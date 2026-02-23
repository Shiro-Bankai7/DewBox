import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  Menu,
  PiggyBank,
  ShieldCheck,
  Target,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaWhatsapp } from "react-icons/fa";
import DMLogo from "./assets/DMLogo.png";
import EmailHelpBlob, { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_WHATSAPP } from "./components/EmailHelpBlob";

const howItWorksSteps = [
  {
    title: "Fund wallet",
    description: "Add money to your wallet and get ready to contribute.",
    icon: Wallet,
  },
  {
    title: "Allocate to Piggy/Investment Cooperative Account",
    description: "Choose Piggy for flexible savings or Investment Cooperative Account for long-term discipline.",
    icon: Target,
  },
  {
    title: "Track contributions + history",
    description: "See your progress, balances, and contribution history in one place.",
    icon: BarChart3,
  },
  {
    title: "Withdraw/transfer",
    description: "Move money when needed through wallet withdrawals and transfers.",
    icon: CreditCard,
  },
];

const headerNavItems = [
  { id: "how-it-works", label: "How it works" },
  { id: "comparison", label: "Piggy vs ICA" },
  { id: "trust", label: "Trust" },
];

const footerQuickLinks = [
  ...headerNavItems,
  { id: "email-us", label: "Email us" },
];

const WHATSAPP_NUMBER = SUPPORT_WHATSAPP.replace(/[^\d]/g, "");
const SOCIAL_LINKS = [
  {
    label: "WhatsApp",
    href: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi MDBX team, I need support.")}`,
    Icon: FaWhatsapp,
  },
  {
    label: "Facebook",
    href: "https://facebook.com",
    Icon: FaFacebookF,
  },
  {
    label: "Instagram",
    href: "https://instagram.com",
    Icon: FaInstagram,
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com",
    Icon: FaLinkedinIn,
  },
];

