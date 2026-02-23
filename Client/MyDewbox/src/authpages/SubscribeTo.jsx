import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Lock, Phone, MapPin, Calendar, ArrowRight, ArrowLeft, Check } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import AuthCarousel from "../components/AuthCarousel";
import { apiService } from "../services/api";
import { useAuthStore } from '../store/authstore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Img from '../assets/DMLogo.png';

const phoneRegex = /^(?:\+?[1-9]{1,3} ?[0-9]{10}|0[1-9]{10})$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Multi-step validation schemas
const step1Schema = yup.object().shape({
  firstname: yup.string().required("First name is required").min(2),
  othername: yup.string().required("Middle name is required").min(2),
  surname: yup.string().required("Surname is required").min(2),
  email: yup.string().required("Email is required").matches(emailRegex, "Invalid email format"),
});

const step2Schema = yup.object().shape({
  mobile: yup.string().required("Mobile number is required").matches(phoneRegex, "Invalid mobile number"),
  alternatePhone: yup.string().required("Alternate phone is required").matches(phoneRegex, "Invalid phone number"),
  dob: yup.date().required("Date of Birth is required").max(new Date(), "Invalid date"),
  gender: yup.string().required("Gender is required"),
});

const step3Schema = yup.object().shape({
  password: yup
    .string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password")], "Passwords must match")
    .required("Confirm Password is required"),
});

const step4Schema = yup.object().shape({
  address1: yup.string().required("Address is required").min(5),
  city: yup.string().required("City is required"),
  state: yup.string().required("State/Region is required"),
  country: yup.string().required("Country is required"),
  lga: yup.string().required("LGA is required").min(2),
  currency: yup.string().required("Currency is required"),
});

const step5Schema = yup.object().shape({
  nextOfKinName: yup.string().required("Next of kin name is required").min(2),
  nextOfKinContact: yup.string().required("Next of kin contact is required").matches(phoneRegex, "Invalid phone number"),
  joinEsusu: yup.string().required("Please select an option"),
  referral: yup.string().optional(),
  referralPhone: yup.string().optional(),
});

