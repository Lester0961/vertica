import { createServiceRoleClient } from "@/lib/supabase/service";
import { authenticate } from "@/lib/security/authenticate";
import { AuthorizationError } from "@/lib/security/authenticate";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  phone: string | null;
  status: string;
  roles: string[];
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  beforeData: unknown;
  afterData: unknown;
  source: string | null;
  createdAt: string;
}

export interface NotificationEntry {
  id: string;
  type: string;
  title: string;
  body: string | null;
  targetUrl: string | null;
  channel: string;
  createdAt: string;
  readAt: string | null;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const actor = await authenticate();
  const roles = actor?.roles ?? [];
  if (!roles.some((r: string) => r === "SUPER_ADMIN" || r === "PROPERTY_ADMIN")) {
    throw new AuthorizationError(403, "Admin access only.");
  }
  const supabase = createServiceRoleClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, display_name, phone, status, created_at")
    .order("created_at", { ascending: false });
  const rows = (profiles ?? []) as unknown as {
    id: string; email: string; display_name: string | null; phone: string | null;
    status: string; created_at: string;
  }[];
  if (!rows.length) return [];
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", rows.map((r) => r.id));
  const roleMap = new Map<string, string[]>();
  for (const ur of (userRoles ?? []) as unknown as { user_id: string; role: string }[]) {
    const arr = roleMap.get(ur.user_id) ?? [];
    arr.push(ur.role);
    roleMap.set(ur.user_id, arr);
  }
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    displayName: r.display_name,
    phone: r.phone,
    status: r.status,
    roles: roleMap.get(r.id) ?? [],
    createdAt: r.created_at,
  }));
}

export async function getAuditLogs(limit = 200): Promise<AuditLogEntry[]> {
  const actor = await authenticate();
  const roles = actor?.roles ?? [];
  if (!roles.some((r: string) => r === "SUPER_ADMIN" || r === "PROPERTY_ADMIN")) {
    throw new AuthorizationError(403, "Admin access only.");
  }
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id, actor_id, actor_role, action, entity, entity_id, before_data, after_data, source, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as unknown as Array<{
    id: string; actor_id: string | null; actor_role: string | null; action: string;
    entity: string; entity_id: string | null; before_data: unknown; after_data: unknown;
    source: string | null; created_at: string;
  }>).map((r) => ({
    id: r.id,
    actorId: r.actor_id,
    actorRole: r.actor_role,
    action: r.action,
    entity: r.entity,
    entityId: r.entity_id,
    beforeData: r.before_data,
    afterData: r.after_data,
    source: r.source,
    createdAt: r.created_at,
  }));
}

export async function getMyProfile(): Promise<UserProfile> {
  const actor = await authenticate();
  if (!actor) throw new AuthorizationError(401, "Not authenticated.");
  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, display_name, phone, status, created_at")
    .eq("user_id", actor.userId)
    .single();
  if (!profile) throw new Error("Profile not found.");
  const p = profile as unknown as {
    id: string; email: string; display_name: string | null; phone: string | null;
    status: string; created_at: string;
  };
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", p.id);
  return {
    id: p.id,
    email: p.email,
    displayName: p.display_name,
    phone: p.phone,
    status: p.status,
    roles: (userRoles ?? []).map((ur: { role: string }) => ur.role),
    createdAt: p.created_at,
  };
}

export async function updateMyProfile(input: { displayName?: string; phone?: string }): Promise<void> {
  const actor = await authenticate();
  if (!actor) throw new AuthorizationError(401, "Not authenticated.");
  const supabase = createServiceRoleClient();
  const updates: Record<string, unknown> = {};
  if (input.displayName !== undefined) updates.display_name = input.displayName;
  if (input.phone !== undefined) updates.phone = input.phone;
  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", actor.userId);
  if (error) throw new Error("Could not update profile.");
}

export async function getMyNotifications(): Promise<NotificationEntry[]> {
  const actor = await authenticate();
  if (!actor) throw new AuthorizationError(401, "Not authenticated.");
  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase
    .from("profiles").select("id").eq("user_id", actor.userId).single();
  if (!profile) return [];
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, target_url, channel, created_at, read_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100);
  return ((data ?? []) as unknown as Array<{
    id: string; type: string; title: string; body: string | null;
    target_url: string | null; channel: string; created_at: string; read_at: string | null;
  }>).map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    targetUrl: r.target_url,
    channel: r.channel,
    createdAt: r.created_at,
    readAt: r.read_at,
  }));
}

export async function markNotificationRead(id: string): Promise<void> {
  const actor = await authenticate();
  if (!actor) throw new AuthorizationError(401, "Not authenticated.");
  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase
    .from("profiles").select("id").eq("user_id", actor.userId).single();
  if (!profile) return;
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", profile.id)
    .is("read_at", null);
}
