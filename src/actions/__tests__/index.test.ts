// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";

const prismaMock = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

const bcryptMock = {
  hash: vi.fn(),
  compare: vi.fn(),
};

const createSessionMock = vi.fn();
const deleteSessionMock = vi.fn();
const getSessionMock = vi.fn();
const revalidatePathMock = vi.fn();
const redirectMock = vi.fn();

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("bcrypt", () => ({ default: bcryptMock }));
vi.mock("@/lib/auth", () => ({
  createSession: createSessionMock,
  deleteSession: deleteSessionMock,
  getSession: getSessionMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const { signUp, signIn, signOut, getUser } = await import("../index");

beforeEach(() => {
  vi.clearAllMocks();
});

test("signUp rejects missing email or password", async () => {
  expect(await signUp("", "password123")).toEqual({
    success: false,
    error: "Email and password are required",
  });
  expect(await signUp("user@example.com", "")).toEqual({
    success: false,
    error: "Email and password are required",
  });
  expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
});

test("signUp rejects passwords shorter than 8 characters", async () => {
  const result = await signUp("user@example.com", "short");

  expect(result).toEqual({
    success: false,
    error: "Password must be at least 8 characters",
  });
  expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
});

test("signUp rejects an email that is already registered", async () => {
  prismaMock.user.findUnique.mockResolvedValue({
    id: "existing-user",
    email: "user@example.com",
  });

  const result = await signUp("user@example.com", "password123");

  expect(result).toEqual({
    success: false,
    error: "Email already registered",
  });
  expect(prismaMock.user.create).not.toHaveBeenCalled();
});

test("signUp creates a user, hashes the password, and creates a session", async () => {
  prismaMock.user.findUnique.mockResolvedValue(null);
  bcryptMock.hash.mockResolvedValue("hashed-password");
  prismaMock.user.create.mockResolvedValue({
    id: "new-user",
    email: "user@example.com",
  });

  const result = await signUp("user@example.com", "password123");

  expect(bcryptMock.hash).toHaveBeenCalledWith("password123", 10);
  expect(prismaMock.user.create).toHaveBeenCalledWith({
    data: { email: "user@example.com", password: "hashed-password" },
  });
  expect(createSessionMock).toHaveBeenCalledWith("new-user", "user@example.com");
  expect(revalidatePathMock).toHaveBeenCalledWith("/");
  expect(result).toEqual({ success: true });
});

test("signUp returns a generic error when something throws", async () => {
  prismaMock.user.findUnique.mockRejectedValue(new Error("db down"));

  const result = await signUp("user@example.com", "password123");

  expect(result).toEqual({
    success: false,
    error: "An error occurred during sign up",
  });
});

test("signIn rejects missing email or password", async () => {
  expect(await signIn("", "password123")).toEqual({
    success: false,
    error: "Email and password are required",
  });
  expect(await signIn("user@example.com", "")).toEqual({
    success: false,
    error: "Email and password are required",
  });
  expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
});

test("signIn rejects when the user does not exist", async () => {
  prismaMock.user.findUnique.mockResolvedValue(null);

  const result = await signIn("user@example.com", "password123");

  expect(result).toEqual({ success: false, error: "Invalid credentials" });
  expect(bcryptMock.compare).not.toHaveBeenCalled();
});

test("signIn rejects an incorrect password", async () => {
  prismaMock.user.findUnique.mockResolvedValue({
    id: "user-1",
    email: "user@example.com",
    password: "hashed-password",
  });
  bcryptMock.compare.mockResolvedValue(false);

  const result = await signIn("user@example.com", "wrong-password");

  expect(bcryptMock.compare).toHaveBeenCalledWith(
    "wrong-password",
    "hashed-password"
  );
  expect(result).toEqual({ success: false, error: "Invalid credentials" });
  expect(createSessionMock).not.toHaveBeenCalled();
});

test("signIn creates a session on valid credentials", async () => {
  prismaMock.user.findUnique.mockResolvedValue({
    id: "user-1",
    email: "user@example.com",
    password: "hashed-password",
  });
  bcryptMock.compare.mockResolvedValue(true);

  const result = await signIn("user@example.com", "password123");

  expect(createSessionMock).toHaveBeenCalledWith("user-1", "user@example.com");
  expect(revalidatePathMock).toHaveBeenCalledWith("/");
  expect(result).toEqual({ success: true });
});

test("signIn returns a generic error when something throws", async () => {
  prismaMock.user.findUnique.mockRejectedValue(new Error("db down"));

  const result = await signIn("user@example.com", "password123");

  expect(result).toEqual({
    success: false,
    error: "An error occurred during sign in",
  });
});

test("signOut deletes the session, revalidates, and redirects home", async () => {
  await signOut();

  expect(deleteSessionMock).toHaveBeenCalled();
  expect(revalidatePathMock).toHaveBeenCalledWith("/");
  expect(redirectMock).toHaveBeenCalledWith("/");
});

test("getUser returns null when there is no session", async () => {
  getSessionMock.mockResolvedValue(null);

  const result = await getUser();

  expect(result).toBeNull();
  expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
});

test("getUser returns the user for a valid session", async () => {
  getSessionMock.mockResolvedValue({
    userId: "user-1",
    email: "user@example.com",
  });
  prismaMock.user.findUnique.mockResolvedValue({
    id: "user-1",
    email: "user@example.com",
    createdAt: new Date("2026-01-01"),
  });

  const result = await getUser();

  expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
    where: { id: "user-1" },
    select: { id: true, email: true, createdAt: true },
  });
  expect(result).toEqual({
    id: "user-1",
    email: "user@example.com",
    createdAt: new Date("2026-01-01"),
  });
});

test("getUser returns null when the lookup throws", async () => {
  getSessionMock.mockResolvedValue({
    userId: "user-1",
    email: "user@example.com",
  });
  prismaMock.user.findUnique.mockRejectedValue(new Error("db down"));

  const result = await getUser();

  expect(result).toBeNull();
});
