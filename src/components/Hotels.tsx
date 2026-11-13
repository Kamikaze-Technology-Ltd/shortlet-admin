"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, Star } from "lucide-react";
import { adminApi, day } from "@/lib/api";
import { Badge, Card, Empty, ErrorText, LinkButton, Loading, Page, Pager, SearchBox, Select, Table, Td, Toolbar } from "./ui";

const PAGE_SIZE = 25;

export default function Hotels() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<"" | "true" | "false">("");
  const [owner, setOwner] = useState<"" | "none">("");
  const [country, setCountry] = useState("");
  const [ordering, setOrdering] = useState("name");
  const [page, setPage] = useState(1);
  const countries = useQuery({ queryKey: ["countries"], queryFn: adminApi.countries, staleTime: Infinity });
  const params = { search, is_active: active, owner, country, ordering, page, page_size: PAGE_SIZE };
  const list = useQuery({ queryKey: ["hotels", params], queryFn: () => adminApi.hotels(params), placeholderData: (prev) => prev });
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <Page
      title="Hotels & rooms"
      subtitle="Every hotel on Shortlet Stay. Open one to edit it, its rooms, photos, prices and owner."
      wide
      actions={
        <LinkButton href="/hotels/new"><Plus className="size-4" /> Add hotel</LinkButton>
      }
    >
      <Toolbar>
        <SearchBox value={search} onChange={reset(setSearch)} placeholder="Hotel, area, city or owner" />
        <Select label="Status" value={active} onChange={reset(setActive)} options={[["", "Live and hidden"], ["true", "Live"], ["false", "Hidden"]] as const} />
        <Select label="Owner" value={owner} onChange={reset(setOwner)} options={[["", "Any owner"], ["none", "Managed by Shortlet Stay"]] as const} />
        <Select
          label="Country"
          value={country}
          onChange={reset(setCountry)}
          options={[["", "Every country"] as const, ...(countries.data ?? []).map((c) => [c.code, c.name] as const)]}
        />
        <Select
          label="Sort"
          value={ordering}
          onChange={reset(setOrdering)}
          options={[["name", "Name A–Z"], ["-created_at", "Newest"], ["-booking_count", "Most bookings"], ["-rating", "Best rated"]] as const}
        />
      </Toolbar>
      <Card pad={false}>
        {list.isPending && <Loading />}
        {list.error && <div className="p-4"><ErrorText error={list.error} /></div>}
        {list.data && !list.data.results.length && <Empty>No hotels match.</Empty>}
        {!!list.data?.results.length && (
          <>
            <Table head={["Hotel", "Owner", "Rooms", "Bookings", "Rating", "Added", "Status"]}>
              {list.data.results.map((h) => (
                <tr key={h.id} className="cursor-pointer hover:bg-mist" onClick={() => router.push(`/hotels/${h.slug}`)}>
                  <Td>
                    <Link href={`/hotels/${h.slug}`} onClick={(e) => e.stopPropagation()} className="font-medium text-brand-950 hover:underline">
                      {h.name}
                    </Link>
                    <p className="text-xs text-muted">{[h.area, h.city, h.country_name].filter(Boolean).join(", ") || "No location"}</p>
                  </Td>
                  <Td>
                    {h.owner_id ? (
                      <>
                        <p>{h.owner_name}</p>
                        <p className="text-xs text-muted">{h.owner_email}</p>
                      </>
                    ) : (
                      <Badge tone="blue">Shortlet Stay</Badge>
                    )}
                  </Td>
                  <Td>{h.published_count} / {h.unit_count} <span className="text-xs text-muted">published</span></Td>
                  <Td>{h.booking_count}</Td>
                  <Td>
                    {h.rating !== null ? (
                      <span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-gold-400 text-gold-400" /> {h.rating.toFixed(1)} <span className="text-xs text-muted">({h.review_count})</span></span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap">{day(h.created_at)}</Td>
                  <Td>{h.is_active ? <Badge tone="green">Live</Badge> : <Badge>Hidden</Badge>}</Td>
                </tr>
              ))}
            </Table>
            <Pager page={page} count={list.data.count} size={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </Card>
    </Page>
  );
}
