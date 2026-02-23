import { create } from "zustand";
import { persist } from "zustand/middleware";

export const userStore = create(
  persist(
    (set, get) => ({
      phone: "",
      isVerified: false,
      otp: "",
      otpExpiry: null,
      
      setPhone: (phone) => set({ phone }),
      setIsVerified: (status) => set({ isVerified: status }),
      setOtp: (otp) => set({ 
        otp,
        otpExpiry: new Date(Date.now() + 10 * 60000) // 10 minutes expiry
      }),
      clearOtp: () => set({ otp: "", otpExpiry: null }),
      validateOtp: (inputOtp) => {
        const state = get();
        const now = new Date();
        if (!state.otpExpiry || new Date(state.otpExpiry) < now) {
          return false; // OTP expired
        }
        const isValid = state.otp === inputOtp;
        if (isValid) {
          set({ isVerified: true });
        }
        return isValid;
      }
    }),
    {
      name: "user-storage",
      getStorage: () => localStorage,
      // Privacy-by-design: avoid persisting transient OTP values in browser storage.
      partialize: (state) => ({
        phone: state.phone,
        isVerified: state.isVerified,
      }),
    }
  )
);

export const useAuthStore = create(
  persist(
    (set) => ({
      isSignedIn: false,
      user: null,
      login: (user) => set({ isSignedIn: true, user }),
      logout: () => set({ isSignedIn: false, user: null }),
    }),
    {
      name: 'auth-storage', // unique name for localStorage key
    }
  )
);
