import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import PaystackPop from "@paystack/inline-js";
import { Wallet, Building2, ArrowLeftRight, Send, ArrowLeft, CheckCircle2, History } from "lucide-react";
import apiService from "../services/api";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Card from "../components/ui/Card";
import Modal from "../components/ui/Modal";
import Skeleton, { SkeletonCard } from "../components/ui/Skeleton";
import TransactionHistory from "../components/TransactionHistory";

// Validation schemas for different transaction types
const depositSchema = yup.object().shape({
    amount: yup.number()
        .typeError("Amount must be a number")
        .positive("Amount must be greater than 0")
        .required("Amount is required"),
});

const withdrawSchema = yup.object().shape({
    bank: yup.string().required("Please select a bank"),
    account: yup.string()
        .matches(/^\d{10}$/, "Account number must be 10 digits")
        .required("Account number is required"),
    amount: yup.number()
        .typeError("Amount must be a number")
        .positive("Amount must be greater than 0")
        .required("Amount is required"),
    password: yup.string()
        .min(6, "Password must be at least 6 characters")
        .required("Password is required for security"),
});

const transferSchema = yup.object().shape({
    bank: yup.string().required("Please select a bank"),
    account: yup.string()
        .matches(/^\d{10}$/, "Account number must be 10 digits")
        .required("Account number is required"),
    amount: yup.number()
        .typeError("Amount must be a number")
        .positive("Amount must be greater than 0")
        .required("Amount is required"),
    password: yup.string()
        .min(6, "Password must be at least 6 characters")
        .required("Password is required for security"),
});

const walletSchema = yup.object().shape({
    walletId: yup.string().trim().required("Recipient wallet ID is required"),
    amount: yup.number()
        .typeError("Amount must be a number")
        .positive("Amount must be greater than 0")
        .required("Amount is required"),
    message: yup.string().max(200, "Message must be less than 200 characters"),
    password: yup.string()
        .min(6, "Password must be at least 6 characters")
        .required("Password is required for security"),
});

