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
          <Link href="/admin/exercises" className="shrink-0 rounded-[14px] border border-[#1F2329] bg-[#14161A] px-4 py-3 text-[15px] font-semibold text-[#F4F5F7]">
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
        <p className="rounded-[14px] border border-[#C8F31D]/35 bg-[#123522] px-4 py-3 text-[14px] font-black leading-6 text-[#C8F31D]">
          Đã thêm {addedCount} bài vào {DAY_FULL_LABELS[selectedDay.dayOfWeek]}.
        </p>
      ) : null}

      {params?.replaced === "1" && selectedDay ? (
        <p className="rounded-[14px] border border-[#C8F31D]/35 bg-[#123522] px-4 py-3 text-[14px] font-black leading-6 text-[#C8F31D]">
          Đã thay bài trong {DAY_FULL_LABELS[selectedDay.dayOfWeek]}. Lịch của học viên đang dùng mẫu này cũng đã được cập nhật.
        </p>
      ) : null}

      <details data-qa="template-create" className="group rounded-[20px] border border-[#1F2329] bg-[#14161A] p-4">
        <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-center rounded-[15px] bg-[#C8F31D] px-4 text-center text-[15px] font-black text-[#14161A] transition hover:bg-[#C8F31D]">
          + Tạo mẫu mới
        </summary>
        <form action={saveWorkoutTemplateAction} className="mt-4 space-y-3">
          <AppInput name="name" placeholder="Tên mẫu, ví dụ 5 buổi mỗi tuần" required className="border-[#2A2F36] bg-[#14161A]" />
          <AppTextarea name="description" rows={3} placeholder="Mô tả ngắn cho học viên" className="border-[#2A2F36] bg-[#14161A]" />
          <div className="grid grid-cols-2 gap-2">
            <AppInput name="sessionsPerWeek" type="number" placeholder="Số buổi" inputMode="numeric" className="border-[#2A2F36] bg-[#14161A]" />
            <AppInput name="sortOrder" type="number" placeholder="Thứ tự" inputMode="numeric" className="border-[#2A2F36] bg-[#14161A]" />
          </div>
          <label className="flex min-h-[52px] items-center gap-3 rounded-[16px] border border-[#1F2329] bg-[#0A0B0D] px-4 text-[14px] font-semibold text-[#F4F5F7]">
            <input type="checkbox" name="isActive" defaultChecked className="h-5 w-5 shrink-0 accent-[#C8F31D]" />
            Hiện cho học viên
          </label>
          <AppButton className="w-full bg-[#C8F31D] text-[#14161A] hover:bg-[#C8F31D]" pendingLabel="Đang tạo...">
            Tạo mẫu
          </AppButton>
        </form>
      </details>

      <section className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start 2xl:grid-cols-[260px_320px_minmax(420px,1fr)]">
        <aside className="order-3 space-y-4 lg:order-1 lg:sticky lg:top-4">
          <div data-qa="template-list">
            <AppCard className="space-y-3 border-[#1F2329] bg-[#14161A]">
              <div>
                <h2 className="text-[17px] font-black text-[#F4F5F7]">Danh sách mẫu</h2>
                <p className="mt-1 text-[13px] leading-5 text-[#8B919B]">Chọn một mẫu để sửa. Màn hình sẽ chỉ mở mẫu đó.</p>
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
                          isSelected ? "border-[#C8F31D] bg-[#0C2537]" : "border-[#1F2329] bg-[#0A0B0D] hover:border-[#2A2F36]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="min-w-0 break-words text-[15px] font-black leading-6 text-[#F4F5F7]">{template.name}</h3>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${template.isActive ? "bg-[#123522] text-[#C8F31D]" : "bg-[#1B1E23] text-[#B6BBC4]"}`}>
                            {template.isActive ? "Hiện" : "Ẩn"}
                          </span>
                        </div>
                        <p className="mt-2 text-[13px] font-semibold text-[#8B919B]">
                          {stats.activeDays} buổi · {stats.exerciseCount} bài
                        </p>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-[16px] border border-dashed border-[#2A2F36] bg-[#0A0B0D] px-4 py-5 text-[14px] leading-6 text-[#8B919B]">
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
                <AppCard className="space-y-4 border-[#1F2329] bg-[#14161A]">
                  <div className="space-y-2">
                  <p className="text-[13px] font-black text-[#C8F31D]">Mẫu đang sửa</p>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words text-[22px] font-black leading-tight text-[#F4F5F7]">{selectedTemplate.name}</h2>
                      <p className="mt-2 text-[14px] font-semibold leading-6 text-[#B6BBC4]">
                        {selectedStats.activeDays || selectedTemplate.sessionsPerWeek} buổi mỗi tuần
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-black ${selectedTemplate.isActive ? "bg-[#123522] text-[#C8F31D]" : "bg-[#1B1E23] text-[#B6BBC4]"}`}>
                      {selectedTemplate.isActive ? "Đang hiện" : "Đang ẩn"}
                    </span>
                  </div>
                  <p className="text-[14px] leading-6 text-[#8B919B]">
                    {selectedTemplate.description || "Mẫu này chưa có mô tả."}
                  </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-[15px] border border-[#1F2329] bg-[#0A0B0D] p-3">
                    <p className="text-[18px] font-black text-[#F4F5F7]">{selectedStats.activeDays}</p>
                    <p className="mt-1 text-[12px] font-semibold text-[#8B919B]">Buổi tập</p>
                  </div>
                  <div className="rounded-[15px] border border-[#1F2329] bg-[#0A0B0D] p-3">
                    <p className="text-[18px] font-black text-[#F4F5F7]">{selectedStats.exerciseCount}</p>
                    <p className="mt-1 text-[12px] font-semibold text-[#8B919B]">Bài tập</p>
                  </div>
                  <div className="rounded-[15px] border border-[#1F2329] bg-[#0A0B0D] p-3">
                    <p className="text-[18px] font-black text-[#F4F5F7]">{selectedStats.setCount}</p>
                    <p className="mt-1 text-[12px] font-semibold text-[#8B919B]">Set</p>
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
                      className="min-h-[44px] w-full rounded-[14px] border border-[#2A2F36] bg-[#14161A] px-3 py-2 text-[13px] font-black text-[#B6BBC4]"
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

              <details className="rounded-[20px] border border-[#1F2329] bg-[#14161A] p-4">
                <summary className="cursor-pointer list-none text-[15px] font-black text-[#F4F5F7]">Sửa thông tin mẫu</summary>
                <form action={saveWorkoutTemplateAction} className="mt-4 space-y-3">
                  <input type="hidden" name="templateId" value={selectedTemplate.id} />
                  <AppInput name="name" defaultValue={selectedTemplate.name} placeholder="Tên mẫu" required className="border-[#2A2F36] bg-[#14161A]" />
                  <AppTextarea name="description" rows={3} defaultValue={selectedTemplate.description ?? ""} placeholder="Mô tả ngắn" className="border-[#2A2F36] bg-[#14161A]" />
                  <div className="grid grid-cols-2 gap-2">
                    <AppInput name="sessionsPerWeek" type="number" defaultValue={selectedTemplate.sessionsPerWeek} placeholder="Số buổi" inputMode="numeric" className="border-[#2A2F36] bg-[#14161A]" />
                    <AppInput name="sortOrder" type="number" defaultValue={selectedTemplate.sortOrder} placeholder="Thứ tự" inputMode="numeric" className="border-[#2A2F36] bg-[#14161A]" />
                  </div>
                  <label className="flex min-h-[52px] items-center gap-3 rounded-[16px] border border-[#1F2329] bg-[#14161A] px-4 text-[14px] font-semibold text-[#F4F5F7]">
                    <input type="checkbox" name="isActive" defaultChecked={selectedTemplate.isActive} className="h-5 w-5 shrink-0 accent-[#C8F31D]" />
                    Hiện cho học viên
                  </label>
                  <AppButton className="w-full bg-[#C8F31D] text-[#14161A] hover:bg-[#C8F31D]" pendingLabel="Đang lưu...">
                    Lưu mẫu
                  </AppButton>
                </form>
              </details>

              <div data-qa="template-week">
                <AppCard className="space-y-3 border-[#1F2329] bg-[#14161A]">
                  <div>
                    <h2 className="text-[17px] font-black text-[#F4F5F7]">Tuần tập</h2>
                    <p className="mt-1 text-[13px] leading-5 text-[#8B919B]">Chọn ngày cần sửa trong mẫu này.</p>
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
                              ? "border-[#C8F31D] bg-[#C8F31D] text-[#14161A]"
                              : day.isRestDay
                                ? "border-[#1F2329] bg-[#0A0B0D] text-[#8B919B]"
                                : "border-[#C8F31D]/35 bg-[#123522] text-[#C8F31D]"
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
            <AppCard className="border-[#1F2329] bg-[#14161A]">
              <h2 className="text-[18px] font-black text-[#F4F5F7]">Chưa có ngày tập</h2>
              <p className="mt-2 text-[14px] leading-6 text-[#8B919B]">Tạo mẫu mới để hệ thống tự tạo 7 ngày trong tuần.</p>
            </AppCard>
          )}
        </section>
      </section>
    </AppShell>
  );
}
