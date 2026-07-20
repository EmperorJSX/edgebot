import type { NextRequest } from "next/server";
import { decisionsSince, getStore } from "@/server/store";

export const dynamic = "force-dynamic";

/**
 * The autonomous decision log as a pollable stream: pass ?after=<id> (the
 * highest decision id you have seen) to get only newer entries, oldest first.
 * ?limit=<n> caps the page (default 200).
 */
export async function GET(request: NextRequest): Promise<Response> {
  const params = request.nextUrl.searchParams;
  const after = Number(params.get("after")) || 0;
  const limit = Math.min(Number(params.get("limit")) || 200, 500);

  return Response.json({
    decisions: decisionsSince(after, limit),
    latestSeq: getStore().state.nextDecisionId - 1,
  });
}
