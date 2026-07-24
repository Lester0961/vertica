import { NextRequest } from "next/server";
import { dispatch } from "@/lib/api/router";
import { registerUnitRoutes } from "@/features/units/api";
import { registerRecommendationRoutes } from "@/features/recommendations/api";
import { registerCrmRoutes } from "@/features/crm/api";

registerUnitRoutes();
registerRecommendationRoutes();
registerCrmRoutes();

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return dispatch(req, path);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return dispatch(req, path);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return dispatch(req, path);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return dispatch(req, path);
}
