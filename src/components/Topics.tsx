"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, EyeOff, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { ApiError, supportApi, type HelpTopic } from "@/lib/api";

/**
 * The help bot's questions and answers. Top-level topics are the first choices; the questions under them carry the
 * answers. A visitor who isn't helped can message the support inbox.
 */
export default function Topics() {
  const topics = useQuery({ queryKey: ["topics"], queryFn: supportApi.topics });
  const [editing, setEditing] = useState<{ topic: HelpTopic | null; parent: number | null } | null>(null);

  const all = topics.data ?? [];
  const children = (parent: number | null) => all.filter((t) => t.parent === parent).sort((a, b) => a.position - b.position || a.id - b.id);

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-brand-950">Help bot answers</h1>
            <p className="mt-1 text-sm text-muted">What visitors can pick in the help chat before they message the team.</p>
          </div>
          <button onClick={() => setEditing({ topic: null, parent: null })} className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-950 px-5 text-sm font-semibold text-white hover:bg-brand-800">
            <Plus className="size-4" /> New topic
          </button>
        </div>

        {topics.isPending && <Loader2 className="mt-8 size-5 animate-spin text-brand-900" aria-label="Loading" />}
        {topics.error && <p className="mt-8 text-sm text-red-700">{topics.error.message}</p>}

        <div className="mt-6 space-y-4">
          {editing && editing.topic === null && editing.parent === null && <Editor parent={null} onDone={() => setEditing(null)} />}
          {children(null).map((topic) => (
            <section key={topic.id} className="rounded-[1.5rem] bg-white p-5 ring-1 ring-brand-900/10">
              {editing?.topic?.id === topic.id ? (
                <Editor topic={topic} parent={null} onDone={() => setEditing(null)} />
              ) : (
                <Heading topic={topic} onEdit={() => setEditing({ topic, parent: null })} />
              )}
              <ul className="mt-3 divide-y divide-brand-900/10">
                {children(topic.id).map((q) => (
                  <li key={q.id} className="py-3">
                    {editing?.topic?.id === q.id ? (
                      <Editor topic={q} parent={topic.id} onDone={() => setEditing(null)} />
                    ) : (
                      <Question topic={q} onEdit={() => setEditing({ topic: q, parent: topic.id })} />
                    )}
                  </li>
                ))}
              </ul>
              {editing && editing.topic === null && editing.parent === topic.id ? (
                <Editor parent={topic.id} onDone={() => setEditing(null)} />
              ) : (
                <button onClick={() => setEditing({ topic: null, parent: topic.id })} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-900 hover:underline">
                  <Plus className="size-4" /> Add a question
                </button>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function Heading({ topic, onEdit }: { topic: HelpTopic; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="font-display text-xl text-brand-950">{topic.title}</h2>
      {!topic.is_active && <Hidden />}
      <button onClick={onEdit} aria-label={`Edit ${topic.title}`} className="ml-auto rounded-full p-2 text-muted hover:bg-cream hover:text-brand-900">
        <Pencil className="size-4" />
      </button>
    </div>
  );
}

function Question({ topic, onEdit }: { topic: HelpTopic; onEdit: () => void }) {
  return (
    <div className="flex gap-2">
      <ChevronRight className="mt-0.5 size-4 shrink-0 text-gold-600" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-medium text-brand-950">
          {topic.title} {!topic.is_active && <Hidden />}
        </p>
        <p className="mt-0.5 whitespace-pre-line text-sm text-muted">{topic.answer || "No answer: it only leads to more choices."}</p>
      </div>
      <button onClick={onEdit} aria-label={`Edit ${topic.title}`} className="self-start rounded-full p-2 text-muted hover:bg-cream hover:text-brand-900">
        <Pencil className="size-4" />
      </button>
    </div>
  );
}

const Hidden = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
    <EyeOff className="size-3" /> Hidden
  </span>
);

function Editor({ topic, parent, onDone }: { topic?: HelpTopic; parent: number | null; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(topic?.title ?? "");
  const [answer, setAnswer] = useState(topic?.answer ?? "");
  const [position, setPosition] = useState(String(topic?.position ?? 0));
  const [active, setActive] = useState(topic?.is_active ?? true);
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["topics"] });
    onDone();
  };
  const save = useMutation({
    mutationFn: () => supportApi.saveTopic(topic?.id ?? null, { parent, title, answer, position: Number(position) || 0, is_active: active }),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: () => supportApi.deleteTopic(topic!.id), onSuccess: refresh });
  const fields = save.error instanceof ApiError ? save.error.fields : {};
  const input = "w-full rounded-xl border border-brand-900/15 px-3 py-2 text-sm outline-none focus:border-gold-500";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="space-y-3 rounded-2xl bg-cream/60 p-4"
    >
      <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-brand-900">
        {parent === null ? "Topic" : "Question"}
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required className={`mt-1 normal-case tracking-normal ${input}`} />
        {fields.title && <span className="mt-1 block text-xs normal-case tracking-normal text-red-700">{fields.title}</span>}
      </label>
      <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-brand-900">
        Answer {parent === null && <span className="normal-case tracking-normal text-muted">(usually empty for a topic)</span>}
        <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} className={`mt-1 normal-case tracking-normal ${input}`} />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          Order
          <input type="number" min={0} value={position} onChange={(e) => setPosition(e.target.value)} className="w-20 rounded-xl border border-brand-900/15 px-2 py-1.5 text-sm" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Shown to visitors
        </label>
      </div>
      {(save.error || remove.error) && !Object.keys(fields).length && <p className="text-sm text-red-700">{(save.error ?? remove.error)?.message}</p>}
      <div className="flex flex-wrap gap-2">
        <button disabled={save.isPending} className="inline-flex h-9 items-center gap-2 rounded-full bg-brand-950 px-4 text-sm font-semibold text-white disabled:opacity-60">
          {save.isPending && <Loader2 className="size-4 animate-spin" />} Save
        </button>
        <button type="button" onClick={onDone} className="h-9 rounded-full px-4 text-sm text-muted hover:text-brand-900">
          Cancel
        </button>
        {topic && (
          <button
            type="button"
            onClick={() => window.confirm(parent === null ? "Delete this topic and every question in it?" : "Delete this question?") && remove.mutate()}
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-red-700 hover:bg-red-50"
          >
            <Trash2 className="size-4" /> Delete
          </button>
        )}
      </div>
    </form>
  );
}
