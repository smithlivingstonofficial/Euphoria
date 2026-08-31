import { redirect } from "next/navigation";

export default function UserPassesRedirectPage() {
  redirect("/dashboard");
}
