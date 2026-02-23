import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Wallet, PlusCircle, User, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { useAuthStore } from "../../store/authstore";
import DMLogo from "../../assets/DMLogo.png";

const DesktopSidebar = ({ isCollapsed = false, onToggleCollapse }) => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    localStorage.removeItem('token');
    logout();
    navigate('/signin');
  };

  const navItems = [
    { path: "/dashboard", icon: Home, label: "Home" },
    { path: "/dashboard/contribute", icon: PlusCircle, label: "Contribute" },
    { path: "/dashboard/wallet", icon: Wallet, label: "Wallet" },
    { path: "/dashboard/profile", icon: User, label: "Profile" },
  ];

  return (
    <motion.nav
      role="navigation"
      aria-label="Main navigation"
      className={clsx(
        "hidden md:flex",
        "fixed top-0 left-0 h-screen z-40",
        "flex-col",
        "bg-[var(--color-surface)] border-r border-[var(--color-border)]",
        "transition-all duration-300"
      )}
      animate={{
        width: isCollapsed ? "72px" : "260px",
      }}
      initial={false}
      aria-expanded={!isCollapsed}
    >
      {/* Logo Section */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <img src={DMLogo} alt="MDBX logo" className="h-10 w-10" />
              <div className="flex flex-col">
                <span className="text-lg font-bold text-[var(--color-text-primary)] leading-none">
                  COOPEX
                </span>
                <span className="text-xs text-[var(--color-text-secondary)] font-medium">
                  mydewbox
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {isCollapsed && (
          <motion.img
            src={DMLogo}
            alt="MDBX logo"
            className="h-10 w-10 mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </div>

      {/* Navigation Items */}
      <div className="flex-1 px-3 py-4 space-y-1" role="list">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            aria-label={`Navigate to ${label}`}
            aria-current={({ isActive }) => (isActive ? "page" : undefined)}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3",
                "px-3 py-2.5 rounded-lg",
                "min-h-[44px]",
                "font-medium text-sm transition-all duration-150",
                isActive
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)]"
              )
            }
            role="listitem"
          >
            <Icon size={20} className="shrink-0" aria-hidden="true" />
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </div>

      {/* Collapse Toggle & Logout */}
      <div className="px-3 py-4 space-y-1 border-t border-[var(--color-border)]">
        <button
          onClick={handleLogout}
          aria-label="Logout from account"
          className={clsx(
            "flex items-center gap-3 w-full",
            "px-3 py-2.5 rounded-lg",
            "min-h-[44px]",
            "font-medium text-sm text-red-600",
            "hover:bg-[var(--color-error-light)] transition-all duration-150"
          )}
        >
          <LogOut size={20} className="shrink-0" aria-hidden="true" />
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="whitespace-nowrap overflow-hidden"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <button
          onClick={onToggleCollapse}
          className={clsx(
            "flex items-center justify-center w-full",
            "px-3 py-2.5 rounded-lg",
            "min-h-[44px]",
            "text-[var(--color-text-tertiary)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)]",
            "transition-all duration-150"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? (
            <ChevronRight size={20} aria-hidden="true" />
          ) : (
            <>
              <ChevronLeft size={20} className="shrink-0" aria-hidden="true" />
              <AnimatePresence mode="wait">
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="whitespace-nowrap overflow-hidden ml-3 text-sm font-medium"
                >
                  Collapse
                </motion.span>
              </AnimatePresence>
            </>
          )}
        </button>
      </div>
    </motion.nav>
  );
};

export default DesktopSidebar;
