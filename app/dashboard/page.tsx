import { redirect } from "next/navigation";
import { Dashboard } from "./dashboard-client";
import { getDashboardData } from "@/lib/dashboard-data";
import { getPrisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=missing_configuration");

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const fullName = String(user.user_metadata.full_name ?? user.user_metadata.name ?? user.email?.split("@")[0] ?? "Pera user");
  const prisma = getPrisma();
  let initialData = null;
  let initialError = "";

  if (!prisma) {
    initialError = "The Prisma database connection is not configured.";
  } else {
    try {
      initialData = await getDashboardData(prisma, user.id);
    } catch (databaseError) {
      console.error("Dashboard data could not be loaded", databaseError);
      initialError = "The database could not be reached. Refresh the page to try again.";
    }
  }

  return <Dashboard userName={fullName} userEmail={user.email ?? ""} initialData={initialData} initialError={initialError} />;
}
