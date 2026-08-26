export class ApiRequestError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...options.headers },
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({})) as { data?: T; error?: { code?: string } };
  if (!response.ok) throw new ApiRequestError(result.error?.code || "internal", response.status);
  return result.data as T;
}

export function pollApi<T>(path: string, next: (value: T) => void, error?: (reason: Error) => void, intervalMs = 15_000) {
  let active = true;
  const load = async () => {
    try {
      const value = await apiRequest<T>(path);
      if (active) next(value);
    } catch (reason) {
      if (active) error?.(reason instanceof Error ? reason : new Error("internal"));
    }
  };
  void load();
  const timer = window.setInterval(load, intervalMs);
  const focus = () => { void load(); };
  window.addEventListener("focus", focus);
  return () => {
    active = false;
    window.clearInterval(timer);
    window.removeEventListener("focus", focus);
  };
}
