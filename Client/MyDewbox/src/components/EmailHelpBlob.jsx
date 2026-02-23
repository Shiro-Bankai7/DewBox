import React, { useMemo, useState } from "react";
import { Mail, Phone } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

export const SUPPORT_EMAIL = "sunkkyoludimu@gmail.com";
export const SUPPORT_PHONE = (import.meta.env.VITE_SUPPORT_PHONE || "+2348030000000").trim();
export const SUPPORT_WHATSAPP = (import.meta.env.VITE_SUPPORT_WHATSAPP || SUPPORT_PHONE).trim();

const EmailHelpBlob = ({ protectedView = false }) => {
  const defaultSubject = encodeURIComponent("MDBX support request");
  const defaultBody = encodeURIComponent(
    "Hello MDBX team,\n\nI need help with:\n- Complaint\n- Demo request\n- General support\n\nThanks.",
  );
  const emailHref = `mailto:${SUPPORT_EMAIL}?subject=${defaultSubject}&body=${defaultBody}`;
  const whatsappNumber = useMemo(() => SUPPORT_WHATSAPP.replace(/[^\d]/g, ""), []);
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${defaultBody}`;
  const callHref = `tel:${SUPPORT_PHONE}`;
  const [isExpanded, setIsExpanded] = useState(false);

  if (!protectedView) {
    return (
      <a
        href={emailHref}
        aria-label="Email us for complaints, demo requests, or support"
        className="fixed right-4 bottom-6 z-[60] inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)]/35 bg-[var(--color-surface)] px-3.5 py-2.5 text-[var(--color-primary)] shadow-lg transition-all hover:bg-[var(--color-primary-light)] md:right-6"
        title={`Email us: ${SUPPORT_EMAIL}`}
      >
        <Mail size={16} />
        <span className="text-xs font-semibold sm:text-sm">Email us</span>
      </a>
    );
  }

  return (
    <div
      className="fixed bottom-20 right-4 z-[60] md:bottom-6 md:right-6"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div
        className={`pointer-events-none absolute bottom-full right-0 mb-3 flex flex-col items-end gap-2 transition-all duration-200 ${
          isExpanded ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex items-center gap-2 rounded-full border border-green-500/40 bg-white px-3 py-2 text-xs font-semibold text-green-700 shadow-lg transition-all hover:bg-green-50 ${
            isExpanded ? "pointer-events-auto" : "pointer-events-none"
          }`}
          aria-label="Chat with support on WhatsApp"
          title="Chat on WhatsApp"
        >
          <FaWhatsapp size={14} />
          <span>WhatsApp</span>
        </a>
        <a
          href={callHref}
          className={`inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-white px-3 py-2 text-xs font-semibold text-blue-700 shadow-lg transition-all hover:bg-blue-50 ${
            isExpanded ? "pointer-events-auto" : "pointer-events-none"
          }`}
          aria-label={`Call support at ${SUPPORT_PHONE}`}
          title={`Call ${SUPPORT_PHONE}`}
        >
          <Phone size={14} />
          <span>Call</span>
        </a>
        <a
          href={emailHref}
          className={`inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)]/35 bg-white px-3 py-2 text-xs font-semibold text-[var(--color-primary)] shadow-lg transition-all hover:bg-[var(--color-primary-light)] ${
            isExpanded ? "pointer-events-auto" : "pointer-events-none"
          }`}
          aria-label="Email support"
          title={`Email ${SUPPORT_EMAIL}`}
        >
          <Mail size={14} />
          <span>Email</span>
        </a>
      </div>

      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((prev) => !prev)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-primary)]/35 bg-[var(--color-surface)] px-3.5 py-2.5 text-[var(--color-primary)] shadow-lg transition-all hover:bg-[var(--color-primary-light)]"
        title="Support options"
      >
        <Mail size={16} />
        <span className="text-xs font-semibold sm:text-sm">Support</span>
      </button>
    </div>
  );
};

export default EmailHelpBlob;
