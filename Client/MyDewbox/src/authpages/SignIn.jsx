import React, { useState } from "react";
import { useForm } from "react-hook-form";
import AuthCarousel from "../components/AuthCarousel";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { Phone, Lock, ArrowRight } from "lucide-react";
import "react-toastify/dist/ReactToastify.css";
import { login } from '../services/api';
import { useAuthStore } from '../store/authstore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Img from '../assets/DMLogo.png';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

// Use phone as login identifier
const schema = yup.object().shape({
  mobile: yup
    .string()
    .required("Phone number is required")
    .matches(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
  rememberMe: yup.boolean(),
});

const SignIn = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login: updateAuth } = useAuthStore();

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      rememberMe: false,
    },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const result = await login(data.mobile, data.password);
      // Ensure the token is the user id and not undefined
      if (!result.token) {
        toast.error("Login failed: No token returned from server.");
        return;
      }
      localStorage.setItem('token', result.token);

      // Handle remember me
      if (data.rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }

      updateAuth(result.user);
      toast.success("Login successful!");
      navigate("/dashboard"); // Always go to dashboard after sign in
    } catch (error) {
      const errorMessage = error.response?.data?.message || "An error occurred during login. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen relative'>
      {/* Left side - Carousel (hidden on mobile) - Fixed position */}
      <div className="hidden md:block fixed left-0 top-0 w-1/2 h-screen overflow-hidden z-10">
        <AuthCarousel />
      </div>

      {/* Mobile Carousel Preview */}
      <div className="md:hidden px-4 pt-4">
        <div className="h-[232px] rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <AuthCarousel compact />
        </div>
      </div>

      {/* Right side - Sign In Form */}
      <div className='min-h-screen md:absolute md:right-0 md:w-1/2 flex items-center justify-center p-4 md:p-8 bg-gray-50'>
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Logo (visible on mobile) - Removed to clean up UI */}

          {/* Clean Minimal Card Container */}
          <Card variant="elevated" padding="md" className="bg-white shadow-sm border border-gray-200">
            {/* Header - Minimal */}
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Welcome back</h2>
              <p className="text-gray-500 text-xs">Sign in to your account to continue</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Phone Number Input */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-[var(--color-text-primary)]">
                  Phone Number
                </label>
                <div className="relative">
                  <PhoneInput
                    country={'ng'}
                    value={getValues('mobile')}
                    onChange={(phone) => setValue('mobile', phone, { shouldValidate: true })}
                    inputClass="!w-full !h-12 !text-base !pl-12 !bg-[var(--color-background)] !border-[var(--color-border)] !text-[var(--color-text-primary)] !rounded-lg focus:!border-primary-500 focus:!ring-1 focus:!ring-primary-500 transition-colors"
                    buttonClass="!bg-[var(--color-surface)] !border-[var(--color-border)] !rounded-l-lg hover:!bg-[var(--color-surface-hover)]"
                    dropdownClass="!bg-[var(--color-surface-elevated)] !text-[var(--color-text-primary)]"
                    containerClass="!w-full"
                  />
                  {errors.mobile && (
                    <p className="text-sm text-red-500 mt-1">{errors.mobile.message}</p>
                  )}
                </div>
              </div>

              {/* Password Input */}
              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                icon={<Lock size={20} />}
                error={errors.password?.message}
                required
                {...register("password")}
              />

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("rememberMe")}
                    className="w-4 h-4 rounded border-[var(--color-border)] text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-[var(--color-text-primary)]">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => toast.info("Password reset feature coming soon")}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Forgot password?
                </button>
              </div>

              {/* Sign In Button - Minimal */}
              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                loading={isLoading}
              >
                Sign In
              </Button>
            </form>

            {/* Create Account Link - Minimal */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-500">
                    Don't have an account?
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/subscribeto")}
                className="mt-3 w-full py-2 px-4 border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all duration-150 flex items-center justify-center gap-2"
              >
                <span>Create new account</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default SignIn;
