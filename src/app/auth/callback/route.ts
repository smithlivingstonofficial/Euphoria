import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ensureStaffAccountAndRole } from "@/actions/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { isProfileComplete } from "@/lib/profile";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") || searchParams.get("redirect") || "/events";

  // Sanitize next path
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/events";

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
        // Run coordinator & admin auto-provisioning check
        const staffRes = await ensureStaffAccountAndRole(user);

        // 1. Dedicated Coordinator Portal Sign-In Flow
        if (next.startsWith("/coordinator")) {
          if (staffRes.isCoordinator || staffRes.isStaff || staffRes.isAdmin) {
            return NextResponse.redirect(`${origin}/coordinator`);
          } else {
            return NextResponse.redirect(
              `${origin}/coordinator/login?error=not_a_coordinator&email=${encodeURIComponent(user.email || "")}`
            );
          }
        }

        // 2. Dedicated Admin OS Sign-In Flow
        if (next.startsWith("/admin")) {
          if (staffRes.isAdmin) {
            return NextResponse.redirect(`${origin}/admin`);
          } else {
            return NextResponse.redirect(
              `${origin}/admin/login?error=not_an_admin&email=${encodeURIComponent(user.email || "")}`
            );
          }
        }

        // 3. Auto-route coordinators/admins even if logging in via general button
        if (staffRes.isAdmin) {
          return NextResponse.redirect(`${origin}/admin`);
        }
        if (staffRes.isCoordinator || staffRes.isStaff) {
          return NextResponse.redirect(`${origin}/coordinator`);
        }

        // 4. Standard Participant Flow: Strictly verify that all profile fields are filled
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        const profileActuallyComplete = isProfileComplete(profile);

        // If any required field is empty or missing, keep is_profile_completed as false and redirect
        if (!profile || !profileActuallyComplete) {
          if (profile && profile.is_profile_completed) {
            const adminClient = await createAdminClient();
            await adminClient
              .from("profiles")
              .update({ is_profile_completed: false })
              .eq("id", user.id);
          }
          return NextResponse.redirect(`${origin}/complete-profile`);
        }

        // If fully complete, ensure DB state reflects true
        if (profile && !profile.is_profile_completed) {
          const adminClient = await createAdminClient();
          await adminClient
            .from("profiles")
            .update({ is_profile_completed: true })
            .eq("id", user.id);
        }

        return NextResponse.redirect(`${origin}${next !== "/events" ? next : "/events"}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_exchange_failed`);
}