const SubscribeTo = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const navigate = useNavigate();
  const { login: updateAuth } = useAuthStore();

  // Location data states
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [lgas, setLgas] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const totalSteps = 5;

  // Get schema for current step
  const getSchema = () => {
    switch (currentStep) {
      case 1: return step1Schema;
      case 2: return step2Schema;
      case 3: return step3Schema;
      case 4: return step4Schema;
      case 5: return step5Schema;
      default: return step1Schema;
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    getValues,
    watch,
    setValue,
  } = useForm({
    resolver: yupResolver(getSchema()),
    mode: "onChange",
  });

  // Watch for country, state changes to load dependent data
  const selectedCountry = watch("country");
  const selectedState = watch("state");

  // Load countries on mount
  React.useEffect(() => {
    const loadCountries = async () => {
      try {
        setLoadingLocations(true);
        const response = await apiService.getCountries();
        if (response.success && response.data) {
          setCountries(response.data);
        } else {
          toast.error('Failed to load countries. Please refresh the page.');
        }
      } catch (error) {
        toast.error('Failed to load countries. Please refresh the page.');
        // Set fallback countries
        setCountries([
          { name: 'Nigeria', code: 'NG' },
          { name: 'United States', code: 'US' },
          { name: 'United Kingdom', code: 'GB' },
          { name: 'Canada', code: 'CA' },
          { name: 'Ghana', code: 'GH' }
        ]);
      } finally {
        setLoadingLocations(false);
      }
    };
    loadCountries();
  }, []);

  // Load states when country changes
  React.useEffect(() => {
    if (selectedCountry) {
      const loadStates = async () => {
        try {
          setLoadingLocations(true);
          setStates([]);
          setCities([]);
          setLgas([]);
          setValue("state", "");
          setValue("city", "");
          setValue("lga", "");
          
          const response = await apiService.getStates(selectedCountry);
          if (response.success && response.data) {
            setStates(response.data);
          }
        } catch (error) {
          // Don't show error toast for states as they might not be available
        } finally {
          setLoadingLocations(false);
        }
      };
      loadStates();
    }
  }, [selectedCountry, setValue]);

  // Load cities when state changes
  React.useEffect(() => {
    if (selectedCountry && selectedState) {
      const loadCities = async () => {
        try {
          setLoadingLocations(true);
          setCities([]);
          setValue("city", "");
          
          const response = await apiService.getCities(selectedCountry, selectedState);
          if (response.success && response.data) {
            setCities(response.data);
          }
        } catch (error) {
          // Cities might not be available for all states
        } finally {
          setLoadingLocations(false);
        }
      };
      loadCities();
    }
  }, [selectedCountry, selectedState, setValue]);

  // Load LGAs for Nigerian states
  // Load LGAs when country and state are selected
  React.useEffect(() => {
    if (selectedCountry && selectedState) {
      const loadLGAs = async () => {
        try {
          setLoadingLocations(true);
          setLgas([]);
          setValue("lga", "");
          
          const response = await apiService.getLGAs(selectedCountry, selectedState);
          
          if (response.success && response.data) {
            setLgas(response.data);
          }
        } catch (error) {
        } finally {
          setLoadingLocations(false);
        }
      };
      loadLGAs();
    } else {
      // Clear LGAs when country or state is not selected
      setLgas([]);
      setValue("lga", "");
    }
  }, [selectedCountry, selectedState, setValue]);

  const handleNext = async () => {
    const isValid = await trigger();
    if (isValid) {
      const values = getValues();
      setFormData({ ...formData, ...values });
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data) => {
    const finalData = { ...formData, ...data };
    setIsLoading(true);

    try {
      const response = await apiService.register({
        ...finalData,
        referral: finalData.referral || "",
        referralPhone: finalData.referralPhone || "",
      });

      toast.success("Registration successful!");
      
      // Auto-login after registration
      if (response.token) {
        localStorage.setItem('token', response.token);
        updateAuth(response.user);
        navigate("/firstcontribute");
      } else {
        navigate("/signin");
      }
    } catch (error) {
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          "Registration failed. Please try again.";

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <Input
              label="First Name"
              type="text"
              placeholder="John"
              icon={<User size={20} />}
              error={errors.firstname?.message}
              required
              {...register("firstname")}
            />
            <Input
              label="Middle Name"
              type="text"
              placeholder="Michael"
              icon={<User size={20} />}
              error={errors.othername?.message}
              required
              {...register("othername")}
            />
            <Input
              label="Surname"
              type="text"
              placeholder="Doe"
              icon={<User size={20} />}
              error={errors.surname?.message}
              required
              {...register("surname")}
            />
            <Input
              label="Email"
              type="email"
              placeholder="john@example.com"
              icon={<Mail size={20} />}
              error={errors.email?.message}
              required
              {...register("email")}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Mobile Number <span className="text-red-500 ml-1">*</span>
              </label>
              <PhoneInput
                country={'ng'}
                value={formData.mobile || ''}
                onChange={(value, country) => {
                  // Safely handle the onChange event
                  const event = {
                    target: {
                      name: 'mobile',
                      value: value
                    }
                  };
                  const mobileField = register("mobile");
                  if (mobileField.onChange) {
                    mobileField.onChange(event);
                  }
                }}
                inputClass="w-full"
                containerClass="phone-input-container"
                inputProps={{
                  name: 'mobile',
                  required: true,
                }}
              />
              {errors.mobile && (
                <p className="text-red-500 text-xs mt-1.5">{errors.mobile.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Alternate Phone <span className="text-red-500 ml-1">*</span>
              </label>
              <PhoneInput
                country={'ng'}
                value={formData.alternatePhone || ''}
                onChange={(value, country) => {
                  const event = {
                    target: {
                      name: 'alternatePhone',
                      value: value
                    }
                  };
                  const alternatePhoneField = register("alternatePhone");
                  if (alternatePhoneField.onChange) {
                    alternatePhoneField.onChange(event);
                  }
                }}
                inputClass="w-full"
                containerClass="phone-input-container"
                inputProps={{
                  name: 'alternatePhone',
                  required: true,
                }}
              />
              {errors.alternatePhone && (
                <p className="text-red-500 text-xs mt-1.5">{errors.alternatePhone.message}</p>
              )}
            </div>
            <Input
              label="Date of Birth"
              type="date"
              icon={<Calendar size={20} />}
              error={errors.dob?.message}
              required
              {...register("dob")}
            />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Gender <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                {...register("gender")}
                className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all duration-150 text-sm"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {errors.gender && (
                <p className="text-red-500 text-xs mt-1.5">{errors.gender.message}</p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <Input
              label="Password"
              type="password"
              placeholder="Create a strong password"
              icon={<Lock size={20} />}
              error={errors.password?.message}
              required
              {...register("password")}
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter your password"
              icon={<Lock size={20} />}
              error={errors.confirmPassword?.message}
              required
              {...register("confirmPassword")}
            />
            <div className="bg-[var(--color-primary-light)] border border-[var(--color-primary)]/20 rounded-lg p-3">
              <p className="text-xs text-[var(--color-text-secondary)]">
                Password must be at least 6 characters long.
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <Input
              label="Address"
              type="text"
              placeholder="123 Main Street"
              icon={<MapPin size={20} />}
              error={errors.address1?.message}
              required
              {...register("address1")}
            />
            
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Country <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                {...register("country")}
                className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all duration-150 text-sm"
                disabled={loadingLocations}
              >
                <option value="">Select country</option>
                {countries.map((country) => (
                  <option key={country.name} value={country.name}>
                    {country.name}
                  </option>
                ))}
              </select>
              {errors.country && (
                <p className="text-red-500 text-xs mt-1.5">{errors.country.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                State/Region <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                {...register("state")}
                className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all duration-150 text-sm"
                disabled={!selectedCountry || loadingLocations}
              >
                <option value="">Select state/region</option>
                {states.map((state) => (
                  <option key={state.name} value={state.name}>
                    {state.name}
                  </option>
                ))}
              </select>
              {errors.state && (
                <p className="text-red-500 text-xs mt-1.5">{errors.state.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                City <span className="text-red-500 ml-1">*</span>
              </label>
              <Input
                label=""
                type="text"
                placeholder="Enter city"
                icon={<MapPin size={20} />}
                error={errors.city?.message}
                required
                {...register("city")}
              />
              {errors.city && (
                <p className="text-red-500 text-xs mt-1.5">{errors.city.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                LGA (Local Government Area) <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                {...register("lga")}
                className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all duration-150 text-sm"
                disabled={!selectedState || loadingLocations}
              >
                <option value="">Select LGA</option>
                {lgas.map((lga) => (
                  <option key={lga.name} value={lga.name}>
                    {lga.name}
                  </option>
                ))}
              </select>
              {errors.lga && (
                <p className="text-red-500 text-xs mt-1.5">{errors.lga.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Currency <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                {...register("currency")}
                className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all duration-150 text-sm"
              >
                <option value="">Select currency</option>
                <option value="NGN">NGN - Nigerian Naira</option>
                <option value="USD">USD - US Dollar</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="EUR">EUR - Euro</option>
              </select>
              {errors.currency && (
                <p className="text-red-500 text-xs mt-1.5">{errors.currency.message}</p>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            {/* Next of Kin Section */}
            <div className="space-y-4 pb-4 border-b border-[var(--color-border)]">
              <Input
                label="Next of Kin Name"
                type="text"
                placeholder="Jane Doe"
                icon={<User size={20} />}
                error={errors.nextOfKinName?.message}
                required
                {...register("nextOfKinName")}
              />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Next of Kin Contact <span className="text-red-500 ml-1">*</span>
                </label>
                <PhoneInput
                  country={'ng'}
                  value={formData.nextOfKinContact || ''}
                  onChange={(value, country) => {
                    const event = {
                      target: {
                        name: 'nextOfKinContact',
                        value: value
                      }
                    };
                    const nextOfKinContactField = register("nextOfKinContact");
                    if (nextOfKinContactField.onChange) {
                      nextOfKinContactField.onChange(event);
                    }
                  }}
                  inputClass="w-full"
                  containerClass="phone-input-container"
                  inputProps={{
                    name: 'nextOfKinContact',
                    required: true,
                  }}
                />
                {errors.nextOfKinContact && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    {errors.nextOfKinContact.message}
                  </p>
                )}
              </div>
            </div>

            {/* Additional Information Section */}
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Join an Esusu <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  {...register("joinEsusu")}
                  className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all duration-150 text-sm"
                >
                  <option value="">Select an option</option>
                  <option value="yes">Yes, I want to join an Esusu</option>
                  <option value="no">No, not at this time</option>
                </select>
                {errors.joinEsusu && (
                  <p className="text-red-500 text-xs mt-1.5">{errors.joinEsusu.message}</p>
                )}
              </div>

              <Input
                label="Referral Code (Optional)"
                type="text"
                placeholder="Enter referral code"
                icon={<User size={20} />}
                error={errors.referral?.message}
                {...register("referral")}
              />
              <Input
                label="Referral Phone (Optional)"
                type="text"
                placeholder="Referrer's phone number"
                icon={<Phone size={20} />}
                error={errors.referralPhone?.message}
                {...register("referralPhone")}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const stepTitles = [
    "Personal Information",
    "Contact Details",
    "Security",
    "Location & Currency",
    "Next of Kin & Preferences"
  ];

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
      
      {/* Right side - Multi-step Form */}
      <div className='min-h-screen md:absolute md:right-0 md:w-1/2 flex items-center justify-center p-4 md:p-8 bg-gray-50'>
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Logo (visible on mobile) - Removed to clean up UI */}

          {/* Progress Bar - Minimal */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                      step < currentStep
                        ? 'bg-blue-600 text-white'
                        : step === currentStep
                        ? 'bg-blue-600 text-white ring-2 ring-blue-600/20'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {step < currentStep ? <Check size={12} /> : step}
                  </div>
                  {step < 5 && (
                    <div
                      className={`flex-1 h-0.5 mx-1.5 rounded transition-all ${
                        step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 text-center">
              Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}
            </p>
          </div>

          {/* Clean Minimal Card Container */}
          <Card variant="elevated" padding="md" className="bg-white shadow-sm border border-gray-200">
            {/* Header - Minimal */}
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Create Account</h2>
              <p className="text-gray-500 text-xs">{stepTitles[currentStep - 1]}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(currentStep === totalSteps ? onSubmit : handleNext)}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Buttons - Minimal */}
              <div className="flex gap-2 mt-6">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={handleBack}
                    icon={<ArrowLeft size={16} />}
                  >
                    Back
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth={currentStep === 1}
                  loading={isLoading && currentStep === totalSteps}
                  icon={currentStep < totalSteps ? <ArrowRight size={16} /> : null}
                >
                  {currentStep === totalSteps ? 'Create Account' : 'Continue'}
                </Button>
              </div>
            </form>

            {/* Sign In Link - Minimal */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-500">
                    Already have an account?
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/signin")}
                className="mt-3 w-full py-2 px-4 border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-all duration-150 flex items-center justify-center gap-2"
              >
                <span>Sign in to your account</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default SubscribeTo;
