import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authSessionKey, signOut } from "@/lib/auth";

type MockWindow = Window & {
  localStorage: Storage;
};

function createMockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } satisfies Storage;
}

describe("signOut", () => {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    const mockWindow = {
      localStorage: createMockStorage(),
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MockWindow;

    vi.stubGlobal("window", mockWindow);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    globalThis.fetch = originalFetch;
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalSupabaseAnonKey;
    if (originalWindow) {
      vi.stubGlobal("window", originalWindow);
    }
  });

  it("clears the stored session and calls the Supabase logout endpoint", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    window.localStorage.setItem(
      authSessionKey,
      JSON.stringify({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: Date.now() + 60_000,
        user: {
          id: "owner-id",
          email: "owner@example.com",
        },
      }),
    );

    await signOut();

    expect(window.localStorage.getItem(authSessionKey)).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("https://example.supabase.co/auth/v1/logout", {
      method: "POST",
      headers: {
        apikey: "anon-key",
        Authorization: "Bearer access-token",
      },
    });
  });
});
