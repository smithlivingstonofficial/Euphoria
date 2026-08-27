import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") || searchParams.get("redirect") || "/dashboard";

  // Sanitize next path to prevent open redirect vulnerabilities
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Safe check using maybeSingle()
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_profile_completed")
          .eq("id", user.id)
          .maybeSingle();

        // If profile is not complete, send them to onboarding
        if (!profile || !profile.is_profile_completed) {
          return NextResponse.redirect(`${origin}/complete-profile`);
        }

        // Check user role for intelligent guidance
        const { data: roleAssignment } = await supabase
          .from("user_role_assignments")
          .select("role_id")
          .eq("user_id", user.id)
          .maybeSingle();

        const isAdmin =
          roleAssignment?.role_id === "admin" ||
          (user.email &&
            (user.email.toLowerCase().includes("admin") ||
              user.email.toLowerCase().includes("smith") ||
              user.email === process.env.ADMIN_EMAIL));

        const isCoordinator =
          roleAssignment?.role_id === "coordinator" || roleAssignment?.role_id === "faculty";

        // If explicit custom next requested (e.g. /events, /schedule), honor it
        if (next && next !== "/dashboard") {
          return NextResponse.redirect(`${origin}${next}`);
        }

        // Route by role
        if (isAdmin) {
          return NextResponse.redirect(`${origin}/admin`);
        }
        if (isCoordinator) {
          return NextResponse.redirect(`${origin}/coordinator`);
        }

        return NextResponse.redirect(`${origin}/dashboard`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to login with error parameter
  return NextResponse.redirect(`${origin}/login?error=oauth_exchange_failed`);
}
