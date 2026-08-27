import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CompleteProfileForm } from "./complete-profile-form";

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

  // If already complete, redirect directly to dashboard
  if (profile && profile.is_profile_completed) {
    redirect("/dashboard");
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
    <div className="relative min-h-screen bg-slate-950 px-3 py-6 sm:py-10 sm:px-6 lg:px-8 flex items-center justify-center overflow-x-hidden">
      {/* Background Glow */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="relative w-full max-w-lg">
        <CompleteProfileForm user={userData} initialProfile={profile} />
      </div>
    </div>
  );
}
