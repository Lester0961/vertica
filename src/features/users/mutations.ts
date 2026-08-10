import "server-only";

import { authenticate, AuthorizationError } from "@/lib/security/authenticate";
import { createServiceRoleClient } from "@/lib/supabase/service";

const APP_ROLES = ["SUPER_ADMIN", "PROPERTY_ADMIN", "TENANT", "GUARD", "MAINTENANCE"] as const;
type AppRole = typeof APP_ROLES[number];

async function requireSuperAdmin() {
  const actor = await authenticate();
  if (!actor?.roles.includes("SUPER_ADMIN")) throw new AuthorizationError(403, "Super admin access only.");
  return actor;
}
export async function inviteUser(input: { email: string; displayName: string; role: AppRole }) {
  const actor = await requireSuperAdmin();
  const supabase = createServiceRoleClient();
  const email = input.email.trim().toLowerCase();
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=/reset-password`;
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { display_name: input.displayName.trim() },
  });
  if (error || !data.user) throw new Error(error?.message ?? "Invitation could not be created.");
  const userId = data.user.id;
  await supabase.from("profiles").upsert({ id: userId, email, display_name: input.displayName.trim(), full_name: input.displayName.trim(), status: "INVITED", invited_at: new Date().toISOString(), created_by: actor.userId }, { onConflict: "id" });
  await supabase.from("user_roles").upsert({ user_id: userId, role: input.role, assigned_by: actor.userId }, { onConflict: "user_id,role" });
  return { id: userId, email, displayName: input.displayName.trim(), phone: null, status: "INVITED", roles: [input.role], createdAt: data.user.created_at };
}

export async function updateUserAccess(id: string, input: { status: "INVITED" | "ACTIVE" | "DISABLED"; roles: AppRole[] }) {
  const actor = await requireSuperAdmin();
  if (!input.roles.length) throw new Error("Assign at least one role.");
  if (id === actor.userId && input.status === "DISABLED") throw new Error("You cannot disable your own account.");
  const supabase = createServiceRoleClient();
  const { data: existingRoles } = await supabase.from("user_roles").select("role").eq("user_id", id);
  const currentRoles = (existingRoles ?? []).map((item: { role: string }) => item.role);
  if (currentRoles.includes("SUPER_ADMIN") && (!input.roles.includes("SUPER_ADMIN") || input.status === "DISABLED")) {
    const { count } = await supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "SUPER_ADMIN").neq("user_id", id);
    if ((count ?? 0) < 1) throw new Error("At least one other super admin must remain.");
  }
  const { error: profileError } = await supabase.from("profiles").update({ status: input.status, updated_by: actor.userId }).eq("id", id);
  if (profileError) throw new Error("User status could not be updated.");
  const { error: deleteError } = await supabase.from("user_roles").delete().eq("user_id", id);
  if (deleteError) throw new Error("Existing roles could not be replaced.");
  const { error: insertError } = await supabase.from("user_roles").insert(input.roles.map((role) => ({ user_id: id, role, assigned_by: actor.userId })));
  if (insertError) {
    if (currentRoles.length) await supabase.from("user_roles").insert(currentRoles.map((role) => ({ user_id: id, role, assigned_by: actor.userId })));
    throw new Error("New roles could not be assigned.");
  }
  if (input.status === "DISABLED") await supabase.auth.admin.updateUserById(id, { ban_duration: "876000h" });
  else await supabase.auth.admin.updateUserById(id, { ban_duration: "none" });
  return { id, status: input.status, roles: input.roles };
}
