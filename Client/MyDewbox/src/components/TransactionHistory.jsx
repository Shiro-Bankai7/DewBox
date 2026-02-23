import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Search, 
    Filter, 
    ChevronDown, 
    ChevronUp, 
    Calendar,
    ArrowUpRight,
    ArrowDownLeft,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle
} from "lucide-react";
import Card from "./ui/Card";
import Input from "./ui/Input";
import Button from "./ui/Button";
import Skeleton from "./ui/Skeleton";

const TransactionHistory = ({ transactions = [], isLoading = false }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedId, setExpandedId] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        type: "all",
        status: "all",
        dateRange: "all"
    });

    const getTransactionTypeLabel = (type) => {
        const typeUpper = String(type || "").toUpperCase();
        switch (typeUpper) {
            case "FEE":
                return "Subscription Fee";
            case "CONTRIBUTION":
                return "Contribution";
            case "DEPOSIT":
                return "Deposit";
            case "WITHDRAWAL":
                return "Withdrawal";
            case "TRANSFER":
                return "Bank Transfer";
            case "WALLET_TRANSFER_SENT":
                return "Wallet Transfer";
            case "WALLET_TRANSFER_RECEIVED":
                return "Wallet Credit";
            default:
                return typeUpper || "Transaction";
        }
    };

    // Group transactions by date
    const groupedTransactions = useMemo(() => {
        if (!transactions || transactions.length === 0) return {};

        // Filter transactions based on search and filters
        let filtered = transactions.filter(transaction => {
            // Search filter
            const matchesSearch = searchQuery === "" || 
                transaction.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                transaction.recipientEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                getTransactionTypeLabel(transaction.type).toLowerCase().includes(searchQuery.toLowerCase()) ||
                transaction.amount?.toString().includes(searchQuery);

            // Type filter
            const matchesType = filters.type === "all" || transaction.type?.toUpperCase() === filters.type;

            // Status filter
            const matchesStatus = filters.status === "all" || transaction.status?.toUpperCase() === filters.status;

            // Date range filter
            let matchesDate = true;
            if (filters.dateRange !== "all") {
                const transactionDate = new Date(transaction.createdAt);
                const now = new Date();
                const daysDiff = Math.floor((now - transactionDate) / (1000 * 60 * 60 * 24));

                switch (filters.dateRange) {
                    case "today":
                        matchesDate = daysDiff === 0;
                        break;
                    case "week":
                        matchesDate = daysDiff <= 7;
                        break;
                    case "month":
                        matchesDate = daysDiff <= 30;
                        break;
                    case "year":
                        matchesDate = daysDiff <= 365;
                        break;
                    default:
                        matchesDate = true;
                }
            }

            return matchesSearch && matchesType && matchesStatus && matchesDate;
        });

        // Group by date
        const grouped = {};
        filtered.forEach(transaction => {
            const date = new Date(transaction.createdAt);
            const dateKey = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });

            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(transaction);
        });

        // Sort dates in descending order
        const sortedGrouped = {};
        Object.keys(grouped)
            .sort((a, b) => new Date(b) - new Date(a))
            .forEach(key => {
                sortedGrouped[key] = grouped[key];
            });

        return sortedGrouped;
    }, [transactions, searchQuery, filters]);

    const getTransactionIcon = (type) => {
        const typeUpper = type?.toUpperCase();
        switch (typeUpper) {
            case "CONTRIBUTION":
            case "DEPOSIT":
                return <ArrowDownLeft className="text-[#059669]" size={20} />;
            case "FEE":
                return <AlertCircle className="text-[#d97706]" size={20} />;
            case "WITHDRAWAL":
            case "TRANSFER":
                return <ArrowUpRight className="text-[#dc2626]" size={20} />;
            default:
                return <ArrowUpRight className="text-[var(--color-text-secondary)]" size={20} />;
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "COMPLETED":
            case "completed":
                return <CheckCircle2 className="text-[#059669]" size={16} />;
            case "PENDING":
            case "pending":
                return <Clock className="text-[#d97706]" size={16} />;
            case "FAILED":
            case "failed":
                return <XCircle className="text-[#dc2626]" size={16} />;
            default:
                return <AlertCircle className="text-[var(--color-text-secondary)]" size={16} />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "COMPLETED":
            case "completed":
                return "text-[#059669] bg-[#dcfce7]";
            case "PENDING":
            case "pending":
                return "text-[#d97706] bg-[#fef3c7]";
            case "FAILED":
            case "failed":
                return "text-[#dc2626] bg-[#fee2e2]";
            default:
                return "text-[var(--color-text-secondary)] bg-[var(--color-surface)]";
        }
    };

    const getAmountColor = (type) => {
        const typeUpper = type?.toUpperCase();
        switch (typeUpper) {
            case "CONTRIBUTION":
            case "DEPOSIT":
                return "text-[#059669]";
            case "FEE":
                return "text-[#d97706]";
            case "WITHDRAWAL":
            case "TRANSFER":
                return "text-[#dc2626]";
            default:
                return "text-[var(--color-text-primary)]";
        }
    };

    const formatAmount = (amount, type) => {
        const typeUpper = type?.toUpperCase();
        const prefix = typeUpper === "CONTRIBUTION" || typeUpper === "DEPOSIT" ? "+" : "-";
        return `${prefix}₦${Number(amount).toLocaleString()}`;
    };

    const toggleExpanded = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const resetFilters = () => {
        setFilters({
            type: "all",
            status: "all",
            dateRange: "all"
        });
        setSearchQuery("");
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Card key={i} variant="elevated" padding="md">
                        <div className="flex items-center gap-4">
                            <Skeleton shape="circle" width="40px" height="40px" />
                            <div className="flex-1 space-y-2">
                                <Skeleton width="75%" height="16px" />
                                <Skeleton width="50%" height="14px" />
                            </div>
                            <Skeleton width="80px" height="16px" />
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    // Empty state
    if (!transactions || transactions.length === 0) {
        return (
            <Card variant="elevated" padding="lg">
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No Transactions Yet
                    </h3>
                    <p className="text-gray-600">
                        Your transaction history will appear here
                    </p>
                </div>
            </Card>
        );
    }

    const hasActiveFilters = filters.type !== "all" || filters.status !== "all" || filters.dateRange !== "all" || searchQuery !== "";

    return (
        <div className="space-y-6">
            {/* Search and Filter Bar */}
            <Card variant="elevated" padding="md">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            type="text"
                            placeholder="Search transactions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            icon={<Search size={20} />}
                        />
                    </div>
                    <Button
                        variant="outline"
                        icon={<Filter size={20} />}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        Filters
                    </Button>
                </div>

                {/* Filter Options */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-4 pt-4 border-t border-gray-200"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Type Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Type
                                    </label>
                                    <select
                                        value={filters.type}
                                        onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                        className="w-full px-3 py-2 border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all duration-150"
                                    >
                                        <option value="all">All Types</option>
                                        <option value="CONTRIBUTION">Contribution</option>
                                        <option value="DEPOSIT">Deposit</option>
                                        <option value="FEE">Subscription Fee</option>
                                        <option value="WITHDRAWAL">Withdrawal</option>
                                        <option value="TRANSFER">Transfer</option>
                                    </select>
                                </div>

                                {/* Status Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Status
                                    </label>
                                    <select
                                        value={filters.status}
                                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                        className="w-full px-3 py-2 border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all duration-150"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="COMPLETED">Completed</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="FAILED">Failed</option>
                                    </select>
                                </div>

                                {/* Date Range Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Date Range
                                    </label>
                                    <select
                                        value={filters.dateRange}
                                        onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                                        className="w-full px-3 py-2 border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all duration-150"
                                    >
                                        <option value="all">All Time</option>
                                        <option value="today">Today</option>
                                        <option value="week">Last 7 Days</option>
                                        <option value="month">Last 30 Days</option>
                                        <option value="year">Last Year</option>
                                    </select>
                                </div>
                            </div>

                            {hasActiveFilters && (
                                <div className="mt-4 flex justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={resetFilters}
                                    >
                                        Reset Filters
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>

            {/* Transaction List */}
            {Object.keys(groupedTransactions).length === 0 ? (
                <Card variant="elevated" padding="lg">
                    <div className="text-center py-8">
                        <p className="text-gray-600">No transactions found matching your filters</p>
                        {hasActiveFilters && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={resetFilters}
                                className="mt-4"
                            >
                                Clear Filters
                            </Button>
                        )}
                    </div>
                </Card>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedTransactions).map(([date, dateTransactions]) => (
                        <div key={date}>
                            {/* Date Header */}
                            <div className="flex items-center gap-2 mb-3">
                                <Calendar className="text-gray-400" size={16} />
                                <h3 className="text-sm font-semibold text-gray-700">{date}</h3>
                            </div>

                            {/* Transactions for this date */}
                            <div className="space-y-2">
                                {dateTransactions.map((transaction) => (
                                    <motion.div
                                        key={transaction.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Card
                                            variant="elevated"
                                            padding="md"
                                            hoverable
                                            onClick={() => toggleExpanded(transaction.id)}
                                            className="cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4">
                                                {/* Icon */}
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                    transaction.type?.toUpperCase() === "CONTRIBUTION" || transaction.type?.toUpperCase() === "DEPOSIT"
                                                        ? "bg-[#dcfce7]"
                                                        : "bg-[#fee2e2]"
                                                }`}>
                                                    {getTransactionIcon(transaction.type)}
                                                </div>

                                                {/* Transaction Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 truncate">
                                                        {transaction.description || getTransactionTypeLabel(transaction.type)}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <p className="text-sm text-gray-500">
                                                            {new Date(transaction.createdAt).toLocaleTimeString('en-US', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </p>
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                                                            {getStatusIcon(transaction.status)}
                                                            {transaction.status?.toUpperCase()}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Amount */}
                                                <div className="text-right">
                                                    <p className={`font-bold text-lg ${getAmountColor(transaction.type)}`}>
                                                        {formatAmount(transaction.amount, transaction.type)}
                                                    </p>
                                                    {expandedId === transaction.id ? (
                                                        <ChevronUp className="text-gray-400 ml-auto mt-1" size={16} />
                                                    ) : (
                                                        <ChevronDown className="text-gray-400 ml-auto mt-1" size={16} />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expanded Details */}
                                            <AnimatePresence>
                                                {expandedId === transaction.id && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="mt-4 pt-4 border-t border-gray-200"
                                                    >
                                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                                            <div>
                                                                <p className="text-gray-500">Transaction ID</p>
                                                                <p className="font-medium text-gray-900 truncate">
                                                                    {transaction.id}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-gray-500">Type</p>
                                                                <p className="font-medium text-gray-900">
                                                                    {getTransactionTypeLabel(transaction.type)}
                                                                </p>
                                                            </div>
                                                            {transaction.recipientEmail && (
                                                                <div className="col-span-2">
                                                                    <p className="text-gray-500">Recipient</p>
                                                                    <p className="font-medium text-gray-900">
                                                                        {transaction.recipientEmail}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            {transaction.category && (
                                                                <div>
                                                                    <p className="text-gray-500">Category</p>
                                                                    <p className="font-medium text-gray-900">
                                                                        {transaction.category}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            {transaction.bankCode && (
                                                                <div>
                                                                    <p className="text-gray-500">Bank Code</p>
                                                                    <p className="font-medium text-gray-900">
                                                                        {transaction.bankCode}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            {transaction.accountNumber && (
                                                                <div>
                                                                    <p className="text-gray-500">Account Number</p>
                                                                    <p className="font-medium text-gray-900">
                                                                        {transaction.accountNumber}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            <div className="col-span-2">
                                                                <p className="text-gray-500">Date & Time</p>
                                                                <p className="font-medium text-gray-900">
                                                                    {new Date(transaction.createdAt).toLocaleString('en-US', {
                                                                        year: 'numeric',
                                                                        month: 'long',
                                                                        day: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TransactionHistory;
