import { ok } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export function GET() {
  return ok({ status: "ok", service: "vertica", time: new Date().toISOString() });
}
