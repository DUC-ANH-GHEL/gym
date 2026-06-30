import Link from "next/link";
import { AppButton, AppCard, AppInput, PageHeader } from "@/components/ui";
import { BrandLogo } from "@/components/brand-logo";
import { registerAction } from "./actions";

const TEXT = {
  title: "T\u1ea1o t\u00e0i kho\u1ea3n",
  description: "T\u1ea1o h\u1ed3 s\u01a1 gym ri\u00eang cho b\u1ea1n.",
  namePlaceholder: "T\u00ean hi\u1ec3n th\u1ecb",
  identifierPlaceholder: "T\u00ean \u0111\u0103ng nh\u1eadp",
  passwordPlaceholder: "M\u1eadt kh\u1ea9u t\u1ed1i thi\u1ec3u 8 k\u00fd t\u1ef1",
  submit: "\u0110\u0103ng k\u00fd",
  haveAccount: "\u0110\u00e3 c\u00f3 t\u00e0i kho\u1ea3n?",
  login: "\u0110\u0103ng nh\u1eadp",
  errors: {
    invalid: "T\u00ean \u0111\u0103ng nh\u1eadp c\u1ea7n t\u1eeb 3 k\u00fd t\u1ef1. M\u1eadt kh\u1ea9u c\u1ea7n t\u1eeb 8 k\u00fd t\u1ef1.",
    exists: "T\u00ean \u0111\u0103ng nh\u1eadp n\u00e0y \u0111\u00e3 c\u00f3 ng\u01b0\u1eddi d\u00f9ng.",
    admin: "T\u00e0i kho\u1ea3n admin kh\u00f4ng th\u1ec3 \u0111\u0103ng k\u00fd \u1edf \u0111\u00e2y.",
    server: "Ch\u01b0a t\u1ea1o \u0111\u01b0\u1ee3c t\u00e0i kho\u1ea3n. Th\u1eed l\u1ea1i sau.",
    fallback: "Ch\u01b0a t\u1ea1o \u0111\u01b0\u1ee3c t\u00e0i kho\u1ea3n. Ki\u1ec3m tra l\u1ea1i t\u00ean \u0111\u0103ng nh\u1eadp v\u00e0 m\u1eadt kh\u1ea9u.",
  },
};

function getErrorMessage(error?: string) {
  if (error === "invalid" || error === "exists" || error === "admin" || error === "server") {
    return TEXT.errors[error];
  }

  return error ? TEXT.errors.fallback : null;
}

export default async function RegisterPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const errorMessage = getErrorMessage((await searchParams)?.error);

  return (
    <div className="flex min-h-screen items-center px-4 py-8">
      <div className="w-full space-y-5">
        <BrandLogo />
        <PageHeader title={TEXT.title} description={TEXT.description} />
        <AppCard>
          {errorMessage ? (
            <p className="mb-4 rounded-[12px] border border-[#EF4444]/50 bg-[#EF4444]/10 px-3 py-2 text-[13px] font-semibold text-[#FCA5A5]">
              {errorMessage}
            </p>
          ) : null}
          <form action={registerAction} className="space-y-4">
            <AppInput type="text" name="name" placeholder={TEXT.namePlaceholder} />
            <AppInput
              type="text"
              name="identifier"
              placeholder={TEXT.identifierPlaceholder}
              required
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
            />
            <AppInput type="password" name="password" placeholder={TEXT.passwordPlaceholder} required autoComplete="new-password" />
            <AppButton className="w-full">{TEXT.submit}</AppButton>
          </form>
          <p className="mt-4 text-[13px] text-[#9CA3AF]">
            {TEXT.haveAccount}{" "}
            <Link href="/login" className="text-[#38BDF8]">
              {TEXT.login}
            </Link>
          </p>
        </AppCard>
      </div>
    </div>
  );
}
