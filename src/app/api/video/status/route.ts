import { NextResponse } from "next/server";

import {
  VENICE_API_BASE_URL,
  VENICE_VIDEO_MODEL,
  getErrorMessage,
  getVeniceDebugInfo,
  readResponsePayload,
} from "@/lib/venice";

export const runtime = "nodejs";

type StatusRequest = {
  model?: string;
  queueId?: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "VENICE_API_KEY is missing. Create .env.local and add your API key before checking status.",
      },
      { status: 500 },
    );
  }

  let body: StatusRequest;
  try {
    body = (await request.json()) as StatusRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid body. Could not read the JSON request." },
      { status: 400 },
    );
  }

  if (!body.queueId?.trim()) {
    return NextResponse.json(
      { error: "queueId cannot be empty." },
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
      model: body.model?.trim() || VENICE_VIDEO_MODEL,
      queue_id: body.queueId.trim(),
    }),
  });

  const contentType = upstreamResponse.headers.get("content-type") ?? "";

  if (contentType.includes("video/mp4")) {
    return NextResponse.json(
      {
        status: "COMPLETED",
        inlineVideo: true,
      },
      { status: 200 },
    );
  }

  const { payload } = await readResponsePayload(upstreamResponse);
  const debug = getVeniceDebugInfo(upstreamResponse);

  if (!upstreamResponse.ok) {
    return NextResponse.json(
      {
        error: getErrorMessage(
          payload,
          "Could not fetch the status from Venice. Try again in a few seconds.",
        ),
        debug,
      },
      { status: upstreamResponse.status },
    );
  }

  if (typeof payload !== "object" || !payload || Array.isArray(payload)) {
    return NextResponse.json(
      { error: "Venice returned a status response that did not match the expected JSON format." },
      { status: 502 },
    );
  }

  const record = payload as Record<string, unknown>;
  const status =
    typeof record.status === "string" ? record.status : "PROCESSING";
  const averageExecutionTime =
    typeof record.average_execution_time === "number"
      ? record.average_execution_time
      : undefined;
  const executionDuration =
    typeof record.execution_duration === "number"
      ? record.execution_duration
      : undefined;

  return NextResponse.json(
    {
      status,
      averageExecutionTime,
      executionDuration,
    },
    { status: 200 },
  );
}
