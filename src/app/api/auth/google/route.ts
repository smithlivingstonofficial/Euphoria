import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("redirect") || "/dashboard";
  const origin = request.nextUrl.origin;

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?redirect=${encodeURIComponent(next)}`,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url),
      { status: 302 }
    );
  }

  if (data?.url) {
    return NextResponse.redirect(data.url, { status: 302 });
  }

  return NextResponse.redirect(
    new URL("/login?error=oauth_init_failed", request.url),
    { status: 302 }
  );
}