const DashboardTopPreview = () => (
  <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_20%_15%,rgba(0,119,182,0.14),transparent_40%),linear-gradient(180deg,#ffffff,#f3f7fb)] p-4 sm:p-6">
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">
            J
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-slate-900 truncate">Hi, Joshua</p>
            <p className="text-sm text-slate-500">Available points: 0</p>
          </div>
        </div>
        <div className="h-10 w-10 rounded-full border border-slate-200 bg-white flex items-center justify-center">
          <ShieldCheck size={18} className="text-slate-600" />
        </div>
      </div>
    </div>

    <div className="mt-4 rounded-3xl border border-[#08162B] bg-[radial-gradient(circle_at_82%_25%,rgba(0,119,182,0.26),transparent_42%),linear-gradient(145deg,#0d1a2e,#081325)] p-5 text-white shadow-lg">
      <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900">
        <Wallet size={13} />
        <span>NGN Wallet</span>
      </div>
      <p className="mt-5 text-4xl font-semibold tracking-tight">N 0.00</p>
      <div className="mt-4 inline-flex rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs">
        Member ID: 8182
      </div>
    </div>

    <div className="mt-4 grid grid-cols-2 gap-3">
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <PiggyBank className="text-[var(--color-primary)]" size={18} />
          <span className="text-xs text-slate-500">60%</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">Piggy</p>
        <p className="text-lg font-semibold text-slate-900">N 45,800</p>
      </article>
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <Target className="text-[var(--color-primary)]" size={18} />
          <span className="text-xs text-slate-500">80%</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">Investment Cooperative Account</p>
        <p className="text-lg font-semibold text-slate-900">N 180,000</p>
      </article>
    </div>
  </div>
);

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
            How it works
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            A simple cycle from wallet funding to contribution tracking and wallet withdrawals.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
          {howItWorksSteps.map((step, index) => {
            const Icon = step.icon;

            return (
              <article
                key={step.title}
                className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-slate-900 px-2 text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <Icon className="text-slate-700" size={20} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const PiggyVsICA = () => {
  return (
    <section id="comparison" className="py-12 sm:py-16 lg:py-20 bg-white border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
            Piggy vs Investment Cooperative Account
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            Both help you grow, but each one supports a different saving style.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-[#DCE9F8] bg-[#F7FAFE] p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F1FF]">
                <PiggyBank className="text-[#1E63B6]" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Piggy</h3>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 text-[#1E63B6]" size={16} />
                <span>Piggy is your piggy bank for flexible savings at your own pace.</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 text-[#1E63B6]" size={16} />
                <span>Good for short-term goals and everyday saving habits.</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 text-[#1E63B6]" size={16} />
                <span>Easy to fund and monitor from your wallet view.</span>
              </li>
            </ul>
          </article>

          <article className="rounded-2xl border border-[#D6ECDC] bg-[#F5FBF7] p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E3F5E8]">
                <Target className="text-[#18794E]" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Investment Cooperative Account(ICA)</h3>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 text-[#18794E]" size={16} />
                <span>Designed for consistent and disciplined contributions.</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 text-[#18794E]" size={16} />
                <span>Best for members building long-term financial strength.</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 text-[#18794E]" size={16} />
                <span>Consistent participation can make you eligible for grants and loans up to N1,000,000.</span>
              </li>
            </ul>
            <div className="mt-4 rounded-xl border border-[#BFE2CA] bg-white px-4 py-3">
              <p className="text-sm font-medium text-[#145A3A]">
                Stay consistent to unlock bigger opportunities over time.
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};

const TrustStrip = () => {
  const trustItems = [
    {
      title: "Start small, stay consistent",
      description: "You can begin with any amount and build your saving rhythm over time.",
      icon: Wallet,
    },
    {
      title: "Choose your own style",
      description: "Use Piggy for flexible saving or Investment Cooperative Account for structured contribution goals.",
      icon: PiggyBank,
    },
    {
      title: "Privacy by design",
      description: "We collect only required account and transaction data and keep purpose and usage transparent.",
      icon: ShieldCheck,
    },
    {
      title: "Save with people you trust",
      description: "You can opt into eSusu-style community saving during onboarding.",
      icon: Users,
    },
    {
      title: "Keep progress visible",
      description: "Track balances and contribution history so you always know where you stand.",
      icon: Target,
    },
  ];

  return (
    <section id="trust" className="py-12 sm:py-16 lg:py-20 bg-white border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
            Community and trust
          </p>
          <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
            Built for everyday savers and community groups
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 leading-7">
            COOPEX my dewbox is designed to help you grow healthy contribution habits, whether you save alone or with others.
            You can fund your wallet, contribute to Piggy or Investment Cooperative Account, and monitor your progress without stress.
          </p>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-7">
            If group saving matters to you, you can join eSusu during onboarding and save with a trusted community rhythm.
            And if you stay consistent, you can work toward eligibility for grants and loans of up to N1,000,000.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <Icon className="text-slate-700" size={18} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-6">{item.description}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-slate-900">Privacy and control</h3>
          <p className="mt-2 text-sm text-slate-700 leading-7">
            Your account is built around data minimization and transparency: we only request details needed for onboarding and contributions,
            explain why data is processed, and support member requests to review, correct, or remove personal data where applicable.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-slate-900">How eSusu fits in</h3>
            <p className="mt-2 text-sm text-slate-700 leading-6">
              eSusu is a familiar rotating savings culture for many communities. You can opt in during signup and save with others while still
              seeing your own progress clearly.
            </p>
          </article>
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-slate-900">Why members stay</h3>
            <p className="mt-2 text-sm text-slate-700 leading-6">
              Members stay because it is simple and practical: contribute when ready, review your progress anytime, and keep building toward
              savings goals, grant opportunities, and loan access.
            </p>
          </article>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
          <p className="text-sm text-slate-700 leading-7">
            Whether you are contributing for household planning, personal stability, or community support, COOPEX my dewbox gives you a simple
            place to manage the full cycle: wallet funding, contributions, tracking, and withdrawals or transfers when needed.
          </p>
        </div>
          </div>
    </section>
  );
};

const EmailUsSection = () => {
  const demoSubject = encodeURIComponent("Demo request - MDBX");
  const complaintSubject = encodeURIComponent("Complaint - MDBX");

  return (
    <section id="email-us" className="py-12 sm:py-16 bg-white border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-light)] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary-dark)]">
            Email support
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">Email us anytime</h2>
          <p className="mt-3 max-w-3xl text-sm sm:text-base text-slate-700 leading-7">
            For complaints, account questions, onboarding clarifications, or demo requests about the website,
            contact us directly.
          </p>

          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-4 inline-flex rounded-full border border-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-primary)] hover:bg-white"
          >
            {SUPPORT_EMAIL}
          </a>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${demoSubject}`}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]"
            >
              Request a demo
            </a>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${complaintSubject}`}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Send a complaint
            </a>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`tel:${SUPPORT_PHONE}`}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Call {SUPPORT_PHONE}
            </a>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-green-200 bg-green-50 px-4 text-xs font-semibold text-green-700 hover:bg-green-100"
            >
              WhatsApp chat
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

const Layout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = () => {
    navigate("/signin");
  };

  const handleGetStarted = () => {
    navigate("/subscribeto");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white">
        <nav className="max-w-7xl mx-auto h-16 sm:h-[72px] px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2" aria-label="MDBX home">
            <img
              src={DMLogo}
              alt="MDBX logo"
              className="h-9 w-9 rounded-xl object-contain"
            />
            <div>
              <p className="text-sm font-bold leading-none">COOPEX</p>
              <p className="text-xs text-slate-500">mydewbox</p>
            </div>
          </a>

          <div className="hidden md:flex items-center gap-1">
            {headerNavItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={handleSignIn}
              className="min-h-11 rounded-full border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Log in
            </button>
            <button
              onClick={handleGetStarted}
              className="min-h-11 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Sign up
            </button>
          </div>

          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 text-slate-700"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="md:hidden border-t border-slate-200 bg-white"
            >
              <div className="px-4 py-4 space-y-2">
                {headerNavItems.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                ))}
                <div className="pt-2 grid grid-cols-1 gap-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignIn();
                    }}
                    className="min-h-11 rounded-full border border-slate-300 px-4 text-sm font-semibold text-slate-700"
                  >
                    Log in
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleGetStarted();
                    }}
                    className="min-h-11 rounded-full bg-slate-900 px-4 text-sm font-semibold text-white"
                  >
                    Sign up
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main id="top" className="pt-20 sm:pt-24">
        <section className="py-10 sm:py-14 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
              <div>
                <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary-light)] px-3 py-1 text-xs sm:text-sm font-medium text-[var(--color-primary-dark)]">
                  <ShieldCheck size={14} className="text-[var(--color-primary)]" />
                  Contributions, wallet, and payment tracking in one place
                </div>

                <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
                  Contribute together,
                  <span className="block bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] bg-clip-text text-transparent">
                    grow together.
                  </span>
                </h1>

                <p className="mt-4 max-w-xl text-sm sm:text-base lg:text-lg text-slate-700 leading-7">
                  COOPEX mydewbox helps members fund wallets, contribute to Piggy or Investment Cooperative Account, and track progress over time.
                </p>

                <div className="mt-6 flex flex-col gap-3 min-[380px]:flex-row">
                  <button
                    onClick={handleGetStarted}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-slate-900 px-6 text-sm sm:text-base font-semibold text-white hover:bg-slate-800"
                  >
                    Get started
                    <ArrowRight size={18} />
                  </button>
                  <button
                    onClick={handleSignIn}
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm sm:text-base font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    I already have an account
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-2 sm:p-3 shadow-sm">
                <DashboardTopPreview />
              </div>
            </div>
          </div>
        </section>

        <HowItWorks />
        <PiggyVsICA />
        <TrustStrip />
        <EmailUsSection />
      </main>

      <EmailHelpBlob />

      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-lg font-semibold text-slate-900">COOPEX mydewbox</p>
              <p className="mt-3 text-sm text-slate-600 leading-6">
                Save with discipline, track progress, and grow with your community.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Quick links</p>
              <div className="mt-3 flex flex-col gap-2">
                {footerQuickLinks.map((item) => (
                  <a key={item.id} href={`#${item.id}`} className="text-sm text-slate-700 hover:text-slate-900">
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Support</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>
                  Email: <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-slate-900">{SUPPORT_EMAIL}</a>
                </p>
                <p>
                  Call: <a href={`tel:${SUPPORT_PHONE}`} className="hover:text-slate-900">{SUPPORT_PHONE}</a>
                </p>
                <p>
                  WhatsApp: <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" className="hover:text-slate-900">Chat with us</a>
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Socials</p>
              <div className="mt-3 flex items-center gap-2">
                {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-100"
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">COOPEX mydewbox</p>
            <p className="text-sm text-slate-500">(c) 2026 Dew Masons & Kindred Limited</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

