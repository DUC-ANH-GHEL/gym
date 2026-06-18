import Link from "next/link";
import { AppButton, AppCard, AppInput, PageHeader } from "@/components/ui";
import { BrandLogo } from "@/components/brand-logo";
import { registerAction } from "./actions";

export default async function RegisterPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const error = (await searchParams)?.error;

  return (
    <div className="flex min-h-screen items-center px-4 py-8">
      <div className="w-full space-y-5">
        <BrandLogo />
        <PageHeader title="Tạo tài khoản" description="Tạo hồ sơ gym riêng cho bạn." />
        <AppCard>
          {error ? (
            <p className="mb-4 rounded-[12px] border border-[#EF4444]/50 bg-[#EF4444]/10 px-3 py-2 text-[13px] font-semibold text-[#FCA5A5]">
              Không thể tạo tài khoản. Kiểm tra email, mật khẩu hoặc email đã tồn tại.
            </p>
          ) : null}
          <form action={registerAction} className="space-y-4">
            <AppInput type="text" name="name" placeholder="Tên hiển thị" />
            <AppInput type="email" name="email" placeholder="Email" required />
            <AppInput type="password" name="password" placeholder="Mật khẩu tối thiểu 8 ký tự" required />
            <AppButton className="w-full">Đăng ký</AppButton>
          </form>
          <p className="mt-4 text-[13px] text-[#9CA3AF]">
            Đã có tài khoản? <Link href="/login" className="text-[#38BDF8]">Đăng nhập</Link>
          </p>
        </AppCard>
      </div>
    </div>
  );
}
