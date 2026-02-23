import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
import { AnimatePresence } from "framer-motion";
import "react-toastify/dist/ReactToastify.css";
import clsx from "clsx";
import { MobileBottomNav, DesktopSidebar, PageTransition } from "./components/navigation";
import SkipToMain from "./components/ui/SkipToMain";
import EmailHelpBlob from "./components/EmailHelpBlob";
import useKeyboardShortcuts from "./hooks/useKeyboardShortcuts";
import FundWalletPrompt from "./components/FundWalletPrompt";
import { useAuthStore } from "./store/authstore";
import Contribute from "./pages/Contribute";
import Wallet from "./pages/Wallet"; // ✨ Renamed from Transactions
import Profile from "./pages/Profile";
import Homepage from "./pages/Home";

const queryClient = new QueryClient();

const Dashboard = () => {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { user } = useAuthStore();
  const showFundWalletPrompt = location.pathname !== "/dashboard";
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen bg-[var(--color-background)]">
        {/* First-time wallet funding prompt */}
        {showFundWalletPrompt && <FundWalletPrompt balance={user?.balance || 0} />}
        
        {/* Skip to main content link for keyboard navigation */}
        <SkipToMain />
        
        {/* Desktop Sidebar */}
        <DesktopSidebar 
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Main Content Area */}
        <main
          id="main-content"
          className={clsx(
            "flex-1 w-full min-w-0 overflow-x-hidden",
            // Responsive margin offset for desktop sidebar
            isSidebarCollapsed ? "md:ml-[72px]" : "md:ml-[260px]",
            "pb-20 md:pb-0", // Bottom padding for mobile nav
            "p-4 sm:p-6 md:p-8", // Responsive padding
            "transition-all duration-300"
          )}
        >
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route
                  path="/"
                  element={
                    <PageTransition>
                      <Homepage />
                    </PageTransition>
                  }
                />
                <Route
                  path="contribute"
                  element={
                    <PageTransition>
                      <Contribute />
                    </PageTransition>
                  }
                />
                <Route
                  path="wallet"
                  element={
                    <PageTransition>
                      <Wallet />
                    </PageTransition>
                  }
                />
                <Route
                  path="profile"
                  element={
                    <PageTransition>
                      <Profile />
                    </PageTransition>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AnimatePresence>
          </div>
        </main>

        <EmailHelpBlob protectedView />

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />

        <ToastContainer />
      </div>
    </QueryClientProvider>
  );
};

export default Dashboard;
