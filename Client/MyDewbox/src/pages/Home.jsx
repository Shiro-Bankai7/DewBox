import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  Bell,
  BellOff,
  Clock,
  PiggyBank,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";
import { apiService } from "../services/api";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Modal from "../components/ui/Modal";
import { formatPublicId } from "../utils/publicId";

const Homepage = () => {
  const navigate = useNavigate();
  const [showAutoPayModal, setShowAutoPayModal] = useState(false);
  const [expandedContributionInfo, setExpandedContributionInfo] = useState(null);
  const [showPendingFeeNotice, setShowPendingFeeNotice] = useState(
    () => localStorage.getItem("pendingFirstContributionFeeNotice") === "true",
  );

  const { data: subscriberData, isLoading: subscriberLoading } = useQuery({
    queryKey: ["subscriber"],
    queryFn: () => apiService.getSubscriber(),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: contributionsData,
  } = useQuery({
    queryKey: ["contributionHistory"],
    queryFn: () => apiService.getContributionHistory(),
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const {
    data: transactionsData,
    isLoading: transactionsLoading,
  } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => apiService.getTransactions(),
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: walletData } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => apiService.getWallet(),
    retry: 1,
  });

  const userData = useMemo(() => {
    const subscriber = subscriberData?.data?.subscriber;
    const wallet = walletData?.data?.wallet;

    if (!subscriber) {
      return {
        name: "User",
        mainBalance: 0,
        icaBalance: 0,
        piggyBalance: 0,
        hasContributed: false,
        walletBalance: 0,
        publicId: "N/A",
      };
    }

    const icaBalance = Number.parseFloat(subscriber.ica_balance) || 0;
    const piggyBalance = Number.parseFloat(subscriber.piggy_balance) || 0;
    const mainBalance = Number.parseFloat(subscriber.balance) || 0;
    const walletBalance = Number.parseFloat(wallet?.balance) || mainBalance;

    return {
      name: subscriber.firstname || "User",
      mainBalance,
      icaBalance,
      piggyBalance,
      hasContributed: icaBalance > 0 || piggyBalance > 0,
      walletBalance,
      publicId: formatPublicId(subscriber.id, subscriber.publicId || subscriber.public_id),
    };
  }, [subscriberData, walletData]);

  const contributionStats = useMemo(() => {
    const contributions = contributionsData?.data || [];

    if (contributions.length === 0) {
      return {
        totalContributions: 0,
        thisMonthContributions: 0,
        lastContributionDate: null,
        nextPaymentDate: null,
        averageContribution: 0,
      };
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthContributions = contributions
      .filter((entry) => {
        const date = new Date(entry.contribution_date || entry.createdAt);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((sum, entry) => sum + Number.parseFloat(entry.amount || 0), 0);

    const sortedContributions = [...contributions].sort(
      (a, b) =>
        new Date(b.contribution_date || b.createdAt) -
        new Date(a.contribution_date || a.createdAt),
    );

    const lastContributionDate =
      sortedContributions[0]?.contribution_date || sortedContributions[0]?.createdAt;
    const nextPaymentDate = new Date(currentYear, currentMonth + 1, 1);

    const totalAmount = contributions.reduce(
      (sum, entry) => sum + Number.parseFloat(entry.amount || 0),
      0,
    );
    const averageContribution =
      contributions.length > 0 ? totalAmount / contributions.length : 0;

    return {
      totalContributions: contributions.length,
      thisMonthContributions,
      lastContributionDate,
      nextPaymentDate,
      averageContribution,
    };
  }, [contributionsData]);

  const recentActivity = useMemo(() => {
    const transactions = transactionsData?.data || [];
    return transactions.slice(0, 5);
  }, [transactionsData]);

  const hasFeeTransaction = useMemo(() => {
    const transactions = transactionsData?.data || [];
    return transactions.some((tx) => String(tx.type || "").toLowerCase() === "fee");
  }, [transactionsData]);

  const getRecentTransactionLabel = (transaction) => {
    const type = String(transaction?.type || "").toLowerCase();
    if (type === "ica") return "ICA Contribution";
    if (type === "piggy") return "Piggy Contribution";
    if (type === "contribution") return "Contribution";
    if (type === "fee") return "Subscription Fee";
    if (type === "withdrawal") return "Withdrawal";
    if (type === "wallet_transfer_sent") return "Wallet Transfer";
    if (type === "wallet_transfer_received") return "Wallet Credit";
    return "Transfer";
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount || 0);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  React.useEffect(() => {
    if (userData.hasContributed && contributionsData?.data?.length === 1) {
      const hasSeenModal = localStorage.getItem("hasSeenAutoPayModal");
      if (!hasSeenModal) {
        setTimeout(() => setShowAutoPayModal(true), 1000);
      }
    }
  }, [userData.hasContributed, contributionsData]);

  React.useEffect(() => {
    if (!showPendingFeeNotice) return;
    if (!hasFeeTransaction) return;
    localStorage.removeItem("pendingFirstContributionFeeNotice");
    setShowPendingFeeNotice(false);
  }, [hasFeeTransaction, showPendingFeeNotice]);

  const handleDismissAutoPayModal = () => {
    localStorage.setItem("hasSeenAutoPayModal", "true");
    setShowAutoPayModal(false);
  };

  const handleEnableAutoPay = () => {
    toast.success("Automatic payments will be available soon!");
    handleDismissAutoPayModal();
  };

  if (subscriberLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-4">
        <div className="h-8 w-32 bg-[var(--color-surface-elevated)] rounded animate-pulse" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="h-80 bg-[var(--color-surface-elevated)] rounded-3xl animate-pulse" />
          <div className="lg:col-span-2 space-y-4">
            <div className="h-36 bg-[var(--color-surface-elevated)] rounded-2xl animate-pulse" />
            <div className="h-36 bg-[var(--color-surface-elevated)] rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const totalContributions = userData.icaBalance + userData.piggyBalance;
  const icaProgress =
    userData.icaBalance > 0
      ? Math.min((userData.icaBalance / 100000) * 100, 100)
      : 0;
  const piggyProgress =
    userData.piggyBalance > 0
      ? Math.min((userData.piggyBalance / 50000) * 100, 100)
      : 0;
  const recentMobileActivity = recentActivity.slice(0, 3);
  const userInitial = (userData.name || "U").charAt(0).toUpperCase();
  const contributionDetails = {
    piggy: {
      title: "Piggy",
      body: "Piggy is your piggy bank for flexible savings you can add to at your own pace.",
    },
    ica: {
      title: "Investment Cooperative Account",
      body: "Investment Cooperative Account helps you contribute in a more structured way toward longer-term goals.",
    },
  };
  const toggleContributionInfo = (key) => {
    setExpandedContributionInfo((prev) => (prev === key ? null : key));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="lg:hidden space-y-4">
        {showPendingFeeNotice && !hasFeeTransaction && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-medium text-amber-900">First contribution fee pending</p>
            <p className="text-xs text-amber-800 mt-1">
              You skipped the fee for now. It will be removed from your first contribution.
            </p>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-[var(--color-text-primary)] text-[var(--color-surface)] flex items-center justify-center text-lg font-semibold shrink-0">
              {userInitial}
            </div>
            <div className="min-w-0">
              <h1 className="text-[28px] leading-none font-semibold text-[var(--color-text-primary)] truncate">
                Hi, {userData.name}
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                Total contributions: {formatCurrency(totalContributions)}
              </p>
            </div>
          </div>
          <div className="w-11 h-11 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center shrink-0">
            <Bell size={19} className="text-[var(--color-text-primary)]" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-6 bg-[radial-gradient(circle_at_80%_20%,rgba(0,119,182,0.28),transparent_42%),linear-gradient(145deg,#0f1d33,#07111f)] text-white border border-black/25 shadow-lg">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-white/90 text-[#111827] text-sm font-semibold">
            <Wallet size={14} />
            <span>NGN</span>
          </div>
          <div className="mt-6 text-[54px] leading-none font-medium tracking-tight">
            {formatCurrency(userData.walletBalance)}
          </div>
          <div className="mt-6 inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm">
            Wallet ID: {userData.publicId || "N/A"}
          </div>
        </div>

        <Card variant="outlined" padding="md" className="rounded-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">
                This Month
              </div>
              <div className="text-2xl font-semibold text-[var(--color-text-primary)]">
                {formatCurrency(contributionStats.thisMonthContributions)}
              </div>
            </div>
            <div className="w-px self-stretch bg-[var(--color-border)]" />
            <div className="text-right">
              <div className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">
                Average
              </div>
              <div className="text-2xl font-semibold text-[var(--color-text-primary)]">
                {formatCurrency(contributionStats.averageContribution)}
              </div>
            </div>
          </div>
        </Card>

        <div className="rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4 space-y-3">
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
            Your contributions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => toggleContributionInfo("piggy")}
              className="text-left"
            >
              <Card
                variant="flat"
                padding="md"
                className={`rounded-2xl border ${
                  expandedContributionInfo === "piggy"
                    ? "border-[var(--color-primary)]"
                    : "border-[var(--color-border)]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <PiggyBank className="text-[#0066FF]" size={20} />
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {piggyProgress.toFixed(0)}%
                  </span>
                </div>
                <div className="text-xs text-[var(--color-text-secondary)] mb-1">
                  Piggy Contributions
                </div>
                <div className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {formatCurrency(userData.piggyBalance)}
                </div>
              </Card>
            </button>

            <button
              type="button"
              onClick={() => toggleContributionInfo("ica")}
              className="text-left"
            >
              <Card
                variant="flat"
                padding="md"
                className={`rounded-2xl border ${
                  expandedContributionInfo === "ica"
                    ? "border-[var(--color-primary)]"
                    : "border-[var(--color-border)]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Target className="text-[#0066FF]" size={20} />
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {icaProgress.toFixed(0)}%
                  </span>
                </div>
                <div className="text-xs text-[var(--color-text-secondary)] mb-1">ICA Progress</div>
                <div className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {formatCurrency(userData.icaBalance)}
                </div>
              </Card>
            </button>
          </div>
          {expandedContributionInfo && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {contributionDetails[expandedContributionInfo].title}
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {contributionDetails[expandedContributionInfo].body}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4">
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-3">
            Recent transactions
          </h2>
          {transactionsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-[var(--color-surface-elevated)] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentMobileActivity.length > 0 ? (
            <div className="space-y-2">
              {recentMobileActivity.map((transaction) => {
                const isCredit =
                  transaction.type?.toLowerCase() === "ica" ||
                  transaction.type?.toLowerCase() === "piggy" ||
                  transaction.type?.toLowerCase() === "contribution";

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)]"
                  >
                    <div className="min-w-0">
                        <div className="font-medium text-[var(--color-text-primary)] truncate">
                          {getRecentTransactionLabel(transaction)}
                        </div>
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        {formatDate(transaction.createdAt)}
                      </div>
                    </div>
                    <div
                      className={`font-semibold ml-3 ${
                        isCredit ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {isCredit ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-5 text-[var(--color-text-secondary)]">
              No recent activity
            </div>
          )}
        </div>
      </div>

      <div className="hidden lg:block">
        {showPendingFeeNotice && !hasFeeTransaction && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-medium text-amber-900">First contribution fee pending</p>
            <p className="text-xs text-amber-800 mt-1">
              You skipped the fee for now. It will be removed from your first contribution.
            </p>
          </div>
        )}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Welcome back, {userData.name}
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Here's your financial overview
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card variant="elevated" padding="lg" className="mb-6">
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] mb-3 font-medium">
                <Wallet size={16} />
                <span>Wallet Balance</span>
              </div>
              <div className="text-4xl font-bold text-[var(--color-text-primary)] mb-2 tracking-tight">
                {formatCurrency(userData.walletBalance)}
              </div>
              <div className="text-sm text-[var(--color-text-secondary)] mb-6">
                Available to spend or contribute
              </div>

              <button
                onClick={() => navigate("/dashboard/contribute")}
                className="w-full flex flex-col items-center justify-center p-4 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-all duration-150"
              >
                <TrendingUp className="w-5 h-5 mb-2 text-white" />
                <div className="text-sm font-semibold text-white">Contribute</div>
              </button>
            </Card>

            <div className="space-y-4">
              <Card variant="flat" padding="md">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-[var(--color-text-secondary)]">
                    Average Contribution
                  </div>
                  <Clock className="text-[var(--color-text-secondary)]" size={18} />
                </div>
                <div className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
                  {formatCurrency(contributionStats.averageContribution)}
                </div>
                <div className="text-xs text-[var(--color-text-secondary)]">Per successful contribution</div>
              </Card>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card
                variant="elevated"
                padding="lg"
                className={`cursor-pointer border ${
                  expandedContributionInfo === "piggy"
                    ? "border-[var(--color-primary)]"
                    : "border-transparent"
                }`}
                onClick={() => toggleContributionInfo("piggy")}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#E6F0FF] flex items-center justify-center">
                      <PiggyBank className="text-[#0066FF]" size={24} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[var(--color-text-secondary)]">
                        Piggy Contributions
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)]">Monthly savings</div>
                    </div>
                  </div>
                </div>
                <div className="text-3xl font-bold text-[var(--color-text-primary)] mb-3">
                  {formatCurrency(userData.piggyBalance)}
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-[var(--color-text-secondary)] mb-1">
                    <span>{piggyProgress.toFixed(0)}% of NGN 50,000 goal</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--color-border-light)] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${piggyProgress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-[#0077B6] to-[#0066FF] rounded-full"
                    />
                  </div>
                </div>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate("/dashboard/contribute");
                  }}
                  className="text-sm text-[#0066FF] hover:underline font-medium"
                >
                  Add to Piggy -&gt;
                </button>
                {expandedContributionInfo === "piggy" && (
                  <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                    {contributionDetails.piggy.body}
                  </div>
                )}
              </Card>

              <Card
                variant="elevated"
                padding="lg"
                className={`cursor-pointer border ${
                  expandedContributionInfo === "ica"
                    ? "border-[var(--color-primary)]"
                    : "border-transparent"
                }`}
                onClick={() => toggleContributionInfo("ica")}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#E6F0FF] flex items-center justify-center">
                      <Target className="text-[#0066FF]" size={24} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[var(--color-text-secondary)]">ICA Progress</div>
                      <div className="text-xs text-[var(--color-text-secondary)]">Yearly investment goal</div>
                    </div>
                  </div>
                  {icaProgress >= 100 && (
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Award className="text-green-600" size={16} />
                    </div>
                  )}
                </div>
                <div className="text-3xl font-bold text-[var(--color-text-primary)] mb-3">
                  {formatCurrency(userData.icaBalance)}
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-[var(--color-text-secondary)] mb-1">
                    <span>{icaProgress.toFixed(0)}% of NGN 100,000 goal</span>
                    {icaProgress >= 100 && (
                      <span className="text-green-600 font-semibold">Goal Reached!</span>
                    )}
                  </div>
                  <div className="w-full h-2 bg-[var(--color-border-light)] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${icaProgress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-[#0066FF] to-[#0052CC] rounded-full"
                    />
                  </div>
                </div>
                {icaProgress < 100 && (
                  <div className="text-xs text-[var(--color-text-secondary)] mb-3">
                    {formatCurrency(100000 - userData.icaBalance)} remaining to reach goal
                  </div>
                )}
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate("/dashboard/contribute");
                  }}
                  className="text-sm text-[#0066FF] hover:underline font-medium"
                >
                  {icaProgress >= 100 ? "Continue Contributing -&gt;" : "Contribute to ICA -&gt;"}
                </button>
                {expandedContributionInfo === "ica" && (
                  <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                    {contributionDetails.ica.body}
                  </div>
                )}
              </Card>
            </div>

            <Card variant="elevated" padding="lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="text-[var(--color-text-secondary)]" size={20} />
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Recent Activity</h3>
                </div>
                <button
                  onClick={() => navigate("/dashboard/wallet")}
                  className="text-sm text-[#0066FF] hover:underline font-medium"
                >
                  View All
                </button>
              </div>

              {transactionsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-[var(--color-surface-elevated)] rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((transaction) => {
                    const isCredit =
                      transaction.type?.toLowerCase() === "ica" ||
                      transaction.type?.toLowerCase() === "piggy" ||
                      transaction.type?.toLowerCase() === "contribution";

                    return (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 bg-[var(--color-surface)] rounded-xl hover:bg-[var(--color-surface-elevated)] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isCredit ? "bg-green-100" : "bg-red-100"
                            }`}
                          >
                            {isCredit ? (
                              <TrendingUp className="text-green-600" size={18} />
                            ) : (
                              <ArrowRight className="text-red-600" size={18} />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-[var(--color-text-primary)]">
                              {getRecentTransactionLabel(transaction)}
                            </div>
                            <div className="text-xs text-[var(--color-text-secondary)]">
                              {formatDate(transaction.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className={`font-semibold ${isCredit ? "text-green-600" : "text-red-600"}`}>
                          {isCredit ? "+" : "-"}
                          {formatCurrency(transaction.amount)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-[var(--color-text-secondary)]">
                  <Clock className="mx-auto mb-3 opacity-30" size={48} />
                  <p>No recent activity</p>
                  <button
                    onClick={() => navigate("/dashboard/contribute")}
                    className="mt-3 text-[#0066FF] hover:underline font-medium"
                  >
                    Make your first contribution
                  </button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAutoPayModal && (
          <Modal
            isOpen={showAutoPayModal}
            onClose={handleDismissAutoPayModal}
            title="Enable Automatic Payments?"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-[#E6F0FF] flex items-center justify-center">
                  <Bell className="text-[#0066FF]" size={32} />
                </div>
              </div>

              <p className="text-center text-[var(--color-text-secondary)]">
                Would you like to set up automatic monthly contributions of{" "}
                <span className="font-bold text-[var(--color-text-primary)]">
                  {formatCurrency(contributionsData?.data?.[0]?.amount || 0)}
                </span>
                ?
              </p>

              <div className="bg-[var(--color-surface)] rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="text-green-500 mt-0.5">+</div>
                  <p className="text-sm text-[var(--color-text-secondary)]">Never miss a contribution</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="text-green-500 mt-0.5">+</div>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Build consistent contribution habits
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="text-green-500 mt-0.5">+</div>
                  <p className="text-sm text-[var(--color-text-secondary)]">Cancel anytime in settings</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={handleDismissAutoPayModal}
                  icon={<BellOff size={20} />}
                >
                  Not Now
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleEnableAutoPay}
                  icon={<Bell size={20} />}
                >
                  Enable Auto-Pay
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Homepage;
