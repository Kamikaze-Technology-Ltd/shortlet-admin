"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Loader2, RotateCcw, Search, Send, UserRound } from "lucide-react";
import { adminApi, supportApi, when, type InboxItem, type Thread } from "@/lib/api";

/** Chats from the help bot: a list on the left, the selected conversation on the right. Both refresh on their own. */
export default function Inbox() {
  const [status, setStatus] = useState<"open" | "closed" | "">("open");
  const [search, setSearch] = useState("");
  const [assigned, setAssigned] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["inbox", status, search, assigned],
    queryFn: () => supportApi.inbox({ status, search, assigned }),
    refetchInterval: 10_000,
  });

  return (
    <div className="flex h-full">
      <section className={`flex w-full flex-col border-r border-brand-900/10 bg-white md:w-96 md:shrink-0 ${selected ? "hidden md:flex" : "flex"}`}>
        <div className="space-y-3 border-b border-brand-900/10 p-4">
          <h1 className="font-display text-3xl text-brand-950">Support inbox</h1>
          <div className="flex gap-1 rounded-full bg-cream p-1 text-sm" role="tablist">
            {(
              [
                ["open", "Open"],
                ["closed", "Closed"],
                ["", "All"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={label}
                role="tab"
                aria-selected={status === value}
                onClick={() => setStatus(value)}
                className={`flex-1 rounded-full py-1.5 font-medium ${status === value ? "bg-brand-950 text-white" : "text-muted hover:text-brand-900"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <select
            value={assigned}
            onChange={(e) => setAssigned(e.target.value)}
            aria-label="Assigned to"
            className="h-10 w-full rounded-xl border border-brand-900/15 bg-white px-3 text-sm outline-none focus:border-gold-500"
          >
            <option value="">Everyone&apos;s chats</option>
            <option value="me">Assigned to me</option>
            <option value="none">Unassigned</option>
          </select>
          <label className="flex items-center gap-2 rounded-xl border border-brand-900/15 px-3">
            <Search className="size-4 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, reference or topic"
              aria-label="Search chats"
              className="h-10 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {list.isPending && <Loader2 className="m-4 size-5 animate-spin text-brand-900" aria-label="Loading" />}
          {list.error && <p className="p-4 text-sm text-red-700">{list.error.message}</p>}
          {list.data && !list.data.results.length && <p className="p-6 text-center text-sm text-muted">No chats here.</p>}
          {list.data?.results.map((c) => (
            <li key={c.reference}>
              <Row c={c} active={selected === c.reference} onClick={() => setSelected(c.reference)} />
            </li>
          ))}
        </ul>
      </section>
      <section className={`min-w-0 flex-1 flex-col ${selected ? "flex" : "hidden md:flex"}`}>
        {selected ? (
          <Conversation reference={selected} onBack={() => setSelected(null)} />
        ) : (
          <div className="grid flex-1 place-items-center text-sm text-muted">Pick a chat to read and reply.</div>
        )}
      </section>
    </div>
  );
}

function Row({ c, active, onClick }: { c: InboxItem; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full border-b border-brand-900/5 px-4 py-3 text-left ${active ? "bg-cream" : "hover:bg-mist"}`}>
      <div className="flex items-center gap-2">
        <span className={`truncate font-semibold ${c.needs_reply ? "text-brand-950" : "text-brand-900/80"}`}>{c.name}</span>
        {c.needs_reply && <span className="size-2 shrink-0 rounded-full bg-gold-400" aria-label="Waiting for a reply" />}
        <span className="ml-auto shrink-0 text-xs text-muted">{when(c.last_message_at)}</span>
      </div>
      <p className="truncate text-xs text-gold-600">{c.topic || "General question"}</p>
      <p className="mt-0.5 truncate text-sm text-muted">
        {c.last_message?.sender === "agent" && "You: "}
        {c.last_message?.body}
      </p>
    </button>
  );
}

function Conversation({ reference, onBack }: { reference: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const thread = useQuery({ queryKey: ["thread", reference], queryFn: () => supportApi.thread(reference), refetchInterval: 5_000 });
  const update = (t: Thread) => {
    queryClient.setQueryData(["thread", reference], t);
    queryClient.invalidateQueries({ queryKey: ["inbox"] });
    queryClient.invalidateQueries({ queryKey: ["summary"] });
  };
  const reply = useMutation({
    mutationFn: () => supportApi.reply(reference, body.trim()),
    onSuccess: (t) => {
      update(t);
      setBody("");
    },
  });
  const close = useMutation({ mutationFn: () => supportApi.close(reference), onSuccess: update });
  const assign = useMutation({ mutationFn: (user: number | null) => supportApi.assign(reference, user), onSuccess: update });
  const team = useQuery({
    queryKey: ["users", { role: "admin", is_active: "true", page_size: 100 }],
    queryFn: () => adminApi.users({ role: "admin", is_active: "true", page_size: 100 }),
    staleTime: 60_000,
  });
  const reopen = useMutation({ mutationFn: () => supportApi.reopen(reference), onSuccess: update });
  const count = thread.data?.messages.length ?? 0;
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [count]);

  if (thread.isPending) return <Loader2 className="m-6 size-5 animate-spin text-brand-900" aria-label="Loading" />;
  if (thread.error) return <p className="p-6 text-sm text-red-700">{thread.error.message}</p>;
  const t = thread.data;

  return (
    <>
      <header className="flex flex-wrap items-center gap-3 border-b border-brand-900/10 bg-white px-4 py-3">
        <button onClick={onBack} className="md:hidden" aria-label="Back to the inbox">
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-brand-950">
            {t.name} <span className="font-normal text-muted">· {t.reference}</span>
          </p>
          <p className="truncate text-xs text-muted">
            {t.email || "No email"} ·{" "}
            {t.user ? (
              <Link href={`/users/${t.user}`} className="font-medium text-brand-900 hover:underline">
                see their account
              </Link>
            ) : (
              "no account"
            )}
          </p>
        </div>
        <select
          value={t.assigned_to ?? ""}
          onChange={(e) => assign.mutate(e.target.value ? Number(e.target.value) : null)}
          disabled={assign.isPending}
          aria-label="Assigned to"
          className="h-9 max-w-44 rounded-full border border-brand-900/15 bg-white px-3 text-sm outline-none focus:border-gold-500"
        >
          <option value="">Unassigned</option>
          {team.data?.results.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        {t.status === "open" ? (
          <button onClick={() => close.mutate()} disabled={close.isPending} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-brand-900 ring-1 ring-brand-900/15 hover:ring-brand-900/40">
            <CheckCircle2 className="size-4" /> Mark solved
          </button>
        ) : (
          <button onClick={() => reopen.mutate()} disabled={reopen.isPending} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-brand-900 ring-1 ring-brand-900/15 hover:ring-brand-900/40">
            <RotateCcw className="size-4" /> Reopen
          </button>
        )}
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {t.topic && <p className="text-center text-xs text-muted">Asked the help bot about: {t.topic}</p>}
        {t.messages
          .filter((m) => m.sender !== "bot")
          .map((m) => {
            const ours = m.sender === "agent";
            return (
              <div key={m.id} className={`flex ${ours ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${ours ? "rounded-br-md bg-brand-950 text-white" : "rounded-bl-md bg-white ring-1 ring-brand-900/10"}`}>
                  <p className={`mb-0.5 flex items-center gap-1 text-xs ${ours ? "text-white/60" : "text-muted"}`}>
                    {!ours && <UserRound className="size-3" />}
                    {m.author_name} · {when(m.created_at)}
                  </p>
                  <p className="whitespace-pre-line">{m.body}</p>
                </div>
              </div>
            );
          })}
        <div ref={end} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) reply.mutate();
        }}
        className="border-t border-brand-900/10 bg-white p-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && body.trim()) reply.mutate();
            }}
            rows={2}
            maxLength={4000}
            placeholder={`Reply to ${t.name.split(" ")[0]}… (Ctrl+Enter to send)`}
            aria-label="Reply"
            className="flex-1 resize-none rounded-2xl border border-brand-900/15 px-3 py-2 text-sm outline-none focus:border-gold-500"
          />
          <button disabled={reply.isPending || !body.trim()} className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-950 px-5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50">
            {reply.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted">
          {t.email ? `They'll see it in the chat and get it by email at ${t.email}.` : "They'll see it in the chat."}
        </p>
        {(reply.error ?? assign.error) && <p className="mt-1 text-sm text-red-700">{(reply.error ?? assign.error)?.message}</p>}
      </form>
    </>
  );
}
