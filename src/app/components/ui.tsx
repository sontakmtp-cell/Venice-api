"use client";

import { type ReactNode, useRef, useState } from "react";

/* ── Badge ─────────────────────────────────────────────── */
type BadgeVariant = "default" | "accent" | "success" | "warning" | "danger" | "info";

const BADGE_STYLES: Record<BadgeVariant, string> = {
  default: "bg-white/5 text-[var(--text-secondary)] ring-1 ring-[var(--border)]",
  accent: "bg-[var(--accent-dim)] text-[var(--accent)] ring-1 ring-[var(--accent)]/20",
  success: "bg-[var(--success-dim)] text-[var(--success)] ring-1 ring-[var(--success)]/20",
  warning: "bg-[var(--warning-dim)] text-[var(--warning)] ring-1 ring-[var(--warning)]/20",
  danger: "bg-[var(--danger-dim)] text-[var(--danger)] ring-1 ring-[var(--danger)]/20",
  info: "bg-[var(--info-dim)] text-[var(--info)] ring-1 ring-[var(--info)]/20",
};

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase ${BADGE_STYLES[variant]}`}
    >
      {children}
    </span>
  );
}

/* ── Card ──────────────────────────────────────────────── */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Filter classes: structural layout/animation vs visual padding
  const classes = className.split(" ");
  const structuralClasses = classes
    .filter(
      (c) =>
        c.startsWith("animate-") ||
        c.startsWith("h-") ||
        c.startsWith("w-") ||
        c.startsWith("flex") ||
        c.startsWith("grid") ||
        c.startsWith("col-")
    )
    .join(" ");
  const innerClasses = classes.filter((c) => !structuralClasses.includes(c)).join(" ");

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative p-[1px] rounded-[var(--radius-xl)] transition-all duration-300 group overflow-hidden ${structuralClasses}`}
      style={{
        background: isHovered
          ? `radial-gradient(300px circle at ${coords.x}px ${coords.y}px, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.05))`
          : "rgba(255, 255, 255, 0.06)",
      }}
    >
      <div
        className={`relative rounded-[calc(var(--radius-xl)-1px)] bg-[var(--surface-glass)] backdrop-blur-xl p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_0_0_1px_rgba(255,255,255,0.02),0_8px_32px_rgba(0,0,0,0.36)] overflow-hidden h-full w-full ${innerClasses}`}
      >
        {/* Spotlight hover body highlight */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[calc(var(--radius-xl)-1px)] opacity-0 transition-opacity duration-500"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(350px circle at ${coords.x}px ${coords.y}px, rgba(255, 255, 255, 0.035), transparent 70%)`,
          }}
        />
        <div className="relative z-10 h-full w-full">{children}</div>
      </div>
    </div>
  );
}

/* ── FieldLabel ────────────────────────────────────────── */
export function FieldLabel({
  htmlFor,
  label,
  hint,
}: {
  htmlFor: string;
  label: string;
  hint?: string;
}) {
  return (
    <label className="block space-y-1" htmlFor={htmlFor}>
      <span className="block text-[13px] font-medium text-[var(--text-primary)]">
        {label}
      </span>
      {hint ? (
        <span className="block text-[12px] leading-relaxed text-[var(--text-muted)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

/* ── Buttons ───────────────────────────────────────────── */
export function PrimaryButton({
  children,
  disabled,
  type = "button",
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-transparent px-4 py-2.5 text-[13px] font-medium text-[var(--text-secondary)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-[13px] font-medium text-[var(--text-muted)] transition-all hover:bg-white/5 hover:text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

/* ── Stat Card ─────────────────────────────────────────── */
export function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative p-[1px] rounded-[var(--radius-lg)] transition-all duration-300 group overflow-hidden"
      style={{
        background: isHovered
          ? `radial-gradient(200px circle at ${coords.x}px ${coords.y}px, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.04))`
          : "rgba(255, 255, 255, 0.05)",
      }}
    >
      <div
        className="relative rounded-[calc(var(--radius-lg)-1px)] bg-[var(--surface-elevated-glass)] backdrop-blur-md p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_0_0_1px_rgba(255,255,255,0.01),0_4px_20px_rgba(0,0,0,0.25)] overflow-hidden"
      >
        {/* Spotlight hover body highlight */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[calc(var(--radius-lg)-1px)] opacity-0 transition-opacity duration-500"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(250px circle at ${coords.x}px ${coords.y}px, rgba(255, 255, 255, 0.025), transparent 70%)`,
          }}
        />
        <div className="relative z-10">
          <p className="text-[11px] font-medium tracking-wide text-[var(--text-muted)] uppercase">
            {label}
          </p>
          <p className="mt-1.5 text-[14px] font-semibold text-[var(--text-primary)] break-all">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Alert ─────────────────────────────────────────────── */
export function Alert({
  children,
  variant = "info",
}: {
  children: ReactNode;
  variant?: "info" | "error";
}) {
  const styles =
    variant === "error"
      ? "border-[var(--danger)]/15 bg-[var(--danger-dim)] text-[var(--danger)]"
      : "border-[var(--accent)]/15 bg-[var(--accent-dim)] text-[var(--accent)]";

  return (
    <div
      className={`animate-fade-in rounded-[var(--radius-md)] border px-4 py-3 text-[13px] leading-relaxed ${styles}`}
    >
      {children}
    </div>
  );
}

/* ── Section Header ────────────────────────────────────── */
export function SectionHeader({
  overline,
  title,
  description,
}: {
  overline?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1.5">
      {overline ? (
        <p className="text-[11px] font-medium tracking-widest text-[var(--text-muted)] uppercase">
          {overline}
        </p>
      ) : null}
      <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
        {title}
      </h2>
      {description ? (
        <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

/* ── Spinner Icon ──────────────────────────────────────── */
export function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin-slow"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-80"
        d="M4 12a8 8 0 018-8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  );
}