const TransactionOption = ({ type, icon: Icon, label, color, onClick, isActive }) => (
    <motion.button
        type="button"
        className={`p-4 rounded-lg cursor-pointer bg-[var(--color-surface)] border transition-all duration-150 text-left w-full ${
            isActive ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/10 shadow-sm' : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-sm'
        }`}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={onClick}
    >
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`} style={{ backgroundColor: `${color}10` }}>
                <Icon style={{ color }} size={20} strokeWidth={2} />
            </div>
            <span className="font-medium text-[var(--color-text-primary)] text-sm">{label}</span>
        </div>
    </motion.button>
);

const TransactionsSkeleton = () => (
    <motion.section
        className="max-w-3xl mx-auto p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
    >
        <div className="mb-6">
            <Skeleton width="180px" height="28px" className="mb-2" />
            <Skeleton width="240px" height="16px" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {[1, 2, 3, 4].map((item) => (
                <div key={item} className="p-4 rounded-lg border border-[var(--color-border)] bg-white">
                    <div className="flex items-center gap-3">
                        <Skeleton shape="square" width="40px" height="40px" className="rounded-lg" />
                        <Skeleton width="100px" height="16px" />
                    </div>
                </div>
            ))}
        </div>
    </motion.section>
);



const transactionOptions = [
    { 
        id: 'deposit',
        type: 'deposit', 
        icon: Wallet, 
        label: 'Fund Wallet',
        title: 'Fund Wallet',
        color: '#0077B6'
    },
    { 
        id: 'withdraw',
        type: 'withdraw', 
        icon: Building2, 
        label: 'Withdraw',
        title: 'Withdraw Funds',
        color: '#059669'
    },
    { 
        id: 'transfer',
        type: 'transfer', 
        icon: ArrowLeftRight, 
        label: 'Pay to Bank',
        title: 'Pay to Bank Account',
        color: '#8b5cf6'
    },
    { 
        id: 'wallet',
        type: 'wallet', 
        icon: Send, 
        label: 'Send to User',
        title: 'Send to User',
        color: '#f59e0b'
    }
];

const Transactions = () => {
    const [activeTransaction, setActiveTransaction] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmData, setConfirmData] = useState(null);
    const [showSuccessScreen, setShowSuccessScreen] = useState(false);
    const [successData, setSuccessData] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [accountName, setAccountName] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Handle URL parameters to auto-select transaction type
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        if (action && ['deposit', 'withdraw', 'transfer', 'wallet'].includes(action)) {
            setActiveTransaction(action);
        }
    }, []);



    // Fetch transaction history
    const { data: transactionsData, isLoading: isLoadingTransactions, error: transactionsError, refetch: refetchTransactions } = useQuery({
        queryKey: ['transactions'],
        queryFn: () => apiService.getTransactions(),
        retry: 1,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        onError: (error) => {
            if (error.response?.status === 401) {
                toast.error('Session expired. Please login again.');
            }
        }
    });
    
    // Get the appropriate schema based on active transaction
    const getSchema = () => {
        switch (activeTransaction) {
            case 'deposit':
                return depositSchema;
            case 'withdraw':
                return withdrawSchema;
            case 'transfer':
                return transferSchema;
            case 'wallet':
                return walletSchema;
            default:
                return depositSchema;
        }
    };
    
    const { register, handleSubmit, reset, watch, formState: { errors, isValid } } = useForm({
        resolver: yupResolver(getSchema()),
        mode: 'onChange', // Enable real-time validation
    });
    
    // Reset form when transaction type changes
    useEffect(() => {
        reset();
        setAccountName('');
    }, [activeTransaction, reset]);

    // Watch for account number and bank changes to auto-verify
    const watchedBank = watch('bank');
    const watchedAccount = watch('account');

    useEffect(() => {
        if (watchedBank && watchedAccount && watchedAccount.length === 10) {
            autoVerifyAccount(watchedAccount, watchedBank);
        } else {
            setAccountName('');
        }
    }, [watchedBank, watchedAccount]);

    // Fetch banks using API service
    const { data: banks, isLoading } = useQuery({
        queryKey: ['banks'],
        queryFn: () => apiService.getBanks()
    });

    // Verify Paystack payment (called after popup closes or after a redirect back)
    const verifyPayment = async (reference) => {
        try {
            const data = await apiService.verifyTransaction(reference);

            if (data?.status === 'success') {
                const amount = data?.data?.amount;

                toast.success("Payment successful! NGN " + amount + " added to your wallet", {
                    autoClose: 5000,
                    position: 'top-right',
                });

                // Invalidate all relevant queries to refresh data
                queryClient.invalidateQueries(['transactions']);
                queryClient.invalidateQueries(['subscriber']);
                queryClient.invalidateQueries(['user']);
                queryClient.invalidateQueries(['balance']);
                queryClient.invalidateQueries(['wallet']);

                // Force refetch after a short delay
                setTimeout(() => {
                    queryClient.refetchQueries(['subscriber']);
                    queryClient.refetchQueries(['transactions']);
                }, 500);

                reset();
                setActiveTransaction(null);
            } else {
                toast.error(data?.message || 'Payment verification failed');
            }
        } catch (err) {
            toast.error('Failed to verify payment');
        }
    };

    // If Paystack redirects back to this page (common for some payment channels),
    // it will append reference/trxref to the URL.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const reference = params.get('reference') || params.get('trxref');

        if (!reference) return;

        verifyPayment(reference).finally(() => {
            params.delete('reference');
            params.delete('trxref');
            params.delete('status');

            const qs = params.toString();
            const nextUrl = window.location.pathname + (qs ? '?' + qs : '');
            window.history.replaceState({}, '', nextUrl);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // Create mutations for different transaction types
    const depositMutation = useMutation({
        mutationFn: (data) => apiService.createTransaction({ 
            ...data, 
            type: 'CONTRIBUTION'
        }),
        onSuccess: (response) => {
            
            const accessCode = response?.data?.access_code;
            const reference = response?.data?.reference;
            
            if (accessCode) {
                // Use Paystack Popup
                const popup = new PaystackPop();
                popup.resumeTransaction(accessCode, {
                    onSuccess: (transaction) => {
                        verifyPayment(transaction.reference);
                    },
                    onCancel: () => {
                        toast.info('Payment cancelled');
                    }
                });
            } else {
                toast.error("Payment initialization failed. Please try again.");
            }
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "Failed to process deposit");
        }
    });

    const withdrawMutation = useMutation({
        mutationFn: (data) => {
            // Get the selected bank details
            const selectedBank = banks?.data?.find(b => b.code === data.bank);
            
            return apiService.createTransaction({ 
                type: 'WITHDRAWAL',
                amount: data.amount,
                password: data.password,
                account: data.account,
                bankCode: data.bank,
                accountName: accountName || 'Account Holder',
                bank: selectedBank?.name || 'Bank'
            });
        },
        onSuccess: (response) => {
            toast.success(response.message || "Withdrawal successful! Funds will be credited shortly.");
            queryClient.invalidateQueries(['transactions']);
            queryClient.invalidateQueries(['subscriber']);
            reset();
            setAccountName('');
            setActiveTransaction(null);
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.message || "Failed to process withdrawal";
            toast.error(errorMessage);
        }
    });

    const transferMutation = useMutation({
        mutationFn: (data) => {
            if (data?.isWalletTransfer) {
                const normalizedWalletId = String(data.walletId || "")
                    .trim()
                    .toUpperCase()
                    .replace(/\s+/g, "");
                return apiService.createTransaction({
                    type: 'WALLET',
                    amount: data.amount,
                    password: data.password,
                    message: data.message,
                    walletId: normalizedWalletId,
                    recipientWalletId: normalizedWalletId
                });
            }

            // Get the selected bank details
            const selectedBank = banks?.data?.find(b => b.code === data.bank);
            
            return apiService.createTransaction({ 
                type: 'TRANSFER',
                amount: data.amount,
                password: data.password,
                account: data.account,
                bankCode: data.bank,
                accountName: accountName || 'Account Holder',
                bank: selectedBank?.name || 'Bank'
            });
        },
        onSuccess: (response, variables) => {
            if (variables?.isWalletTransfer) {
                toast.success(response.message || "Wallet transfer successful.");
                queryClient.invalidateQueries(['transactions']);
                queryClient.invalidateQueries(['subscriber']);
                setSuccessData({
                    walletId: response?.data?.recipientWalletId || variables?.walletId,
                    amount: response?.data?.amount ?? variables?.amount,
                    message: response?.data?.message ?? variables?.message,
                    recipientName: response?.data?.recipientName
                });
                setShowSuccessScreen(true);
                reset();
                return;
            }

            toast.success(response.message || "Transfer successful! Funds will be credited shortly.");
            queryClient.invalidateQueries(['transactions']);
            queryClient.invalidateQueries(['subscriber']);
            reset();
            setAccountName('');
            setActiveTransaction(null);
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.message || "Failed to process transfer";
            toast.error(errorMessage);
        }
    });

    const verifyBankMutation = useMutation({
        mutationFn: (data) => apiService.verifyBankAccount(data),
        onSuccess: (data) => {
            toast.success(`Account verified: ${data.accountName}`);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "Failed to verify account");
        }
    });

    const handleTransaction = (data, type) => {
        switch (type) {
            case 'deposit':
                depositMutation.mutate(data);
                break;
            case 'withdraw':
                withdrawMutation.mutate(data);
                break;
            case 'transfer':
                transferMutation.mutate(data);
                break;
            case 'wallet':
                transferMutation.mutate({ ...data, isWalletTransfer: true });
                break;
            default:
                break;
        }
    };

    // Auto-verify account when both bank and account number are valid
    const autoVerifyAccount = async (accountNumber, bankCode) => {
        if (!accountNumber || !bankCode || accountNumber.length !== 10) {
            setAccountName('');
            return;
        }

        setIsVerifying(true);
        try {
            const response = await apiService.verifyBankAccount({
                accountNumber,
                bankCode
            });
            
            if (response.status && response.data?.account_name) {
                setAccountName(response.data.account_name);
                toast.success(`✓ ${response.data.account_name}`, {
                    autoClose: 3000,
                    position: 'top-right'
                });
            } else if (response.data?.status && response.data?.data?.account_name) {
                // Handle nested response structure
                setAccountName(response.data.data.account_name);
                toast.success(`✓ ${response.data.data.account_name}`, {
                    autoClose: 3000,
                    position: 'top-right'
                });
            } else {
                // Verification returned but no account name
                setAccountName('Unable to verify account');
                toast.warning('Could not verify account details. Please check and try again.', {
                    autoClose: 4000
                });
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            
            // Check if it's an API key issue
            if (errorMessage?.includes('Invalid key') || errorMessage?.includes('Unauthorized')) {
                setAccountName('Verification service not configured');
                toast.error('Bank verification is not set up. Please contact support.', {
                    autoClose: 5000
                });
            } else if (errorMessage?.includes('Could not resolve')) {
                setAccountName('Invalid account details');
                toast.error('Account number not found. Please check your details.', {
                    autoClose: 4000
                });
            } else {
                // Generic error
                setAccountName('Unable to verify account');
                toast.warning('Verification temporarily unavailable. You can still proceed.', {
                    autoClose: 4000
                });
            }
        } finally {
            setIsVerifying(false);
        }
    };

    const renderActiveForm = () => {
        if (!activeTransaction) return null;

        const formProps = {
            animate: { opacity: 1, y: 0 },
            initial: { opacity: 0, y: 20 },
            transition: { duration: 0.3 },
            exit: { opacity: 0, y: -20 }
        };

        switch (activeTransaction) {
            case 'deposit':
                return (
                    <motion.div 
                        key="deposit-form"
                        className="mt-6"
                        {...formProps}
                    >
                        <Card variant="elevated" padding="md">
                            <form onSubmit={handleSubmit((data) => handleTransaction(data, 'deposit'))}>
                                {/* Compact header */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#0077B610' }}>
                                        <Wallet style={{ color: '#0077B6' }} size={20} strokeWidth={2} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                                        Fund Wallet
                                    </h3>
                                </div>
                                
                                <div className="space-y-4">
                                    <Input
                                        type="number"
                                        label="Amount (₦)"
                                        placeholder="Enter amount"
                                        error={errors.amount?.message}
                                        {...register("amount")}
                                    />
                                    <div className="bg-[var(--color-primary-light)] border border-[var(--color-primary)]/20 rounded-lg p-3">
                                        <p className="text-xs text-[var(--color-text-secondary)]">
                                            Secure payment via Paystack • Card, Bank, USSD, Opay, QR
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="mt-4 flex gap-2">
                                    <Button 
                                        type="button" 
                                        variant="secondary" 
                                        size="md"
                                        onClick={() => setActiveTransaction(null)}
                                        icon={<ArrowLeft size={18} />}
                                    >
                                        Back
                                    </Button>
                                    <Button 
                                        type="submit" 
                                        variant="primary" 
                                        size="md"
                                        fullWidth
                                        loading={depositMutation.isPending}
                                        disabled={!isValid || depositMutation.isPending}
                                    >
                                        {depositMutation.isPending ? 'Opening...' : 'Continue'}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </motion.div>
                );
            case 'withdraw':
                return (
                    <motion.div 
                        key="withdraw-form"
                        className="mt-8 max-w-md mx-auto"
                        {...formProps}
                    >
                        <Card variant="elevated" padding="lg">
                            <form onSubmit={handleSubmit((data) => handleTransaction(data, "withdraw"))}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-full bg-[#059669] flex items-center justify-center">
                                        <Building2 className="text-white" size={24} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-[var(--color-text-primary)]">
                                        Withdraw Funds
                                    </h3>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                                            Bank
                                        </label>
                                        <select
                                            {...register("bank")}
                                            disabled={isLoading}
                                            className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all duration-150"
                                        >
                                            <option value="">Select a bank</option>
                                            {banks?.data?.map((bank, idx) => (
                                                <option key={`bank-${bank.code}-${idx}`} value={bank.code}>{bank.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Input
                                            type="text"
                                            label="Account Number"
                                            placeholder="Enter 10-digit account number"
                                            {...register("account")}
                                            maxLength={10}
                                        />
                                        {isVerifying && (
                                            <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                                                🔄 Verifying account...
                                            </p>
                                        )}
                                        {accountName && !isVerifying && (
                                            <div className="mt-2 p-3 bg-[#dcfce7] border border-[#059669] rounded-lg">
                                                <p className="text-sm font-medium text-[#059669]">
                                                    ✓ {accountName}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <Input
                                        type="number"
                                        label="Amount"
                                        placeholder="Enter amount"
                                        error={errors.amount?.message}
                                        {...register("amount")}
                                    />
                                    <Input
                                        type="password"
                                        label="Password"
                                        placeholder="Enter your password to confirm"
                                        error={errors.password?.message}
                                        {...register("password")}
                                    />
                                </div>
                                
                                <div className="mt-6 flex gap-3">
                                    <Button 
                                        type="button" 
                                        variant="secondary" 
                                        onClick={() => setActiveTransaction(null)}
                                        icon={<ArrowLeft size={20} />}
                                    >
                                        Back
                                    </Button>
                                    <Button 
                                        type="submit" 
                                        variant="primary"
                                        fullWidth
                                        loading={withdrawMutation.isPending}
                                        disabled={!isValid || withdrawMutation.isPending || !accountName}
                                    >
                                        Withdraw
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </motion.div>
                );
            case 'transfer':
                return (
                    <motion.div 
                        key="transfer-form"
                        className="mt-8 max-w-md mx-auto"
                        {...formProps}
                    >
                        <Card variant="elevated" padding="lg">
                            <form onSubmit={handleSubmit((data) => handleTransaction(data, "transfer"))}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-full bg-[#8b5cf6] flex items-center justify-center">
                                        <ArrowLeftRight className="text-white" size={24} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-[var(--color-text-primary)]">
                                        Pay to Bank
                                    </h3>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                                            Bank
                                        </label>
                                        <select
                                            {...register("bank")}
                                            disabled={isLoading}
                                            className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all duration-150"
                                        >
                                            <option value="">Select a bank</option>
                                            {banks?.data?.map((bank, idx) => (
                                                <option key={`bank-${bank.code}-${idx}`} value={bank.code}>{bank.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <Input
                                        type="text"
                                        label="Account Number"
                                        placeholder="Enter account number"
                                        {...register("account")}
                                    />
                                    <Input
                                        type="number"
                                        label="Amount"
                                        placeholder="Enter amount"
                                        error={errors.amount?.message}
                                        {...register("amount")}
                                    />
                                    <Input
                                        type="password"
                                        label="Password"
                                        placeholder="Enter your password to confirm"
                                        error={errors.password?.message}
                                        {...register("password")}
                                    />
                                </div>
                                
                                <div className="mt-6 flex gap-3">
                                    <Button 
                                        type="button" 
                                        variant="secondary" 
                                        onClick={() => setActiveTransaction(null)}
                                        icon={<ArrowLeft size={20} />}
                                    >
                                        Back
                                    </Button>
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        onClick={() => autoVerifyAccount(watchedAccount, watchedBank)}
                                        loading={isVerifying}
                                    >
                                        Verify
                                    </Button>
                                    <Button 
                                        type="submit" 
                                        variant="primary"
                                        loading={transferMutation.isPending}
                                        disabled={!isValid || transferMutation.isPending}
                                    >
                                        Transfer
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </motion.div>
                );
            case 'wallet':
                if (showSuccessScreen) {
                    return (
                        <motion.div 
                            key="success-screen"
                            className="mt-8 max-w-md mx-auto"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Card variant="elevated" padding="lg">
                                <div className="text-center">
                                    <div className="w-20 h-20 rounded-full bg-[#059669] flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="text-white" size={48} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
                                        Transfer Successful!
                                    </h3>
                                    <p className="text-[var(--color-text-secondary)] mb-6">
                                        Your money has been sent successfully
                                    </p>
                                    
                                    {successData && (
                                        <div className="bg-[var(--color-surface)] rounded-lg p-4 mb-6 space-y-2 text-left">
                                            <div className="flex justify-between">
                                                <span className="text-[var(--color-text-secondary)]">Recipient:</span>
                                                <span className="font-medium text-[var(--color-text-primary)]">{successData.walletId}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[var(--color-text-secondary)]">Amount:</span>
                                                <span className="font-medium text-[var(--color-text-primary)]">₦{successData.amount}</span>
                                            </div>
                                            {successData.message && (
                                                <div className="flex justify-between">
                                                    <span className="text-[var(--color-text-secondary)]">Message:</span>
                                                    <span className="font-medium text-[var(--color-text-primary)]">{successData.message}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    <Button 
                                        variant="primary" 
                                        fullWidth
                                        onClick={() => {
                                            setShowSuccessScreen(false);
                                            setActiveTransaction(null);
                                            setSuccessData(null);
                                        }}
                                    >
                                        Done
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    );
                }
                
                return (
                    <>
                        <motion.div 
                            key="wallet-form"
                            className="mt-8 max-w-md mx-auto"
                            {...formProps}
                        >
                            <Card variant="elevated" padding="lg">
                                <form onSubmit={handleSubmit((data) => {
                                    setConfirmData(data);
                                    setShowConfirmModal(true);
                                })}>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-12 h-12 rounded-full bg-[#f59e0b] flex items-center justify-center">
                                            <Send className="text-white" size={24} />
                                        </div>
                                        <h3 className="text-2xl font-bold text-[var(--color-text-primary)]">
                                            Send to User
                                        </h3>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <Input
                                            type="text"
                                            label="Recipient Wallet ID"
                                            placeholder="MDBX-XXXX-XXXX-XXXX"
                                            error={errors.walletId?.message}
                                            {...register("walletId")}
                                        />
                                        <Input
                                            type="number"
                                            label="Amount"
                                            placeholder="Enter amount"
                                            error={errors.amount?.message}
                                            {...register("amount")}
                                        />
                                        <Input
                                            type="text"
                                            label="Message (Optional)"
                                            placeholder="Add a message"
                                            {...register("message")}
                                        />
                                        <Input
                                            type="password"
                                            label="Password"
                                            placeholder="Enter your password to confirm"
                                            error={errors.password?.message}
                                            {...register("password")}
                                        />
                                    </div>
                                    
                                    <div className="mt-6 flex gap-3">
                                        <Button 
                                            type="button" 
                                            variant="secondary" 
                                            onClick={() => setActiveTransaction(null)}
                                            icon={<ArrowLeft size={20} />}
                                        >
                                            Back
                                        </Button>
                                        <Button 
                                            type="submit" 
                                            variant="primary" 
                                            fullWidth
                                            disabled={!isValid}
                                        >
                                            Send Money
                                        </Button>
                                    </div>
                                </form>
                            </Card>
                        </motion.div>
                        
                        <Modal
                            isOpen={showConfirmModal}
                            onClose={() => setShowConfirmModal(false)}
                            title="Confirm Transfer"
                        >
                            <div className="space-y-4">
                                <p className="text-[var(--color-text-secondary)]">
                                    Please confirm the transfer details:
                                </p>
                                
                                {confirmData && (
                                    <div className="bg-[var(--color-surface)] rounded-lg p-4 space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-[var(--color-text-secondary)]">Recipient:</span>
                                            <span className="font-medium text-[var(--color-text-primary)]">{confirmData.walletId}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[var(--color-text-secondary)]">Amount:</span>
                                            <span className="font-medium text-[var(--color-text-primary)]">₦{confirmData.amount}</span>
                                        </div>
                                        {confirmData.message && (
                                            <div className="flex justify-between">
                                                <span className="text-[var(--color-text-secondary)]">Message:</span>
                                                <span className="font-medium text-[var(--color-text-primary)]">{confirmData.message}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                <div className="flex gap-3 mt-6">
                                    <Button 
                                        variant="secondary" 
                                        fullWidth
                                        onClick={() => setShowConfirmModal(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button 
                                        variant="primary" 
                                        fullWidth
                                        loading={transferMutation.isPending}
                                        onClick={() => {
                                            handleTransaction(confirmData, "wallet");
                                            setShowConfirmModal(false);
                                        }}
                                    >
                                        Confirm
                                    </Button>
                                </div>
                            </div>
                        </Modal>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <motion.section
            className="max-w-3xl mx-auto p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
        >
            {/* Header - Compact & Clean */}
            <div className="mb-6">
                <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">Transactions</h1>
                <p className="text-sm text-[var(--color-text-secondary)]">Manage your transactions</p>
            </div>
                
            {/* Tab Navigation - Minimalist segmented control */}
            <div className="flex gap-1 bg-[var(--color-surface)] p-1 rounded-lg inline-flex mb-6 border border-[var(--color-border)]">
                <button
                    onClick={() => setShowHistory(false)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                        !showHistory 
                            ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm' 
                            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    }`}
                >
                    New Transaction
                </button>
                <button
                    onClick={() => setShowHistory(true)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                        showHistory 
                            ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm' 
                            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    }`}
                >
                    History
                </button>
            </div>

            <AnimatePresence mode="wait">
                {showHistory ? (
                    <motion.div
                        key="history"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                    >
                        <TransactionHistory
                            transactions={transactionsData?.data || []}
                            isLoading={isLoadingTransactions}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="options"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                    >
                        {/* Transaction Options - Compact grid */}
                        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 ${
                            activeTransaction ? 'opacity-50 pointer-events-none' : ''
                        }`}>
                            {transactionOptions.map(({ id, type, icon, label, color }) => (
                                <TransactionOption
                                    key={id}
                                    type={type}
                                    icon={icon}
                                    label={label}
                                    color={color}
                                    onClick={() => setActiveTransaction(id)}
                                    isActive={activeTransaction === id}
                                />
                            ))}
                        </div>
                        <AnimatePresence mode="wait">
                            {renderActiveForm()}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.section>
    );
};

export default Transactions;
