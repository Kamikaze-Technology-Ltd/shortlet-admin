"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { ApiError, adminApi, day, type Role, type StaffUser } from "@/lib/api";
import { Badge, Button, Card, Check, Drawer, Empty, ErrorText, Field, inputClass, Loading, Page, Pager, RoleBadge, SearchBox, Select, Table, Td, Toolbar } from "./ui";

const PAGE_SIZE = 25;

const COPY: Record<Role | "all", { title: string; subtitle: string; add: string }> = {
  all: { title: "All users", subtitle: "Every account on Shortlet Stay: guests, hotel owners, organisers and staff.", add: "Add account" },
  guest: { title: "Guests", subtitle: "People who book stays and buy tickets.", add: "Add guest" },
  owner: { title: "Hotel owners", subtitle: "Accounts that list and run hotels from the website's dashboard.", add: "Add hotel owner" },
  organiser: { title: "Organisers", subtitle: "Accounts that sell tickets to events.", add: "Add organiser" },
  admin: { title: "Support team", subtitle: "Shortlet Stay staff who can use this admin. Super admins can add and remove team members.", add: "Add team member" },
};

export default function Users({ role }: { role?: Role }) {
  const copy = COPY[role ?? "all"];
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<"" | "true" | "false">("");
  const [roleFilter, setRoleFilter] = useState<"" | Role>("");
  const [ordering, setOrdering] = useState("-date_joined");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const params = { role: role ?? roleFilter, search, is_active: active, ordering, page, page_size: PAGE_SIZE };
  const list = useQuery({ queryKey: ["users", params], queryFn: () => adminApi.users(params), placeholderData: (prev) => prev });
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <Page title={copy.title} subtitle={copy.subtitle} wide actions={<Button onClick={() => setAdding(true)}><Plus className="size-4" /> {copy.add}</Button>}>
      <Toolbar>
        <SearchBox value={search} onChange={reset(setSearch)} placeholder="Name, email or phone" />
        {!role && (
          <Select
            label="Role"
            value={roleFilter}
            onChange={reset(setRoleFilter)}
            options={[["", "Every role"], ["guest", "Guests"], ["owner", "Hotel owners"], ["organiser", "Organisers"], ["admin", "Staff"]] as const}
          />
        )}
        <Select label="Status" value={active} onChange={reset(setActive)} options={[["", "Active and deactivated"], ["true", "Active"], ["false", "Deactivated"]] as const} />
        <Select
          label="Sort"
          value={ordering}
          onChange={reset(setOrdering)}
          options={[["-date_joined", "Newest first"], ["date_joined", "Oldest first"], ["-last_login", "Last signed in"], ["first_name", "Name A–Z"], ["email", "Email A–Z"]] as const}
        />
      </Toolbar>
      <Card pad={false}>
        {list.isPending && <Loading />}
        {list.error && <div className="p-4"><ErrorText error={list.error} /></div>}
        {list.data && !list.data.results.length && <Empty>No accounts match.</Empty>}
        {!!list.data?.results.length && (
          <>
            <Table head={["Name", "Role", role === "owner" ? "Hotels" : role === "organiser" ? "Events" : role === "admin" ? "Access" : "Bookings", "Joined", "Last signed in", "Status"]}>
              {list.data.results.map((u) => (
                <UserRow key={u.id} u={u} role={role} />
              ))}
            </Table>
            <Pager page={page} count={list.data.count} size={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </Card>
      {adding && <NewUser role={role} onClose={() => setAdding(false)} />}
    </Page>
  );
}

function UserRow({ u, role }: { u: StaffUser; role?: Role }) {
  const router = useRouter();
  const metric =
    role === "owner" ? u.hotel_count : role === "organiser" ? u.event_count : role === "admin" ? (u.is_superuser ? "Super admin" : "Support") : u.booking_count;
  return (
    <tr className="cursor-pointer hover:bg-mist" onClick={() => router.push(`/users/${u.id}`)}>
      <Td>
        <Link href={`/users/${u.id}`} className="font-medium text-brand-950 hover:underline" onClick={(e) => e.stopPropagation()}>
          {u.name}
        </Link>
        <p className="text-xs text-muted">{u.email}{u.phone && ` · ${u.phone}`}</p>
      </Td>
      <Td><RoleBadge role={u.role} superuser={u.is_superuser} /></Td>
      <Td>{metric}</Td>
      <Td className="whitespace-nowrap">{day(u.date_joined)}</Td>
      <Td className="whitespace-nowrap">{u.last_login ? day(u.last_login) : <span className="text-muted">Never</span>}</Td>
      <Td>{u.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Deactivated</Badge>}</Td>
    </tr>
  );
}

function NewUser({ role, onClose }: { role?: Role; onClose: () => void }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    account_type: (role && role !== "admin" ? role : "guest") as "guest" | "owner" | "organiser",
    is_staff: role === "admin",
    is_superuser: false,
    password: "",
  });
  const set = <K extends keyof typeof form>(k: K) => (v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const save = useMutation({
    mutationFn: () => adminApi.createUser(form),
    onSuccess: (u) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      onClose();
      router.push(`/users/${u.id}`);
    },
  });
  const fields = save.error instanceof ApiError ? save.error.fields : {};

  return (
    <Drawer
      title="New account"
      onClose={onClose}
      footer={
        <>
          <Button busy={save.isPending} onClick={() => save.mutate()}>Create account</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" error={fields.first_name}>
          <input value={form.first_name} onChange={(e) => set("first_name")(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Last name" error={fields.last_name}>
          <input value={form.last_name} onChange={(e) => set("last_name")(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Email" error={fields.email} className="sm:col-span-2">
          <input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Phone" error={fields.phone} hint="Optional. With country code, e.g. +2348012345678.">
          <input value={form.phone} onChange={(e) => set("phone")(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Account type" error={fields.account_type} hint="What they do on the website and app.">
          <select value={form.account_type} onChange={(e) => set("account_type")(e.target.value as typeof form.account_type)} className={inputClass}>
            <option value="guest">Guest</option>
            <option value="owner">Hotel owner</option>
            <option value="organiser">Event organiser</option>
          </select>
        </Field>
      </div>
      <div className="space-y-2 rounded-2xl bg-cream/60 p-4">
        <Check label="Shortlet Stay staff (can use this admin)" checked={form.is_staff} onChange={(v) => setForm((f) => ({ ...f, is_staff: v, is_superuser: v && f.is_superuser }))} />
        <Check label="Super admin (can manage the support team)" checked={form.is_superuser} disabled={!form.is_staff} onChange={set("is_superuser")} />
        <p className="text-xs text-muted">Only super admins can add staff.</p>
      </div>
      <Field label="Password" error={fields.password} hint="Leave empty to email them a link to choose their own (recommended).">
        <input type="password" autoComplete="new-password" value={form.password} onChange={(e) => set("password")(e.target.value)} className={inputClass} />
      </Field>
      {save.error && !Object.keys(fields).length && <ErrorText error={save.error} />}
    </Drawer>
  );
}
