import { NextResponse } from "next/server";

import {
  getErrorMessage,
  getVeniceDebugInfo,
  isAspectRatioOption,
  isDurationAllowedForVideoModel,
  isDurationOption,
  isResolutionOption,
  isVideoModelOption,
  readResponsePayload,
  VENICE_API_BASE_URL,
  VENICE_VIDEO_MODEL,
  videoModelSupportsAspectRatio,
  type QuoteVideoRequest,
} from "@/lib/venice";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "VENICE_API_KEY is missing, so the video price cannot be quoted." },
      { status: 500 },
    );
  }

  let body: QuoteVideoRequest;

  try {
    body = (await request.json()) as QuoteVideoRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid body. Could not read the JSON request." },
      { status: 400 },
    );
  }

  if (body.model && !isVideoModelOption(body.model)) {
    return NextResponse.json({ error: "Invalid model." }, { status: 400 });
  }

  const selectedModel = body.model || VENICE_VIDEO_MODEL;

  if (!isDurationOption(body.duration)) {
    return NextResponse.json({ error: "Invalid duration." }, { status: 400 });
  }

  if (!isDurationAllowedForVideoModel(selectedModel, body.duration)) {
    return NextResponse.json(
      { error: "This model does not support the selected duration." },
      { status: 400 },
    );
  }

  if (!isResolutionOption(body.resolution)) {
    return NextResponse.json(
      { error: "Invalid resolution." },
      { status: 400 },
    );
  }

  if (
    videoModelSupportsAspectRatio(selectedModel) &&
    !isAspectRatioOption(body.aspectRatio)
  ) {
    return NextResponse.json(
      { error: "Invalid aspect ratio." },
      { status: 400 },
    );
  }

  const upstreamResponse = await fetch(`${VENICE_API_BASE_URL}/video/quote`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      model: selectedModel,
      duration: body.duration,
      resolution: body.resolution,
      aspect_ratio: videoModelSupportsAspectRatio(selectedModel)
        ? body.aspectRatio
        : undefined,
    }),
  });

  const { payload } = await readResponsePayload(upstreamResponse);
  const debug = getVeniceDebugInfo(upstreamResponse);

  if (!upstreamResponse.ok) {
    return NextResponse.json(
      {
        error: getErrorMessage(payload, "Could not quote the video price."),
        debug,
      },
      { status: upstreamResponse.status },
    );
  }

  if (typeof payload !== "object" || !payload || Array.isArray(payload)) {
    return NextResponse.json(
      { error: "Venice returned a quote response that did not match the expected JSON format." },
      { status: 502 },
    );
  }

  const quote = (payload as Record<string, unknown>).quote;

  if (typeof quote !== "number") {
    return NextResponse.json(
      { error: "Venice returned a quote response without a numeric quote." },
      { status: 502 },
    );
  }

  return NextResponse.json({ quote }, { status: 200 });
}
