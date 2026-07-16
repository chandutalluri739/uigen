// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const COOKIE_NAME = "auth-token";

const cookieJar = new Map<string, string>();
const setMock = vi.fn((name: string, value: string, _options: any) => {
  cookieJar.set(name, value);
});
const deleteMock = vi.fn((name: string) => {
  cookieJar.delete(name);
});

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: setMock,
    delete: deleteMock,
  })),
}));

const { createSession, getSession, deleteSession, verifySession } = await import(
  "../auth"
);

beforeEach(() => {
  cookieJar.clear();
  setMock.mockClear();
  deleteMock.mockClear();
});

function makeRequest(token?: string) {
  const headers = new Headers();
  if (token) {
    headers.set("cookie", `${COOKIE_NAME}=${token}`);
  }
  return new NextRequest("http://localhost/", { headers });
}

test("createSession sets an httpOnly cookie with the expected options", async () => {
  await createSession("user-1", "user@example.com");

  expect(setMock).toHaveBeenCalledTimes(1);
  const [name, token, options] = setMock.mock.calls[0];

  expect(name).toBe(COOKIE_NAME);
  expect(typeof token).toBe("string");
  expect(options).toMatchObject({
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  expect(options.expires).toBeInstanceOf(Date);
  expect(options.expires.getTime()).toBeGreaterThan(Date.now());
});

test("getSession returns null when there is no cookie", async () => {
  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns the session payload for a valid token", async () => {
  await createSession("user-1", "user@example.com");

  const session = await getSession();

  expect(session).not.toBeNull();
  expect(session?.userId).toBe("user-1");
  expect(session?.email).toBe("user@example.com");
});

test("getSession returns null for a tampered/invalid token", async () => {
  cookieJar.set(COOKIE_NAME, "not-a-valid-jwt");

  const session = await getSession();

  expect(session).toBeNull();
});

test("deleteSession removes the auth cookie", async () => {
  await createSession("user-1", "user@example.com");
  expect(cookieJar.has(COOKIE_NAME)).toBe(true);

  await deleteSession();

  expect(deleteMock).toHaveBeenCalledWith(COOKIE_NAME);
  expect(cookieJar.has(COOKIE_NAME)).toBe(false);
});

test("verifySession returns null when the request has no auth cookie", async () => {
  const session = await verifySession(makeRequest());
  expect(session).toBeNull();
});

test("verifySession returns null for an invalid token", async () => {
  const session = await verifySession(makeRequest("garbage-token"));
  expect(session).toBeNull();
});

test("verifySession returns the payload for a valid token", async () => {
  await createSession("user-2", "another@example.com");
  const token = cookieJar.get(COOKIE_NAME)!;

  const session = await verifySession(makeRequest(token));

  expect(session).not.toBeNull();
  expect(session?.userId).toBe("user-2");
  expect(session?.email).toBe("another@example.com");
});
