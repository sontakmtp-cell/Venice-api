import { NextResponse } from "next/server";

import { VENICE_API_BASE_URL, VENICE_VIDEO_MODEL } from "@/lib/venice";

export const runtime = "nodejs";

function buildFileName(queueId: string) {
  const safeId = queueId.replace(/[^a-zA-Z0-9-_]/g, "");
  return `venice-recovered-${safeId || "video"}.mp4`;
}

export async function GET(request: Request) {
  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "VENICE_API_KEY is missing, so the video cannot be recovered by queue_id." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const queueId = searchParams.get("queueId")?.trim();
  const model = searchParams.get("model")?.trim() || VENICE_VIDEO_MODEL;

  if (!queueId) {
    return NextResponse.json(
      { error: "Provide a queueId to recover the video." },
      { status: 400 },
    );
  }

  const upstreamResponse = await fetch(`${VENICE_API_BASE_URL}/video/retrieve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      model,
      queue_id: queueId,
    }),
  });

  const contentType = upstreamResponse.headers.get("content-type") ?? "";

  if (contentType.includes("video/mp4") && upstreamResponse.body) {
    return new NextResponse(upstreamResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${buildFileName(queueId)}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const payload = contentType.includes("application/json")
    ? await upstreamResponse.json()
    : await upstreamResponse.text();

  return NextResponse.json(
    {
      error:
        typeof payload === "string"
          ? payload
          : payload?.error ||
            payload?.message ||
            "The video is not ready yet, or the queue_id is invalid.",
      details: payload,
    },
    { status: upstreamResponse.status },
  );
}
