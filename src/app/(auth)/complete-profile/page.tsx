import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CompleteProfileForm } from "./complete-profile-form";
import { isProfileComplete } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function CompleteProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/register");
  }

  // Fetch profile if exists
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const actuallyComplete = isProfileComplete(profile);

  // If already genuinely complete with all required fields, redirect directly to events
  if (profile && profile.is_profile_completed && actuallyComplete) {
    redirect("/events");
  } else if (profile && profile.is_profile_completed && !actuallyComplete) {
    // If DB erroneously had true but data is empty, rectify DB state to false
    const adminClient = await createAdminClient();
    await adminClient.from("profiles").update({ is_profile_completed: false }).eq("id", user.id);
  }

  const userEmail = user.email || "";
  const isInternal = userEmail.toLowerCase().endsWith("@klu.ac.in");

  const userData = {
    id: user.id,
    email: userEmail,
    fullName:
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      userEmail.split("@")[0],
    avatarUrl:
      profile?.avatar_url ||
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      null,
    participantType: (isInternal ? "internal" : "external") as "internal" | "external",
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-50/90 py-4 sm:py-8 md:py-12 px-3 sm:px-6 lg:px-8 flex items-center justify-center overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900">
      {/* Lively Glow Flow Background Layer */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Modern Dot Matrix Grid Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:28px_28px] opacity-45 [mask-image:radial-gradient(ellipse_75%_65%_at_50%_50%,#000_60%,transparent_100%)]" />

        {/* Floating Glow Orb 1: Electric Indigo & Cyan (Top Left Flow) */}
        <div className="animate-glow-flow-1 absolute -top-28 -left-24 h-[500px] w-[500px] sm:h-[620px] sm:w-[620px] rounded-full bg-gradient-to-tr from-indigo-500/25 via-sky-400/20 to-teal-300/15 blur-[100px] sm:blur-[130px]" />

        {/* Floating Glow Orb 2: Sunset Violet & Coral Pink (Bottom Right Flow) */}
        <div className="animate-glow-flow-2 absolute -bottom-32 -right-24 h-[520px] w-[520px] sm:h-[640px] sm:w-[640px] rounded-full bg-gradient-to-bl from-purple-500/25 via-pink-400/20 to-rose-300/15 blur-[100px] sm:blur-[130px]" />

        {/* Floating Glow Orb 3: Radiant Mint & Emerald (Top Right Drift) */}
        <div className="animate-glow-flow-3 absolute top-1/4 -right-28 h-[420px] w-[420px] sm:h-[500px] sm:w-[500px] rounded-full bg-gradient-to-l from-emerald-400/20 via-teal-300/15 to-cyan-300/10 blur-[110px]" />

        {/* Floating Glow Orb 4: Warm Amber / Sunset Glow (Bottom Left Drift) */}
        <div className="animate-glow-flow-3 absolute -bottom-24 left-1/4 h-[380px] w-[380px] rounded-full bg-gradient-to-tr from-amber-400/15 via-rose-300/15 to-purple-300/10 blur-[100px]" />

        {/* Floating Glow Orb 5: Centered Dynamic Backlight Halo behind the card */}
        <div className="animate-glow-breath absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[480px] w-[680px] sm:h-[580px] sm:w-[920px] rounded-full bg-gradient-to-r from-indigo-300/25 via-purple-300/25 to-pink-300/20 blur-[130px]" />
      </div>

      {/* Main Profile Form Container */}
      <div className="relative z-10 w-full max-w-4xl">
        <CompleteProfileForm user={userData} initialProfile={profile} />
      </div>
    </div>
  );
}
