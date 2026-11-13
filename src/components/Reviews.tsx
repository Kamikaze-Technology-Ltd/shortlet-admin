"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Star } from "lucide-react";
import { adminApi, day } from "@/lib/api";
import { Badge, Button, Card, Empty, ErrorText, Loading, Page, Pager, Select, Stat, Toolbar } from "./ui";

const PAGE_SIZE = 20;

/** Guests' reviews. Staff hide ones that break the rules; hidden reviews don't count towards ratings. */
export default function Reviews() {
  const queryClient = useQueryClient();
  const params = useSearchParams();
  const [hotel, setHotel] = useState(params.get("hotel") ?? "");
  const [visible, setVisible] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);
  const summary = useQuery({ queryKey: ["review-summary"], queryFn: adminApi.reviewSummary });
  const query = { property__slug: hotel, is_visible: visible, page, page_size: PAGE_SIZE };
  const list = useQuery({ queryKey: ["reviews", query], queryFn: () => adminApi.reviews(query), placeholderData: (prev) => prev });
  const toggle = useMutation({
    mutationFn: ({ id, show }: { id: number; show: boolean }) => adminApi.setReviewVisible(id, show),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["review-summary"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["hotels"] });
    },
  });
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <Page title="Reviews" subtitle="What guests say after their stay. Hide a review that breaks the rules: it stops showing and stops counting." wide>
      {summary.data && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Visible reviews" value={summary.data.count} />
          <Stat label="Hotels average" value={summary.data.hotel_average ? `${summary.data.hotel_average}★` : "—"} />
          <Stat label="Rooms average" value={summary.data.room_average ? `${summary.data.room_average}★` : "—"} />
        </div>
      )}
      <Toolbar>
        <Select
          label="Hotel"
          value={hotel}
          onChange={reset(setHotel)}
          options={[["", "Every hotel"] as const, ...(summary.data?.properties ?? []).map((p) => [p.slug, `${p.name} (${p.count})`] as const)]}
        />
        <Select label="Visibility" value={visible} onChange={reset(setVisible)} options={[["", "Shown and hidden"], ["true", "Shown"], ["false", "Hidden"]] as const} />
      </Toolbar>
      <ErrorText error={toggle.error} />
      <Card pad={false}>
        {list.isPending && <Loading />}
        {list.error && <div className="p-4"><ErrorText error={list.error} /></div>}
        {list.data && !list.data.results.length && <Empty>No reviews match.</Empty>}
        <ul className="divide-y divide-brand-900/5">
          {list.data?.results.map((r) => (
            <li key={r.id} className={`flex flex-col gap-3 p-5 sm:flex-row ${r.is_visible ? "" : "bg-cream/50"}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-brand-950">{r.guest_name}</span>
                  <span className="text-xs text-muted">stayed {r.stayed} · {day(r.created_at)} · {r.booking_reference}</span>
                  {!r.is_visible && <Badge tone="red">Hidden</Badge>}
                </div>
                <p className="mt-1 text-sm">
                  <Link href={`/hotels/${r.property_slug}`} className="font-medium text-brand-900 hover:underline">
                    {r.property_name}
                  </Link>{" "}
                  · {r.room_name}
                </p>
                <p className="mt-1 flex gap-4 text-sm">
                  <Stars label="Hotel" n={r.hotel_rating} />
                  <Stars label="Room" n={r.room_rating} />
                </p>
                {r.comment && <p className="mt-2 whitespace-pre-line text-sm text-ink">{r.comment}</p>}
              </div>
              <div className="shrink-0">
                <Button
                  size="sm"
                  variant={r.is_visible ? "danger" : "outline"}
                  busy={toggle.isPending && toggle.variables?.id === r.id}
                  onClick={() => toggle.mutate({ id: r.id, show: !r.is_visible })}
                >
                  {r.is_visible ? <><EyeOff className="size-3.5" /> Hide</> : <><Eye className="size-3.5" /> Show again</>}
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {list.data && <Pager page={page} count={list.data.count} size={PAGE_SIZE} onPage={setPage} />}
      </Card>
    </Page>
  );
}

function Stars({ label, n }: { label: string; n: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-muted">{label}</span>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`size-3.5 ${i < n ? "fill-gold-400 text-gold-400" : "text-brand-900/20"}`} />
      ))}
    </span>
  );
}
