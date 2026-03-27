import { webcrypto } from "node:crypto";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as typeof globalThis.crypto;
}

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
  },
});
