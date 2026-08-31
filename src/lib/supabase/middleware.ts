import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
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

  const path = request.nextUrl.pathname;

  // Allow public access to dedicated login pages
  if (path === "/coordinator/login" || path === "/admin/login") {
    if (user) {
      const url = request.nextUrl.clone();
      url.pathname = path.startsWith("/admin") ? "/admin" : "/coordinator";
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Protected authenticated routes
  const isProtectedPath =
    path.startsWith("/dashboard") ||
    path.startsWith("/coordinator") ||
    path.startsWith("/staff") ||
    path.startsWith("/admin") ||
    path.startsWith("/complete-profile");

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    if (path.startsWith("/coordinator")) {
      url.pathname = "/coordinator/login";
    } else if (path.startsWith("/admin")) {
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
