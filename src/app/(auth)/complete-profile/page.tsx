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

  // If already complete, redirect directly to events
  if (profile && profile.is_profile_completed) {
    redirect("/events");
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
    <div className="min-h-screen bg-slate-50/80 py-6 sm:py-8 md:py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        <CompleteProfileForm user={userData} initialProfile={profile} />
      </div>
    </div>
  );
}
