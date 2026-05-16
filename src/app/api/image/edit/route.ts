import { NextResponse } from "next/server";

import {
  VENICE_API_BASE_URL,
  VENICE_IMAGE_EDIT_MODEL,
  getBase64FromImageDataUrl,
  getErrorMessage,
  getVeniceDebugInfo,
  isImageDataUrl,
  isImageOutputFormatOption,
  readResponsePayload,
  type EditImageRequest,
} from "@/lib/venice";

export const runtime = "nodejs";

function toDataUrl(buffer: ArrayBuffer, contentType: string) {
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${contentType};base64,${base64}`;
}

function getEditErrorMessage(payload: unknown, status: number) {
  const upstreamMessage = getErrorMessage(payload, "");
  if (upstreamMessage) {
    return upstreamMessage;
  }

  if (status === 413) {
    return "The image is too large. Use an image smaller than 25MB and try again.";
  }

  if (status === 415) {
    return "Venice did not accept the image format. Use JPG, PNG, or WebP.";
  }

  if (status === 402) {
    return "The Venice account does not have enough balance to run this request.";
  }

  if (status === 422 || status === 400) {
    return "Venice rejected the edit request. Try a simpler prompt or a different image.";
  }

  return "Venice did not accept the image edit request. Try again with a different prompt or image.";
}

export async function POST(request: Request) {
  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "VENICE_API_KEY is missing. Create .env.local and add your API key before editing an image.",
      },
      { status: 500 },
    );
  }

  let body: EditImageRequest;

  try {
    body = (await request.json()) as EditImageRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid body. Could not read the JSON request." },
      { status: 400 },
    );
  }

  if (!body.prompt?.trim()) {
    return NextResponse.json(
      { error: "Image edit prompt cannot be empty." },
      { status: 400 },
    );
  }

  if (!isImageDataUrl(body.imageDataUrl)) {
    return NextResponse.json(
      {
        error:
          "The source image must be a base64 data URL, for example data:image/jpeg;base64,...",
      },
      { status: 400 },
    );
  }

  if (
    body.outputFormat !== undefined &&
    !isImageOutputFormatOption(body.outputFormat)
  ) {
    return NextResponse.json(
      { error: "Invalid output format." },
      { status: 400 },
    );
  }

  const outputFormat = body.outputFormat ?? "png";
  const image = getBase64FromImageDataUrl(body.imageDataUrl);

  if (!image) {
    return NextResponse.json(
      { error: "The source image data URL does not contain base64 image data." },
      { status: 400 },
    );
  }

  const upstreamResponse = await fetch(`${VENICE_API_BASE_URL}/image/edit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      model: VENICE_IMAGE_EDIT_MODEL,
      prompt: body.prompt.trim(),
      image,
      output_format: outputFormat,
    }),
  });

  const debug = getVeniceDebugInfo(upstreamResponse);
  const contentType = upstreamResponse.headers.get("content-type") ?? "";

  if (!upstreamResponse.ok) {
    const { payload } = await readResponsePayload(upstreamResponse);

    return NextResponse.json(
      {
        error: getEditErrorMessage(payload, upstreamResponse.status),
        debug,
      },
      { status: upstreamResponse.status },
    );
  }

  if (!contentType.startsWith("image/")) {
    const { payload } = await readResponsePayload(upstreamResponse);

    return NextResponse.json(
      {
        error: getErrorMessage(
          payload,
          "Venice returned a successful response that was not an image.",
        ),
        debug,
      },
      { status: 502 },
    );
  }

  const imageDataUrl = toDataUrl(await upstreamResponse.arrayBuffer(), contentType);

  return NextResponse.json(
    {
      imageDataUrl,
      model: VENICE_IMAGE_EDIT_MODEL,
      outputFormat,
    },
    { status: 200 },
  );
}
