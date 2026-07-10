import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import {
  addCatalogItemToTemplateDayAction,
  addWorkoutTemplateSetAction,
  deleteWorkoutTemplateAction,
  moveWorkoutTemplateExerciseAction,
  removeWorkoutTemplateExerciseAction,
  removeWorkoutTemplateSetAction,
  replaceWorkoutTemplateExerciseAction,
  saveWorkoutTemplateAction,
  updateWorkoutTemplateDayAction,
  updateWorkoutTemplateSetAction,
} from "@/lib/admin-template-actions";
import { AdminRouteLinks } from "@/components/admin-route-links";
import { AppShell } from "@/components/app-shell";
import { AppButton, AppCard, AppInput, AppTextarea, PageHeader, PendingButton } from "@/components/ui";
import { TemplateDayCard } from "@/components/template-day-card";

type SearchParams = {
  added?: string;
  day?: string;
  error?: string;
  replaced?: string;
  template?: string;
};

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const DAY_LABELS: Record<number, string> = {
  0: "CN",
  1: "T2",
  2: "T3",
  3: "T4",
  4: "T5",
  5: "T6",
  6: "T7",
};

const DAY_FULL_LABELS: Record<number, string> = {
  0: "Chủ nhật",
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
};

function getTemplateStats(template: {
  days: {
    isRestDay: boolean;
    exercises: { sets: unknown[] }[];
  }[];
}) {
  const activeDays = template.days.filter((day) => !day.isRestDay).length;
  const exerciseCount = template.days.reduce((sum, day) => sum + day.exercises.length, 0);
  const setCount = template.days.reduce(
    (sum, day) => sum + day.exercises.reduce((daySum, exercise) => daySum + exercise.sets.length, 0),
    0,
  );

  return { activeDays, exerciseCount, setCount };
}

function getSortedDays<TDay extends { dayOfWeek: number }>(days: TDay[]) {
  return [...days].sort((a, b) => DAY_ORDER.indexOf(a.dayOfWeek as (typeof DAY_ORDER)[number]) - DAY_ORDER.indexOf(b.dayOfWeek as (typeof DAY_ORDER)[number]));
}

function parseSelectedDay(value: string | undefined) {
  const parsed = Number(value);
  return DAY_ORDER.includes(parsed as (typeof DAY_ORDER)[number]) ? parsed : 1;
}

