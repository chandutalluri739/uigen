import { test, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const pushMock = vi.fn();
const signInActionMock = vi.fn();
const signUpActionMock = vi.fn();
const getAnonWorkDataMock = vi.fn();
const clearAnonWorkMock = vi.fn();
const getProjectsMock = vi.fn();
const createProjectMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/actions", () => ({
  signIn: signInActionMock,
  signUp: signUpActionMock,
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: getAnonWorkDataMock,
  clearAnonWork: clearAnonWorkMock,
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: getProjectsMock,
}));

vi.mock("@/actions/create-project", () => ({
  createProject: createProjectMock,
}));

const { useAuth } = await import("../use-auth");

beforeEach(() => {
  vi.clearAllMocks();
  getAnonWorkDataMock.mockReturnValue(null);
  getProjectsMock.mockResolvedValue([]);
});

test("isLoading starts false", () => {
  const { result } = renderHook(() => useAuth());
  expect(result.current.isLoading).toBe(false);
});

test("signIn sets isLoading during the call and resets after", async () => {
  let resolveSignIn: (value: any) => void;
  signInActionMock.mockReturnValue(
    new Promise((resolve) => {
      resolveSignIn = resolve;
    })
  );
  createProjectMock.mockResolvedValue({ id: "new-project" });

  const { result } = renderHook(() => useAuth());

  let signInPromise: Promise<any>;
  act(() => {
    signInPromise = result.current.signIn("a@b.com", "password");
  });

  await waitFor(() => expect(result.current.isLoading).toBe(true));

  await act(async () => {
    resolveSignIn!({ success: true });
    await signInPromise;
  });

  expect(result.current.isLoading).toBe(false);
});

test("signIn returns the result from the sign in action", async () => {
  signInActionMock.mockResolvedValue({ success: false, error: "Invalid credentials" });

  const { result } = renderHook(() => useAuth());

  let response: any;
  await act(async () => {
    response = await result.current.signIn("a@b.com", "wrong");
  });

  expect(response).toEqual({ success: false, error: "Invalid credentials" });
});

test("signIn does not run post-sign-in flow when unsuccessful", async () => {
  signInActionMock.mockResolvedValue({ success: false, error: "Invalid credentials" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("a@b.com", "wrong");
  });

  expect(getAnonWorkDataMock).not.toHaveBeenCalled();
  expect(pushMock).not.toHaveBeenCalled();
});

test("signIn with anonymous work creates a project from it and navigates there", async () => {
  signInActionMock.mockResolvedValue({ success: true });
  getAnonWorkDataMock.mockReturnValue({
    messages: [{ role: "user", content: "hi" }],
    fileSystemData: { "/": {} },
  });
  createProjectMock.mockResolvedValue({ id: "project-1" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("a@b.com", "password");
  });

  expect(createProjectMock).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [{ role: "user", content: "hi" }],
      data: { "/": {} },
    })
  );
  expect(clearAnonWorkMock).toHaveBeenCalled();
  expect(pushMock).toHaveBeenCalledWith("/project-1");
});

test("signIn with no anonymous work navigates to the most recent project", async () => {
  signInActionMock.mockResolvedValue({ success: true });
  getAnonWorkDataMock.mockReturnValue(null);
  getProjectsMock.mockResolvedValue([{ id: "existing-1" }, { id: "existing-2" }]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("a@b.com", "password");
  });

  expect(createProjectMock).not.toHaveBeenCalled();
  expect(pushMock).toHaveBeenCalledWith("/existing-1");
});

test("signIn with no anonymous work and no projects creates a new project", async () => {
  signInActionMock.mockResolvedValue({ success: true });
  getAnonWorkDataMock.mockReturnValue(null);
  getProjectsMock.mockResolvedValue([]);
  createProjectMock.mockResolvedValue({ id: "new-project" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("a@b.com", "password");
  });

  expect(createProjectMock).toHaveBeenCalledWith(
    expect.objectContaining({ messages: [], data: {} })
  );
  expect(pushMock).toHaveBeenCalledWith("/new-project");
});

test("signIn treats empty anonymous messages as no anonymous work", async () => {
  signInActionMock.mockResolvedValue({ success: true });
  getAnonWorkDataMock.mockReturnValue({ messages: [], fileSystemData: {} });
  getProjectsMock.mockResolvedValue([{ id: "existing-1" }]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("a@b.com", "password");
  });

  expect(createProjectMock).not.toHaveBeenCalled();
  expect(pushMock).toHaveBeenCalledWith("/existing-1");
});

test("signUp sets isLoading during the call and resets after", async () => {
  let resolveSignUp: (value: any) => void;
  signUpActionMock.mockReturnValue(
    new Promise((resolve) => {
      resolveSignUp = resolve;
    })
  );

  const { result } = renderHook(() => useAuth());

  let signUpPromise: Promise<any>;
  act(() => {
    signUpPromise = result.current.signUp("a@b.com", "password");
  });

  await waitFor(() => expect(result.current.isLoading).toBe(true));

  await act(async () => {
    resolveSignUp!({ success: true });
    await signUpPromise;
  });

  expect(result.current.isLoading).toBe(false);
});

test("signUp returns the result from the sign up action", async () => {
  signUpActionMock.mockResolvedValue({ success: false, error: "Email already exists" });

  const { result } = renderHook(() => useAuth());

  let response: any;
  await act(async () => {
    response = await result.current.signUp("a@b.com", "password");
  });

  expect(response).toEqual({ success: false, error: "Email already exists" });
});

test("signUp does not run post-sign-in flow when unsuccessful", async () => {
  signUpActionMock.mockResolvedValue({ success: false, error: "Email already exists" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("a@b.com", "password");
  });

  expect(getAnonWorkDataMock).not.toHaveBeenCalled();
  expect(pushMock).not.toHaveBeenCalled();
});

test("signUp with anonymous work creates a project from it and navigates there", async () => {
  signUpActionMock.mockResolvedValue({ success: true });
  getAnonWorkDataMock.mockReturnValue({
    messages: [{ role: "user", content: "hello" }],
    fileSystemData: { "/": {} },
  });
  createProjectMock.mockResolvedValue({ id: "project-2" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("a@b.com", "password");
  });

  expect(createProjectMock).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [{ role: "user", content: "hello" }],
      data: { "/": {} },
    })
  );
  expect(clearAnonWorkMock).toHaveBeenCalled();
  expect(pushMock).toHaveBeenCalledWith("/project-2");
});
