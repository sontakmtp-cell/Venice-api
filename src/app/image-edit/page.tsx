"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import {
  VENICE_IMAGE_EDIT_MODEL,
  type ImageOutputFormatOption,
  type VeniceDebugInfo,
  formatVeniceDebugSummary,
} from "@/lib/venice";
import {
  Alert,
  Badge,
  Card,
  FieldLabel,
  GhostButton,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  Spinner,
} from "../components/ui";

const DEFAULT_EDIT_PROMPT =
  "Improve image quality, preserve the same person, face, pose, outfit, lighting, and composition.";

function buildErrorWithDebug(message: string, debug?: VeniceDebugInfo | null) {
  return `${message}${formatVeniceDebugSummary(debug)}`;
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read the image."));
      }
    };
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.readAsDataURL(file);
  });
}

function buildEditedFileName(originalName: string, outputFormat: string) {
  const fallback = "image";
  const name = originalName.trim() || fallback;
  const withoutExtension = name.replace(/\.[^.]+$/, "") || fallback;
  return `edited-${withoutExtension}.${outputFormat}`;
}

export default function ImageEditPage() {
  const [originalImageDataUrl, setOriginalImageDataUrl] = useState("");
  const [originalImageName, setOriginalImageName] = useState("");
  const [editPrompt, setEditPrompt] = useState(DEFAULT_EDIT_PROMPT);
  const [editedImageDataUrl, setEditedImageDataUrl] = useState("");
  const [outputFormat, setOutputFormat] =
    useState<ImageOutputFormatOption>("png");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setOriginalImageDataUrl(dataUrl);
      setOriginalImageName(file.name);
      setEditedImageDataUrl("");
      setNotice(`Loaded image "${file.name}"`);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the image.");
    }
  }

  async function handleEditImage() {
    setNotice(null);

    if (!originalImageDataUrl) {
      setError("Upload an image before editing.");
      return;
    }

    if (!editPrompt.trim()) {
      setError("Image edit prompt cannot be empty.");
      return;
    }

    setEditing(true);
    setError(null);

    try {
      const response = await fetch("/api/image/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: editPrompt,
          imageDataUrl: originalImageDataUrl,
          outputFormat,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        imageDataUrl?: string;
        debug?: VeniceDebugInfo;
      };

      if (!response.ok || !data.imageDataUrl) {
        throw new Error(
          buildErrorWithDebug(
            data.error ?? "Could not edit the image.",
            data.debug,
          ),
        );
      }

      setEditedImageDataUrl(data.imageDataUrl);
      setNotice("Image edited successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error while editing image.");
    } finally {
      setEditing(false);
    }
  }

  function downloadEditedImage() {
    if (!editedImageDataUrl) {
      return;
    }

    const link = document.createElement("a");
    link.href = editedImageDataUrl;
    link.download = buildEditedFileName(originalImageName, outputFormat);
    link.click();
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-dim)]">
              <svg
                className="h-4 w-4 text-[var(--accent)]"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                viewBox="0 0 24 24"
              >
                <path
                  d="M4 16.5V19a1 1 0 0 0 1 1h2.5L18.2 9.3a2.12 2.12 0 0 0-3-3L4.5 17Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="m13.5 8 2.5 2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-[var(--text-primary)]">
                Venice Image Edit
              </h1>
              <p className="text-[12px] text-[var(--text-muted)]">
                Edit images separately from video generation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="accent">{VENICE_IMAGE_EDIT_MODEL}</Badge>
            <Link
              className="inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-[13px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
              href="/"
            >
              Create Video
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-6">
        <div className="mb-5 space-y-2">
          {error && <Alert variant="error">{error}</Alert>}
          {notice && <Alert variant="info">{notice}</Alert>}
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-5">
            <Card>
              <SectionHeader
                title="Source Image"
                description="Upload a JPG, PNG, or WebP image smaller than 25MB."
              />
              <label
                className="mt-4 flex cursor-pointer items-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface-elevated)] p-4 transition hover:border-[var(--accent)]/30"
                htmlFor="source-image"
              >
                <input
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  id="source-image"
                  onChange={handleImage}
                  type="file"
                />
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-dim)]">
                  <svg
                    className="h-5 w-5 text-[var(--accent)]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                    {originalImageName || "Choose an image to edit"}
                  </p>
                  <p className="text-[12px] text-[var(--text-muted)]">
                    Click to browse
                  </p>
                </div>
              </label>
            </Card>

            <Card>
              <div className="space-y-4">
                <div className="space-y-2">
                  <FieldLabel
                    htmlFor="edit-prompt"
                    hint="Use short, direct edit instructions."
                    label="Edit Prompt"
                  />
                  <textarea
                    className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)] px-3.5 py-3 text-[13px] leading-relaxed text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/40"
                    id="edit-prompt"
                    onChange={(event) => setEditPrompt(event.target.value)}
                    placeholder="Remove background, improve quality, change sky to sunrise..."
                    rows={5}
                    value={editPrompt}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="output-format" label="Output Format" />
                  <select
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]/40"
                    id="output-format"
                    onChange={(event) =>
                      setOutputFormat(event.target.value as ImageOutputFormatOption)
                    }
                    value={outputFormat}
                  >
                    <option value="png">PNG</option>
                    <option value="jpeg">JPEG</option>
                    <option value="webp">WebP</option>
                  </select>
                </div>
              </div>
            </Card>

            <div className="flex flex-wrap gap-3">
              <PrimaryButton
                disabled={editing || !originalImageDataUrl}
                onClick={() => void handleEditImage()}
              >
                {editing ? (
                  <>
                    <Spinner /> Editing...
                  </>
                ) : (
                  "Edit Image"
                )}
              </PrimaryButton>
              <SecondaryButton
                disabled={!editedImageDataUrl}
                onClick={downloadEditedImage}
              >
                Download Edited Image
              </SecondaryButton>
              <GhostButton
                disabled={!originalImageDataUrl && !editedImageDataUrl}
                onClick={() => {
                  setOriginalImageDataUrl("");
                  setOriginalImageName("");
                  setEditedImageDataUrl("");
                  setNotice("Images cleared.");
                  setError(null);
                }}
              >
                Clear
              </GhostButton>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Card className="!p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                  Original Image
                </span>
                {originalImageDataUrl && <Badge>Source</Badge>}
              </div>
              <div className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-elevated)]">
                {originalImageDataUrl ? (
                  <Image
                    alt="Original preview"
                    className="h-full w-full object-contain"
                    fill
                    sizes="(max-width: 768px) 100vw, 380px"
                    src={originalImageDataUrl}
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-6 text-center text-[12px] text-[var(--text-muted)]">
                    Original image preview will appear here
                  </div>
                )}
              </div>
            </Card>

            <Card className="!p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                  Edited Image
                </span>
                {editedImageDataUrl && <Badge variant="success">Ready</Badge>}
              </div>
              <div className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-elevated)]">
                {editedImageDataUrl ? (
                  <Image
                    alt="Edited preview"
                    className="h-full w-full object-contain"
                    fill
                    sizes="(max-width: 768px) 100vw, 380px"
                    src={editedImageDataUrl}
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-6 text-center text-[12px] text-[var(--text-muted)]">
                    Edited image preview will appear here
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
