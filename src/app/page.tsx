"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ASPECT_RATIO_OPTIONS, DURATION_OPTIONS, RESOLUTION_OPTIONS, VENICE_MODEL_SUPPORTS_ASPECT_RATIO, VENICE_VIDEO_MODEL, type AspectRatioOption, type DurationOption, type ResolutionOption, type VeniceDebugInfo, formatVeniceDebugSummary } from "@/lib/venice";
import { Alert, Badge, Card, FieldLabel, GhostButton, PrimaryButton, SecondaryButton, SectionHeader, Spinner, StatCard } from "./components/ui";

type JobStatus = "queued" | "processing" | "completed" | "failed";
type FormState = { prompt: string; negativePrompt: string; duration: DurationOption; resolution: ResolutionOption; aspectRatio: AspectRatioOption; imageDataUrl: string; imageName: string };
type VideoJob = { model: string; queueId: string; downloadUrl: string | null; prompt: string; negativePrompt: string; duration: DurationOption; resolution: ResolutionOption; aspectRatio: AspectRatioOption; imageDataUrl: string; imageName: string; status: JobStatus; queuedAt: string; updatedAt: string; averageExecutionTime?: number; executionDuration?: number; error?: string };
type ServerHistoryItem = { model: string; queueId: string; downloadUrl: string | null; createdAt: string };

function buildErrorWithDebug(message: string, debug?: VeniceDebugInfo | null) { return `${message}${formatVeniceDebugSummary(debug)}`; }

const STORAGE_KEY = "venice-video-mvp.current-job";
const STORE_EVENT = "venice-video-mvp:job-change";
const INITIAL_FORM: FormState = { prompt: "slow cinematic push-in, natural blinking, soft wind in hair, realistic motion", negativePrompt: "blurry, distorted face, flicker, jitter, warped hands, low quality, oversaturated", duration: "5s", resolution: "720p", aspectRatio: "9:16", imageDataUrl: "", imageName: "" };

const STATUS_MAP: Record<JobStatus, { label: string; hint: string; variant: "info" | "accent" | "success" | "warning" | "danger" }> = {
  queued: { label: "Queued", hint: "Your request has been submitted. The app checks again every 5 seconds.", variant: "warning" },
  processing: { label: "Processing", hint: "Venice is rendering the video. You can leave this tab open while it runs.", variant: "info" },
  completed: { label: "Completed", hint: "Your video is ready to download.", variant: "success" },
  failed: { label: "Failed", hint: "The request did not complete. See the error below.", variant: "danger" },
};

function formatDT(v?: string) { if (!v) return "--"; return new Intl.DateTimeFormat("en-US", { dateStyle: "short", timeStyle: "medium" }).format(new Date(v)); }
function formatMs(v?: number) { if (!v || Number.isNaN(v)) return "--"; return `${Math.max(1, Math.round(v / 1000))}s`; }
function estRemaining(job: VideoJob | null) { if (!job?.averageExecutionTime || !job.executionDuration) return "--"; const r = job.averageExecutionTime - job.executionDuration; return r <= 0 ? "< 1s" : formatMs(r); }
function dlHref(url: string, qid: string, v?: string) { const p = new URLSearchParams({ url, queueId: qid }); if (v) p.set("v", v); return `/api/video/download?${p.toString()}`; }

function parseJob(raw: string | null): VideoJob | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<VideoJob>;
    if (!p.queueId || !p.model) return null;
    return { model: p.model, queueId: p.queueId, downloadUrl: p.downloadUrl ?? null, prompt: p.prompt ?? "", negativePrompt: p.negativePrompt ?? "", duration: p.duration ?? "5s", resolution: p.resolution ?? "720p", aspectRatio: p.aspectRatio ?? "9:16", imageDataUrl: typeof p.imageDataUrl === "string" ? p.imageDataUrl : "", imageName: p.imageName ?? "", status: p.status ?? "queued", queuedAt: p.queuedAt ?? new Date(0).toISOString(), updatedAt: p.updatedAt ?? p.queuedAt ?? new Date(0).toISOString(), averageExecutionTime: p.averageExecutionTime, executionDuration: p.executionDuration, error: p.error };
  } catch { return null; }
}

