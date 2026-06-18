import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function AppCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[20px] border border-[#374151] bg-[#111827] p-4 shadow-sm ${className}`}>{children}</div>;
}

export function AppButton({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-[48px] items-center justify-center rounded-[14px] bg-[#22C55E] px-4 py-3 text-[15px] font-bold text-white transition active:scale-[0.99] hover:bg-[#16A34A] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
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
