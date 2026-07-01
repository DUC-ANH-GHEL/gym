import Link from "next/link";
import { requireAdminUser } from "@/lib/admin";
import { AppShell } from "@/components/app-shell";
import { AppCard, PageHeader } from "@/components/ui";

const adminSections = [
  {
    href: "/admin/templates",
    title: "Template lịch",
    description: "Tạo và chỉnh mẫu lịch tập chung để user áp vào lịch cá nhân.",
  },
  {
    href: "/admin/exercises",
    title: "Metadata bài tập",
    description: "Quản lý tên bài, nhóm cơ, ảnh và trạng thái hiển thị trong kho bài tập.",
  },
  {
    href: "/admin/exercise-media",
    title: "Media bài tập",
    description: "Xem bài đang thiếu GIF, dò slug và copy lệnh seed media theo từng bài.",
  },
] as const;

export default async function AdminPage() {
  await requireAdminUser();

  return (
    <AppShell>
      <PageHeader title="Admin" description="Chọn đúng khu vực quản lý bạn cần dùng." />

      <section className="space-y-3">
        {adminSections.map((section) => (
          <Link key={section.href} href={section.href} className="block">
            <AppCard className="space-y-2 border-[#243041] bg-[#121A2B] transition hover:border-[#38BDF8]/50">
              <h2 className="text-[18px] font-bold text-[#F8FAFC]">{section.title}</h2>
              <p className="text-[14px] leading-6 text-[#94A3B8]">{section.description}</p>
            </AppCard>
          </Link>
        ))}
      </section>
    </AppShell>
  );
}
