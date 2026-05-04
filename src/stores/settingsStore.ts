import { create } from "zustand";
import type { AppSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import { api } from "@/lib/tauri";
import i18n from "@/i18n";

function applyTheme(theme: AppSettings["theme"]) {
  const root = document.documentElement;
  if (theme === "light") {
    root.dataset.theme = "light";
  } else if (theme === "dark") {
    delete root.dataset.theme;
  } else {
    // system: follow OS preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) {
      delete root.dataset.theme;
    } else {
      root.dataset.theme = "light";
    }
  }
}

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (settings: AppSettings) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  load: async () => {
    const settings = await api.settings.get();
    set({ settings, loaded: true });
    if (settings.language) {
      await i18n.changeLanguage(settings.language);
    }
    applyTheme(settings.theme);
  },

  update: async (settings) => {
    await api.settings.save(settings);
    set({ settings });
    await i18n.changeLanguage(settings.language);
    applyTheme(settings.theme);
  },
}));
