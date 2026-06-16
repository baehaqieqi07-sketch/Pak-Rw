import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import type { BootstrapData, PickerData } from "./types";
import { api } from "../lib/api";
import { DashboardContext } from "./DashboardContext";
import { AppShell } from "../layouts/AppShell";
import { DashboardHome } from "../pages/DashboardHome";
import { ManagePage } from "../pages/manage/ManagePage";
import { PlaceholderCenter } from "../pages/PlaceholderCenter";
import { ActivityPage, BackupPage, ChannelManagerPage, CommandCenterPage, LogsPage, PermissionCenterPage, RoleManagerPage, SettingsPage, BannerManagerPage } from "../pages/SystemPages";
import { ToastArea, type ToastState } from "../components/ui/Toast";

const emptyPicker: PickerData = { ok: false, channel: [], role: [], user: [] };

export function App() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [picker, setPicker] = useState<PickerData>(emptyPicker);
  const [loading, setLoading] = useState(true);
  const [pickerLoading, setPickerLoading] = useState(true);
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const notify = useCallback((message: string, kind: "success" | "error" | "info" = "success") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, message, kind }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4300);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await api.bootstrap();
      setData(next);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const refreshPicker = useCallback(async () => {
    setPickerLoading(true);
    try {
      const next = await api.picker();
      setPicker(next);
    } catch (err) {
      setPicker({ ...emptyPicker, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setPickerLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([refresh(), refreshPicker()]).finally(() => setLoading(false));
  }, [refresh, refreshPicker]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.querySelector<HTMLButtonElement>(".topbar-search-button")?.click();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (loading) return <div className="app-loading"><LoaderCircle className="spin" size={28} /><strong>Menyiapkan Balai Warga Digital</strong><span>Membaca config dan data Discord.</span></div>;
  if (!data || error) return <div className="app-error"><AlertTriangle size={30} /><strong>Dashboard belum dapat dimuat</strong><span>{error || "Data bootstrap tidak tersedia."}</span><button className="button button-primary" onClick={() => window.location.reload()}>Muat ulang</button></div>;

  return (
    <DashboardContext.Provider value={{ data, picker, pickerLoading, refresh, refreshPicker, notify }}>
      <Routes>
        <Route element={<AppShell data={data} />}>
          <Route index element={<DashboardHome data={data} />} />
          <Route path="manage/:feature" element={<ManagePage />} />
          <Route path="placeholder-center" element={<PlaceholderCenter />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="channel-manager" element={<ChannelManagerPage />} />
          <Route path="role-manager" element={<RoleManagerPage />} />
          <Route path="command-center" element={<CommandCenterPage />} />
          <Route path="permission-center" element={<PermissionCenterPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="backup" element={<BackupPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="banner-manager" element={<BannerManagerPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <ToastArea toasts={toasts} dismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </DashboardContext.Provider>
  );
}
