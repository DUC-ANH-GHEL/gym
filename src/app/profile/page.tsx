import Link from "next/link";
import { AppButton, AppCard, AppInput, AppSelect, PageHeader } from "@/components/ui";
import { AppShell } from "@/components/app-shell";
import { isAdminIdentifier } from "@/lib/admin-config";
import { requireUser } from "@/lib/auth";
import { logoutAction, saveProfileAction } from "@/lib/profile-actions";

const timezones = ["Asia/Bangkok", "Asia/Ho_Chi_Minh", "Asia/Singapore", "UTC"];

export default async function ProfilePage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const error = (await searchParams)?.error;
  const user = await requireUser();
  const profile = user.gymProfile;
  const isAdmin = isAdminIdentifier(user.email);

  return (
    <AppShell>
      <PageHeader title="Cá nhân" description="Quản lý hồ sơ gym và đăng xuất." />
      <AppCard>
        {error ? (
          <p className="mb-4 rounded-[12px] border border-[#EF4444]/50 bg-[#EF4444]/10 px-3 py-2 text-[13px] font-semibold text-[#FCA5A5]">
            {error === "admin-access"
              ? "Tài khoản hiện tại không có quyền admin. Hãy đăng xuất rồi đăng nhập bằng tài khoản admin, hoặc thêm tài khoản này vào ADMIN_IDENTIFIERS trên Vercel."
              : "Hồ sơ chưa hợp lệ. Kiểm tra lại chiều cao, cân nặng và múi giờ."}
          </p>
        ) : null}

        <p className="text-[15px] text-[#9CA3AF]">Tài khoản: {user.email}</p>
        <p className={`mt-1 text-[13px] font-semibold ${isAdmin ? "text-[#86EFAC]" : "text-[#FBBF24]"}`}>
          {isAdmin ? "Quyền hiện tại: Admin" : "Quyền hiện tại: User thường"}
        </p>

        <form action={saveProfileAction} className="mt-4 space-y-4">
          <AppInput name="displayName" defaultValue={profile?.displayName ?? ""} placeholder="Tên hiển thị" />
          <AppInput name="goal" defaultValue={profile?.goal ?? ""} placeholder="Mục tiêu" />
          <div className="grid grid-cols-2 gap-2">
            <AppInput name="heightCm" type="number" defaultValue={profile?.heightCm ?? ""} placeholder="Chiều cao (cm)" />
            <AppInput name="weightKg" type="number" step="0.5" defaultValue={profile?.weightKg ?? ""} placeholder="Cân nặng (kg)" />
          </div>
          <AppSelect name="timezone" defaultValue={profile?.timezone || "Asia/Bangkok"}>
            {timezones.map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezone}
              </option>
            ))}
          </AppSelect>
          <AppButton className="w-full">Lưu hồ sơ</AppButton>
        </form>

        <form action={logoutAction} className="mt-4">
          <button className="min-h-[44px] w-full rounded-[14px] bg-[#EF4444] px-4 py-3 text-[15px] font-bold text-white">
            Đăng xuất
          </button>
        </form>
      </AppCard>

      {isAdmin ? (
        <AppCard className="space-y-3">
          <div>
            <h2 className="text-[18px] font-bold text-[#F9FAFB]">Admin</h2>
            <p className="mt-1 text-[14px] text-[#9CA3AF]">Quản lý metadata bài tập và template lịch chung.</p>
          </div>
          <Link
            href="/admin"
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[14px] bg-[#38BDF8] px-4 py-3 text-[15px] font-bold text-[#0B0F14]"
          >
            Mở admin
          </Link>
        </AppCard>
      ) : null}
    </AppShell>
  );
}
