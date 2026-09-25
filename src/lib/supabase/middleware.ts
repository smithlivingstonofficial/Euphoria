import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function decodeBase64Safe(str: string): string {
  try {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(str, "base64").toString("utf-8");
    }
    return atob(str);
  } catch {
    return "";
  }
}

function isAuthTokenFresh(request: NextRequest): boolean {
  try {
    const cookies = request.cookies.getAll();
    const authCookie = cookies.find((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
    if (!authCookie || !authCookie.value) return false;

    let rawValue = authCookie.value;
    if (rawValue.startsWith("base64-")) {
      rawValue = decodeBase64Safe(rawValue.slice(7));
    }

    let jwt = "";
    if (rawValue.startsWith("eyJ")) {
      jwt = rawValue;
    } else {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed) && typeof parsed[0] === "string" && parsed[0].startsWith("eyJ")) {
        jwt = parsed[0];
      } else if (parsed && typeof parsed.access_token === "string") {
        jwt = parsed.access_token;
      }
    }

    if (!jwt) return false;
    const parts = jwt.split(".");
    if (parts.length < 2) return false;
    const payloadJson = decodeBase64Safe(parts[1]);
    if (!payloadJson) return false;

    const payload = JSON.parse(payloadJson);
    if (!payload.exp) return false;

    const now = Math.floor(Date.now() / 1000);
    // If token has more than 5 minutes (300s) remaining before expiry, it is fresh
    return payload.exp > now + 300;
  } catch {
    return false;
  }
}

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Fast-path: Exclude webhooks, callbacks, and public API routes that don't use user sessions
  if (path.startsWith("/api/payments/easebuzz")) {
    return NextResponse.next();
  }

  const isProtectedPath =
    path.startsWith("/dashboard") ||
    path.startsWith("/coordinator") ||
    path.startsWith("/staff") ||
    path.startsWith("/admin") ||
    path.startsWith("/super-admin") ||
    path.startsWith("/complete-profile");

  const isAuthPage =
    path === "/login" ||
    path === "/register" ||
    path === "/coordinator/login" ||
    path === "/admin/login";

  // Check if any Supabase auth cookies are present in the request
  const cookiesList = request.cookies.getAll();
  const hasAuthCookie = cookiesList.some(
    (c) => c.name.startsWith("sb-") && c.name.includes("-auth-token")
  );

  // 2. High-Efficiency Fast Path for Anonymous Visitors
  // If user has NO auth cookie:
  if (!hasAuthCookie) {
    if (isProtectedPath && !isAuthPage) {
      const url = request.nextUrl.clone();
      if (path.startsWith("/coordinator")) {
        url.pathname = "/coordinator/login";
      } else if (path.startsWith("/admin") || path.startsWith("/super-admin")) {
        url.pathname = "/admin/login";
      } else {
        url.pathname = "/login";
        url.searchParams.set("redirect", path);
      }
      return NextResponse.redirect(url);
    }

    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  // 3. High-Efficiency Fast Path for Public Routes (/, /events, /campus-map, etc.)
  // Never perform blocking remote Supabase Auth network calls in Edge middleware for public routes.
  // This guarantees 0ms latency and 100% immunity to Supabase API outages on visitor traffic.
  if (!isProtectedPath && !isAuthPage) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  // 4. Fast Path for Users with Valid Tokens
  const tokenIsFresh = isAuthTokenFresh(request);

  if (tokenIsFresh) {
    // If logged-in user visits auth pages, redirect away cleanly
    if (isAuthPage) {
      const url = request.nextUrl.clone();
      if (path === "/admin/login") {
        url.pathname = "/admin";
      } else if (path === "/coordinator/login") {
        url.pathname = "/coordinator";
      } else {
        const redirectParam = request.nextUrl.searchParams.get("redirect");
        const target =
          redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
            ? redirectParam
            : "/dashboard";
        url.pathname = target;
        url.searchParams.delete("redirect");
      }
      return NextResponse.redirect(url);
    }

    // Protected path with fresh token: forward immediately to Server Component in 0.1ms
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  // If user is on an auth page and token is expired/unfresh, allow them to view login without blocking
  if (isAuthPage) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  // 5. Protected Path with Stale/Expired Token: Attempt Refresh with Strict 2s Timeout
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Wrap remote auth check with strict 2-second timeout to completely prevent 504 MIDDLEWARE_INVOCATION_TIMEOUT
  let user = null;
  let didTimeout = false;
  try {
    const userPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise<{ data: { user: null }; error: any }>((resolve) =>
      setTimeout(() => {
        didTimeout = true;
        resolve({ data: { user: null }, error: new Error("Supabase auth timeout") });
      }, 2000)
    );
    const result = await Promise.race([userPromise, timeoutPromise]);
    user = result?.data?.user || null;
  } catch (err) {
    console.error("Middleware Supabase getUser error:", err);
    user = null;
  }

  // If user session couldn't be verified and did not simply timeout with existing cookie:
  if (isProtectedPath && !user) {
    // If Supabase timed out or is temporarily having API errors, let the request pass through
    // to the Node.js Server Component rather than crashing Edge with 504 or prematurely logging them out
    if (didTimeout && hasAuthCookie) {
      return response;
    }

    const url = request.nextUrl.clone();
    if (path.startsWith("/coordinator")) {
      url.pathname = "/coordinator/login";
    } else if (path.startsWith("/admin") || path.startsWith("/super-admin")) {
      url.pathname = "/admin/login";
    } else {
      url.pathname = "/login";
      url.searchParams.set("redirect", path);
    }
    return NextResponse.redirect(url);
  }

  return response;
}
