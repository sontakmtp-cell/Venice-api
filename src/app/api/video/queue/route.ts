import { NextResponse } from "next/server";

import {
  getVeniceDebugInfo,
  VENICE_API_BASE_URL,
  VENICE_MODEL_SUPPORTS_ASPECT_RATIO,
  VENICE_VIDEO_MODEL,
  getQueueErrorMessage,
  isAspectRatioOption,
  isDurationOption,
  isImageDataUrl,
  isResolutionOption,
  readResponsePayload,
  type QueueVideoRequest,
} from "@/lib/venice";
import { appendVideoHistory } from "@/lib/video-history";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "VENICE_API_KEY is missing. Create .env.local and add your API key before queuing a video.",
      },
      { status: 500 },
    );
  }

  let body: QueueVideoRequest;

  try {
    body = (await request.json()) as QueueVideoRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid body. Could not read the JSON request." },
      { status: 400 },
    );
  }

  if (!body.prompt?.trim()) {
    return NextResponse.json(
      { error: "Motion prompt cannot be empty." },
      { status: 400 },
    );
  }

  if (!isImageDataUrl(body.imageDataUrl)) {
    return NextResponse.json(
      {
        error:
          "The reference image must be a base64 data URL, for example data:image/jpeg;base64,...",
      },
      { status: 400 },
    );
  }

  if (!isDurationOption(body.duration)) {
    return NextResponse.json({ error: "Invalid duration." }, { status: 400 });
  }

  if (!isResolutionOption(body.resolution)) {
    return NextResponse.json(
      { error: "Invalid resolution." },
      { status: 400 },
    );
  }

  if (
    VENICE_MODEL_SUPPORTS_ASPECT_RATIO &&
    !isAspectRatioOption(body.aspectRatio)
  ) {
    return NextResponse.json(
      { error: "Invalid aspect ratio." },
      { status: 400 },
    );
  }

  const upstreamResponse = await fetch(`${VENICE_API_BASE_URL}/video/queue`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      model: VENICE_VIDEO_MODEL,
      prompt: body.prompt.trim(),
      negative_prompt: body.negativePrompt?.trim() || undefined,
      image_url: body.imageDataUrl,
      duration: body.duration,
      resolution: body.resolution,
      aspect_ratio: VENICE_MODEL_SUPPORTS_ASPECT_RATIO
        ? body.aspectRatio
        : undefined,
    }),
  });

  const { payload } = await readResponsePayload(upstreamResponse);
  const debug = getVeniceDebugInfo(upstreamResponse);

  if (!upstreamResponse.ok) {
    return NextResponse.json(
      {
        error: getQueueErrorMessage(payload, upstreamResponse.status),
        debug,
      },
      { status: upstreamResponse.status },
    );
  }

  if (typeof payload !== "object" || !payload || Array.isArray(payload)) {
    return NextResponse.json(
      { error: "Venice returned a response that did not match the expected JSON format." },
      { status: 502 },
    );
  }

  const record = payload as Record<string, unknown>;
  const model =
    typeof record.model === "string" ? record.model : VENICE_VIDEO_MODEL;
  const queueId = typeof record.queue_id === "string" ? record.queue_id : null;
  const downloadUrl =
    typeof record.download_url === "string" ? record.download_url : null;

  if (!queueId) {
    return NextResponse.json(
      {
        error:
          "Venice returned a successful response without queue_id. Polling cannot continue.",
      },
      { status: 502 },
    );
  }

  await appendVideoHistory({
    model,
    queueId,
    downloadUrl,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json(
    {
      model,
      queueId,
      downloadUrl,
    },
    { status: 200 },
  );
}
