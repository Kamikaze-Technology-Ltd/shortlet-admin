"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, dateTime, money, type Charter, type RentalStatus } from "@/lib/api";
import { Button, Card, Empty, ErrorText, Loading, Page, Pager, SearchBox, StatusBadge, Table, Tabs, Td, Toolbar, useFlash } from "./ui";

const PAGE_SIZE = 25;
const TABS = [["", "All"], ["pending", "Waiting for the host"], ["confirmed", "Confirmed"], ["declined", "Declined"], ["cancelled", "Cancelled"]] as const;

/** Boat cruises across every host. Staff can answer a request for a host who doesn't, or cancel one. */
export default function Charters({ boat = "" }: { boat?: string }) {
  const queryClient = useQueryClient();
  const [flash, setFlash] = useFlash();
  const [status, setStatus] = useState<"" | RentalStatus>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const params = { status, search, boat, page, page_size: PAGE_SIZE };
  const list = useQuery({ queryKey: ["charters", params], queryFn: () => adminApi.charters(params), placeholderData: (prev) => prev });
  const act = useMutation({
    mutationFn: ({ r, action }: { r: Charter; action: "confirm" | "decline" | "cancel" }) => adminApi.charterAction(r.reference, action),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["charters"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      setFlash(`${r.reference} is ${r.status}. The guest has been told.`);
    },
  });
  const busy = (r: Charter, action: string) => act.isPending && act.variables?.r.reference === r.reference && act.variables.action === action;

  return (
    <Page title="Boat cruises" subtitle="Every boat cruise request. Hosts answer their own; step in if one is stuck." wide>
      {flash}
      <ErrorText error={act.error} />
      <Tabs value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={TABS} />
      <Toolbar>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Reference, guest name, email or phone" />
      </Toolbar>
      {boat && (
        <p className="text-sm text-muted">
          Showing one boat&apos;s cruises. <Link href="/charters" className="font-medium text-brand-900 hover:underline">Show every cruise</Link>
        </p>
      )}
      <Card pad={false}>
        {list.isPending && <Loading />}
        {list.error && <div className="p-4"><ErrorText error={list.error} /></div>}
        {list.data && !list.data.results.length && <Empty>No cruises match.</Empty>}
        {!!list.data?.results.length && (
          <>
            <Table head={["Cruise", "Guest", "Boat and time", "Total", "Status", ""]}>
              {list.data.results.map((r) => (
                <tr key={r.reference}>
                  <Td>
                    <p className="font-medium text-brand-950">{r.reference}</p>
                    <p className="text-xs text-muted">{dateTime(r.created_at)}</p>
                  </Td>
                  <Td>
                    <p>{r.guest_name}</p>
                    <p className="text-xs text-muted">{[r.guest_email, r.guest_phone].filter(Boolean).join(" · ")}</p>
                  </Td>
                  <Td>
                    <p>{r.boat_name} · {r.party_size} guests</p>
                    <p className="text-xs text-muted">
                      {dateTime(r.starts_at)} · {r.hours} hour{r.hours === 1 ? "" : "s"} · host {r.host_email ?? "Shortlet Stay"}
                    </p>
                  </Td>
                  <Td className="whitespace-nowrap">{money(r.total_price, r.currency)}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" busy={busy(r, "confirm")} onClick={() => act.mutate({ r, action: "confirm" })}>Confirm</Button>
                          <Button size="sm" variant="outline" busy={busy(r, "decline")} onClick={() => act.mutate({ r, action: "decline" })}>Decline</Button>
                        </>
                      )}
                      {r.status === "confirmed" && (
                        <Button
                          size="sm"
                          variant="danger"
                          busy={busy(r, "cancel")}
                          onClick={() => window.confirm(`Cancel ${r.reference}? The guest will be told.`) && act.mutate({ r, action: "cancel" })}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </Td>
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
