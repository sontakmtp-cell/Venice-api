import { NextResponse } from "next/server";

import { isAllowedVeniceDownloadUrl } from "@/lib/venice";

export const runtime = "nodejs";

function buildFileName(queueId: string) {
  const safeId = queueId.replace(/[^a-zA-Z0-9-_]/g, "");
  return `venice-${safeId || "video"}.mp4`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const downloadUrl = searchParams.get("url");
  const queueId = searchParams.get("queueId") ?? "video";

  if (!downloadUrl || !isAllowedVeniceDownloadUrl(downloadUrl)) {
    return NextResponse.json(
      { error: "download_url is invalid or is not hosted on a Venice domain." },
      { status: 400 },
    );
  }

  const upstreamResponse = await fetch(downloadUrl, {
    method: "GET",
    cache: "no-store",
  });

  if (!upstreamResponse.ok || !upstreamResponse.body) {
    return NextResponse.json(
      { error: "Could not download the video from the private download_url." },
      { status: upstreamResponse.status || 502 },
    );
  }

  return new NextResponse(upstreamResponse.body, {
    status: 200,
    headers: {
      "Content-Type": upstreamResponse.headers.get("content-type") ?? "video/mp4",
      "Content-Disposition": `attachment; filename="${buildFileName(queueId)}"`,
      "Cache-Control": "no-store",
    },
  });
}
