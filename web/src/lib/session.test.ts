import { expect, test } from "vitest";

import { canAccessPath, destinationForSystemRole, hasSessionCookie, isProtectedPath } from "./session";

test("detects the platform session cookie inside a cookie header", () => {
  expect(hasSessionCookie("foo=bar; platform_session=session-123; theme=dark")).toBe(true);
  expect(hasSessionCookie("foo=bar; theme=dark")).toBe(false);
  expect(hasSessionCookie(undefined)).toBe(false);
});

test("maps system roles to their default destinations", () => {
  expect(destinationForSystemRole("platform_admin")).toBe("/admin");
  expect(destinationForSystemRole("tenant_admin")).toBe("/tenant");
  expect(destinationForSystemRole("tenant_member")).toBe("/app");
  expect(destinationForSystemRole("personal_user")).toBe("/app");
  expect(destinationForSystemRole(undefined)).toBe("/app");
});

test("identifies protected paths", () => {
  expect(isProtectedPath("/app")).toBe(true);
  expect(isProtectedPath("/tenant/members")).toBe(true);
  expect(isProtectedPath("/admin/users")).toBe(true);
  expect(isProtectedPath("/login")).toBe(false);
});

test("enforces path access rules by role", () => {
  expect(canAccessPath("/app", "platform_admin")).toBe(true);
  expect(canAccessPath("/app", "tenant_member")).toBe(true);
  expect(canAccessPath("/tenant", "tenant_admin")).toBe(true);
  expect(canAccessPath("/tenant", "platform_admin")).toBe(false);
  expect(canAccessPath("/admin", "platform_admin")).toBe(true);
  expect(canAccessPath("/admin", "tenant_admin")).toBe(false);
});
