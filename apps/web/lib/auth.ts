"use client";

export const authSessionKey = "life-os-auth-session";
const authChangedEvent = "lifeos:auth-changed";

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: {
    id: string;
    email?: string;
  };
};

type SupabaseTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email?: string;
  };
};

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
}

function getConfiguredAppOrigin() {
  const raw = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() ?? "";
  if (!raw) return "";

  try {
    return new URL(raw).origin;
  } catch {
    return raw.replace(/\/$/, "");
  }
}

function isLoopbackHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
}

export function getBrowserAuthCallbackUrl() {
  const configuredOrigin = getConfiguredAppOrigin();
  if (configuredOrigin) {
    return `${configuredOrigin}/auth/callback`;
  }
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/auth/callback`;
}

export function isRemoteBrowserAuthHost() {
  if (typeof window === "undefined") return false;
  return !isLoopbackHost(window.location.hostname);
}

function emitAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(authChangedEvent));
}

function normalizeSession(payload: SupabaseTokenResponse): AuthSession {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
    user: {
      id: payload.user.id,
      email: payload.user.email,
    },
  };
}

function normalizePartialSession(payload: Partial<SupabaseTokenResponse>) {
  if (
    typeof payload.access_token !== "string" ||
    typeof payload.refresh_token !== "string" ||
    typeof payload.expires_in !== "number" ||
    !payload.user?.id
  ) {
    return null;
  }
  return normalizeSession(payload as SupabaseTokenResponse);
}

function readJwtPayload(accessToken: string) {
  const [, payload] = accessToken.split(".");
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    return JSON.parse(decoded) as { sub?: string; email?: string };
  } catch {
    return null;
  }
}

export function readStoredAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(authSessionKey);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function saveStoredAuthSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(authSessionKey, JSON.stringify(session));
  emitAuthChanged();
}

export function clearStoredAuthSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(authSessionKey);
  emitAuthChanged();
}

export function hasAuthSession() {
  return Boolean(readStoredAuthSession()?.accessToken);
}

async function requestSupabaseSession(path: string, body: unknown) {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase auth is not configured in the web env");
  }

  const response = await fetch(`${supabaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { msg?: string; error_description?: string } | null;
    throw new Error(payload?.msg || payload?.error_description || "Unable to sign in");
  }

  return (await response.json()) as SupabaseTokenResponse;
}

export async function signInWithPassword(email: string, password: string) {
  const payload = await requestSupabaseSession("/auth/v1/token?grant_type=password", {
    email,
    password,
  });
  const session = normalizeSession(payload);
  saveStoredAuthSession(session);
  return session;
}

export async function signUpWithPassword(email: string, password: string, displayName?: string) {
  const payload = await requestSupabaseSession("/auth/v1/signup", {
    email,
    password,
    data: displayName ? { display_name: displayName } : undefined,
  });
  const session = normalizePartialSession(payload);
  if (session) {
    saveStoredAuthSession(session);
  }
  return {
    session,
    needsEmailConfirmation: !session,
  };
}

export function startGoogleSignIn() {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();
  const callbackUrl = getBrowserAuthCallbackUrl();
  if (!supabaseUrl || !supabaseAnonKey || !callbackUrl) {
    throw new Error("Supabase auth is not configured in the web env");
  }
  const authorizeUrl = new URL(`${supabaseUrl}/auth/v1/authorize`);
  authorizeUrl.searchParams.set("provider", "google");
  authorizeUrl.searchParams.set("redirect_to", callbackUrl);
  authorizeUrl.searchParams.set("apikey", supabaseAnonKey);
  window.location.assign(authorizeUrl.toString());
}

export function consumeAuthCallbackFromLocation() {
  if (typeof window === "undefined") return { ok: false as const, error: "Missing browser context" };
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const search = window.location.search.startsWith("?") ? window.location.search.slice(1) : window.location.search;
  const hashParams = new URLSearchParams(hash);
  const searchParams = new URLSearchParams(search);
  const error = hashParams.get("error_description") || searchParams.get("error_description") || hashParams.get("error");
  if (error) {
    return { ok: false as const, error };
  }

  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  const expiresIn = Number(hashParams.get("expires_in"));
  const jwtPayload = accessToken ? readJwtPayload(accessToken) : null;
  const userId = hashParams.get("user_id") ?? hashParams.get("sub") ?? jwtPayload?.sub;
  const email = hashParams.get("email") ?? jwtPayload?.email ?? undefined;

  if (!accessToken || !refreshToken || !Number.isFinite(expiresIn) || !userId) {
    return { ok: false as const, error: "No session was returned from Supabase" };
  }

  const session: AuthSession = {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    user: {
      id: userId,
      email,
    },
  };
  saveStoredAuthSession(session);
  return { ok: true as const, session };
}

export async function refreshAuthSession() {
  const current = readStoredAuthSession();
  if (!current?.refreshToken) return null;
  const payload = await requestSupabaseSession("/auth/v1/token?grant_type=refresh_token", {
    refresh_token: current.refreshToken,
  });
  const nextSession = normalizeSession(payload);
  saveStoredAuthSession(nextSession);
  return nextSession;
}

export async function getAccessToken() {
  const current = readStoredAuthSession();
  if (!current?.accessToken) return null;
  if (current.expiresAt - Date.now() > 60_000) return current.accessToken;

  try {
    const refreshed = await refreshAuthSession();
    return refreshed?.accessToken ?? null;
  } catch {
    clearStoredAuthSession();
    return null;
  }
}

export async function signOut() {
  const accessToken = readStoredAuthSession()?.accessToken ?? null;
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();
  clearStoredAuthSession();

  if (!supabaseUrl || !supabaseAnonKey || !accessToken) return;

  await fetch(`${supabaseUrl}/auth/v1/logout`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  }).catch(() => undefined);
}

export function watchStoredAuthSession(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", listener);
  window.addEventListener(authChangedEvent, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(authChangedEvent, listener);
  };
}
