import type { AppSettings, Category, Product } from "@/features/sales/types";

export const initialCategories: Category[] = [];

export const initialProducts: Product[] = [];

export const accentPalette = [
  "#4c8cff",
  "#4cd87e",
  "#ffc72b",
  "#aa52f2",
  "#ff708b",
  "#0f172a",
] as const;

export const defaultSettings: AppSettings = {
  pinRequired: true,
  offlineMode: true,
  compactNumbers: false,
  printSummary: false,
  startingCashCents: 0,
  cashPresets: [200, 500, 1000, 2000, 5000, 10000],
};
