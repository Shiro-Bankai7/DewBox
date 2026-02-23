import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { useAuthStore } from "../store/authstore";
import { useQuery } from "@tanstack/react-query";
import apiService from "../services/api";
import { ArrowRight, TrendingUp } from "lucide-react";
import Button from "../components/ui/Button";

const FirstContribute = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: subscriberData } = useQuery({
    queryKey: ["subscriber"],
    queryFn: () => user ? apiService.getSubscriber() : Promise.resolve({ data: { subscriber: {} } }),
    enabled: !!user,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const subscriber = subscriberData?.data?.subscriber;
  const subscriberCurrency = subscriber?.currency || "NGN";
  const currencySymbol = subscriberCurrency === 'NGN' ? '₦' : '$';

  const quickAmounts = [1000, 5000, 10000, 20000];

  const handleContribute = async () => {
    if (!user) {
      toast.error("Please sign in to contribute");
      navigate("/signin");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const depositResponse = await apiService.createTransaction({
        type: 'FEE',
        amount: parseFloat(amount)
      });

      if (depositResponse.status === 'success' && depositResponse.data?.authorization_url) {
        window.location.href = depositResponse.data.authorization_url;
      } else {
        toast.error('Failed to initialize payment');
        setIsSubmitting(false);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                         error.response?.data?.error || 
                         'Failed to process payment';
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("pendingFirstContributionFeeNotice", "true");
    toast.info("You can skip for now. A fee will be removed from your first contribution.");
    navigate("/dashboard");
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full mx-4 bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <h2 className="text-xl font-semibold mb-3 text-gray-900">Sign in Required</h2>
          <p className="mb-6 text-gray-600 text-sm">You must be signed in to make a contribution.</p>
          <Button 
            variant="primary"
            size="md"
            fullWidth
            onClick={() => navigate('/signin')}
          >
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-ocean-blue to-bright-cyan px-8 py-10 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-semibold">Pay Your First Fee</h1>
            </div>
            <p className="text-ice-blue text-sm">
              This is your onboarding fee payment. You can skip now and it will be removed from your first contribution.
            </p>
          </div>

          <div className="px-8 py-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Fee Amount
            </label>
            
            <div className="relative mb-6">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-semibold text-gray-400">
                {currencySymbol}
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-16 pr-6 py-5 text-4xl font-semibold border-2 border-gray-200 rounded-xl focus:border-ocean-blue focus:outline-none transition-colors"
                min="0"
                step="100"
              />
            </div>

            <div className="grid grid-cols-4 gap-2 mb-8">
              {quickAmounts.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(preset.toString())}
                  className={`py-3 px-2 text-sm font-medium rounded-lg border-2 transition-all ${
                    amount === preset.toString()
                      ? 'border-ocean-blue bg-ice-blue text-ocean-blue'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {currencySymbol}{preset.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="bg-ice-blue border border-sky-blue rounded-xl p-4 mb-6">
              <p className="text-sm text-dark-navy mb-1">
                <span className="font-medium">Secure Payment:</span> Your fee is processed securely through Paystack.
              </p>
              <p className="text-xs text-dark-navy/80">
                If you skip now, the fee will be deducted from your first contribution.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleContribute}
                loading={isSubmitting}
                disabled={!amount || parseFloat(amount) <= 0}
                icon={<ArrowRight size={18} />}
                iconPosition="right"
              >
                Pay Fee Now
              </Button>
               
              <button
                onClick={handleSkip}
                className="w-full py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Trusted by thousands of savers across Nigeria
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default FirstContribute;
