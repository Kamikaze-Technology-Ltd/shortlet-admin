import type { components } from "./api-schema";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api").replace(/\/$/, "");

type S = components["schemas"];
export type Page<T> = { count: number; next?: string | null; previous?: string | null; results: T[] };
export type User = S["User"];
export type StaffUser = S["StaffUser"];
export type StaffUserDetail = S["StaffUserDetail"];
export type StaffUserInput = S["StaffUserCreateRequest"];
export type Role = StaffUser["role"];
export type Overview = S["StaffOverview"];
export type Money = S["Money"];
export type Hotel = S["Hotel"];
export type Property = S["PropertyManage"];
export type PropertyInput = S["PropertyManageRequest"];
export type Room = S["UnitManage"];
export type RoomInput = S["UnitManageRequest"];
export type RoomImage = S["UnitImage"];
export type Discount = S["Discount"];
export type DiscountInput = S["DiscountRequest"];
export type Amenity = S["Amenity"];
export type AmenityInput = S["AmenityRequest"];
export type Booking = S["Booking"];
export type Transaction = S["Transaction"];
export type TransactionSummary = S["TransactionSummary"];
export type TicketPayment = S["StaffTicketPayment"];
export type TicketOrder = S["StaffTicketOrder"];
export type Review = S["ManagedReview"];
export type ReviewSummary = S["ReviewSummary"];
export type Event = S["EventManage"];
export type EventOrder = S["OrderManage"];
export type Attendee = S["Attendee"];
export type Country = S["Country"];
export type InboxItem = S["AdminConversation"];
export type Thread = S["AdminConversationDetail"];
export type InboxSummary = S["SupportSummary"];
export type HelpTopic = S["AdminHelpTopic"];
export type HelpTopicInput = S["AdminHelpTopicRequest"];

/** DRF errors: `{ field: ["msg"] }`, `{ detail: "msg" }` or `{ non_field_errors: [...] }`. */
export class ApiError extends Error {
  constructor(public status: number, public fields: Record<string, string> = {}, message = "Something went wrong. Please try again.") {
    super(message);
  }
  static async from(res: Response) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {}
    const fields: Record<string, string> = {};
    let message: string | undefined;
    if (body && typeof body === "object") {
      for (const [key, value] of Object.entries(body)) {
        const text = Array.isArray(value) ? String(value[0]) : String(value);
        if (key === "detail" || key === "non_field_errors") message ??= text;
        else fields[key] = text;
      }
    }
    return new ApiError(res.status, fields, message);
  }
}

const KEYS = { access: "admin_access", refresh: "admin_refresh" };
const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
  clear: () => {
    try {
      localStorage.removeItem(KEYS.access);
      localStorage.removeItem(KEYS.refresh);
    } catch {}
  },
};

