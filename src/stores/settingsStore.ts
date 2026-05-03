import { create } from "zustand";
import type { AppSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import { api } from "@/lib/tauri";
import i18n from "@/i18n";

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
  },

  update: async (settings) => {
    await api.settings.save(settings);
    set({ settings });
    await i18n.changeLanguage(settings.language);
  },
}));
