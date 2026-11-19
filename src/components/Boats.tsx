"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, day, money, type Boat } from "@/lib/api";
import { Badge, Button, Card, Drawer, Empty, ErrorText, Field, inputClass, Loading, Page, Pager, SearchBox, Select, Table, Td, Toolbar, useFlash } from "./ui";

const PAGE_SIZE = 25;

/** Every boat on Shortlet Stay. Staff suspend a boat to take it off the site whatever its host does, or move it to another host. */
export default function Boats({ owner = "" }: { owner?: string }) {
  const queryClient = useQueryClient();
  const [flash, setFlash] = useFlash();
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<"" | "true" | "false">("");
  const [published, setPublished] = useState<"" | "true" | "false">("");
  const [country, setCountry] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [page, setPage] = useState(1);
  const [moving, setMoving] = useState<Boat | null>(null);
  const countries = useQuery({ queryKey: ["countries"], queryFn: adminApi.countries, staleTime: Infinity });
  const params = { search, is_active: active, is_published: published, country, owner, ordering, page, page_size: PAGE_SIZE };
  const list = useQuery({ queryKey: ["boats", params], queryFn: () => adminApi.boats(params), placeholderData: (prev) => prev });
  const toggle = useMutation({
    mutationFn: (boat: Boat) => (boat.is_active ? adminApi.suspendBoat(boat.slug) : adminApi.restoreBoat(boat.slug)),
    onSuccess: (boat) => {
      queryClient.invalidateQueries({ queryKey: ["boats"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      setFlash(boat.is_active ? `${boat.name} is back on the site.` : `${boat.name} is suspended: guests can't see or book it.`);
    },
  });
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <Page title="Boats" subtitle="Every boat listed by boat cruise hosts. Suspend one to take it off the site, whatever its host does." wide>
      {flash}
      <ErrorText error={toggle.error} />
      <Toolbar>
        <SearchBox value={search} onChange={reset(setSearch)} placeholder="Name, marina, city or host" />
        <Select label="Status" value={active} onChange={reset(setActive)} options={[["", "Live and suspended"], ["true", "Not suspended"], ["false", "Suspended"]] as const} />
        <Select label="Published" value={published} onChange={reset(setPublished)} options={[["", "Published or not"], ["true", "Published"], ["false", "Draft"]] as const} />
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
          options={[["-created_at", "Newest"], ["name", "Name A–Z"], ["hourly_rate", "Cheapest"], ["-charter_count", "Most cruises"]] as const}
        />
      </Toolbar>
      {owner && (
        <p className="text-sm text-muted">
          Showing one host&apos;s boats. <Link href="/boats" className="font-medium text-brand-900 hover:underline">Show every boat</Link>
        </p>
      )}
      <Card pad={false}>
        {list.isPending && <Loading />}
        {list.error && <div className="p-4"><ErrorText error={list.error} /></div>}
        {list.data && !list.data.results.length && <Empty>No boats match.</Empty>}
        {!!list.data?.results.length && (
          <>
            <Table head={["Boat", "Host", "Price", "Cruises", "Added", "Status", ""]}>
              {list.data.results.map((c) => (
                <tr key={c.slug}>
                  <Td>
                    <p className="font-medium text-brand-950">{c.name}</p>
                    <p className="text-xs text-muted">{[c.marina, c.city, c.country].filter(Boolean).join(", ")}</p>
                  </Td>
                  <Td>
                    {c.owner_id ? (
                      <Link href={`/users/${c.owner_id}`} className="hover:underline">
                        <p>{c.owner_name}</p>
                        <p className="text-xs text-muted">{c.owner_email}</p>
                      </Link>
                    ) : (
                      <Badge tone="blue">Shortlet Stay</Badge>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap">{money(c.hourly_rate)} <span className="text-xs text-muted">/ hour</span></Td>
                  <Td>
                    {c.charter_count ? (
                      <Link href={`/charters?boat=${c.slug}`} className="font-medium text-brand-900 hover:underline">{c.charter_count}</Link>
                    ) : 0}
                    {c.pending_requests > 0 && <p className="text-xs text-amber-700">{c.pending_requests} waiting</p>}
                  </Td>
                  <Td className="whitespace-nowrap">{day(c.created_at)}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {c.is_published ? <Badge tone="green">Published</Badge> : <Badge>Draft</Badge>}
                      {!c.is_active && <Badge tone="red">Suspended</Badge>}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setMoving(c)}>Change host</Button>
                      <Button
                        size="sm"
                        variant={c.is_active ? "danger" : "outline"}
                        busy={toggle.isPending && toggle.variables?.slug === c.slug}
                        onClick={() => (!c.is_active || window.confirm(`Suspend ${c.name}? Guests won't see it until you restore it. Cruises already booked stand.`)) && toggle.mutate(c)}
                      >
                        {c.is_active ? "Suspend" : "Restore"}
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
            <Pager page={page} count={list.data.count} size={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </Card>
      {moving && <ChangeHost boat={moving} onClose={() => setMoving(null)} onSaved={(c) => setFlash(`${c.name} now belongs to ${c.owner_email ?? "Shortlet Stay"}.`)} />}
    </Page>
  );
}

/** Give a boat to another boat cruise host, or back to Shortlet Stay. */
function ChangeHost({ boat, onClose, onSaved }: { boat: Boat; onClose: () => void; onSaved: (c: Boat) => void }) {
  const queryClient = useQueryClient();
  const [owner, setOwner] = useState(boat.owner_id ? String(boat.owner_id) : "");
  const hosts = useQuery({
    queryKey: ["users", { host_type: "boat_cruise", is_active: "true", page_size: 200 }],
    queryFn: () => adminApi.users({ role: "owner", host_type: "boat_cruise", is_active: "true", page_size: 200 }),
  });
  const save = useMutation({
    mutationFn: () => adminApi.assignBoatOwner(boat.slug, owner ? Number(owner) : null),
    onSuccess: (c) => {
      queryClient.invalidateQueries({ queryKey: ["boats"] });
      onSaved(c);
      onClose();
    },
  });

  return (
    <Drawer
      title={`Host of ${boat.name}`}
      onClose={onClose}
      footer={
        <>
          <Button busy={save.isPending} onClick={() => save.mutate()}>Save</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </>
      }
    >
      <Field label="Boat cruise host" hint="Only boat cruise hosts list boats. Its cruises stay as they are.">
        <select value={owner} onChange={(e) => setOwner(e.target.value)} className={inputClass}>
          <option value="">Shortlet Stay (no host)</option>
          {hosts.data?.results.map((u) => (
            <option key={u.id} value={u.id}>{u.name} · {u.email}</option>
          ))}
        </select>
      </Field>
      <ErrorText error={save.error ?? hosts.error} />
    </Drawer>
  );
}
