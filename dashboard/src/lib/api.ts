import type { BootstrapData, PickerData } from "../app/types";

async function parseJson<T>(res: Response): Promise<T> {
  if (res.status === 401 || res.redirected && res.url.includes("/login")) {
    window.location.href = "/login";
    throw new Error("Sesi dashboard berakhir.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `HTTP ${res.status}`);
  return data as T;
}

export const api = {
  bootstrap: async () => parseJson<BootstrapData>(await fetch("/api/dashboard/bootstrap", { credentials: "same-origin", cache: "no-store" })),
  picker: async () => parseJson<PickerData>(await fetch("/api/discord-picker-data", { credentials: "same-origin", cache: "no-store" })),
  savePatches: async (patches: Array<{ path: string; value: unknown }>) => parseJson<{ ok: boolean; config: Record<string, any> }>(await fetch("/api/dashboard/settings", {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patches })
  })),
  saveEmbed: async (key: string, embed: Record<string, any>) => parseJson<{ ok: boolean; embed: Record<string, any> }>(await fetch(`/api/dashboard/embed/${encodeURIComponent(key)}`, {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embed })
  })),
  testEmbed: async (channelId: string, embed: Record<string, any>) => parseJson<{ ok: boolean; messageId?: string }>(await fetch("/api/dashboard/test-embed", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channelId, embed })
  })),
  health: async () => parseJson<any>(await fetch("/api/dashboard/health", { credentials: "same-origin", cache: "no-store" }))
};
