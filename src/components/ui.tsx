"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, Search, X } from "lucide-react";
import { ApiError } from "@/lib/api";

/** A scrolling page with a title row. */
export function Page({ title, subtitle, actions, children, wide }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-10">
      <div className={`mx-auto ${wide ? "max-w-7xl" : "max-w-5xl"}`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-3xl text-brand-950">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        <div className="mt-6 space-y-6">{children}</div>
      </div>
    </div>
  );
}

export function Card({ title, actions, children, className = "", pad = true }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`rounded-[1.5rem] bg-white ring-1 ring-brand-900/10 ${pad ? "p-5" : "overflow-hidden"} ${className}`}>
      {(title || actions) && (
        <div className={`flex flex-wrap items-center justify-between gap-2 ${pad ? "mb-4" : "px-5 pb-3 pt-5"}`}>
          {title && <h2 className="font-display text-xl text-brand-950">{title}</h2>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "warn" | "good" }) {
  return (
    <div className="rounded-[1.25rem] bg-white p-4 ring-1 ring-brand-900/10">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className={`mt-1 font-display text-2xl ${tone === "warn" ? "text-gold-500" : tone === "good" ? "text-emerald-700" : "text-brand-950"}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const TONES = {
  green: "bg-emerald-50 text-emerald-800",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-800",
  blue: "bg-sky-50 text-sky-800",
  grey: "bg-brand-900/5 text-brand-900/70",
  brand: "bg-brand-950 text-white",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "grey", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}

const STATUS_TONES: Record<string, Tone> = {
  confirmed: "green",
  successful: "green",
  published: "green",
  active: "green",
  open: "amber",
  pending: "amber",
  initiated: "grey",
  draft: "grey",
  expired: "grey",
  closed: "grey",
  cancelled: "red",
  failed: "red",
  inactive: "red",
};
export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONES[status] ?? "grey"}>{status.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())}</Badge>;
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "outline"; busy?: boolean; size?: "sm" | "md" };
export function Button({ variant = "primary", busy, size = "md", className = "", children, disabled, ...rest }: ButtonProps) {
  const look = {
    primary: "bg-brand-950 text-white hover:bg-brand-800",
    outline: "text-brand-900 ring-1 ring-brand-900/15 hover:ring-brand-900/40 bg-white",
    ghost: "text-muted hover:text-brand-900 hover:bg-cream",
    danger: "text-red-700 ring-1 ring-red-200 hover:bg-red-50 bg-white",
  }[variant];
  const height = size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm";
  return (
    <button {...rest} disabled={disabled || busy} className={`inline-flex items-center justify-center gap-1.5 rounded-full font-semibold disabled:opacity-50 ${height} ${look} ${className}`}>
      {busy && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function LinkButton({ href, children, variant = "primary" }: { href: string; children: React.ReactNode; variant?: "primary" | "outline" }) {
  const look = variant === "primary" ? "bg-brand-950 text-white hover:bg-brand-800" : "bg-white text-brand-900 ring-1 ring-brand-900/15 hover:ring-brand-900/40";
  return (
    <Link href={href} className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold ${look}`}>
      {children}
    </Link>
  );
}

export const inputClass = "w-full rounded-xl border border-brand-900/15 bg-white px-3 py-2 text-sm outline-none focus:border-gold-500";

export function Field({ label, error, hint, children, className = "" }: { label: string; error?: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-xs font-semibold uppercase tracking-[0.12em] text-brand-900 ${className}`}>
      {label}
      <div className="mt-1 text-sm font-normal normal-case tracking-normal">{children}</div>
      {hint && !error && <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-red-700">{error}</span>}
    </label>
  );
}

export function Check({ label, checked, onChange, disabled }: { label: React.ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-center gap-2 text-sm ${disabled ? "opacity-50" : ""}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-brand-950" /> {label}
    </label>
  );
}

/** Search box that reports its value after the user stops typing. */
export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [text, setText] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => text !== value && onChange(text), 300);
    return () => clearTimeout(t);
  }, [text, value, onChange]);
  return (
    <label className="flex min-w-56 flex-1 items-center gap-2 rounded-xl border border-brand-900/15 bg-white px-3">
      <Search className="size-4 text-muted" />
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-10 flex-1 bg-transparent text-sm outline-none" />
    </label>
  );
}

export function Select<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: readonly (readonly [T, string])[]; label: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} aria-label={label} className="h-10 rounded-xl border border-brand-900/15 bg-white px-3 text-sm outline-none focus:border-gold-500">
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: readonly (readonly [T, React.ReactNode])[] }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full bg-white p-1 text-sm ring-1 ring-brand-900/10" role="tablist">
      {options.map(([v, label]) => (
        <button
          key={v}
          role="tab"
          aria-selected={value === v}
          onClick={() => onChange(v)}
          className={`rounded-full px-3 py-1.5 font-medium ${value === v ? "bg-brand-950 text-white" : "text-muted hover:text-brand-900"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function Loading() {
  return <Loader2 className="m-4 size-5 animate-spin text-brand-900" aria-label="Loading" />;
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : "Something went wrong.";
  const fields = error instanceof ApiError ? Object.entries(error.fields) : [];
  return (
    <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
      {(!fields.length || !(error instanceof ApiError && error.message === "Something went wrong. Please try again.")) && <p>{message}</p>}
      {fields.map(([k, v]) => (
        <p key={k}>
          <span className="font-medium">{k.replace(/_/g, " ")}:</span> {v}
        </p>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="p-8 text-center text-sm text-muted">{children}</p>;
}

/** A table that scrolls sideways on small screens. */
export function Table({ head, children }: { head: React.ReactNode[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-brand-900/10 text-xs uppercase tracking-[0.1em] text-muted">
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-900/5">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}

export function Pager({ page, count, size, onPage }: { page: number; count: number; size: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(count / size));
  if (pages <= 1) return <p className="px-4 py-3 text-xs text-muted">{count} total</p>;
  return (
    <div className="flex items-center justify-between gap-2 border-t border-brand-900/10 px-4 py-3 text-sm">
      <span className="text-xs text-muted">
        {count} total · page {page} of {pages}
      </span>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/** A panel that slides in from the right, for details and edit forms. */
export function Drawer({ title, onClose, children, footer }: { title: React.ReactNode; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-brand-950/30" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="flex h-full w-full max-w-xl flex-col bg-mist shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center gap-3 border-b border-brand-900/10 bg-white px-5 py-4">
          <h2 className="min-w-0 flex-1 truncate font-display text-xl text-brand-950">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-cream hover:text-brand-900">
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="flex flex-wrap items-center gap-2 border-t border-brand-900/10 bg-white px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

/** Label/value pairs. */
export function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-2 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="min-w-0 break-words text-brand-950">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A short-lived note after an action, e.g. "Email sent". */
export function useFlash() {
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(""), 4000);
    return () => clearTimeout(t);
  }, [note]);
  const view = note ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{note}</p> : null;
  return [view, setNote] as const;
}

export const ROLE_LABEL: Record<string, string> = { guest: "Guest", owner: "Hotel owner", organiser: "Organiser", admin: "Staff" };
export function RoleBadge({ role, superuser }: { role: string; superuser?: boolean }) {
  const tone: Tone = role === "admin" ? "brand" : role === "owner" ? "blue" : role === "organiser" ? "amber" : "grey";
  return <Badge tone={tone}>{role === "admin" && superuser ? "Super admin" : ROLE_LABEL[role] ?? role}</Badge>;
}
