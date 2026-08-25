import { redirect } from "next/navigation";
import { Dashboard } from "./dashboard-client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=missing_configuration");

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const fullName = String(user.user_metadata.full_name ?? user.user_metadata.name ?? user.email?.split("@")[0] ?? "Pera user");

  return <Dashboard userName={fullName} userEmail={user.email ?? ""} />;
}
