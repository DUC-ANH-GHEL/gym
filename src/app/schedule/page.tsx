import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getDayOfWeekInTimeZone } from "@/lib/date";
import { AppButton, AppInput, PendingButton } from "@/components/ui";
import { AppShell } from "@/components/app-shell";
import { CatalogPickerPanel } from "@/components/catalog-picker-panel";
import { buildScheduleSummary, getFriendlyWorkoutTitle } from "@/lib/schedule-summary";
import {
  addCatalogItemToDayAction,
  addWorkoutSetPlanAction,
  applyWorkoutTemplateAction,
  moveWorkoutDayExerciseAction,
  removeExerciseFromDayAction,
  removeWorkoutSetPlanAction,
  updateWorkoutDayAction,
  updateWorkoutSetPlanAction,
} from "@/lib/schedule-actions";

type SearchParams = {
  day?: string | string[];
};

const DAY_LABELS: Record<number, string> = {
  0: "Chủ nhật",
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
};

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getSelectedDayOfWeek(params: SearchParams, fallbackDayOfWeek: number) {
  const parsed = Number(getFirstParam(params.day));
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 6 ? parsed : fallbackDayOfWeek;
}

function getTemplateStats(
  template: {
    sessionsPerWeek: number;
    days: { isRestDay: boolean; exercises: unknown[] }[];
  },
) {
  const activeDays = template.days.filter((day) => !day.isRestDay).length;
  const exerciseCount = template.days.reduce((sum, day) => sum + day.exercises.length, 0);

  return {
    sessionsPerWeek: template.sessionsPerWeek || activeDays,
    exerciseCount,
  };
}

function getMuscleSummary(
  exercises: {
    catalogItem: { muscleGroup: string | null };
  }[],
) {
  const groups = Array.from(new Set(exercises.map((entry) => entry.catalogItem.muscleGroup).filter(Boolean)));
  if (groups.length === 0) {
    return "Chưa có nhóm cơ";
  }

  return groups.slice(0, 3).join(", ");
}

function getSetLabel(count: number) {
  return `${count || 0} hiệp`;
}

