import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { AppCard, EmptyState, PageHeader } from "@/components/ui";
import { AppShell } from "@/components/app-shell";
import { ExerciseCard } from "@/components/exercise-card";

export default async function ExercisesPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const error = (await searchParams)?.error;
  const user = await requireUser();
  const exercises = await prisma.exercise.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });

  return (
    <AppShell>
      <PageHeader title="Bài tập" description="Thư viện riêng của bạn." action={<Link href="/exercises/new" className="rounded-[14px] bg-[#38BDF8] px-4 py-3 text-[15px] font-bold text-[#0B0F14]">Tạo bài tập</Link>} />
      {error ? (
        <p className="rounded-[12px] border border-[#EF4444]/50 bg-[#EF4444]/10 px-3 py-2 text-[13px] font-semibold text-[#FCA5A5]">
          Dữ liệu bài tập chưa hợp lệ. Kiểm tra tên bài, mức tạ và ảnh.
        </p>
      ) : null}
      {exercises.length === 0 ? (
        <EmptyState title="Chưa có bài tập nào" description="Tạo bài tập đầu tiên để bắt đầu xây lịch." actionHref="/exercises/new" actionLabel="Tạo bài tập đầu tiên" />
      ) : (
        <div className="space-y-4">
          {exercises.map((exercise) => (
            <div key={exercise.id} className="space-y-2">
              <ExerciseCard exercise={{ ...exercise, setsCount: undefined }} href={`/exercises/${exercise.id}/edit`} ctaLabel="Sửa bài" />
              <div className="flex justify-end">
                <Link href={`/exercises/${exercise.id}/edit`} className="rounded-[14px] bg-[#1F2937] px-4 py-3 text-[15px] font-bold text-[#F9FAFB]">Sửa</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
