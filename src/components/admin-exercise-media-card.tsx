"use client";

import { useState } from "react";
import { ExerciseMediaPreview } from "@/components/exercise-media-preview";
import { hasAnimationUrl } from "@/lib/exercise-media-admin";

type AdminExerciseMediaCardProps = {
  item: {
    id: string;
    slug: string;
    name: string;
    muscleGroup: string | null;
    imageUrl: string | null;
    animationUrl: string | null;
    updatedAtLabel: string;
  };
};

type MediaAction = "check" | "update";

type MediaState = {
  imageUrl: string | null;
  animationUrl: string | null;
  updatedAtLabel: string;
};

async function copyText(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard unavailable");
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "true");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
}

function PreviewBlock({
  title,
  src,
  kind,
  alt,
}: {
  title: string;
  src: string | null;
  kind: "image" | "animation";
  alt: string;
}) {
  return (
    <div className="min-w-0 rounded-[16px] border border-[#243041] bg-[#0F172A] p-3">
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">{title}</p>
      {src ? (
        <ExerciseMediaPreview
          media={{ src, kind, isPlaceholder: false }}
          alt={alt}
          width={320}
          height={180}
          imageClassName="h-32 w-full rounded-[12px] object-cover"
          placeholderClassName="hidden"
          buttonClassName="block w-full overflow-hidden rounded-[12px]"
          sizes="(max-width: 640px) 100vw, 320px"
        />
      ) : (
        <div className="flex h-32 items-center justify-center rounded-[12px] border border-dashed border-[#334155] bg-[#111827] px-3 text-center text-[13px] text-[#94A3B8]">
          {kind === "animation" ? "Chưa có GIF động" : "Chưa có ảnh thumbnail"}
        </div>
      )}
    </div>
  );
}

export function AdminExerciseMediaCard({ item }: AdminExerciseMediaCardProps) {
  const [datasetFolderName, setDatasetFolderName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [media, setMedia] = useState<MediaState>({
    imageUrl: item.imageUrl,
    animationUrl: item.animationUrl,
    updatedAtLabel: item.updatedAtLabel,
  });
  const hasGif = hasAnimationUrl(media.animationUrl);

  async function handleCopySlug() {
    try {
      await copyText(item.slug);
      setStatusMessage("Đã copy slug.");
    } catch {
      setStatusMessage("Không copy được slug. Hãy thử lại trên trình duyệt khác.");
    }
  }

  async function handleMediaAction(action: MediaAction) {
    const folderName = datasetFolderName.trim();
    if (!folderName) {
      setStatusMessage("Nhập tên folder dataset trước khi kiểm tra hoặc cập nhật.");
      return;
    }

    setIsSaving(true);
    setStatusMessage(action === "check" ? "Đang kiểm tra folder..." : "Đang cập nhật media...");

    try {
      const response = await fetch("/api/admin/exercise-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: item.slug, folderName, action }),
      });
      const result = (await response.json()) as {
        error?: string;
        message?: string;
        imageUrl?: string | null;
        animationUrl?: string | null;
        updatedAt?: string;
      };

      if (!response.ok) {
        setStatusMessage(result.error || "Không xử lý được folder này.");
        return;
      }

      if (action === "update") {
        setMedia((current) => ({
          imageUrl: result.imageUrl || current.imageUrl,
          animationUrl: result.animationUrl || current.animationUrl,
          updatedAtLabel: result.updatedAt ? new Date(result.updatedAt).toLocaleString("vi-VN") : current.updatedAtLabel,
        }));
      }

      setStatusMessage(result.message || "Đã xử lý xong.");
    } catch {
      setStatusMessage("Không gọi được công cụ media. Hãy thử lại.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-[20px] border border-[#243041] bg-[#121A2B] p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="break-words text-[18px] font-bold text-[#F8FAFC]">{item.name}</h2>
            <span
              className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
                hasGif ? "bg-[#22C55E]/15 text-[#86EFAC]" : "bg-[#F59E0B]/15 text-[#FCD34D]"
              }`}
            >
              {hasGif ? "Có GIF" : "Thiếu GIF"}
            </span>
          </div>
          <p className="break-all text-[13px] font-medium text-[#7DD3FC]">{item.slug}</p>
          <p className="text-[13px] text-[#94A3B8]">
            {item.muscleGroup || "Chưa có nhóm cơ"} · Cập nhật {media.updatedAtLabel}
          </p>
        </div>

        <button
          type="button"
          className="min-h-[44px] rounded-[14px] border border-[#243041] bg-[#0F172A] px-4 py-3 text-[14px] font-semibold text-[#F8FAFC]"
          onClick={handleCopySlug}
        >
          Copy slug
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <PreviewBlock title="Thumbnail" src={media.imageUrl} kind="image" alt={item.name} />
        <PreviewBlock title="GIF động" src={media.animationUrl} kind="animation" alt={`${item.name} GIF`} />
      </div>

      <label className="block space-y-2">
        <span className="text-[13px] font-semibold text-[#CBD5E1]">Dataset folder name</span>
        <input
          value={datasetFolderName}
          onChange={(event) => setDatasetFolderName(event.target.value)}
          placeholder="Ví dụ: Romanian_Deadlift"
          className="min-h-[48px] w-full rounded-[12px] border border-[#314155] bg-[#0F172A] px-3 text-[15px] text-[#F8FAFC] outline-none placeholder:text-[#64748B] focus:border-[#38BDF8]"
        />
        <p className="text-[12px] text-[#94A3B8]">
          Nhập đúng tên folder trong free-exercise-db, ví dụ <span className="font-semibold text-[#CBD5E1]">Romanian_Deadlift</span>.
        </p>
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          className="min-h-[44px] rounded-[14px] border border-[#38BDF8]/50 bg-[#0F172A] px-3 py-2 text-[13px] font-semibold text-[#E0F2FE] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          onClick={() => handleMediaAction("check")}
        >
          Kiểm tra folder
        </button>
        <button
          type="button"
          className="min-h-[44px] rounded-[14px] bg-[#38BDF8] px-3 py-2 text-[13px] font-bold text-[#082F49] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          onClick={() => handleMediaAction("update")}
        >
          Cập nhật media
        </button>
      </div>

      {statusMessage ? <p className="text-[13px] font-medium text-[#86EFAC]">{statusMessage}</p> : null}
    </div>
  );
}
