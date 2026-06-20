import Link from "next/link";
import { AppButton, AppCard, AppInput, PageHeader } from "@/components/ui";
import { BrandLogo } from "@/components/brand-logo";
import { loginAction } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const error = (await searchParams)?.error;

  return (
    <div className="flex min-h-screen items-center px-4 py-8">
      <div className="w-full space-y-5">
        <BrandLogo />
        <PageHeader title="Đăng nhập" description="Vào app để xem lịch tập hôm nay." />
        <AppCard>
          {error ? (
            <p className="mb-4 rounded-[12px] border border-[#EF4444]/50 bg-[#EF4444]/10 px-3 py-2 text-[13px] font-semibold text-[#FCA5A5]">
              Tài khoản hoặc mật khẩu không đúng.
            </p>
          ) : null}
          <form action={loginAction} className="space-y-4">
            <AppInput type="text" name="identifier" placeholder="Tài khoản" required autoCapitalize="none" autoCorrect="off" />
            <AppInput type="password" name="password" placeholder="Mật khẩu" required />
            <AppButton className="w-full">Đăng nhập</AppButton>
          </form>
          <p className="mt-4 text-[13px] text-[#9CA3AF]">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-[#38BDF8]">
              Đăng ký
            </Link>
          </p>
        </AppCard>
      </div>
    </div>
  );
}