export default async function SchedulePage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = (await searchParams) ?? {};
  const user = await requireUser();
  const [workoutDays, catalogItems, templates, profile] = await Promise.all([
    prisma.workoutDay.findMany({
      where: { userId: user.id },
      orderBy: { dayOfWeek: "asc" },
      include: {
        exercises: {
          orderBy: { orderIndex: "asc" },
          include: {
            catalogItem: true,
            sets: { orderBy: { setIndex: "asc" } },
          },
        },
      },
    }),
    prisma.exerciseCatalogItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.workoutTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        days: {
          include: {
            exercises: true,
          },
        },
      },
    }),
    prisma.gymProfile.findUnique({
      where: { userId: user.id },
      include: { appliedWorkoutTemplate: true },
    }),
  ]);

  const timezone = profile?.timezone || "Asia/Bangkok";
  const todayDayOfWeek = getDayOfWeekInTimeZone(new Date(), timezone);
  const selectedDayOfWeek = getSelectedDayOfWeek(params, todayDayOfWeek);
  const summary = buildScheduleSummary({ selectedDayOfWeek, workoutDays });
  const selectedDay = summary.selectedDay;
  const todayDay = workoutDays.find((day) => day.dayOfWeek === todayDayOfWeek) ?? selectedDay;
  const todayTitle = todayDay ? getFriendlyWorkoutTitle(todayDay.title) : "Chưa có lịch";
  const selectedDayTitle = selectedDay ? getFriendlyWorkoutTitle(selectedDay.title) : "";
  const featuredTemplate = templates.find((template) => template.id === profile?.appliedWorkoutTemplateId) ?? templates[0] ?? null;
  const featuredTemplateStats = featuredTemplate ? getTemplateStats(featuredTemplate) : null;

  return (
    <AppShell>
      <div className="space-y-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[28px] font-black leading-none tracking-[-0.04em] text-[#F7FAFC]">Lịch tập</h1>
            <p className="mt-2 max-w-[250px] text-[14px] leading-5 text-[#B7C6D8]">
              Xem tuần này trước, chỉnh từng buổi sau. Mẫu có sẵn nằm gọn bên dưới.
            </p>
          </div>
          <Link
            href="#chinh-buoi"
            className="shrink-0 rounded-[16px] border border-[#2B3A4B] bg-[#111B26] px-4 py-3 text-center text-[13px] font-black leading-tight text-[#DBEAFE]"
          >
            Sửa
            <br />
            lịch
          </Link>
        </header>

        <section className="rounded-[24px] border border-[#22C55E]/35 bg-[linear-gradient(145deg,rgba(34,197,94,0.18),rgba(14,165,233,0.10)_42%,#101821_74%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-black uppercase tracking-[0.03em] text-[#86EFAC]">Hôm nay</p>
              <h2 className="mt-1 truncate text-[21px] font-black leading-tight tracking-[-0.03em] text-[#F7FAFC]">
                {todayTitle}
              </h2>
            </div>
            <span className="shrink-0 rounded-full border border-[#86EFAC]/25 bg-[#080D12]/50 px-3 py-1.5 text-[12px] font-black text-[#BBF7D0]">
              {todayDay?.exercises.length ?? 0} bài
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="min-w-0 rounded-[16px] border border-white/5 bg-[#080D12]/40 p-3">
              <strong className="block text-[18px] leading-none text-[#F7FAFC]">{summary.stats.exerciseCount}</strong>
              <span className="mt-1 block text-[11px] leading-tight text-[#A7B3C2]">bài trong tuần</span>
            </div>
            <div className="min-w-0 rounded-[16px] border border-white/5 bg-[#080D12]/40 p-3">
              <strong className="block text-[18px] leading-none text-[#F7FAFC]">{summary.stats.trainingDayCount}</strong>
              <span className="mt-1 block text-[11px] leading-tight text-[#A7B3C2]">buổi tập</span>
            </div>
            <div className="min-w-0 rounded-[16px] border border-white/5 bg-[#080D12]/40 p-3">
              <strong className="block text-[18px] leading-none text-[#F7FAFC]">{summary.stats.restDayCount}</strong>
              <span className="mt-1 block text-[11px] leading-tight text-[#A7B3C2]">ngày nghỉ</span>
            </div>
          </div>

          <Link
            href="/today"
            className="mt-4 flex min-h-[50px] w-full items-center justify-center rounded-[18px] bg-[#22C55E] px-4 py-3 text-[16px] font-black text-white shadow-[0_10px_24px_rgba(34,197,94,0.28)] active:scale-[0.99]"
          >
            Bắt đầu buổi tập
          </Link>
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-[18px] font-black tracking-[-0.02em] text-[#F7FAFC]">Tuần của tôi</h2>
            <Link href="#mau-goi-y" className="text-[13px] font-black text-[#7DD3FC]">
              Đổi mẫu
            </Link>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {summary.weekDays.map((day) => (
              <Link
                key={day.dayOfWeek}
                href={`/schedule?day=${day.dayOfWeek}`}
                className={`min-w-0 rounded-[18px] border px-1.5 py-2 text-center ${
                  day.isSelected
                    ? "border-[#22C55E] bg-[#183421] outline outline-2 outline-offset-2 outline-[#22C55E]"
                    : day.isRestDay
                      ? "border-[#273444] bg-[#101821]/70 opacity-70"
                      : "border-[#22C55E]/50 bg-[#183421]"
                }`}
              >
                <b className="block text-[12px] leading-5 text-[#F7FAFC]">{day.shortName}</b>
                <span className="block truncate text-[11px] leading-4 text-[#B7C6D8]">{day.shortTitle}</span>
              </Link>
            ))}
          </div>
        </section>

        {selectedDay ? (
          <section className="overflow-hidden rounded-[22px] border border-[#273444] bg-[#101821]">
            <div className="flex items-start justify-between gap-3 border-b border-white/5 p-4">
              <div className="min-w-0">
                <h2 className="text-[18px] font-black leading-tight tracking-[-0.02em] text-[#F7FAFC]">
                  {DAY_LABELS[selectedDay.dayOfWeek]} · {selectedDayTitle}
                </h2>
                <p className="mt-1 text-[13px] leading-5 text-[#B7C6D8]">
                  {selectedDay.isRestDay
                    ? "Ngày này đang để nghỉ. Bấm sửa lịch nếu muốn đổi thành buổi tập."
                    : `${getMuscleSummary(selectedDay.exercises)}. Có thể đổi thứ tự trong phần sửa lịch.`}
                </p>
              </div>
              <Link
                href="#them-bai"
                className="shrink-0 rounded-[14px] border border-[#334155] bg-[#182433] px-4 py-3 text-[14px] font-black text-[#E2E8F0]"
              >
                Thêm
              </Link>
            </div>

            {selectedDay.exercises.length > 0 ? (
              <div>
                {selectedDay.exercises.slice(0, 5).map((entry, exerciseIndex) => (
                  <div key={entry.id} className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/5 px-4 py-3 last:border-b-0">
                    <div className="grid h-[34px] w-[34px] place-items-center rounded-[13px] bg-[#203147] text-[13px] font-black text-[#BFDBFE]">
                      {exerciseIndex + 1}
                    </div>
                    <div className="min-w-0">
                      <b className="block truncate text-[15px] leading-tight text-[#F7FAFC]">{entry.catalogItem.name}</b>
                      <span className="mt-1 block truncate text-[12px] text-[#B7C6D8]">
                        {entry.catalogItem.muscleGroup || "Chưa có nhóm cơ"} · nghỉ 90 giây
                      </span>
                    </div>
                    <span className="shrink-0 rounded-full border border-[#22C55E]/20 bg-[#22C55E]/12 px-2.5 py-1.5 text-[12px] font-black text-[#D1FAE5]">
                      {getSetLabel(entry.sets.length)}
                    </span>
                  </div>
                ))}
                {selectedDay.exercises.length > 5 ? (
                  <p className="border-t border-white/5 px-4 py-3 text-[13px] font-bold text-[#B7C6D8]">
                    Còn {selectedDay.exercises.length - 5} bài khác trong buổi này.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="px-4 py-5">
                <p className="text-[14px] font-bold text-[#E2E8F0]">Buổi này chưa có bài tập.</p>
                <p className="mt-1 text-[13px] leading-5 text-[#B7C6D8]">Bấm thêm để chọn bài phù hợp cho ngày này.</p>
              </div>
            )}
          </section>
        ) : null}

        <section id="mau-goi-y" className="scroll-mt-8 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-[18px] font-black tracking-[-0.02em] text-[#F7FAFC]">Mẫu gợi ý</h2>
            {templates.length > 1 ? (
              <Link href="#tat-ca-mau" className="text-[13px] font-black text-[#7DD3FC]">
                Xem tất cả
              </Link>
            ) : null}
          </div>

          {featuredTemplate && featuredTemplateStats ? (
            <article className="rounded-[22px] border border-[#38BDF8]/20 bg-[#0E1722] p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[16px] font-black leading-snug text-[#F7FAFC]">{featuredTemplate.name}</h3>
                {profile?.appliedWorkoutTemplateId === featuredTemplate.id ? (
                  <span className="shrink-0 rounded-full border border-[#86EFAC]/25 bg-[#080D12]/50 px-3 py-1.5 text-[12px] font-black text-[#BBF7D0]">
                    Đang dùng
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-[13px] leading-5 text-[#B7C6D8]">
                {featuredTemplate.description ||
                  `Có ${featuredTemplateStats.sessionsPerWeek} buổi mỗi tuần, gồm ${featuredTemplateStats.exerciseCount} bài tập.`}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="#tat-ca-mau"
                  className="flex min-h-[44px] items-center justify-center rounded-[15px] border border-[#2A3A4D] bg-[#152232] px-3 text-center text-[13px] font-black text-[#E2E8F0]"
                >
                  Xem chi tiết
                </Link>
                <form action={applyWorkoutTemplateAction}>
                  <input type="hidden" name="templateId" value={featuredTemplate.id} />
                  <PendingButton
                    className="min-h-[44px] w-full rounded-[15px] bg-[#22C55E] px-3 text-[13px] font-black text-white active:scale-[0.99]"
                    pendingLabel="Đang áp..."
                  >
                    Áp lại mẫu
                  </PendingButton>
                </form>
              </div>
            </article>
          ) : (
            <div className="rounded-[22px] border border-[#273444] bg-[#101821] p-4">
              <p className="text-[14px] font-bold text-[#E2E8F0]">Chưa có mẫu gợi ý.</p>
              <p className="mt-1 text-[13px] leading-5 text-[#B7C6D8]">Bạn vẫn có thể tự thêm bài vào từng buổi bên dưới.</p>
            </div>
          )}
        </section>

        {selectedDay ? (
          <section id="chinh-buoi" className="scroll-mt-8 space-y-3 rounded-[22px] border border-[#273444] bg-[#101821] p-4">
            <div>
              <h2 className="text-[18px] font-black text-[#F7FAFC]">Sửa buổi này</h2>
              <p className="mt-1 text-[13px] leading-5 text-[#B7C6D8]">Đổi tên buổi, bật ngày nghỉ hoặc thêm bài mới.</p>
            </div>

            <form action={updateWorkoutDayAction} className="space-y-3 rounded-[18px] border border-[#273444] bg-[#0B1220] p-3">
              <input type="hidden" name="dayOfWeek" value={selectedDay.dayOfWeek} />
              <label className="block space-y-1">
                <span className="text-[12px] font-bold text-[#B7C6D8]">Tên buổi</span>
                <AppInput name="title" defaultValue={selectedDay.title} placeholder="Tên buổi tập" className="border-[#314155] bg-[#111C2E]" />
              </label>
              <label className="flex min-h-[48px] items-center gap-3 rounded-[16px] border border-[#273444] bg-[#111827] px-3 text-[14px] font-bold text-[#F7FAFC]">
                <input type="checkbox" name="isRestDay" defaultChecked={selectedDay.isRestDay} className="h-5 w-5 accent-[#22C55E]" />
                Đánh dấu là ngày nghỉ
              </label>
              <AppButton className="w-full" pendingLabel="Đang lưu...">
                Lưu buổi này
              </AppButton>
            </form>

            <form id="them-bai" action={addCatalogItemToDayAction} className="scroll-mt-8">
              <input type="hidden" name="dayOfWeek" value={selectedDay.dayOfWeek} />
              <CatalogPickerPanel
                items={catalogItems}
                existingIds={selectedDay.exercises.map((entry) => entry.catalogItemId)}
                title={`Thêm bài vào ${selectedDayTitle || "buổi này"}`}
                description="Chọn bài có hình để dễ nhớ và bấm dễ hơn."
                submitLabel="Thêm"
                emptyLabel="Không tìm thấy bài phù hợp để thêm cho buổi này."
              />
            </form>

            {selectedDay.exercises.length > 0 ? (
              <details className="rounded-[18px] border border-[#273444] bg-[#0B1220] p-3">
                <summary className="cursor-pointer list-none text-[14px] font-black text-[#DBEAFE] [&::-webkit-details-marker]:hidden">
                  Chỉnh bài đã có
                </summary>
                <div className="mt-3 space-y-3">
                  {selectedDay.exercises.map((entry, exerciseIndex) => (
                    <div key={entry.id} className="space-y-3 rounded-[16px] border border-[#273444] bg-[#111827] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[14px] font-black text-[#F7FAFC]">
                            {exerciseIndex + 1}. {entry.catalogItem.name}
                          </p>
                          <p className="mt-1 text-[12px] text-[#B7C6D8]">{entry.catalogItem.muscleGroup || "Chưa có nhóm cơ"}</p>
                        </div>
                        <form action={removeExerciseFromDayAction}>
                          <input type="hidden" name="workoutDayExerciseId" value={entry.id} />
                          <PendingButton
                            className="min-h-[40px] rounded-[14px] border border-[#7F1D1D] bg-[#3B0C0C] px-3 text-[13px] font-bold text-[#FCA5A5]"
                            pendingLabel="Đang xóa..."
                          >
                            Xóa
                          </PendingButton>
                        </form>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <form action={moveWorkoutDayExerciseAction}>
                          <input type="hidden" name="workoutDayExerciseId" value={entry.id} />
                          <input type="hidden" name="direction" value="up" />
                          <PendingButton
                            className="min-h-[42px] w-full rounded-[14px] border border-[#273444] bg-[#182433] text-[13px] font-bold text-[#E2E8F0]"
                            pendingLabel="Đang đưa lên..."
                          >
                            Đưa lên
                          </PendingButton>
                        </form>
                        <form action={moveWorkoutDayExerciseAction}>
                          <input type="hidden" name="workoutDayExerciseId" value={entry.id} />
                          <input type="hidden" name="direction" value="down" />
                          <PendingButton
                            className="min-h-[42px] w-full rounded-[14px] border border-[#273444] bg-[#182433] text-[13px] font-bold text-[#E2E8F0]"
                            pendingLabel="Đang đưa xuống..."
                          >
                            Đưa xuống
                          </PendingButton>
                        </form>
                      </div>

                      <div className="space-y-2">
                        {entry.sets.map((set) => (
                          <div key={set.id} className="space-y-2 rounded-[14px] border border-[#273444] bg-[#0B1220] p-3">
                            <p className="text-[13px] font-bold text-[#CBD5E1]">Hiệp {set.setIndex + 1}</p>
                            <form action={updateWorkoutSetPlanAction} className="space-y-3">
                              <input type="hidden" name="workoutDayExerciseId" value={entry.id} />
                              <input type="hidden" name="planSetId" value={set.id} />
                              <input type="hidden" name="setIndex" value={set.setIndex} />
                              <div className="grid grid-cols-2 gap-2">
                                <label className="space-y-1">
                                  <span className="text-[12px] font-bold text-[#B7C6D8]">Mức nặng (%)</span>
                                  <AppInput name="intensityPercent" type="number" defaultValue={set.intensityPercent ?? ""} placeholder="70" inputMode="numeric" className="border-[#314155] bg-[#111C2E]" />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-[12px] font-bold text-[#B7C6D8]">Số lần</span>
                                  <AppInput name="targetReps" type="number" defaultValue={set.targetReps ?? ""} placeholder="12" inputMode="numeric" className="border-[#314155] bg-[#111C2E]" />
                                </label>
                              </div>
                              <label className="space-y-1">
                                <span className="text-[12px] font-bold text-[#B7C6D8]">Tạ mục tiêu (kg)</span>
                                <AppInput name="targetWeightKg" type="number" step="0.5" defaultValue={set.targetWeightKg ?? ""} placeholder="40" inputMode="decimal" className="border-[#314155] bg-[#111C2E]" />
                              </label>
                              <AppButton className="w-full" pendingLabel="Đang lưu...">
                                Lưu hiệp
                              </AppButton>
                            </form>
                            <form action={removeWorkoutSetPlanAction}>
                              <input type="hidden" name="planSetId" value={set.id} />
                              <PendingButton
                                className="min-h-[40px] w-full rounded-[14px] border border-[#7F1D1D] bg-[#3B0C0C] px-3 text-[13px] font-bold text-[#FCA5A5]"
                                pendingLabel="Đang xóa..."
                              >
                                Xóa hiệp
                              </PendingButton>
                            </form>
                          </div>
                        ))}
                        <form action={addWorkoutSetPlanAction}>
                          <input type="hidden" name="workoutDayExerciseId" value={entry.id} />
                          <PendingButton
                            className="min-h-[44px] w-full rounded-[14px] border border-[#22C55E]/40 bg-[#0C2537] px-3 text-[13px] font-bold text-[#BBF7D0]"
                            pendingLabel="Đang thêm..."
                          >
                            Thêm hiệp mới
                          </PendingButton>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </section>
        ) : null}

        {templates.length > 1 ? (
          <section id="tat-ca-mau" className="scroll-mt-8 space-y-3">
            <h2 className="text-[18px] font-black text-[#F7FAFC]">Tất cả mẫu</h2>
            {templates.map((template) => {
              const stats = getTemplateStats(template);

              return (
                <article key={template.id} className="rounded-[18px] border border-[#273444] bg-[#101821] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-black text-[#F7FAFC]">{template.name}</h3>
                      <p className="mt-1 text-[12px] text-[#B7C6D8]">
                        {stats.sessionsPerWeek} buổi mỗi tuần · {stats.exerciseCount} bài
                      </p>
                    </div>
                    {profile?.appliedWorkoutTemplateId === template.id ? (
                      <span className="shrink-0 rounded-full bg-[#22C55E]/12 px-3 py-1 text-[12px] font-black text-[#BBF7D0]">Đang dùng</span>
                    ) : null}
                  </div>
                  <form action={applyWorkoutTemplateAction} className="mt-3">
                    <input type="hidden" name="templateId" value={template.id} />
                    <PendingButton
                      className="min-h-[44px] w-full rounded-[15px] bg-[#22C55E] px-3 text-[13px] font-black text-white active:scale-[0.99]"
                      pendingLabel="Đang áp..."
                    >
                      Áp mẫu này
                    </PendingButton>
                  </form>
                </article>
              );
            })}
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