let refreshing: Promise<boolean> | null = null;
function refresh(): Promise<boolean> {
  refreshing ??= (async () => {
    const token = store.get(KEYS.refresh);
    if (!token) return false;
    const res = await fetch(`${API_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: token }),
    }).catch(() => null);
    if (!res?.ok) {
      store.clear();
      return false;
    }
    const data = await res.json();
    store.set(KEYS.access, data.access);
    if (data.refresh) store.set(KEYS.refresh, data.refresh);
    return true;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}, retry = true): Promise<T> {
  const { json, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (json !== undefined) headers.set("Content-Type", "application/json");
  const access = store.get(KEYS.access);
  if (access) headers.set("Authorization", `Bearer ${access}`);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...rest, headers, body: json !== undefined ? JSON.stringify(json) : rest.body });
  } catch {
    throw new ApiError(0, {}, "Can't reach the server. Check your connection and try again.");
  }
  if (res.status === 401 && access && retry && (await refresh())) return api<T>(path, init, false);
  if (!res.ok) throw await ApiError.from(res);
  return res.status === 204 ? (undefined as T) : res.json();
}

export const authApi = {
  /** Platform staff sign in through the owner portal, which accepts admins. */
  async login(email: string, password: string) {
    const data = await api<S["AuthResponse"]>("/auth/login/", { method: "POST", json: { email, password, portal: "owner" } });
    if (data.user.role !== "admin") throw new ApiError(403, {}, "This app is for Shortlet Stay staff. Hotel owners use the website's dashboard.");
    store.set(KEYS.access, data.access);
    store.set(KEYS.refresh, data.refresh);
    return data.user;
  },
  me: () => api<User>("/auth/me/"),
  signedIn: () => !!store.get(KEYS.access),
  logout: () => store.clear(),
};

const ref = encodeURIComponent;
type Params = Record<string, string | number | boolean | null | undefined>;

/** `?a=1&b=x`, leaving out empty values. */
export function qs(params: Params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const supportApi = {
  inbox: (params: { status?: string; search?: string; assigned?: string; page?: number }) =>
    api<S["PaginatedAdminConversationList"]>(`/support/admin/conversations/${qs(params)}`),
  assign: (reference: string, user: number | null) =>
    api<Thread>(`/support/admin/conversations/${ref(reference)}/assign/`, { method: "POST", json: { user } }),
  summary: () => api<InboxSummary>("/support/admin/conversations/summary/"),
  thread: (reference: string) => api<Thread>(`/support/admin/conversations/${ref(reference)}/`),
  reply: (reference: string, body: string) => api<Thread>(`/support/admin/conversations/${ref(reference)}/reply/`, { method: "POST", json: { body } }),
  close: (reference: string) => api<Thread>(`/support/admin/conversations/${ref(reference)}/close/`, { method: "POST" }),
  reopen: (reference: string) => api<Thread>(`/support/admin/conversations/${ref(reference)}/reopen/`, { method: "POST" }),
  topics: () => api<HelpTopic[]>("/support/admin/topics/"),
  saveTopic: (id: number | null, input: Partial<HelpTopicInput>) =>
    id ? api<HelpTopic>(`/support/admin/topics/${id}/`, { method: "PATCH", json: input }) : api<HelpTopic>("/support/admin/topics/", { method: "POST", json: input }),
  deleteTopic: (id: number) => api<void>(`/support/admin/topics/${id}/`, { method: "DELETE" }),
};

export const adminApi = {
  overview: () => api<Overview>("/admin/overview/"),
  countries: () => api<Country[]>("/geo/countries/"),

  users: (params: Params) => api<Page<StaffUser>>(`/admin/users/${qs(params)}`),
  user: (id: number) => api<StaffUserDetail>(`/admin/users/${id}/`),
  createUser: (input: Partial<StaffUserInput>) => api<StaffUser>("/admin/users/", { method: "POST", json: input }),
  updateUser: (id: number, input: Partial<StaffUserInput>) => api<StaffUserDetail>(`/admin/users/${id}/`, { method: "PATCH", json: input }),
  sendPasswordReset: (id: number) => api<{ detail: string }>(`/admin/users/${id}/send-password-reset/`, { method: "POST" }),
  signOutUser: (id: number) => api<{ detail: string }>(`/admin/users/${id}/sign-out/`, { method: "POST" }),

  hotels: (params: Params) => api<Page<Hotel>>(`/admin/hotels/${qs(params)}`),
  hotel: (slug: string) => api<Hotel>(`/admin/hotels/${ref(slug)}/`),
  assignOwner: (slug: string, owner: number | null) => api<Hotel>(`/admin/hotels/${ref(slug)}/assign-owner/`, { method: "POST", json: { owner } }),
  property: (slug: string) => api<Property>(`/dashboard/properties/${ref(slug)}/`),
  saveProperty: (slug: string | null, input: Partial<PropertyInput>) =>
    slug
      ? api<Property>(`/dashboard/properties/${ref(slug)}/`, { method: "PATCH", json: input })
      : api<Property>("/dashboard/properties/", { method: "POST", json: input }),
  deleteProperty: (slug: string) => api<void>(`/dashboard/properties/${ref(slug)}/`, { method: "DELETE" }),

  rooms: (params: Params) => api<Page<Room>>(`/dashboard/units/${qs({ page_size: 200, ...params })}`),
  room: (slug: string) => api<Room>(`/dashboard/units/${ref(slug)}/`),
  saveRoom: (slug: string | null, input: Partial<RoomInput>) =>
    slug
      ? api<Room>(`/dashboard/units/${ref(slug)}/`, { method: "PATCH", json: input })
      : api<Room>("/dashboard/units/", { method: "POST", json: input }),
  deleteRoom: (slug: string) => api<void>(`/dashboard/units/${ref(slug)}/`, { method: "DELETE" }),
  uploadImage: (room: string, file: File, position: number) => {
    const body = new FormData();
    body.set("image", file);
    body.set("position", String(position));
    return api<RoomImage>(`/dashboard/units/${ref(room)}/images/`, { method: "POST", body });
  },
  deleteImage: (room: string, id: number) => api<void>(`/dashboard/units/${ref(room)}/images/${id}/`, { method: "DELETE" }),
  addDiscount: (room: string, input: Partial<DiscountInput>) =>
    api<Discount>(`/dashboard/units/${ref(room)}/discounts/`, { method: "POST", json: input }),
  deleteDiscount: (room: string, id: number) => api<void>(`/dashboard/units/${ref(room)}/discounts/${id}/`, { method: "DELETE" }),

  amenities: () => api<Amenity[]>("/dashboard/amenities/"),
  saveAmenity: (slug: string | null, input: Partial<AmenityInput>) =>
    slug
      ? api<Amenity>(`/dashboard/amenities/${ref(slug)}/`, { method: "PATCH", json: input })
      : api<Amenity>("/dashboard/amenities/", { method: "POST", json: input }),
  deleteAmenity: (slug: string) => api<void>(`/dashboard/amenities/${ref(slug)}/`, { method: "DELETE" }),

  bookings: (params: Params) => api<Page<Booking>>(`/dashboard/bookings/${qs(params)}`),
  updateBooking: (id: number, input: Partial<S["BookingRequest"]>) =>
    api<Booking>(`/dashboard/bookings/${id}/`, { method: "PATCH", json: input }),
  confirmBooking: (id: number) => api<Booking>(`/dashboard/bookings/${id}/confirm/`, { method: "POST" }),
  declineBooking: (id: number) => api<Booking>(`/dashboard/bookings/${id}/decline/`, { method: "POST" }),

  transactions: (params: Params) => api<Page<Transaction>>(`/dashboard/transactions/${qs(params)}`),
  transactionSummary: (params: Params) => api<TransactionSummary>(`/dashboard/transactions/summary/${qs(params)}`),
  markRefunded: (id: number, note: string) => api<Transaction>(`/admin/payments/${id}/mark-refunded/`, { method: "POST", json: { note } }),
  ticketPayments: (params: Params) => api<Page<TicketPayment>>(`/admin/ticket-payments/${qs(params)}`),
  markTicketRefunded: (id: number, note: string) =>
    api<TicketPayment>(`/admin/ticket-payments/${id}/mark-refunded/`, { method: "POST", json: { note } }),

  reviews: (params: Params) => api<Page<Review>>(`/dashboard/reviews/${qs(params)}`),
  reviewSummary: () => api<ReviewSummary>("/dashboard/reviews/summary/"),
  setReviewVisible: (id: number, is_visible: boolean) => api<Review>(`/dashboard/reviews/${id}/`, { method: "PATCH", json: { is_visible } }),

  events: (params: Params) => api<Page<Event>>(`/dashboard/events/${qs(params)}`),
  event: (slug: string) => api<Event>(`/dashboard/events/${ref(slug)}/`),
  eventAction: (slug: string, action: "publish" | "unpublish" | "cancel") =>
    api<Event>(`/dashboard/events/${ref(slug)}/${action}/`, { method: "POST" }),
  deleteEvent: (slug: string) => api<void>(`/dashboard/events/${ref(slug)}/`, { method: "DELETE" }),
  eventOrders: (slug: string, params: Params) => api<Page<EventOrder>>(`/dashboard/events/${ref(slug)}/orders/${qs(params)}`),
  orderAction: (slug: string, reference: string, action: "confirm" | "decline") =>
    api<EventOrder>(`/dashboard/events/${ref(slug)}/orders/${ref(reference)}/${action}/`, { method: "POST" }),
  attendees: (slug: string, params: Params) => api<Page<Attendee>>(`/dashboard/events/${ref(slug)}/attendees/${qs(params)}`),
  ticketOrders: (params: Params) => api<Page<TicketOrder>>(`/admin/ticket-orders/${qs(params)}`),
};

/** "₦48,000": amounts come from the API as decimal strings. */
export function money(amount: string | number | null | undefined, currency = "NGN") {
  if (amount === null || amount === undefined || amount === "") return "—";
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(amount));
  } catch {
    return `${currency} ${Number(amount).toLocaleString()}`;
  }
}

/** Totals in several currencies, "₦48,000 · £120", or "₦0" when there are none. */
export function moneyList(rows: Money[] | undefined) {
  return rows?.length ? rows.map((r) => money(r.amount, r.currency)).join(" · ") : money(0);
}

/** "12 Nov 2026". */
export function day(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

/** "12 Nov 2026, 14:05". */
export function dateTime(iso: string | null | undefined) {
  return iso
    ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";
}

/** "14:05" today, else "12 Nov". */
export function when(iso: string) {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
