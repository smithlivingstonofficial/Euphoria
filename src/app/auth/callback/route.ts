import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ensureStaffAccountAndRole } from "@/actions/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { isProfileComplete } from "@/lib/profile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") || searchParams.get("redirect") || "/dashboard";

  // Host awareness for Vercel behind reverse proxies / custom domains
  const forwardedHost = request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const origin = forwardedHost ? `${proto}://${forwardedHost}` : new URL(request.url).origin;

  // Sanitize next path
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const cookieStore = cookies();
  const cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }> = [];

  const redirectWithCookies = (url: string) => {
    const res = NextResponse.redirect(url, { status: 302 });
    cookiesToSet.forEach(({ name, value, options }) => {
      res.cookies.set({ name, value, ...options });
    });
    return res;
  };

  // Check for provider error
  const oauthError = searchParams.get("error_description") || searchParams.get("error");
  if (oauthError) {
    console.error("[OAuth Callback] Provider returned error:", oauthError);
    return redirectWithCookies(`${origin}/login?error=${encodeURIComponent(oauthError)}`);
  }

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch {}
            cookiesToSet.push({ name, value, options });
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: "", ...options });
            } catch {}
            cookiesToSet.push({ name, value: "", options });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[OAuth Callback] exchangeCodeForSession failed:", error.message);
      return redirectWithCookies(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    }

    const user = data?.user || (await supabase.auth.getUser()).data.user;

    if (user) {
      // Run coordinator & admin auto-provisioning check
      const staffRes = await ensureStaffAccountAndRole(user);

      // 1. Dedicated Coordinator Portal Sign-In Flow
      if (next.startsWith("/coordinator")) {
        if (staffRes.isCoordinator || staffRes.isStaff || staffRes.isAdmin) {
          return redirectWithCookies(`${origin}/coordinator`);
        } else {
          return redirectWithCookies(
            `${origin}/coordinator/login?error=not_a_coordinator&email=${encodeURIComponent(user.email || "")}`
          );
        }
      }

      // 2. Dedicated Admin OS Sign-In Flow
      if (next.startsWith("/admin")) {
        if (staffRes.isAdmin) {
          return redirectWithCookies(`${origin}/admin`);
        } else {
          return redirectWithCookies(
            `${origin}/admin/login?error=not_an_admin&email=${encodeURIComponent(user.email || "")}`
          );
        }
      }

      // 3. Auto-route coordinators/admins even if logging in via general button
      if (staffRes.isAdmin) {
        return redirectWithCookies(`${origin}/admin`);
      }
      if (staffRes.isCoordinator || staffRes.isStaff) {
        return redirectWithCookies(`${origin}/coordinator`);
      }

      // 4. Standard Participant Flow: Strictly verify that all profile fields are filled
      const profile =
        staffRes.profile ||
        (await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()).data;

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
        return redirectWithCookies(`${origin}/complete-profile`);
      }

      // If fully complete, ensure DB state reflects true
      if (profile && !profile.is_profile_completed) {
        const adminClient = await createAdminClient();
        await adminClient
          .from("profiles")
          .update({ is_profile_completed: true })
          .eq("id", user.id);
      }

      return redirectWithCookies(`${origin}${next}`);
    }

    return redirectWithCookies(`${origin}${next}`);
  }

  return redirectWithCookies(`${origin}/login?error=no_auth_code`);
}
