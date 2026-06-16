import { createContext, useContext } from "react";
import type { BootstrapData, PickerData } from "./types";

export type DashboardContextValue = {
  data: BootstrapData;
  picker: PickerData;
  pickerLoading: boolean;
  refresh: () => Promise<void>;
  refreshPicker: () => Promise<void>;
  notify: (message: string, kind?: "success" | "error" | "info") => void;
};

export const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard() {
  const value = useContext(DashboardContext);
  if (!value) throw new Error("DashboardContext belum tersedia.");
  return value;
}
