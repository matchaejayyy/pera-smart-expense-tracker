import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(request: Request) {
  const confirmation = (await request.json() as { confirmation?: string }).confirmation;
  if (confirmation !== "DELETE") return NextResponse.json({ error: "Type DELETE to confirm account deletion." }, { status: 400 });

  const supabase = await createClient();
  const prisma = getPrisma();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabase || !prisma) return NextResponse.json({ error: "Connect Prisma to the Supabase database before deleting an account." }, { status: 503 });
  if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ error: "Account deletion is not configured on the server yet." }, { status: 503 });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "You must be signed in to delete this account." }, { status: 401 });

  try {
    await prisma.profile.count({ where: { id: user.id } });
  } catch {
    return NextResponse.json({ error: "The Prisma database could not be reached. No account data was deleted." }, { status: 503 });
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteAuthError) return NextResponse.json({ error: deleteAuthError.message }, { status: 400 });

  try {
    await prisma.$transaction([
      prisma.insight.deleteMany({ where: { ownerId: user.id } }),
      prisma.savingsGoal.deleteMany({ where: { ownerId: user.id } }),
      prisma.recurringExpense.deleteMany({ where: { ownerId: user.id } }),
      prisma.transaction.deleteMany({ where: { ownerId: user.id } }),
      prisma.budget.deleteMany({ where: { ownerId: user.id } }),
      prisma.category.deleteMany({ where: { ownerId: user.id } }),
      prisma.account.deleteMany({ where: { ownerId: user.id } }),
      prisma.profile.deleteMany({ where: { id: user.id } }),
    ]);
  } catch {
    return NextResponse.json({ error: "The Auth account was removed, but its financial rows need administrator cleanup." }, { status: 500 });
  }

  return NextResponse.json({ data: { deleted: true } });
}
