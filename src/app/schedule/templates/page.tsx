import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ApplyTemplateButton } from "@/components/apply-template-button";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyWorkoutTemplateAction } from "@/lib/schedule-actions";
import { getFriendlyWorkoutTitle } from "@/lib/schedule-summary";

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const SHORT_DAY_NAMES: Record<number, string> = { 0: "CN", 1: "T2", 2: "T3", 3: "T4", 4: "T5", 5: "T6", 6: "T7" };

export default async function ScheduleTemplatesPage() {
  const user = await requireUser();
  const [templates, profile] = await Promise.all([
    prisma.workoutTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        days: {
          orderBy: { dayOfWeek: "asc" },
          include: {
            exercises: {
              orderBy: { orderIndex: "asc" },
              include: { catalogItem: { select: { name: true } } },
            },
          },
        },
      },
    }),
    prisma.gymProfile.findUnique({ where: { userId: user.id }, select: { appliedWorkoutTemplateId: true } }),
  ]);
  const currentId = profile?.appliedWorkoutTemplateId ?? null;
  const ordered = [...templates].sort((a, b) => Number(b.id === currentId) - Number(a.id === currentId));

  return (
    <AppShell>
      <div className="space-y-4">
        <header className="space-y-2">
          <Link href="/schedule" className="inline-flex min-h-[36px] items-center text-[13px] font-black text-[#C8F31D]">
            ← Lịch tập
          </Link>
          <h1 className="text-[28px] font-black leading-none tracking-[-0.04em] text-[#F4F5F7]">Đổi mẫu lịch</h1>
          <p className="text-[14px] leading-5 text-[#B6BBC4]">
            Chọn một mẫu, xem thử từng ngày rồi bấm dùng. Mẫu sẽ thay lịch tuần của bạn, lịch sử tập vẫn giữ nguyên.
          </p>
        </header>

        {ordered.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-[#2A2F36] bg-[#14161A] p-5 text-[14px] text-[#B6BBC4]">
            Chưa có mẫu nào. Bạn vẫn có thể tự thêm bài vào từng buổi trong Lịch tập.
          </div>
        ) : null}

        {ordered.map((template) => {
          const isCurrent = template.id === currentId;
          const daysByWeekday = new Map(template.days.map((day) => [day.dayOfWeek, day]));
          const trainingDays = template.days.filter((day) => !day.isRestDay && day.exercises.length > 0);
          const exerciseCount = template.days.reduce((sum, day) => sum + day.exercises.length, 0);

          return (
            <article
              key={template.id}
              className={`space-y-3 rounded-[22px] border p-4 ${isCurrent ? "border-[#C8F31D]/50 bg-[#0E1722]" : "border-[#1F2329] bg-[#14161A]"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words text-[18px] font-black leading-tight text-[#F4F5F7]">{template.name}</h2>
                  <p className="mt-1 text-[13px] font-bold text-[#8B919B]">
                    {template.sessionsPerWeek || trainingDays.length} buổi/tuần · {exerciseCount} bài
                  </p>
                </div>
                {isCurrent ? (
                  <span className="shrink-0 rounded-full border border-[#C8F31D]/30 bg-[#C8F31D]/12 px-3 py-1.5 text-[12px] font-black text-[#C8F31D]">
                    Đang dùng
                  </span>
                ) : null}
              </div>

              {template.description ? <p className="text-[13px] leading-5 text-[#B6BBC4]">{template.description}</p> : null}

              <div className="grid grid-cols-7 gap-1">
                {WEEK_ORDER.map((dayOfWeek) => {
                  const day = daysByWeekday.get(dayOfWeek);
                  const trains = Boolean(day && !day.isRestDay && day.exercises.length > 0);

                  return (
                    <div
                      key={dayOfWeek}
                      className={`min-w-0 rounded-[12px] border px-0.5 py-1.5 text-center ${
                        trains ? "border-[#C8F31D]/40 bg-[#183421]" : "border-[#1F2329] bg-[#0A0B0D] opacity-60"
                      }`}
                    >
                      <b className="block text-[11px] leading-4 text-[#F4F5F7]">{SHORT_DAY_NAMES[dayOfWeek]}</b>
                      <span className="block truncate text-[10px] leading-4 text-[#B6BBC4]">
                        {trains && day ? getFriendlyWorkoutTitle(day.title) : "Nghỉ"}
                      </span>
                    </div>
                  );
                })}
              </div>

              <details className="rounded-[16px] border border-[#1F2329] bg-[#0A0B0D] p-3">
                <summary className="cursor-pointer list-none text-[13px] font-black text-[#DBEAFE] [&::-webkit-details-marker]:hidden">
                  Xem bài từng ngày
                </summary>
                <div className="mt-3 space-y-3">
                  {trainingDays.map((day) => (
                    <div key={day.id}>
                      <p className="text-[13px] font-black text-[#C8F31D]">
                        {SHORT_DAY_NAMES[day.dayOfWeek]} · {getFriendlyWorkoutTitle(day.title)}
                      </p>
                      <ul className="mt-1 space-y-0.5 text-[13px] leading-5 text-[#B6BBC4]">
                        {day.exercises.map((exercise) => (
                          <li key={exercise.id}>{exercise.catalogItem.name}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </details>

              <ApplyTemplateButton
                action={applyWorkoutTemplateAction}
                isCurrent={isCurrent}
                templateId={template.id}
                templateName={template.name}
              />
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
