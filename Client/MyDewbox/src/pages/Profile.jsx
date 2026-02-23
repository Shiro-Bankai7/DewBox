import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  ChevronRight,
  CircleHelp,
  Coins,
  Edit3,
  EyeOff,
  LogOut,
  Megaphone,
  Moon,
  ReceiptText,
  Save,
  Settings,
  Shield,
  Sun,
  Wallet,
  X,
} from "lucide-react";
import { apiService } from "../services/api";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import { useAuthStore } from "../store/authstore";
import { useThemeStore } from "../store/themeStore";
import { useSettingsStore } from "../store/settingsStore";
import { formatPublicId } from "../utils/publicId";

const formatNaira = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount || 0);

const INITIAL_EDIT_FORM = {
  firstname: "",
  surname: "",
  email: "",
  mobile: "",
  city: "",
  state: "",
  lga: "",
  country: "",
  address1: "",
};

const Switch = ({ checked, onClick, label }) => (
  <button
    type="button"
    role="switch"
    aria-label={label}
    aria-checked={checked}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    className={`relative inline-flex h-9 w-16 rounded-full border transition-colors duration-150 ${
      checked
        ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
        : "bg-[var(--color-surface)] border-[var(--color-text-tertiary)]"
    }`}
  >
    <span
      className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow-sm transition-transform duration-150 ${
        checked ? "translate-x-8" : "translate-x-1"
      }`}
    />
  </button>
);

const MobileRow = ({ icon: Icon, title, subtitle, badge, withBorder = true, onClick, rightNode }) => {
  const isInteractive = typeof onClick === "function";
  const hasRightNode = Boolean(rightNode);
  const className = `w-full flex items-center gap-3 px-4 py-4 ${withBorder ? "border-b border-[var(--color-border)]" : ""}`;

  const handleKeyDown = (event) => {
    if (!isInteractive) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  const content = (
    <>
      <Icon className="text-[var(--color-text-primary)] shrink-0" size={22} />
      <div className="flex-1 text-left min-w-0">
        <p className="text-base font-medium leading-tight text-[var(--color-text-primary)]">{title}</p>
        {subtitle && <p className="text-xs mt-0.5 text-[var(--color-text-secondary)] truncate">{subtitle}</p>}
      </div>
      {badge && (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
          {badge}
        </span>
      )}
      {rightNode || <ChevronRight className="text-[var(--color-text-tertiary)] shrink-0" size={20} />}
    </>
  );

  if (hasRightNode) {
    return (
      <div
        role={isInteractive ? "button" : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onClick={isInteractive ? onClick : undefined}
        onKeyDown={handleKeyDown}
        className={className}
      >
        {content}
      </div>
    );
  }

  if (!isInteractive) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
};

const EditField = ({ label, value, onChange, name, type = "text", placeholder = "", fullWidth = false }) => (
  <label className={`flex flex-col gap-1 ${fullWidth ? "sm:col-span-2" : ""}`}>
    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{label}</span>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="min-h-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
    />
  </label>
);

const ProfileSkeleton = () => (
  <section className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
    <div className="flex justify-between items-center">
      <Skeleton width="120px" height="34px" />
      <Skeleton width="44px" height="44px" className="rounded-full" />
    </div>
    <Card variant="elevated" padding="md">
      <div className="flex items-center gap-3">
        <Skeleton width="56px" height="56px" className="rounded-full" />
        <div className="flex-1">
          <Skeleton width="180px" height="22px" className="mb-2" />
          <Skeleton width="220px" height="16px" />
        </div>
      </div>
    </Card>
    <Card variant="elevated" padding="md">
      <Skeleton width="100%" height="90px" className="rounded-xl" />
    </Card>
    <Card variant="elevated" padding="none">
      <Skeleton width="100%" height="180px" />
    </Card>
  </section>
);

const Profile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editForm, setEditForm] = useState(INITIAL_EDIT_FORM);

  const {
    twoFactorEnabled,
    hideBalanceByDefault,
    loginNotifications,
    transactionAlerts,
    marketingEmails,
    securityAlerts,
    updateSetting,
  } = useSettingsStore();

  const { data: subscriberData, isLoading, isFetching, error } = useQuery({
    queryKey: ["subscriber"],
    queryFn: () => apiService.getSubscriber(),
    retry: 1,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const subscriber = subscriberData?.data?.subscriber || subscriberData?.subscriber;

  useEffect(() => {
    if (!subscriber) return;
    setEditForm({
      firstname: subscriber.firstname || "",
      surname: subscriber.surname || "",
      email: subscriber.email || "",
      mobile: subscriber.mobile || "",
      city: subscriber.city || "",
      state: subscriber.state || "",
      lga: subscriber.lga || "",
      country: subscriber.country || "",
      address1: subscriber.address1 || "",
    });
  }, [subscriber]);

  const updateProfileMutation = useMutation({
    mutationFn: (payload) => apiService.updateProfile(payload),
    onSuccess: (response) => {
      const updatedSubscriber = response?.data?.subscriber || response?.subscriber;
      if (updatedSubscriber) {
        queryClient.setQueryData(["subscriber"], (previous) => {
          const previousPayload = previous?.data || {};
          const previousSubscriber = previousPayload?.subscriber || {};
          return {
            ...(previous || {}),
            data: {
              ...previousPayload,
              subscriber: {
                ...previousSubscriber,
                ...updatedSubscriber,
              },
            },
          };
        });
      }

      queryClient.invalidateQueries({ queryKey: ["subscriber"] });
      toast.success("Profile updated successfully");
      setIsEditProfileOpen(false);
    },
    onError: (mutationError) => {
      const message =
        mutationError?.response?.data?.message ||
        mutationError?.message ||
        "Failed to update profile";
      toast.error(message);
    },
  });

  const profile = useMemo(() => {
    if (!subscriber) {
      return {
        fullName: "User",
        initials: "U",
        email: "No email available",
        profileImage: "",
        memberSince: "N/A",
        walletBalance: 0,
        icaBalance: 0,
        piggyBalance: 0,
        referral: "",
        memberId: "N/A",
      };
    }

    const first = subscriber.firstname || "";
    const last = subscriber.surname || "";
    return {
      fullName: `${first} ${last}`.trim() || "User",
      initials: `${first[0] || ""}${last[0] || ""}`.toUpperCase() || "U",
      email: subscriber.email || "No email available",
      profileImage: subscriber.profileImage || "",
      memberSince: subscriber.createdAt
        ? new Date(subscriber.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long" })
        : "N/A",
      walletBalance: Number.parseFloat(subscriber.balance) || 0,
      icaBalance: Number.parseFloat(subscriber.ica_balance) || 0,
      piggyBalance: Number.parseFloat(subscriber.piggy_balance) || 0,
      referral: subscriber.referral || "",
      memberId: formatPublicId(subscriber.id, subscriber.publicId || subscriber.public_id),
    };
  }, [subscriber]);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    logout();
    toast.success("Signed out successfully");
    navigate("/signin");
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleEditSubmit = (event) => {
    event.preventDefault();
    const payload = {
      firstname: editForm.firstname.trim(),
      surname: editForm.surname.trim(),
      email: editForm.email.trim(),
      mobile: editForm.mobile.trim(),
      city: editForm.city.trim(),
      state: editForm.state.trim(),
      lga: editForm.lga.trim(),
      country: editForm.country.trim(),
      address1: editForm.address1.trim(),
    };

    if (!payload.firstname || !payload.surname) {
      toast.error("First name and surname are required");
      return;
    }

    updateProfileMutation.mutate(payload);
  };

  if (isLoading || isFetching) {
    return <ProfileSkeleton />;
  }

  if (error || !subscriber) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <p className="text-red-600">Error loading profile data</p>
        <p className="text-sm text-[var(--color-text-secondary)]">Please try again</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-all duration-150 shadow-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <motion.section
        className="max-w-5xl mx-auto p-4 sm:p-6 w-full space-y-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        <div className="lg:hidden space-y-4">
          <div className="relative flex items-center justify-center py-2">
            <h1 className="text-3xl font-semibold text-[var(--color-text-primary)]">Settings</h1>
            <button
              type="button"
              aria-label="Help"
              className="absolute right-0 w-11 h-11 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center"
            >
              <CircleHelp size={22} className="text-[var(--color-text-primary)]" />
            </button>
          </div>

          <Card variant="elevated" padding="none" className="rounded-2xl overflow-hidden">
            <div className="w-full p-4 flex items-center gap-3 text-left">
              <div className="w-14 h-14 rounded-full bg-[var(--color-text-primary)] text-[var(--color-surface)] flex items-center justify-center text-lg font-semibold shrink-0 overflow-hidden">
                {profile.profileImage ? (
                  <img src={profile.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  profile.initials
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xl font-semibold text-[var(--color-text-primary)]">{profile.fullName}</p>
                <p className="text-sm mt-1 text-[var(--color-text-secondary)] break-all">{profile.email}</p>
                <p className="text-xs mt-1 text-[var(--color-text-tertiary)]">Member ID: {profile.memberId}</p>
              </div>
              <ChevronRight className="text-[var(--color-text-tertiary)] shrink-0" size={22} />
            </div>
          </Card>

          <Button
            variant="secondary"
            size="md"
            fullWidth
            icon={<Edit3 size={18} />}
            onClick={() => setIsEditProfileOpen(true)}
          >
            Edit profile
          </Button>

          <button
            type="button"
            onClick={toggleTheme}
            className="w-full rounded-2xl border border-[var(--color-primary)]/35 bg-gradient-to-r from-[var(--color-primary-light)] via-[var(--color-surface)] to-[var(--color-primary-light)] p-4 flex items-center gap-3 text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-[var(--color-primary)]/15 text-[var(--color-primary)] flex items-center justify-center shrink-0">
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-[var(--color-text-primary)]">Appearance</p>
              <p className="text-sm mt-1 text-[var(--color-text-secondary)]">
                Tap to switch to {theme === "light" ? "Dark" : "Light"} mode
              </p>
            </div>
            <ChevronRight className="text-[var(--color-primary)] shrink-0" size={22} />
          </button>

          <div>
            <h2 className="text-2xl font-medium text-[var(--color-text-secondary)] mb-2">Security</h2>
            <Card variant="elevated" padding="none" className="rounded-2xl overflow-hidden">
              <MobileRow
                icon={Shield}
                title="Two-factor authentication"
                subtitle={twoFactorEnabled ? "Enabled" : "Disabled"}
                onClick={() => updateSetting("twoFactorEnabled", !twoFactorEnabled)}
              />
              <MobileRow
                icon={Bell}
                title="Tips for your account"
                subtitle={loginNotifications ? "Notifications on" : "Notifications off"}
                onClick={() => updateSetting("loginNotifications", !loginNotifications)}
              />
              <MobileRow
                icon={EyeOff}
                title="Hide balance by default"
                withBorder={false}
                rightNode={
                  <Switch
                    checked={Boolean(hideBalanceByDefault)}
                    onClick={() => updateSetting("hideBalanceByDefault", !hideBalanceByDefault)}
                    label="Hide balance by default"
                  />
                }
                onClick={() => updateSetting("hideBalanceByDefault", !hideBalanceByDefault)}
              />
            </Card>
          </div>

          <div>
            <h2 className="text-2xl font-medium text-[var(--color-text-secondary)] mb-2">Finances</h2>
            <Card variant="elevated" padding="none" className="rounded-2xl overflow-hidden">
              <MobileRow
                icon={Coins}
                title="Wallet balance"
                badge={hideBalanceByDefault ? "*****" : formatNaira(profile.walletBalance)}
                onClick={() => {}}
              />
              <MobileRow
                icon={Megaphone}
                title="Referral Program"
                subtitle={profile.referral ? `Code: ${profile.referral}` : "Invite members and receive referral rewards"}
                onClick={() => {}}
              />
              <MobileRow
                icon={ReceiptText}
                title="Transaction alerts"
                subtitle={transactionAlerts ? "Active" : "Disabled"}
                onClick={() => updateSetting("transactionAlerts", !transactionAlerts)}
              />
              <MobileRow
                icon={Settings}
                title="Deals for you"
                subtitle={marketingEmails ? "Active" : "Disabled"}
                withBorder={false}
                onClick={() => updateSetting("marketingEmails", !marketingEmails)}
              />
            </Card>
          </div>

          <Button variant="danger" size="md" fullWidth icon={<LogOut size={18} />} onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>

        <div className="hidden lg:grid grid-cols-12 gap-6">
          <div className="col-span-12 xl:col-span-4 space-y-4">
            <Card variant="elevated" padding="lg">
              <div className="w-20 h-20 rounded-2xl bg-[var(--color-text-primary)] text-[var(--color-surface)] flex items-center justify-center text-2xl font-semibold overflow-hidden mb-4">
                {profile.profileImage ? (
                  <img src={profile.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  profile.initials
                )}
              </div>
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{profile.fullName}</h2>
              <p className="text-sm text-[var(--color-text-secondary)] break-all mt-1">{profile.email}</p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Member ID: {profile.memberId}</p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-2">Member since {profile.memberSince}</p>
              <div className="mt-4">
                <Button variant="secondary" size="sm" fullWidth icon={<Edit3 size={16} />} onClick={() => setIsEditProfileOpen(true)}>
                  Edit profile
                </Button>
              </div>
            </Card>

            <Card variant="elevated" padding="lg" className="bg-gradient-to-br from-[var(--color-primary-light)] to-[var(--color-surface)] border-[var(--color-primary)]/30">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">Appearance</p>
                  <p className="text-lg font-semibold text-[var(--color-text-primary)] mt-1">{theme === "light" ? "Light Mode" : "Dark Mode"}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={toggleTheme} icon={theme === "light" ? <Moon size={16} /> : <Sun size={16} />}>
                  Switch
                </Button>
              </div>
            </Card>
          </div>

          <div className="col-span-12 xl:col-span-8 space-y-4">
            <Card variant="elevated" padding="lg">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Security</h3>
              <div className="space-y-3">
                <MobileRow icon={Shield} title="Two-factor authentication" subtitle={twoFactorEnabled ? "Enabled" : "Disabled"} onClick={() => updateSetting("twoFactorEnabled", !twoFactorEnabled)} />
                <MobileRow icon={Bell} title="Tips for your account" subtitle={securityAlerts ? "Alerts enabled" : "Alerts disabled"} onClick={() => updateSetting("securityAlerts", !securityAlerts)} />
                <MobileRow icon={EyeOff} title="Hide balance by default" withBorder={false} rightNode={<Switch checked={Boolean(hideBalanceByDefault)} onClick={() => updateSetting("hideBalanceByDefault", !hideBalanceByDefault)} label="Hide balance by default" />} onClick={() => updateSetting("hideBalanceByDefault", !hideBalanceByDefault)} />
              </div>
            </Card>

            <Card variant="elevated" padding="lg">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Finances</h3>
              <div className="space-y-3">
                <MobileRow icon={Wallet} title="Wallet balance" subtitle={hideBalanceByDefault ? "*****" : formatNaira(profile.walletBalance)} onClick={() => {}} />
                <MobileRow icon={Coins} title="ICA balance" subtitle={hideBalanceByDefault ? "*****" : formatNaira(profile.icaBalance)} onClick={() => {}} />
                <MobileRow icon={Coins} title="Piggy balance" subtitle={hideBalanceByDefault ? "*****" : formatNaira(profile.piggyBalance)} onClick={() => {}} />
                <MobileRow
                  icon={Megaphone}
                  title="Referral Program"
                  subtitle={profile.referral ? `Code: ${profile.referral}` : "Invite members and receive referral rewards"}
                  withBorder={false}
                  onClick={() => {}}
                />
              </div>
            </Card>

            <Button variant="danger" size="md" fullWidth icon={<LogOut size={18} />} onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </motion.section>

      <AnimatePresence>
        {isEditProfileOpen && (
          <motion.div
            className="fixed inset-0 z-[80] bg-black/45 p-4 sm:p-6 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="mx-auto w-full max-w-3xl rounded-3xl border border-[var(--color-border)] bg-[var(--color-background)] shadow-2xl"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
            >
              <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4 sm:p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Hidden screen</p>
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Edit profile</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                  aria-label="Close edit profile"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                <EditField
                  label="First name"
                  name="firstname"
                  value={editForm.firstname}
                  onChange={handleEditChange}
                  placeholder="Enter first name"
                />
                <EditField
                  label="Surname"
                  name="surname"
                  value={editForm.surname}
                  onChange={handleEditChange}
                  placeholder="Enter surname"
                />
                <EditField
                  label="Email"
                  name="email"
                  type="email"
                  value={editForm.email}
                  onChange={handleEditChange}
                  placeholder="Enter email"
                />
                <EditField
                  label="Mobile"
                  name="mobile"
                  value={editForm.mobile}
                  onChange={handleEditChange}
                  placeholder="Enter mobile number"
                />
                <EditField
                  label="City"
                  name="city"
                  value={editForm.city}
                  onChange={handleEditChange}
                  placeholder="Enter city"
                />
                <EditField
                  label="State"
                  name="state"
                  value={editForm.state}
                  onChange={handleEditChange}
                  placeholder="Enter state"
                />
                <EditField
                  label="LGA"
                  name="lga"
                  value={editForm.lga}
                  onChange={handleEditChange}
                  placeholder="Enter LGA"
                />
                <EditField
                  label="Country"
                  name="country"
                  value={editForm.country}
                  onChange={handleEditChange}
                  placeholder="Enter country"
                />
                <EditField
                  label="Address"
                  name="address1"
                  value={editForm.address1}
                  onChange={handleEditChange}
                  placeholder="Enter address"
                  fullWidth
                />

                <div className="sm:col-span-2 flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setIsEditProfileOpen(false)}
                    disabled={updateProfileMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={updateProfileMutation.isPending}
                    loadingText="Saving..."
                    icon={<Save size={16} />}
                  >
                    Save changes
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Profile;
