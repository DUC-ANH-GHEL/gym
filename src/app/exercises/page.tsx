import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { addCatalogExerciseToLibraryAction } from "@/lib/exercise-actions";
import { AppCard, EmptyState, PageHeader } from "@/components/ui";
import { AppShell } from "@/components/app-shell";
import { ExerciseCard } from "@/components/exercise-card";

export default async function ExercisesPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const error = (await searchParams)?.error;
  const user = await requireUser();
  const [exercises, catalogItems] = await Promise.all([
    prisma.exercise.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.exerciseCatalogItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const personalByCatalogId = new Map(
    exercises
      .filter((exercise) => exercise.catalogItemId)
      .map((exercise) => [exercise.catalogItemId as string, exercise]),
  );

  return (
    <AppShell>
      <PageHeader
        title="Bài tập"
        description="Bấm thêm từ kho bài tập, sau đó chỉnh mức tạ và ghi chú riêng của bạn."
      />

      {error ? (
        <p className="rounded-[12px] border border-[#EF4444]/50 bg-[#EF4444]/10 px-3 py-2 text-[13px] font-semibold text-[#FCA5A5]">
          {error === "catalog"
            ? "Bài tập trong kho không khả dụng. Hãy chọn bài khác."
            : "Dữ liệu bài tập chưa hợp lệ. Kiểm tra tên bài, mức tạ và ảnh."}
        </p>
      ) : null}

      <section className="space-y-3" aria-labelledby="my-exercises">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="my-exercises" className="text-[18px] font-bold text-[#F9FAFB]">
              Của tôi
            </h2>
            <p className="mt-1 text-[13px] text-[#9CA3AF]">{exercises.length} bài đã thêm</p>
          </div>
        </div>

        {exercises.length === 0 ? (
          <EmptyState
            title="Chưa có bài trong thư viện"
            description="Kéo xuống kho bài tập và bấm thêm. Lịch tập chỉ dùng các bài bạn đã thêm vào đây."
          />
        ) : (
          <div className="space-y-4">
            {exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={{ ...exercise, setsCount: undefined }}
                href={`/exercises/${exercise.id}/edit`}
                ctaLabel="Chỉnh bài"
              />
            ))}
          </div>
        )}
      </section>

      <section id="catalog" className="space-y-3" aria-labelledby="exercise-catalog">
        <div>
          <h2 id="exercise-catalog" className="text-[18px] font-bold text-[#F9FAFB]">
            Kho bài tập
          </h2>
          <p className="mt-1 text-[13px] text-[#9CA3AF]">Metadata chung của app, mỗi người có bản riêng sau khi thêm.</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {catalogItems.map((item) => {
            const personalExercise = personalByCatalogId.get(item.id);

            return (
              <AppCard key={item.id} className="overflow-hidden p-0">
                <div className="relative h-36 w-full bg-[#1F2937]">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.name} fill sizes="100vw" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-[13px] font-semibold text-[#9CA3AF]">
                      Chưa có ảnh
                    </div>
                  )}
                </div>
                <div className="space-y-3 p-4">
                  <div className="min-w-0">
                    <h3 className="text-[18px] font-bold text-[#F9FAFB]">{item.name}</h3>
                    <p className="text-[13px] text-[#9CA3AF]">{item.muscleGroup || "Chưa có nhóm cơ"}</p>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-[12px] bg-[#0B0F14] px-3 py-2">
                    <span className="text-[13px] text-[#9CA3AF]">Tạ gợi ý</span>
                    <span className="text-[15px] font-bold text-[#F9FAFB]">{item.defaultWeightKg ?? 0}kg</span>
                  </div>

                  {item.note ? <p className="text-[14px] leading-5 text-[#D1D5DB]">{item.note}</p> : null}

                  {personalExercise ? (
                    <Link
                      href={`/exercises/${personalExercise.id}/edit`}
                      className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[14px] bg-[#1F2937] px-4 py-3 text-[15px] font-bold text-[#F9FAFB]"
                    >
                      Đã thêm - Sửa của tôi
                    </Link>
                  ) : (
                    <form action={addCatalogExerciseToLibraryAction}>
                      <input type="hidden" name="catalogItemId" value={item.id} />
                      <button className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[14px] bg-[#22C55E] px-4 py-3 text-[15px] font-bold text-white">
                        Thêm vào của tôi
                      </button>
                    </form>
                  )}
                </div>
              </AppCard>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
