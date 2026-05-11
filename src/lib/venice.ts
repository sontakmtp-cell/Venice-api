export const VENICE_API_BASE_URL = "https://api.venice.ai/api/v1";
export const VENICE_VIDEO_MODEL = "grok-imagine-image-to-video-private";
export const VENICE_MODEL_SUPPORTS_ASPECT_RATIO = false;

export const DURATION_OPTIONS = ["5s", "10s"] as const;
export const RESOLUTION_OPTIONS = ["480p", "720p", "1080p"] as const;
export const ASPECT_RATIO_OPTIONS = ["1:1", "9:16", "16:9"] as const;

export type DurationOption = (typeof DURATION_OPTIONS)[number];
export type ResolutionOption = (typeof RESOLUTION_OPTIONS)[number];
export type AspectRatioOption = (typeof ASPECT_RATIO_OPTIONS)[number];

export type QueueVideoRequest = {
  prompt: string;
  negativePrompt?: string;
  imageDataUrl: string;
  duration: DurationOption;
  resolution: ResolutionOption;
  aspectRatio?: AspectRatioOption;
};

export type VeniceDebugInfo = {
  requestId: string | null;
  contentViolation: boolean | null;
  adultModelContentViolation: boolean | null;
  hostName: string | null;
};

export function isDurationOption(value: unknown): value is DurationOption {
  return typeof value === "string" && DURATION_OPTIONS.includes(value as DurationOption);
}

export function isResolutionOption(value: unknown): value is ResolutionOption {
  return (
    typeof value === "string" &&
    RESOLUTION_OPTIONS.includes(value as ResolutionOption)
  );
}

export function isAspectRatioOption(value: unknown): value is AspectRatioOption {
  return (
    typeof value === "string" &&
    ASPECT_RATIO_OPTIONS.includes(value as AspectRatioOption)
  );
}

export async function readResponsePayload(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return {
      contentType,
      payload: (await response.json()) as Record<string, unknown>,
    };
  }

  return {
    contentType,
    payload: await response.text(),
  };
}

export function getErrorMessage(
  payload: unknown,
  fallbackMessage: string,
) {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return fallbackMessage;
  }

  const record = payload as Record<string, unknown>;
  const messageCandidates = [
    record.message,
    record.error,
    record.detail,
  ];

  for (const candidate of messageCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  const issues = record.issues;
  if (Array.isArray(issues)) {
    const issueMessages = issues
      .map((issue) => {
        if (!issue || typeof issue !== "object" || Array.isArray(issue)) {
          return null;
        }

        const message = (issue as Record<string, unknown>).message;
        return typeof message === "string" && message.trim() ? message : null;
      })
      .filter((message): message is string => Boolean(message));

    if (issueMessages.length > 0) {
      return issueMessages.join(". ");
    }
  }

  return fallbackMessage;
}

export function getQueueErrorMessage(payload: unknown, status: number) {
  const upstreamMessage = getErrorMessage(payload, "");
  if (upstreamMessage) {
    return upstreamMessage;
  }

  if (status === 422) {
    return "Venice rejected the request with status 422. According to their documentation, this is usually a content violation. Try changing the prompt or using a safer image.";
  }

  if (status === 413) {
    return "The payload is too large. Reduce the image dimensions or file size, then try again.";
  }

  if (status === 402) {
    return "The Venice account does not have enough balance to run this request.";
  }

  return "Venice did not accept the queue request. Try again with a different prompt or image.";
}

export function isImageDataUrl(value: unknown) {
  return (
    typeof value === "string" &&
    value.startsWith("data:image/") &&
    value.includes(";base64,")
  );
}

export function isAllowedVeniceDownloadUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "venice.ai" || url.hostname.endsWith(".venice.ai"))
    );
  } catch {
    return false;
  }
}

function readBooleanHeader(value: string | null) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

export function getVeniceDebugInfo(response: Response): VeniceDebugInfo {
  return {
    requestId: response.headers.get("CF-RAY"),
    contentViolation: readBooleanHeader(
      response.headers.get("x-venice-is-content-violation"),
    ),
    adultModelContentViolation: readBooleanHeader(
      response.headers.get("x-venice-is-adult-model-content-violation"),
    ),
    hostName: response.headers.get("x-venice-host-name"),
  };
}

export function formatVeniceDebugSummary(debug?: VeniceDebugInfo | null) {
  if (!debug) {
    return "";
  }

  const parts: string[] = [];

  if (debug.contentViolation !== null) {
    parts.push(`content_violation=${debug.contentViolation ? "true" : "false"}`);
  }

  if (debug.adultModelContentViolation !== null) {
    parts.push(
      `adult_model_violation=${debug.adultModelContentViolation ? "true" : "false"}`,
    );
  }

  if (debug.requestId) {
    parts.push(`CF-RAY=${debug.requestId}`);
  }

  if (debug.hostName) {
    parts.push(`host=${debug.hostName}`);
  }

  return parts.length > 0 ? ` (${parts.join(", ")})` : "";
}
