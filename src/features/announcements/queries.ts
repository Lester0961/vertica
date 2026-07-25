import { createServiceRoleClient } from "@/lib/supabase/service";
import { authenticate } from "@/lib/security/authenticate";
import { AuthorizationError } from "@/lib/security/authenticate";

export type AnnouncementAudience = "ALL" | "TENANTS" | "STAFF";
export type AnnouncementPriority = "NORMAL" | "URGENT";

export interface AnnouncementView {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  priority: AnnouncementPriority;
  publishedAt: string | null;
  expiresAt: string | null;
  createdBy: string;
  createdAt: string;
  authorName: string | null;
}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  priority: AnnouncementPriority;
  publishedAt?: string | null;
  expiresAt?: string | null;
}

export async function getActiveAnnouncements(): Promise<AnnouncementView[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("announcements")
    .select("id, title, body, audience, priority, published_at, expires_at, created_by, created_at")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("priority", { ascending: true })
    .order("published_at", { ascending: false });
  const rows = (data ?? []) as unknown as Array<{
    id: string; title: string; body: string; audience: AnnouncementAudience;
    priority: AnnouncementPriority; published_at: string | null; expires_at: string | null;
    created_by: string; created_at: string;
  }>;
  if (!rows.length) return [];
  const authorIds = [...new Set(rows.map((r) => r.created_by))];
  const { data: profiles } = await supabase
    .from("profiles").select("id, full_name").in("id", authorIds);
  const authorMap = new Map((profiles ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    audience: r.audience,
    priority: r.priority,
    publishedAt: r.published_at,
    expiresAt: r.expires_at,
    createdBy: r.created_by,
    createdAt: r.created_at,
    authorName: authorMap.get(r.created_by) ?? null,
  }));
}

export async function getAllAnnouncements(): Promise<AnnouncementView[]> {
  const actor = await authenticate();
  const roles = actor?.roles ?? [];
  if (!roles.some((r: string) => r === "SUPER_ADMIN" || r === "PROPERTY_ADMIN")) {
    throw new AuthorizationError(403, "Admin access only.");
  }
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("announcements")
    .select("id, title, body, audience, priority, published_at, expires_at, created_by, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as unknown as Array<{
    id: string; title: string; body: string; audience: AnnouncementAudience;
    priority: AnnouncementPriority; published_at: string | null; expires_at: string | null;
    created_by: string; created_at: string;
  }>;
  if (!rows.length) return [];
  const authorIds = [...new Set(rows.map((r) => r.created_by))];
  const { data: profiles } = await supabase
    .from("profiles").select("id, full_name").in("id", authorIds);
  const authorMap = new Map((profiles ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    audience: r.audience,
    priority: r.priority,
    publishedAt: r.published_at,
    expiresAt: r.expires_at,
    createdBy: r.created_by,
    createdAt: r.created_at,
    authorName: authorMap.get(r.created_by) ?? null,
  }));
}

export async function createAnnouncement(input: CreateAnnouncementInput): Promise<{ id: string }> {
  const actor = await authenticate();
  const roles = actor?.roles ?? [];
  if (!roles.some((r: string) => r === "SUPER_ADMIN" || r === "PROPERTY_ADMIN")) {
    throw new AuthorizationError(403, "Admin access only.");
  }
  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase
    .from("profiles").select("id").eq("user_id", actor!.userId).single();
  if (!profile) throw new Error("No profile found.");
  const { data, error } = await supabase
    .from("announcements")
    .insert({
      title: input.title,
      body: input.body,
      audience: input.audience,
      priority: input.priority,
      published_at: input.publishedAt ?? null,
      expires_at: input.expiresAt ?? null,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("Could not create announcement.");
  return { id: data.id };
}

export async function updateAnnouncement(id: string, input: Partial<CreateAnnouncementInput>): Promise<void> {
  const actor = await authenticate();
  const roles = actor?.roles ?? [];
  if (!roles.some((r: string) => r === "SUPER_ADMIN" || r === "PROPERTY_ADMIN")) {
    throw new AuthorizationError(403, "Admin access only.");
  }
  const supabase = createServiceRoleClient();
  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.body !== undefined) updates.body = input.body;
  if (input.audience !== undefined) updates.audience = input.audience;
  if (input.priority !== undefined) updates.priority = input.priority;
  if (input.publishedAt !== undefined) updates.published_at = input.publishedAt;
  if (input.expiresAt !== undefined) updates.expires_at = input.expiresAt;
  const { error } = await supabase.from("announcements").update(updates).eq("id", id);
  if (error) throw new Error("Could not update announcement.");
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const actor = await authenticate();
  const roles = actor?.roles ?? [];
  if (!roles.some((r: string) => r === "SUPER_ADMIN" || r === "PROPERTY_ADMIN")) {
    throw new AuthorizationError(403, "Admin access only.");
  }
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw new Error("Could not delete announcement.");
}
