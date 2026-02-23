import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useSettingsStore = create(
  persist(
    (set) => ({
      // Account settings
      twoFactorEnabled: false,
      biometricEnabled: false,
      
      // Security settings
      sessionTimeout: true,
      loginNotifications: true,
      
      // Preferences
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      hideBalanceByDefault: false,
      
      // Notification settings
      transactionAlerts: true,
      marketingEmails: false,
      securityAlerts: true,
      
      // Update functions
      updateSetting: (key, value) => set({ [key]: value }),
      resetSettings: () => set({
        twoFactorEnabled: false,
        biometricEnabled: false,
        sessionTimeout: true,
        loginNotifications: true,
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        hideBalanceByDefault: false,
        transactionAlerts: true,
        marketingEmails: false,
        securityAlerts: true,
      }),
    }),
    {
      name: 'settings-storage',
    }
  )
);
