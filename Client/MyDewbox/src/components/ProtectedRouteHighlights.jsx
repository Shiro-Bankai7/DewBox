import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgePercent,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet
} from "lucide-react";
import Card from "./ui/Card";
import Button from "./ui/Button";
import { apiService } from "../services/api";
import DMLogo from "../assets/DMLogo.png";

const routeBannerMap = [
  {
    match: (path) => path === "/dashboard",
    title: "Dashboard Overview",
    text: "Track wallet, ICA, Piggy and community savings in one place."
  },
  {
    match: (path) => path.startsWith("/dashboard/contribute"),
    title: "Contribution Flow",
    text: "Fund Piggy or ICA directly. Esusu follows club onboarding."
  },
  {
    match: (path) => path.startsWith("/dashboard/wallet"),
    title: "Wallet Operations",
    text: "Fund, transfer and download receipts from verified payments."
  },
  {
    match: (path) => path.startsWith("/dashboard/profile"),
    title: "Profile & Security",
    text: "Maintain account details and security settings."
  }
];

const logoCarouselItems = [
  { name: "COOPEX", type: "image", src: DMLogo },
  { name: "MyDewbox", type: "text" },
  { name: "Secure Wallets", type: "text" },
  { name: "Community Savings", type: "text" },
  { name: "ICA + Piggy", type: "text" }
];

const infoCarouselItems = [
  "ICA: disciplined yearly growth",
  "Piggy: flexible monthly savings",
  "Esusu: join club before contributing",
  "Wallet funding supports instant balance updates",
  "Receipts are generated from verified payment data",
  "Track every transaction in your history tab"
];

const LogoPill = ({ item }) => {
  if (item.type === "image") {
    return (
      <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <img src={item.src} alt={`${item.name} logo`} className="h-4 w-4 object-contain" />
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">{item.name}</span>
      </div>
    );
  }

  return (
    <div className="shrink-0 px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm text-xs font-semibold text-[var(--color-text-primary)]">
      {item.name}
    </div>
  );
};

const MetricTile = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
      <Icon size={12} />
      <span>{label}</span>
    </div>
    <p className="mt-1 text-sm font-bold text-[var(--color-text-primary)]">{value}</p>
  </div>
);

const ProtectedRouteHighlights = ({ variant = "desktop" }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const { data: subscriberData } = useQuery({
    queryKey: ["subscriber"],
    queryFn: () => apiService.getSubscriber(),
    staleTime: 120000
  });

  const banner = useMemo(
    () => routeBannerMap.find((item) => item.match(location.pathname)) || routeBannerMap[0],
    [location.pathname]
  );

  const metrics = useMemo(() => {
    const subscriber = subscriberData?.data?.subscriber || {};
    const wallet = Number.parseFloat(subscriber.balance) || 0;
    const ica = Number.parseFloat(subscriber.ica_balance) || 0;
    const piggy = Number.parseFloat(subscriber.piggy_balance) || 0;
    const total = ica + piggy;
    const icaShare = total > 0 ? Math.round((ica / total) * 100) : 0;
    const piggyShare = total > 0 ? 100 - icaShare : 0;
    const esusuEnabled =
      String(subscriber.joinEsusu || "").toLowerCase() === "yes" || subscriber.joinEsusu === true;

    return { wallet, icaShare, piggyShare, esusuEnabled };
  }, [subscriberData]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0
    }).format(amount || 0);

  const isHomeRoute = location.pathname === "/dashboard";

  if (variant === "mobile") {
    return (
      <Card variant="elevated" padding="md" className="overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <img src={DMLogo} alt="COOPEX logo" className="h-7 w-7 rounded-md object-contain shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[var(--color-text-primary)] leading-tight">{banner.title}</h2>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{banner.text}</p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate("/dashboard/contribute")}
            icon={<ArrowRight size={12} />}
          >
            Contribute
          </Button>
        </div>

        <div className="mt-3 overflow-hidden">
          <div className="flex w-max gap-2 animate-marquee">
            {logoCarouselItems.concat(logoCarouselItems).map((item, idx) => (
              <LogoPill key={`mobile-logo-${item.name}-${idx}`} item={item} />
            ))}
          </div>
        </div>

        {isHomeRoute && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <MetricTile icon={Wallet} label="Wallet" value={formatCurrency(metrics.wallet)} />
            <MetricTile icon={BadgePercent} label="Split" value={`${metrics.icaShare}/${metrics.piggyShare}`} />
            <MetricTile icon={Users} label="Esusu" value={metrics.esusuEnabled ? "Enabled" : "Join"} />
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card variant="elevated" padding="md" className="overflow-hidden">
        <div className="flex items-start gap-3">
          <img src={DMLogo} alt="COOPEX logo" className="h-9 w-9 rounded-md object-contain shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
              Protected Route Insight
            </p>
            <h2 className="text-sm font-bold text-[var(--color-text-primary)] leading-tight">{banner.title}</h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">{banner.text}</p>
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          fullWidth
          className="mt-3"
          onClick={() => navigate("/dashboard/contribute")}
          icon={<ArrowRight size={14} />}
        >
          Quick Contribute
        </Button>
      </Card>

      <Card variant="elevated" padding="md">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] mb-2">
          <ShieldCheck size={12} />
          <span>Logos</span>
        </div>
        <div className="overflow-hidden">
          <div className="flex w-max gap-2 animate-marquee">
            {logoCarouselItems.concat(logoCarouselItems).map((item, idx) => (
              <LogoPill key={`desktop-logo-${item.name}-${idx}`} item={item} />
            ))}
          </div>
        </div>
      </Card>

      {isHomeRoute && (
        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] mb-2">
            <TrendingUp size={12} />
            <span>Infographics</span>
          </div>

          <div className="space-y-2.5 mb-3">
            <MetricTile icon={Wallet} label="Wallet" value={formatCurrency(metrics.wallet)} />
            <MetricTile icon={Users} label="Esusu" value={metrics.esusuEnabled ? "Enabled" : "Join Club Required"} />
          </div>

          <div className="rounded-xl border border-[var(--color-border)] p-2.5 bg-[var(--color-surface)]">
            <div className="flex justify-between text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
              <span>ICA</span>
              <span>{metrics.icaShare}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--color-border-light)] overflow-hidden mb-2">
              <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: `${metrics.icaShare}%` }} />
            </div>
            <div className="flex justify-between text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
              <span>Piggy</span>
              <span>{metrics.piggyShare}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--color-border-light)] overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${metrics.piggyShare}%` }} />
            </div>
          </div>

          <div className="mt-3 overflow-hidden">
            <div className="flex w-max gap-2 animate-marquee-reverse">
              {infoCarouselItems.concat(infoCarouselItems).map((item, idx) => (
                <div
                  key={`desktop-info-${idx}`}
                  className="shrink-0 px-3 py-1.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] text-xs font-semibold"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ProtectedRouteHighlights;
