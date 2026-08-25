import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ProfileClient } from "./profile-client";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=missing_configuration");

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const authName = String(user.user_metadata.full_name ?? user.user_metadata.name ?? user.email?.split("@")[0] ?? "Pera user");
  const preferences = {
    displayName: authName,
    currency: "PHP",
    timezone: "Asia/Manila",
    monthlySavingsTarget: 20000,
    budgetAlerts: true,
  };
  const stats = { transactions: 0, savings: 0, recurring: 0, accounts: 0 };
  let databaseReady = false;
  const prisma = getPrisma();

  if (prisma) {
    try {
      const [profile, transactions, savings, recurring, accounts] = await Promise.all([
        prisma.profile.findUnique({ where: { id: user.id } }),
        prisma.transaction.count({ where: { ownerId: user.id } }),
        prisma.savingsGoal.count({ where: { ownerId: user.id } }),
        prisma.recurringExpense.count({ where: { ownerId: user.id } }),
        prisma.account.count({ where: { ownerId: user.id, isArchived: false } }),
      ]);
      if (profile) {
        preferences.displayName = profile.displayName ?? authName;
        preferences.currency = profile.currency;
        preferences.timezone = profile.timezone;
        preferences.monthlySavingsTarget = Number(profile.monthlySavingsTarget);
        preferences.budgetAlerts = profile.budgetAlerts;
      }
      Object.assign(stats, { transactions, savings, recurring, accounts });
      databaseReady = true;
    } catch {
      databaseReady = false;
    }
  }

  const metadataProviders = Array.isArray(user.app_metadata.providers) ? user.app_metadata.providers.map(String) : [];
  const identityProviders = (user.identities ?? []).map((identity) => identity.provider);
  const providers = Array.from(new Set([...metadataProviders, ...identityProviders, String(user.app_metadata.provider ?? "")].filter(Boolean)));

  return <ProfileClient
    account={{
      id: user.id,
      email: user.email ?? "",
      phone: user.phone ?? "",
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? "",
      emailConfirmed: Boolean(user.email_confirmed_at),
      providers,
    }}
    preferences={preferences}
    stats={stats}
    databaseReady={databaseReady}
  />;
}
