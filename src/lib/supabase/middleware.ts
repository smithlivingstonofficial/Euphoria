import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // 2. High-Efficiency Fast Path for Anonymous Visitors (90%+ of site traffic)
  // If user has NO auth cookie:
  if (!hasAuthCookie) {
    // If attempting to access protected route without cookie, redirect immediately with 0 network overhead
    if (isProtectedPath) {
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

    // If viewing public route (/, /events, /campus-map, /announcements) or auth page without cookie:
    // Return immediately with ZERO network round-trips to Supabase
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  // 3. Skip auth network overhead on Next.js background data prefetches for public routes
  const isPrefetch =
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    request.nextUrl.searchParams.has("_rsc");

  if (isPrefetch && !isProtectedPath && !isAuthPage) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  // 4. Full Session Verification (only when cookies are present and route requires validation or refresh)
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allow public access to dedicated login pages
  if (path === "/coordinator/login" || path === "/admin/login") {
    if (user) {
      const url = request.nextUrl.clone();
      url.pathname = path.startsWith("/admin") ? "/admin" : "/coordinator";
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (isProtectedPath && !user) {
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

  // If logged-in user visits /login or /register, redirect cleanly
  if (user && (path === "/login" || path === "/register")) {
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    const target =
      redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
        ? redirectParam
        : "/dashboard";

    const url = request.nextUrl.clone();
    url.pathname = target;
    url.searchParams.delete("redirect");
    return NextResponse.redirect(url);
  }

  return response;
}
