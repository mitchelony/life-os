import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authSessionKey, getBrowserAuthCallbackUrl, signOut, startGoogleSignIn } from "@/lib/auth";

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

describe("browser auth callback handling", () => {
  const originalWindow = globalThis.window;
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    const assign = vi.fn();
    const mockWindow = {
      localStorage: createMockStorage(),
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      location: {
        origin: "http://192.168.1.162:3000",
        hostname: "192.168.1.162",
        assign,
      },
    } as unknown as MockWindow;

    vi.stubGlobal("window", mockWindow);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalSupabaseAnonKey;
    if (originalWindow) {
      vi.stubGlobal("window", originalWindow);
    }
  });

  it("builds the auth callback URL from the current browser origin", () => {
    expect(getBrowserAuthCallbackUrl()).toBe("http://192.168.1.162:3000/auth/callback");
  });

  it("starts Google sign-in with the current browser callback URL", () => {
    startGoogleSignIn();

    expect(window.location.assign).toHaveBeenCalledTimes(1);

    const authorizeUrl = new URL((window.location.assign as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]);
    expect(authorizeUrl.origin).toBe("https://example.supabase.co");
    expect(authorizeUrl.pathname).toBe("/auth/v1/authorize");
    expect(authorizeUrl.searchParams.get("provider")).toBe("google");
    expect(authorizeUrl.searchParams.get("apikey")).toBe("anon-key");
    expect(authorizeUrl.searchParams.get("redirect_to")).toBe("http://192.168.1.162:3000/auth/callback");
  });
});
