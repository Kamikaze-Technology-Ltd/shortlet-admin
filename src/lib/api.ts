import type { components } from "./api-schema";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api").replace(/\/$/, "");

type S = components["schemas"];
export type User = S["User"];
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
export const supportApi = {
  inbox: (params: { status?: string; search?: string; page?: number }) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, String(v));
    return api<S["PaginatedAdminConversationList"]>(`/support/admin/conversations/?${q}`);
  },
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

/** "14:05" today, else "12 Nov". */
export function when(iso: string) {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