function parseAddedCount(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function buildTemplateHref(templateId: string, dayOfWeek: number) {
  return `/admin/templates?template=${encodeURIComponent(templateId)}&day=${dayOfWeek}`;
}

export default async function AdminTemplatesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = await searchParams;
  await requireAdminUser();

  const [templates, catalogItems] = await Promise.all([
    prisma.workoutTemplate.findMany({
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: {
        days: {
          orderBy: { dayOfWeek: "asc" },
          include: {
            exercises: {
              orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }, { id: "asc" }],
              include: {
                catalogItem: true,
                sets: { orderBy: { setIndex: "asc" } },
              },
            },
          },
        },
      },
    }),
    prisma.exerciseCatalogItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const selectedDayOfWeek = parseSelectedDay(params?.day);
  const selectedTemplate = templates.find((template) => template.id === params?.template) ?? templates[0] ?? null;
  const selectedDays = selectedTemplate ? getSortedDays(selectedTemplate.days) : [];
  const selectedDay =
    selectedDays.find((day) => day.dayOfWeek === selectedDayOfWeek) ?? selectedDays.find((day) => day.dayOfWeek === 1) ?? selectedDays[0] ?? null;
  const selectedStats = selectedTemplate ? getTemplateStats(selectedTemplate) : null;
  const addedCount = parseAddedCount(params?.added);

  return (
    <AppShell>
      <PageHeader
        title="Template lịch"
        description="Tạo mẫu lịch tập để áp cho học viên trong một lần."
        action={
          <Link href="/admin/exercises" className="shrink-0 rounded-[14px] border border-[#243041] bg-[#121A2B] px-4 py-3 text-[15px] font-semibold text-[#F8FAFC]">
            Bài tập
          </Link>
        }
      />
      <AdminRouteLinks current="templates" />

      {params?.error ? (
        <p className="rounded-[14px] border border-[#7F1D1D] bg-[#3B0C0C] px-4 py-3 text-[14px] font-semibold leading-6 text-[#FCA5A5]">
          {params.error === "duplicate"
            ? "Ngày này đã có bài đó rồi. Chọn bài khác để thay."
            : "Dữ liệu mẫu lịch chưa hợp lệ. Kiểm tra lại tên mẫu, ngày tập và thông số set."}
        </p>
      ) : null}

      {addedCount > 0 && selectedDay ? (
        <p className="rounded-[14px] border border-[#22C55E]/35 bg-[#123522] px-4 py-3 text-[14px] font-black leading-6 text-[#BBF7D0]">
          Đã thêm {addedCount} bài vào {DAY_FULL_LABELS[selectedDay.dayOfWeek]}.
        </p>
      ) : null}

      {params?.replaced === "1" && selectedDay ? (
        <p className="rounded-[14px] border border-[#22C55E]/35 bg-[#123522] px-4 py-3 text-[14px] font-black leading-6 text-[#BBF7D0]">
          Đã thay bài trong {DAY_FULL_LABELS[selectedDay.dayOfWeek]}. Lịch của học viên đang dùng mẫu này cũng đã được cập nhật.
        </p>
      ) : null}

      <details data-qa="template-create" className="group rounded-[20px] border border-[#243041] bg-[#121A2B] p-4">
        <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-center rounded-[15px] bg-[#0EA5E9] px-4 text-center text-[15px] font-black text-[#082F49] transition hover:bg-[#38BDF8]">
          + Tạo mẫu mới
        </summary>
        <form action={saveWorkoutTemplateAction} className="mt-4 space-y-3">
          <AppInput name="name" placeholder="Tên mẫu, ví dụ 5 buổi mỗi tuần" required className="border-[#314155] bg-[#111C2E]" />
          <AppTextarea name="description" rows={3} placeholder="Mô tả ngắn cho học viên" className="border-[#314155] bg-[#111C2E]" />
          <div className="grid grid-cols-2 gap-2">
            <AppInput name="sessionsPerWeek" type="number" placeholder="Số buổi" inputMode="numeric" className="border-[#314155] bg-[#111C2E]" />
            <AppInput name="sortOrder" type="number" placeholder="Thứ tự" inputMode="numeric" className="border-[#314155] bg-[#111C2E]" />
          </div>
          <label className="flex min-h-[52px] items-center gap-3 rounded-[16px] border border-[#243041] bg-[#0F172A] px-4 text-[14px] font-semibold text-[#F8FAFC]">
            <input type="checkbox" name="isActive" defaultChecked className="h-5 w-5 shrink-0 accent-[#0EA5E9]" />
            Hiện cho học viên
          </label>
          <AppButton className="w-full bg-[#0EA5E9] text-[#082F49] hover:bg-[#38BDF8]" pendingLabel="Đang tạo...">
            Tạo mẫu
          </AppButton>
        </form>
      </details>

      <section className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start 2xl:grid-cols-[260px_320px_minmax(420px,1fr)]">
        <aside className="order-3 space-y-4 lg:order-1 lg:sticky lg:top-4">
          <div data-qa="template-list">
            <AppCard className="space-y-3 border-[#243041] bg-[#121A2B]">
              <div>
                <h2 className="text-[17px] font-black text-[#F8FAFC]">Danh sách mẫu</h2>
                <p className="mt-1 text-[13px] leading-5 text-[#94A3B8]">Chọn một mẫu để sửa. Màn hình sẽ chỉ mở mẫu đó.</p>
              </div>
              {templates.length > 0 ? (
                <div className="space-y-2">
                  {templates.map((template) => {
                    const stats = getTemplateStats(template);
                    const isSelected = template.id === selectedTemplate?.id;

                    return (
                      <Link
                        key={template.id}
                        href={buildTemplateHref(template.id, selectedDay?.dayOfWeek ?? 1)}
                        className={`block rounded-[16px] border p-3 transition ${
                          isSelected ? "border-[#0EA5E9] bg-[#0C2537]" : "border-[#243041] bg-[#0F172A] hover:border-[#334155]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="min-w-0 break-words text-[15px] font-black leading-6 text-[#F8FAFC]">{template.name}</h3>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${template.isActive ? "bg-[#123522] text-[#BBF7D0]" : "bg-[#1E293B] text-[#CBD5E1]"}`}>
                            {template.isActive ? "Hiện" : "Ẩn"}
                          </span>
                        </div>
                        <p className="mt-2 text-[13px] font-semibold text-[#94A3B8]">
                          {stats.activeDays} buổi · {stats.exerciseCount} bài
                        </p>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-[16px] border border-dashed border-[#334155] bg-[#0F172A] px-4 py-5 text-[14px] leading-6 text-[#94A3B8]">
                  Chưa có mẫu lịch nào. Bấm tạo mẫu mới để bắt đầu.
                </p>
              )}
            </AppCard>
          </div>
        </aside>

        <section className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-4">
          {selectedTemplate && selectedStats ? (
            <>
              <div data-qa="template-active">
                <AppCard className="space-y-4 border-[#243041] bg-[#121A2B]">
                  <div className="space-y-2">
                  <p className="text-[13px] font-black text-[#38BDF8]">Mẫu đang sửa</p>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words text-[22px] font-black leading-tight text-[#F8FAFC]">{selectedTemplate.name}</h2>
                      <p className="mt-2 text-[14px] font-semibold leading-6 text-[#CBD5E1]">
                        {selectedStats.activeDays || selectedTemplate.sessionsPerWeek} buổi mỗi tuần
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-black ${selectedTemplate.isActive ? "bg-[#123522] text-[#BBF7D0]" : "bg-[#1E293B] text-[#CBD5E1]"}`}>
                      {selectedTemplate.isActive ? "Đang hiện" : "Đang ẩn"}
                    </span>
                  </div>
                  <p className="text-[14px] leading-6 text-[#94A3B8]">
                    {selectedTemplate.description || "Mẫu này chưa có mô tả."}
                  </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-[15px] border border-[#243041] bg-[#0F172A] p-3">
                    <p className="text-[18px] font-black text-[#F8FAFC]">{selectedStats.activeDays}</p>
                    <p className="mt-1 text-[12px] font-semibold text-[#94A3B8]">Buổi tập</p>
                  </div>
                  <div className="rounded-[15px] border border-[#243041] bg-[#0F172A] p-3">
                    <p className="text-[18px] font-black text-[#F8FAFC]">{selectedStats.exerciseCount}</p>
                    <p className="mt-1 text-[12px] font-semibold text-[#94A3B8]">Bài tập</p>
                  </div>
                  <div className="rounded-[15px] border border-[#243041] bg-[#0F172A] p-3">
                    <p className="text-[18px] font-black text-[#F8FAFC]">{selectedStats.setCount}</p>
                    <p className="mt-1 text-[12px] font-semibold text-[#94A3B8]">Set</p>
                  </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                  <form action={saveWorkoutTemplateAction}>
                    <input type="hidden" name="templateId" value={selectedTemplate.id} />
                    <input type="hidden" name="name" value={selectedTemplate.name} />
                    <input type="hidden" name="description" value={selectedTemplate.description ?? ""} />
                    <input type="hidden" name="sessionsPerWeek" value={selectedTemplate.sessionsPerWeek} />
                    <input type="hidden" name="sortOrder" value={selectedTemplate.sortOrder} />
                    {!selectedTemplate.isActive ? <input type="hidden" name="isActive" value="on" /> : null}
                    <PendingButton
                      className="min-h-[44px] w-full rounded-[14px] border border-[#334155] bg-[#111827] px-3 py-2 text-[13px] font-black text-[#E2E8F0]"
                      pendingLabel="Đang đổi..."
                    >
                      {selectedTemplate.isActive ? "Ẩn mẫu" : "Hiện mẫu"}
                    </PendingButton>
                  </form>
                  <form action={deleteWorkoutTemplateAction}>
                    <input type="hidden" name="templateId" value={selectedTemplate.id} />
                    <PendingButton
                      className="min-h-[44px] w-full rounded-[14px] border border-[#7F1D1D] bg-[#3B0C0C] px-3 py-2 text-[13px] font-black text-[#FCA5A5]"
                      pendingLabel="Đang xóa..."
                    >
                      Xóa mẫu
                    </PendingButton>
                  </form>
                  </div>
                </AppCard>
              </div>

              <details className="rounded-[20px] border border-[#243041] bg-[#121A2B] p-4">
                <summary className="cursor-pointer list-none text-[15px] font-black text-[#F8FAFC]">Sửa thông tin mẫu</summary>
                <form action={saveWorkoutTemplateAction} className="mt-4 space-y-3">
                  <input type="hidden" name="templateId" value={selectedTemplate.id} />
                  <AppInput name="name" defaultValue={selectedTemplate.name} placeholder="Tên mẫu" required className="border-[#314155] bg-[#111C2E]" />
                  <AppTextarea name="description" rows={3} defaultValue={selectedTemplate.description ?? ""} placeholder="Mô tả ngắn" className="border-[#314155] bg-[#111C2E]" />
                  <div className="grid grid-cols-2 gap-2">
                    <AppInput name="sessionsPerWeek" type="number" defaultValue={selectedTemplate.sessionsPerWeek} placeholder="Số buổi" inputMode="numeric" className="border-[#314155] bg-[#111C2E]" />
                    <AppInput name="sortOrder" type="number" defaultValue={selectedTemplate.sortOrder} placeholder="Thứ tự" inputMode="numeric" className="border-[#314155] bg-[#111C2E]" />
                  </div>
                  <label className="flex min-h-[52px] items-center gap-3 rounded-[16px] border border-[#243041] bg-[#111827] px-4 text-[14px] font-semibold text-[#F8FAFC]">
                    <input type="checkbox" name="isActive" defaultChecked={selectedTemplate.isActive} className="h-5 w-5 shrink-0 accent-[#0EA5E9]" />
                    Hiện cho học viên
                  </label>
                  <AppButton className="w-full bg-[#0EA5E9] text-[#082F49] hover:bg-[#38BDF8]" pendingLabel="Đang lưu...">
                    Lưu mẫu
                  </AppButton>
                </form>
              </details>

              <div data-qa="template-week">
                <AppCard className="space-y-3 border-[#243041] bg-[#121A2B]">
                  <div>
                    <h2 className="text-[17px] font-black text-[#F8FAFC]">Tuần tập</h2>
                    <p className="mt-1 text-[13px] leading-5 text-[#94A3B8]">Chọn ngày cần sửa trong mẫu này.</p>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {selectedDays.map((day) => {
                      const isSelected = day.id === selectedDay?.id;
                      const hasExercises = day.exercises.length > 0;

                      return (
                        <Link
                          key={day.id}
                          href={buildTemplateHref(selectedTemplate.id, day.dayOfWeek)}
                          className={`min-w-0 rounded-[14px] border px-1 py-2 text-center transition ${
                            isSelected
                              ? "border-[#0EA5E9] bg-[#0EA5E9] text-[#082F49]"
                              : day.isRestDay
                                ? "border-[#243041] bg-[#0F172A] text-[#94A3B8]"
                                : "border-[#22C55E]/35 bg-[#123522] text-[#BBF7D0]"
                          }`}
                        >
                          <span className="block text-[13px] font-black">{DAY_LABELS[day.dayOfWeek] ?? "?"}</span>
                          <span className="mt-1 block truncate text-[10px] font-bold">{day.isRestDay ? "nghỉ" : hasExercises ? `${day.exercises.length} bài` : "tập"}</span>
                        </Link>
                      );
                    })}
                  </div>
                </AppCard>
              </div>
            </>
          ) : null}
        </section>

        <section className="order-2 min-w-0 lg:order-3 lg:col-span-2 2xl:col-span-1">
          {selectedDay ? (
            <TemplateDayCard
              day={selectedDay}
              catalogItems={catalogItems}
              updateAction={updateWorkoutTemplateDayAction}
              addAction={addCatalogItemToTemplateDayAction}
              moveExerciseAction={moveWorkoutTemplateExerciseAction}
              removeExerciseAction={removeWorkoutTemplateExerciseAction}
              replaceExerciseAction={replaceWorkoutTemplateExerciseAction}
              updateSetAction={updateWorkoutTemplateSetAction}
              addSetAction={addWorkoutTemplateSetAction}
              removeSetAction={removeWorkoutTemplateSetAction}
            />
          ) : (
            <AppCard className="border-[#243041] bg-[#121A2B]">
              <h2 className="text-[18px] font-black text-[#F8FAFC]">Chưa có ngày tập</h2>
              <p className="mt-2 text-[14px] leading-6 text-[#94A3B8]">Tạo mẫu mới để hệ thống tự tạo 7 ngày trong tuần.</p>
            </AppCard>
          )}
        </section>
      </section>
    </AppShell>
  );
}
