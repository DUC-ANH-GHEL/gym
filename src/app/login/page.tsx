import Link from "next/link";
import { AppButton, AppCard, AppInput, PageHeader } from "@/components/ui";
import { BrandLogo } from "@/components/brand-logo";
import { loginAction } from "./actions";

const TEXT = {
  title: "\u0110\u0103ng nh\u1eadp",
  description: "V\u00e0o app \u0111\u1ec3 xem l\u1ecbch t\u1eadp h\u00f4m nay.",
  error: "T\u00ean \u0111\u0103ng nh\u1eadp ho\u1eb7c m\u1eadt kh\u1ea9u kh\u00f4ng \u0111\u00fang.",
  identifierPlaceholder: "T\u00ean \u0111\u0103ng nh\u1eadp",
  passwordPlaceholder: "M\u1eadt kh\u1ea9u",
  submit: "\u0110\u0103ng nh\u1eadp",
  noAccount: "Ch\u01b0a c\u00f3 t\u00e0i kho\u1ea3n?",
  register: "\u0110\u0103ng k\u00fd",
};

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const error = (await searchParams)?.error;

  return (
    <div className="flex min-h-screen items-center px-4 py-8">
      <div className="w-full space-y-5">
        <BrandLogo />
        <PageHeader title={TEXT.title} description={TEXT.description} />
        <AppCard>
          {error ? (
            <p className="mb-4 rounded-[12px] border border-[#EF4444]/50 bg-[#EF4444]/10 px-3 py-2 text-[13px] font-semibold text-[#FCA5A5]">
              {TEXT.error}
            </p>
          ) : null}
          <form action={loginAction} className="space-y-4">
            <AppInput
              type="text"
              name="identifier"
              placeholder={TEXT.identifierPlaceholder}
              required
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
            />
            <AppInput type="password" name="password" placeholder={TEXT.passwordPlaceholder} required autoComplete="current-password" />
            <AppButton className="w-full">{TEXT.submit}</AppButton>
          </form>
          <p className="mt-4 text-[13px] text-[#9CA3AF]">
            {TEXT.noAccount}{" "}
            <Link href="/register" className="text-[#38BDF8]">
              {TEXT.register}
            </Link>
          </p>
        </AppCard>
      </div>
    </div>
  );
}
