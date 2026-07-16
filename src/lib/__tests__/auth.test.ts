// @vitest-environment node
import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";

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

test("createSession signs a token that encodes the userId and email", async () => {
  await createSession("user-1", "user@example.com");

  const [, token] = setMock.mock.calls[0];
  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || "development-secret-key"
  );
  const { payload } = await jwtVerify(token, secret);

  expect(payload.userId).toBe("user-1");
  expect(payload.email).toBe("user@example.com");
  expect(payload.expiresAt).toBeDefined();
});

test("createSession sets expires roughly 7 days out", async () => {
  const before = Date.now();
  await createSession("user-1", "user@example.com");
  const after = Date.now();

  const [, , options] = setMock.mock.calls[0];
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(options.expires.getTime()).toBeGreaterThanOrEqual(
    before + sevenDaysMs - 1000
  );
  expect(options.expires.getTime()).toBeLessThanOrEqual(
    after + sevenDaysMs + 1000
  );
});

test("createSession only sets secure in production", async () => {
  const originalEnv = process.env.NODE_ENV;

  (process.env as any).NODE_ENV = "development";
  await createSession("user-1", "user@example.com");
  expect(setMock.mock.calls[0][2]).toMatchObject({ secure: false });

  setMock.mockClear();

  (process.env as any).NODE_ENV = "production";
  await createSession("user-1", "user@example.com");
  expect(setMock.mock.calls[0][2]).toMatchObject({ secure: true });

  (process.env as any).NODE_ENV = originalEnv;
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

test("getSession returns null for a token signed with a different secret", async () => {
  const wrongSecret = new TextEncoder().encode("some-other-secret");
  const token = await new SignJWT({ userId: "user-1", email: "user@example.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(wrongSecret);
  cookieJar.set(COOKIE_NAME, token);

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null for an expired token", async () => {
  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || "development-secret-key"
  );
  const token = await new SignJWT({ userId: "user-1", email: "user@example.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("-1s")
    .setIssuedAt()
    .sign(secret);
  cookieJar.set(COOKIE_NAME, token);

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