function writeJob(j: VideoJob | null) {
  if (typeof window === "undefined") return;
  if (j) { const s = { ...j, prompt: "", negativePrompt: "", imageDataUrl: "", imageName: "" }; try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { window.localStorage.removeItem(STORAGE_KEY); } } else { window.localStorage.removeItem(STORAGE_KEY); }
  window.dispatchEvent(new Event(STORE_EVENT));
}

function getJob() { return parseJob(typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY)); }
function subJob(cb: () => void) { if (typeof window === "undefined") return () => {}; const h = () => cb(); window.addEventListener(STORE_EVENT, h); window.addEventListener("storage", h); return () => { window.removeEventListener(STORE_EVENT, h); window.removeEventListener("storage", h); }; }
function snapJob() { if (typeof window === "undefined") return ""; return window.localStorage.getItem(STORAGE_KEY) ?? ""; }
function toStatus(s: string | undefined): JobStatus { if (s === "COMPLETED") return "completed"; if (s === "FAILED") return "failed"; return "processing"; }

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => { if (typeof r.result === "string") resolve(r.result); else reject(new Error("Could not read the image.")); };
    r.onerror = () => reject(new Error("Could not read the image file."));
    r.readAsDataURL(file);
  });
}

/* ── Tabs ── */
function TabBar({ active, onChange }: { active: string; onChange: (t: string) => void }) {
  const tabs = [
    { id: "create", label: "Create Video" },
    { id: "status", label: "Status" },
    { id: "history", label: "History" },
  ];
  return (
    <div className="flex gap-1 rounded-[var(--radius-lg)] bg-[var(--surface)] p-1">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} type="button"
          className={`flex-1 rounded-[var(--radius-md)] px-4 py-2 text-[13px] font-medium transition-all ${active === t.id ? "bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [tab, setTab] = useState("create");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [history, setHistory] = useState<ServerHistoryItem[]>([]);
  const polling = useRef(false);
  const snap = useSyncExternalStore(subJob, snapJob, () => "");
  const job = useMemo(() => parseJob(snap || null), [snap]);

  async function refreshHistory() { try { const r = await fetch("/api/video/history", { cache: "no-store" }); const d = (await r.json()) as { items?: ServerHistoryItem[] }; if (r.ok) setHistory(Array.isArray(d.items) ? d.items : []); } catch {} }

  const statusMeta = job ? STATUS_MAP[job.status] : null;
  const downloadLink = useMemo(() => { if (!job?.downloadUrl) return null; return dlHref(job.downloadUrl, job.queueId, job.updatedAt ?? job.queuedAt); }, [job?.downloadUrl, job?.queueId, job?.queuedAt, job?.updatedAt]);

  useEffect(() => { const t = setTimeout(() => void refreshHistory(), 0); return () => clearTimeout(t); }, []);
  useEffect(() => { if (!job || (job.status !== "queued" && job.status !== "processing")) return; const t = setInterval(() => void pollStatus(job, true), 5000); return () => clearInterval(t); }, [job]);

  async function pollStatus(cur: VideoJob, silent = false) {
    if (polling.current) return;
    polling.current = true;
    if (!silent) setChecking(true);
    try {
      setError(null);
      const r = await fetch("/api/video/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: cur.model, queueId: cur.queueId }) });
      const d = (await r.json()) as { error?: string; status?: string; averageExecutionTime?: number; executionDuration?: number; debug?: VeniceDebugInfo };
      if (!r.ok) throw new Error(buildErrorWithDebug(d.error ?? "Could not fetch the job status.", d.debug));
      startTransition(() => {
        const prev = getJob(); if (!prev || prev.queueId !== cur.queueId) return;
        const ns = toStatus(d.status);
        writeJob({ ...prev, status: ns, averageExecutionTime: d.averageExecutionTime, executionDuration: d.executionDuration, updatedAt: new Date().toISOString(), error: ns === "failed" ? "Venice reported that the job did not complete." : undefined });
      });
      if (!silent) setNotice(d.status === "COMPLETED" ? "The video has finished rendering." : "Status updated.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error while checking the job.";
      setError(msg);
      startTransition(() => { const prev = getJob(); if (!prev || prev.queueId !== cur.queueId) return; writeJob({ ...prev, status: "failed", updatedAt: new Date().toISOString(), error: msg }); });
    } finally { polling.current = false; if (!silent) setChecking(false); }
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    try { const url = await fileToDataUrl(f); setForm((c) => ({ ...c, imageDataUrl: url, imageName: f.name })); setNotice(`Loaded image "${f.name}"`); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not read the image."); }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setNotice(null);
    if (!form.imageDataUrl) { setError("Upload an image before creating a video."); return; }
    setSubmitting(true); setError(null);
    try {
      const r = await fetch("/api/video/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: form.prompt, negativePrompt: form.negativePrompt, imageDataUrl: form.imageDataUrl, duration: form.duration, resolution: form.resolution, aspectRatio: form.aspectRatio }) });
      const d = (await r.json()) as { error?: string; model?: string; queueId?: string; downloadUrl?: string | null; debug?: VeniceDebugInfo };
      if (!r.ok || !d.queueId || !d.model) throw new Error(buildErrorWithDebug(d.error ?? "Could not submit the video job.", d.debug));
      const now = new Date().toISOString();
      startTransition(() => { writeJob({ model: d.model!, queueId: d.queueId!, downloadUrl: d.downloadUrl ?? null, prompt: form.prompt, negativePrompt: form.negativePrompt, duration: form.duration, resolution: form.resolution, aspectRatio: form.aspectRatio, imageDataUrl: form.imageDataUrl, imageName: form.imageName, status: "queued", queuedAt: now, updatedAt: now }); });
      void refreshHistory();
      setNotice("Video job created successfully."); setTab("status");
    } catch (err) { setError(err instanceof Error ? err.message : "Error while creating the video."); }
    finally { setSubmitting(false); }
  }

  async function copyText(text: string, label: string) { try { await navigator.clipboard.writeText(text); setNotice(`Copied ${label}.`); } catch { setNotice(`Could not copy ${label}.`); } }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-dim)]">
              <svg className="h-4 w-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </div>
            <h1 className="text-[15px] font-semibold text-[var(--text-primary)]">Venice Video</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="accent">{VENICE_VIDEO_MODEL}</Badge>
            <Link
              className="inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-[13px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
              href="/image-edit"
            >
              Image Edit
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-6">
        {/* Notifications */}
        <div className="mb-5 space-y-2">
          {error && <Alert variant="error">{error}</Alert>}
          {notice && <Alert variant="info">{notice}</Alert>}
        </div>

        {/* Tabs */}
        <div className="mb-6"><TabBar active={tab} onChange={setTab} /></div>

        {/* ── TAB: Create ── */}
        {tab === "create" && (
          <div className="animate-fade-in grid gap-6 lg:grid-cols-[1fr_320px]">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <Card>
                <SectionHeader title="Reference Image" description="JPG, PNG, or WebP. Use a clear face, around 1024-1536px." />
                <label className="mt-4 flex cursor-pointer items-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface-elevated)] p-4 transition hover:border-[var(--accent)]/30" htmlFor="image">
                  <input id="image" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={handleImage} type="file" />
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-dim)]">
                    <svg className="h-5 w-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{form.imageName || "Choose an image to animate"}</p>
                    <p className="text-[12px] text-[var(--text-muted)]">Drag and drop, or click to browse</p>
                  </div>
                </label>
              </Card>

              <Card>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <FieldLabel htmlFor="prompt" label="Motion Prompt" hint="Camera, subject, and environment." />
                    <textarea id="prompt" className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)] px-3.5 py-3 text-[13px] leading-relaxed text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/40 resize-none" rows={3} onChange={(e) => setForm((c) => ({ ...c, prompt: e.target.value }))} placeholder="slow camera push-in, natural blinking..." value={form.prompt} />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="neg" label="Negative Prompt" hint="Artifacts to avoid." />
                    <textarea id="neg" className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)] px-3.5 py-3 text-[13px] leading-relaxed text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/40 resize-none" rows={2} onChange={(e) => setForm((c) => ({ ...c, negativePrompt: e.target.value }))} placeholder="blurry, flicker, distorted face..." value={form.negativePrompt} />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <FieldLabel htmlFor="dur" label="Duration" />
                    <select id="dur" className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]/40" onChange={(e) => setForm((c) => ({ ...c, duration: e.target.value as DurationOption }))} value={form.duration}>
                      {DURATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="res" label="Resolution" />
                    <select id="res" className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]/40" onChange={(e) => setForm((c) => ({ ...c, resolution: e.target.value as ResolutionOption }))} value={form.resolution}>
                      {RESOLUTION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="ar" label="Aspect Ratio" hint={VENICE_MODEL_SUPPORTS_ASPECT_RATIO ? undefined : "This model does not support aspect ratio controls."} />
                    <select id="ar" className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]/40 disabled:opacity-40" disabled={!VENICE_MODEL_SUPPORTS_ASPECT_RATIO} onChange={(e) => setForm((c) => ({ ...c, aspectRatio: e.target.value as AspectRatioOption }))} value={form.aspectRatio}>
                      {ASPECT_RATIO_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              </Card>

              <div className="flex gap-3">
                <PrimaryButton type="submit" disabled={submitting}>{submitting ? <><Spinner /> Creating...</> : "Create Video"}</PrimaryButton>
                <SecondaryButton disabled={!job} onClick={() => { writeJob(null); setNotice("Job cleared."); setError(null); }}>Clear Job</SecondaryButton>
              </div>
            </form>

            {/* Preview sidebar */}
            <div className="space-y-4">
              <Card className="!p-3">
                <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-elevated)]">
                  {(job?.imageDataUrl || form.imageDataUrl) ? (
                    <Image alt="Preview" className="h-full w-full object-cover" fill sizes="320px" src={job?.imageDataUrl || form.imageDataUrl} unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center p-6 text-center text-[12px] text-[var(--text-muted)]">Image preview will appear here</div>
                  )}
                </div>
              </Card>
              {statusMeta && (
                <Card className="animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[var(--text-muted)]">Status</span>
                    <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-[var(--text-muted)]">{statusMeta.hint}</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: Status ── */}
        {tab === "status" && (
          <div className="animate-fade-in space-y-5">
            <Card>
              <div className="flex items-center justify-between">
                <SectionHeader title="Render Status" description={job ? `Queue ID: ${job.queueId}` : "No job yet."} />
                {statusMeta ? <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge> : <Badge>None</Badge>}
              </div>
              {statusMeta && <p className="mt-3 text-[13px] text-[var(--text-muted)]">{statusMeta.hint}</p>}
            </Card>

            {job && (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard label="Queue ID" value={job.queueId ?? "--"} />
                  <StatCard label="Created At" value={formatDT(job.queuedAt)} />
                  <StatCard label="Estimated Time Left" value={estRemaining(job)} />
                  <StatCard label="Updated At" value={formatDT(job.updatedAt)} />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatCard label="Average Time" value={formatMs(job.averageExecutionTime)} />
                  <StatCard label="Elapsed" value={formatMs(job.executionDuration)} />
                  <StatCard label="Download Link" value={job.downloadUrl ? "Saved" : "--"} />
                </div>
              </>
            )}

            <div className="flex flex-wrap gap-3">
              <SecondaryButton disabled={!job || checking} onClick={() => { if (job) void pollStatus(job); }}>{checking ? <><Spinner /> Checking...</> : "Check Status"}</SecondaryButton>
              <GhostButton disabled={!job} onClick={() => { if (job?.queueId) void copyText(job.queueId, "queue_id"); }}>Copy queue_id</GhostButton>
              <PrimaryButton disabled={!downloadLink || job?.status !== "completed"} onClick={() => { if (downloadLink) window.location.assign(downloadLink); }}>Download Video</PrimaryButton>
            </div>
          </div>
        )}

        {/* ── TAB: History ── */}
        {tab === "history" && (
          <div className="animate-fade-in space-y-4">
            <SectionHeader title="Video List" description="Updates automatically when Venice returns a download_url." />
            {history.length > 0 ? history.map((item) => (
              <Card key={item.queueId}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">{item.queueId}</p>
                    <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{formatDT(item.createdAt)}</p>
                    {item.downloadUrl && <p className="mt-2 text-[12px] text-[var(--text-muted)] break-all truncate">{item.downloadUrl}</p>}
                  </div>
                  {item.downloadUrl && (
                    <div className="flex gap-2">
                      <SecondaryButton onClick={() => void copyText(item.downloadUrl!, "link")}>Copy</SecondaryButton>
                      <a className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-110" href={dlHref(item.downloadUrl, item.queueId, item.createdAt)}>Download</a>
                    </div>
                  )}
                </div>
              </Card>
            )) : (
              <Card><p className="text-[13px] text-[var(--text-muted)]">No videos in history yet.</p></Card>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
