import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Heart, TrendingUp, Users, CheckCircle2, ArrowRight, Wallet, PiggyBank, Check, CreditCard, Download, ChevronDown } from "lucide-react";
import { apiService } from "../services/api";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Card from "../components/ui/Card";
import { useAuthStore } from "../store/authstore";
import { downloadReceipt } from "../utils/receipt";

const schema = yup.object().shape({
    amount: yup
        .number()
        .typeError("Amount must be a number")
        .positive("Amount must be greater than 0")
        .required("Amount is required"),
    description: yup.string().max(200, "Description must be less than 200 characters"),
    contributionType: yup.string().required("Please select a contribution type"),
    paymentMethod: yup.string().when("contributionType", {
        is: "esusu",
        then: (value) => value.notRequired(),
        otherwise: (value) => value.required("Please select a payment method"),
    }),
});

const Contribute = () => {
    const [showSuccess, setShowSuccess] = useState(false);
    const [contributionAmount, setContributionAmount] = useState(0);
    const [selectedType, setSelectedType] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    const [receiptPayload, setReceiptPayload] = useState(null);
    const [expandedTypeInfo, setExpandedTypeInfo] = useState('');
    const [piggyWithdrawAmount, setPiggyWithdrawAmount] = useState('');
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const navigate = useNavigate();
    
    // Get subscriber data for email
    const { data: subscriberData } = useQuery({
        queryKey: ['subscriber'],
        queryFn: () => apiService.getSubscriber(),
    });
    const { data: contributionInfoResponse } = useQuery({
        queryKey: ['contributionInfo'],
        queryFn: () => apiService.getContributionInfo(),
        staleTime: 60 * 1000,
    });

    const hasJoinedEsusu = String(subscriberData?.data?.subscriber?.joinEsusu || '')
        .toLowerCase() === 'yes' || subscriberData?.data?.subscriber?.joinEsusu === true;
    const subscriber = subscriberData?.data?.subscriber || {};
    const currentPiggyBalance = Number.parseFloat(subscriber.piggy_balance || 0);
    const currentWalletBalance = Number.parseFloat(subscriber.balance || 0);
    const contributionInfo = contributionInfoResponse?.data || {};
    const isPiggyLocked = contributionInfo.allowPiggy === false;
    const remainingIcaOnlyContributions = Number.parseInt(
        contributionInfo.remainingIcaOnlyContributions || 0,
        10
    );
    
    const contributionTypes = [
        { 
            id: "ica", 
            title: "ICA", 
            icon: TrendingUp,
            color: "ocean-blue",
        },
        { 
            id: "esusu", 
            title: "eSusu", 
            icon: Users,
            color: "bright-cyan",
        },
        { 
            id: "piggy", 
            title: "Piggy", 
            icon: PiggyBank,
            color: "deep-teal",
        },
    ];

    const contributionTypeInfo = {
        ica: {
            title: "Investment Cooperative Account",
            description:
                "Investment Cooperative Account is for more structured contributions that support long-term financial goals."
        },
        piggy: {
            title: "Piggy",
            description:
                "Piggy is your piggy bank, built for flexible savings you can top up whenever you are ready."
        },
        esusu: {
            title: "eSusu",
            description:
                "eSusu works through group participation. Join an eSusu club first before contributing through this option."
        }
    };

    const paymentMethods = [
        {
            id: "wallet",
            title: "Wallet",
            subtitle: "Pay from your wallet balance",
            icon: Wallet,
            color: "ocean-blue"
        },
        {
            id: "bank",
            title: "Bank Card",
            subtitle: "Pay with debit/credit card",
            icon: CreditCard,
            color: "bright-cyan"
        }
    ];
    
    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors, isValid },
    } = useForm({
        resolver: yupResolver(schema),
        mode: 'onChange',
    });

    // Contribution mutation
    const mutation = useMutation({
        mutationFn: (data) => apiService.contribute(data),
        onSuccess: (response) => {
            // Wallet payment success
            setContributionAmount(response.data?.amount || 0);
            setReceiptPayload({
                receipt: {
                    reference: response.data?.reference || `WALLET-${Date.now()}`,
                    transactionId: null,
                    status: 'success',
                    amount: response.data?.amount || 0,
                    requestedAmount: response.data?.amount || 0,
                    fees: 0,
                    currency: 'NGN',
                    channel: 'wallet',
                    gatewayResponse: 'Approved',
                    paidAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    customerEmail: subscriberData?.data?.subscriber?.email || user?.email || null,
                    paymentType: response.data?.type || selectedType?.toUpperCase() || 'CONTRIBUTION',
                    narration: response.data?.description || 'Wallet contribution'
                },
                verification: null
            });
            setShowSuccess(true);
            const typeLabel = contributionTypes.find(t => t.id === selectedType)?.title || 'Contribution';
            toast.success(`${typeLabel} contribution added successfully! 🎉`);
            queryClient.invalidateQueries(['transactions']);
            queryClient.invalidateQueries(['subscriber']);
            queryClient.invalidateQueries(['contributionInfo']);
            queryClient.invalidateQueries(['contributionHistory']);
            queryClient.invalidateQueries(['wallet']);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "Failed to contribute. Please try again");
        },
    });

    const piggyWithdrawMutation = useMutation({
        mutationFn: (amount) => apiService.withdrawPiggyToWallet(amount),
        onSuccess: (response) => {
            toast.success(response?.message || 'Piggy funds moved to wallet');
            setPiggyWithdrawAmount('');
            queryClient.invalidateQueries(['transactions']);
            queryClient.invalidateQueries(['subscriber']);
            queryClient.invalidateQueries(['wallet']);
            queryClient.invalidateQueries(['contributionHistory']);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to move piggy funds to wallet');
        }
    });

    // Load Paystack script
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://js.paystack.co/v1/inline.js';
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    // If Paystack redirects back here (possible for some channels), verify using the reference in the URL.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const reference = params.get('reference') || params.get('trxref');

        if (!reference) return;

        toast.info('Verifying payment...');
        apiService.verifyContribution(reference)
            .then((verifyResponse) => {
                const amount = verifyResponse.data?.amount;
                const contributionType = verifyResponse.data?.contributionType;

                if (amount) setContributionAmount(amount);
                if (contributionType) setSelectedType(String(contributionType).toLowerCase());
                setReceiptPayload({
                    receipt: verifyResponse.data?.receipt || null,
                    verification: verifyResponse.data?.verification || null
                });

                setShowSuccess(true);
                queryClient.invalidateQueries(['transactions']);
                queryClient.invalidateQueries(['subscriber']);
                queryClient.invalidateQueries(['contributionInfo']);
                queryClient.invalidateQueries(['contributionHistory']);
                queryClient.invalidateQueries(['wallet']);
            })
            .catch((error) => {
                toast.error(error.response?.data?.message || 'Failed to verify payment');
            })
            .finally(() => {
                params.delete('reference');
                params.delete('trxref');
                params.delete('status');

                const qs = params.toString();
                const nextUrl = window.location.pathname + (qs ? `?${qs}` : '');
                window.history.replaceState({}, '', nextUrl);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onSubmit = async (data) => {
        // Esusu contributions are handled via club membership onboarding.
        if (data.contributionType === 'esusu') {
            toast.info('Join an Esusu club first before making Esusu contributions.');
            return;
        }

        // If bank payment is selected, initiate Paystack payment
        if (data.paymentMethod === 'bank') {
            const email = subscriberData?.data?.subscriber?.email || user?.email;
            
            if (!email) {
                toast.error('Email not found. Please update your profile.');
                return;
            }

            // Initialize Paystack
            const PaystackPop = window.PaystackPop;
            if (!PaystackPop) {
                toast.error('Payment system not loaded. Please refresh the page.');
                return;
            }

            const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
            if (!publicKey) {
                toast.error('Paystack public key not configured.');
                return;
            }

            const handler = PaystackPop.setup({
                key: publicKey,
                email: email,
                amount: parseFloat(data.amount) * 100, // Convert to kobo
                currency: 'NGN',
                ref: `CONT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
                metadata: {
                    userId: user?.id,
                    contributionType: data.contributionType.toUpperCase(),
                    description: data.description || 'Contribution',
                    custom_fields: [
                        {
                            display_name: "User ID",
                            variable_name: "user_id",
                            value: user?.id || ''
                        },
                        {
                            display_name: "Contribution Type",
                            variable_name: "contribution_type",
                            value: data.contributionType.toUpperCase()
                        }
                    ]
                },
                callback: function(response) {
                    // Payment successful
                    toast.success('Payment successful! Processing contribution...');
                    
                    // Verify payment and process contribution
                    apiService.verifyContribution(response.reference)
                        .then((verifyResponse) => {
                            setContributionAmount(verifyResponse.data?.amount || data.amount);
                            setReceiptPayload({
                                receipt: verifyResponse.data?.receipt || null,
                                verification: verifyResponse.data?.verification || null
                            });
                            setShowSuccess(true);
                            const typeLabel = contributionTypes.find(t => t.id === selectedType)?.title || 'Contribution';
                            toast.success(`${typeLabel} contribution processed successfully! 🎉`);
                            queryClient.invalidateQueries(['transactions']);
                            queryClient.invalidateQueries(['subscriber']);
                            queryClient.invalidateQueries(['contributionInfo']);
                            queryClient.invalidateQueries(['contributionHistory']);
                            queryClient.invalidateQueries(['wallet']);
                        })
                        .catch((error) => {
                            toast.error(error.response?.data?.message || 'Failed to process contribution');
                        });
                },
                onClose: function() {
                    toast.info('Payment cancelled');
                }
            });

            handler.openIframe();
            return;
        }

        // Wallet payment
        mutation.mutate({
            amount: data.amount,
            type: data.contributionType.toUpperCase(),
            description: data.description || 'Contribution',
            paymentMethod: 'wallet',
        });
    };

    const handleJoinEsusuClub = () => {
        if (hasJoinedEsusu) {
            toast.info('Your account can use eSusu.');
            return;
        }
        toast.info('Please join an eSusu group first.');
    };

    const handleDownloadReceipt = () => {
        const downloaded = downloadReceipt({
            receipt: receiptPayload?.receipt || null,
            verification: receiptPayload?.verification || null,
            title: 'MyDewbox Contribution Receipt'
        });

        if (downloaded) {
            toast.success('Receipt downloaded');
            return;
        }

        toast.error('No receipt data available yet.');
    };

    const handleNewContribution = () => {
        setShowSuccess(false);
        setContributionAmount(0);
        setSelectedType('');
        setSelectedPaymentMethod('');
        setReceiptPayload(null);
        reset();
    };

    const handleTypeSelect = (typeId) => {
        if (typeId === 'piggy' && isPiggyLocked) {
            toast.info(
                contributionInfo.description ||
                `First ${contributionInfo.icaOnlyLimit || 10} daily contributions are ICA only.`
            );
            return;
        }

        setSelectedType(typeId);
        setValue('contributionType', typeId, { shouldValidate: true });
        setExpandedTypeInfo((prev) => (prev === typeId ? '' : typeId));

        if (typeId === 'esusu') {
            setSelectedPaymentMethod('');
            setValue('paymentMethod', '', { shouldValidate: true });
        }
    };

    const handlePaymentMethodSelect = (methodId) => {
        setSelectedPaymentMethod(methodId);
        setValue('paymentMethod', methodId, { shouldValidate: true });
    };

    const handlePiggyWithdraw = () => {
        const amount = Number.parseFloat(piggyWithdrawAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error('Enter a valid amount');
            return;
        }
        if (amount > currentPiggyBalance) {
            toast.error('Amount exceeds your piggy balance');
            return;
        }
        piggyWithdrawMutation.mutate(amount);
    };

    if (showSuccess) {
        return (
            <motion.div
                className="max-w-5xl mx-auto p-4 sm:p-6 w-full"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                <Card variant="elevated" padding="lg" className="rounded-2xl">
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="text-green-600" size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
                            Contribution Successful
                        </h2>
                        <p className="text-base text-[var(--color-text-secondary)] mb-6">
                            You've contributed <span className="font-bold text-green-600">₦{contributionAmount.toLocaleString()}</span>
                        </p>
                        
                        <div className="bg-[var(--color-surface-elevated)] rounded-lg p-6 mb-6">
                            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                                Your contribution is now working for you. Earn returns and grow your wealth with the community.
                            </p>
                            <div className="flex items-center justify-center gap-8 text-sm">
                                <div className="text-center">
                                    <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mx-auto mb-2">
                                        <TrendingUp className="text-green-600" size={20} />
                                    </div>
                                    <p className="font-medium text-[var(--color-text-primary)]">Earn Returns</p>
                                </div>
                                <div className="text-center">
                                    <div className="w-12 h-12 rounded-lg bg-[var(--color-primary-light)] flex items-center justify-center mx-auto mb-2">
                                        <Users className="text-[var(--color-primary)]" size={20} />
                                    </div>
                                    <p className="font-medium text-[var(--color-text-primary)]">Build Together</p>
                                </div>
                                <div className="text-center">
                                    <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center mx-auto mb-2">
                                        <Heart className="text-red-600" size={20} />
                                    </div>
                                    <p className="font-medium text-[var(--color-text-primary)]">Build Wealth</p>
                                </div>
                            </div>
                        </div>

                        {(receiptPayload?.receipt || receiptPayload?.verification) && (
                            <div className="mb-3">
                                <Button
                                    variant="outline"
                                    onClick={handleDownloadReceipt}
                                    fullWidth
                                    icon={<Download size={18} />}
                                >
                                    Download Receipt
                                </Button>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button
                                variant="secondary"
                                onClick={handleNewContribution}
                                fullWidth
                            >
                                Contribute More
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => navigate('/dashboard')}
                                fullWidth
                                icon={<ArrowRight size={20} />}
                            >
                                Go to Dashboard
                            </Button>
                        </div>
                    </div>
                </Card>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="max-w-5xl mx-auto p-4 sm:p-6 w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="relative flex items-center justify-center py-1 mb-5">
                <h1 className="text-3xl font-semibold text-[var(--color-text-primary)]">Contribute</h1>
                <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="absolute left-0 w-11 h-11 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center"
                    aria-label="Back to dashboard"
                >
                    <ArrowRight className="rotate-180 text-[var(--color-text-primary)]" size={20} />
                </button>
            </div>

            <Card variant="elevated" padding="lg" className="rounded-2xl">
                <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                                Move Piggy funds to Wallet
                            </p>
                            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                                Piggy: ₦{currentPiggyBalance.toLocaleString()} | Wallet: ₦{currentWalletBalance.toLocaleString()}
                            </p>
                        </div>
                        <div className="flex w-full flex-col sm:w-auto sm:flex-row gap-2">
                            <input
                                type="number"
                                min="0"
                                step="100"
                                value={piggyWithdrawAmount}
                                onChange={(e) => setPiggyWithdrawAmount(e.target.value)}
                                placeholder="Amount"
                                className="min-h-11 w-full flex-1 sm:w-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                            />
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handlePiggyWithdraw}
                                loading={piggyWithdrawMutation.isPending}
                                disabled={piggyWithdrawMutation.isPending || currentPiggyBalance <= 0}
                                className="w-full sm:w-auto"
                            >
                                Move
                            </Button>
                        </div>
                    </div>
                    {currentPiggyBalance <= 0 && (
                        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                            No available piggy balance to move yet.
                        </p>
                    )}
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Contribution Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-3">
                            Choose where to contribute
                        </label>
                        {isPiggyLocked && (
                            <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                {contributionInfo.description || 'Piggy is temporarily locked this month.'}
                                {remainingIcaOnlyContributions > 0
                                    ? ` ${remainingIcaOnlyContributions} ICA contribution(s) remaining before Piggy unlocks.`
                                    : ''}
                            </div>
                        )}
                        <div className="grid grid-cols-3 gap-2">
                            {contributionTypes.map((type) => {
                                const Icon = type.icon;
                                const isSelected = selectedType === type.id;
                                const isExpanded = expandedTypeInfo === type.id;
                                const isTypeDisabled = type.id === 'piggy' && isPiggyLocked;
                                return (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => handleTypeSelect(type.id)}
                                        disabled={isTypeDisabled}
                                        className={`p-2 min-h-[68px] rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                                            isSelected
                                                ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                                                : 'border-[var(--color-border)] hover:border-[var(--color-primary)] bg-[var(--color-surface)]'
                                        } ${isTypeDisabled ? 'opacity-50 cursor-not-allowed hover:border-[var(--color-border)]' : ''}`}
                                    >
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                            isSelected ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-elevated)]'
                                        }`}>
                                            <Icon className={isSelected ? 'text-white' : 'text-[var(--color-text-secondary)]'} size={14} />
                                        </div>
                                        <h3 className="text-xs font-semibold text-[var(--color-text-primary)] leading-tight">
                                            {type.title}
                                        </h3>
                                        <ChevronDown
                                            size={12}
                                            className={`transition-transform ${
                                                isExpanded ? "rotate-180 text-[var(--color-primary)]" : "text-[var(--color-text-tertiary)]"
                                            }`}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                        {expandedTypeInfo && contributionTypeInfo[expandedTypeInfo] && (
                            <motion.div
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3"
                            >
                                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                                    {contributionTypeInfo[expandedTypeInfo].title}
                                </p>
                                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                                    {contributionTypeInfo[expandedTypeInfo].description}
                                </p>
                            </motion.div>
                        )}
                        {errors.contributionType && (
                            <p className="text-red-500 text-sm mt-2">{errors.contributionType.message}</p>
                        )}
                    </div>

                    {selectedType === 'esusu' ? (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5"
                        >
                            <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">
                                Join eSusu First
                            </h4>
                            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                                You need to be in an eSusu group before contributing here.
                            </p>
                            <Button
                                type="button"
                                variant={hasJoinedEsusu ? "secondary" : "primary"}
                                onClick={handleJoinEsusuClub}
                                fullWidth
                            >
                                {hasJoinedEsusu ? 'eSusu Enabled' : 'Join eSusu'}
                            </Button>
                        </motion.div>
                    ) : (
                    <>
                    {/* Payment Method Selection */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-3">
                            Choose payment method
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                            {paymentMethods.map((method) => {
                                const Icon = method.icon;
                                const isSelected = selectedPaymentMethod === method.id;
                                return (
                                    <button
                                        key={method.id}
                                        type="button"
                                        onClick={() => handlePaymentMethodSelect(method.id)}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                                            isSelected
                                                ? 'border-ocean-blue bg-ice-blue'
                                                : 'border-gray-200 hover:border-gray-300 bg-white'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                                isSelected ? 'bg-ocean-blue' : 'bg-gray-100'
                                            }`}>
                                                <Icon className={isSelected ? 'text-white' : 'text-gray-600'} size={20} />
                                            </div>
                                            {isSelected && (
                                                <div className="w-6 h-6 rounded-full bg-ocean-blue flex items-center justify-center">
                                                    <Check className="text-white" size={14} />
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
                                            {method.title}
                                        </h3>
                                        <p className="text-xs text-[var(--color-text-secondary)]">
                                            {method.subtitle}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                        {errors.paymentMethod && (
                            <p className="text-red-500 text-sm mt-2">{errors.paymentMethod.message}</p>
                        )}
                    </div>

                    <Input
                        type="number"
                        label="Contribution Amount (NGN)"
                        placeholder="Enter amount to contribute"
                        error={errors.amount?.message}
                        {...register("amount")}
                    />

                    <Input
                        type="text"
                        label="Note (Optional)"
                        placeholder="Add a note about your contribution"
                        error={errors.description?.message}
                        {...register("description")}
                    />

                    <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        loading={mutation.isPending}
                        disabled={!isValid || mutation.isPending}
                        icon={<TrendingUp size={20} />}
                    >
                        {mutation.isPending ? 'Processing...' : 'Contribute Now'}
                    </Button>
                    </>
                    )}
                </form>
            </Card>

            <div className="mt-6 text-center">
                <p className="text-sm text-[var(--color-text-secondary)]">
                    All contributions are recorded and earn returns over time
                </p>
            </div>
        </motion.div>
    );
};

export default Contribute;

