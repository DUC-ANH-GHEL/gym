"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

const DEFAULT_PENDING_LABEL = "Đang xử lý...";

type PendingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: ReactNode;
};

function ButtonBusyContent({ children, pending, pendingLabel }: { children: ReactNode; pending: boolean; pendingLabel: ReactNode }) {
  if (!pending) {
    return <>{children}</>;
  }

  return (
    <span className="inline-flex min-w-0 items-center justify-center gap-2">
      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      <span className="min-w-0 truncate">{pendingLabel}</span>
    </span>
  );
}

export function AppCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[20px] border border-[#374151] bg-[#111827] p-4 shadow-sm ${className}`}>{children}</div>;
}

export function PendingButton({
  children,
  className = "",
  disabled,
  pendingLabel = DEFAULT_PENDING_LABEL,
  type = "submit",
  ...props
}: PendingButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      {...props}
      type={type}
      disabled={isDisabled}
      aria-busy={pending}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-65 disabled:active:scale-100`}
    >
      <ButtonBusyContent pending={pending} pendingLabel={pendingLabel}>
        {children}
      </ButtonBusyContent>
    </button>
  );
}

export function AppButton({ children, className = "", disabled, pendingLabel = DEFAULT_PENDING_LABEL, ...props }: PendingButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={pending}
      className={`inline-flex min-h-[48px] items-center justify-center rounded-[14px] bg-[#22C55E] px-4 py-3 text-[15px] font-bold text-white transition active:scale-[0.99] hover:bg-[#16A34A] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${className}`}
    >
      <ButtonBusyContent pending={pending} pendingLabel={pendingLabel}>
        {children}
      </ButtonBusyContent>
    </button>
  );
}

export function AppInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`min-h-[48px] w-full rounded-[12px] border border-[#374151] bg-[#1F2937] px-3 text-[16px] text-[#F9FAFB] outline-none placeholder:text-[#9CA3AF] focus:border-[#38BDF8] ${className}`} />;
}

export function AppTextarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-[12px] border border-[#374151] bg-[#1F2937] px-3 py-3 text-[16px] text-[#F9FAFB] outline-none placeholder:text-[#9CA3AF] focus:border-[#38BDF8] ${className}`} />;
}

export function AppSelect({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`min-h-[48px] w-full rounded-[12px] border border-[#374151] bg-[#1F2937] px-3 text-[16px] text-[#F9FAFB] outline-none focus:border-[#38BDF8] ${className}`} />;
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[24px] font-bold text-[#F9FAFB]">{title}</h1>
        {description ? <p className="mt-1 text-[15px] text-[#9CA3AF]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, description, actionHref, actionLabel }: { title: string; description: string; actionHref?: string; actionLabel?: string }) {
  return (
    <AppCard className="text-center">
      <h2 className="text-[18px] font-bold text-[#F9FAFB]">{title}</h2>
      <p className="mt-2 text-[15px] text-[#9CA3AF]">{description}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-[14px] bg-[#38BDF8] px-4 py-3 text-[15px] font-bold text-[#0B0F14]">
          {actionLabel}
        </Link>
      ) : null}
    </AppCard>
  );
}
