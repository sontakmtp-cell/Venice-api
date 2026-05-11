import { NextResponse } from "next/server";

import { readVideoHistory } from "@/lib/video-history";

export const runtime = "nodejs";

export async function GET() {
  const history = await readVideoHistory();
  return NextResponse.json({ items: history }, { status: 200 });
}
