import Link from "next/link";
import { AppCard, PendingButton } from "@/components/ui";
import { ExerciseMediaPreview } from "@/components/exercise-media-preview";
import { getExerciseMedia } from "@/lib/exercise-media";

export function ExerciseCard({
  exercise,
  href,
  action,
  ctaLabel = "Bắt đầu / Tiếp tục",
}: {
  exercise: {
    id: string;
    name: string;
    muscleGroup: string | null;
    imageUrl: string | null;
    animationUrl?: string | null;
    currentWeightKg: number | null;
    setsCount?: number;
  };
  href?: string;
  action?: () => Promise<void>;
  ctaLabel?: string;
}) {
  const media = getExerciseMedia(exercise, "list");

  return (
    <AppCard className="overflow-hidden p-0">
      <ExerciseMediaPreview
        media={media}
        alt={exercise.name}
        width={640}
        height={320}
        imageClassName="h-40 w-full object-cover"
        placeholderClassName="flex h-40 items-center justify-center bg-[#1B1E23] text-[13px] font-semibold text-[#8B919B]"
        placeholderLabel="Chưa có ảnh"
        buttonClassName="block w-full"
        sizes="(max-width: 768px) 100vw, 640px"
      />
      <div className="space-y-2 p-4">
        <div>
          <h3 className="text-[18px] font-bold text-[#F4F5F7]">{exercise.name}</h3>
          <p className="text-[13px] text-[#8B919B]">{exercise.muscleGroup || "Chưa có nhóm cơ"}</p>
        </div>
        <p className="text-[15px] text-[#F4F5F7]">Tạ hiện tại: {exercise.currentWeightKg ?? 0}kg</p>
        {typeof exercise.setsCount === "number" ? <p className="text-[13px] text-[#8B919B]">{exercise.setsCount} set</p> : null}
        {action ? (
          <form action={action}>
            <PendingButton
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[14px] bg-[#C8F31D] px-4 py-3 text-[15px] font-bold text-[#0A0B0D]"
              pendingLabel="Đang mở..."
            >
              {ctaLabel}
            </PendingButton>
          </form>
        ) : href ? (
          <Link href={href} className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[14px] bg-[#C8F31D] px-4 py-3 text-[15px] font-bold text-[#0A0B0D]">
            {ctaLabel}
          </Link>
        ) : null}
      </div>
    </AppCard>
  );
}
