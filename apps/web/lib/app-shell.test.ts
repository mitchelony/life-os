import { describe, expect, it } from "vitest";
import { chunkMobileNavItems, getActiveNavItem, navItems } from "./app-shell";

describe("app-shell mobile helpers", () => {
  it("maps the root path to dashboard", () => {
    expect(getActiveNavItem("/", navItems)?.href).toBe("/dashboard");
  });

  it("keeps mobile navigation in two rows of four items", () => {
    const rows = chunkMobileNavItems(navItems, 4);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveLength(4);
    expect(rows[1]).toHaveLength(4);
    expect(rows[1][1]?.mobileLabel).toBe("Roadmap");
  });
});
