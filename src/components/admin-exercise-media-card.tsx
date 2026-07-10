"use client";

import { useState, type ChangeEvent } from "react";
import { ExerciseMediaPreview } from "@/components/exercise-media-preview";
import { hasAnimationUrl } from "@/lib/exercise-media-admin";
import { getUploadPolicy, type UploadKind, validateUploadFile } from "@/lib/media-upload-policy";

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

const TEXT = {
  noGif: "Ch\u01b0a c\u00f3 GIF \u0111\u1ed9ng",
  noImage: "Ch\u01b0a c\u00f3 \u1ea3nh thumbnail",
  copiedSlug: "\u0110\u00e3 copy slug.",
  copyFailed: "Kh\u00f4ng copy \u0111\u01b0\u1ee3c slug. H\u00e3y th\u1eed l\u1ea1i tr\u00ean tr\u00ecnh duy\u1ec7t kh\u00e1c.",
  enterFolder: "Nh\u1eadp t\u00ean folder dataset tr\u01b0\u1edbc khi ki\u1ec3m tra ho\u1eb7c c\u1eadp nh\u1eadt.",
  checkingFolder: "\u0110ang ki\u1ec3m tra folder...",
  updatingMedia: "\u0110ang c\u1eadp nh\u1eadt media...",
  mediaFailed: "Kh\u00f4ng x\u1eed l\u00fd \u0111\u01b0\u1ee3c folder n\u00e0y.",
  mediaDone: "\u0110\u00e3 x\u1eed l\u00fd xong.",
  toolFailed: "Kh\u00f4ng g\u1ecdi \u0111\u01b0\u1ee3c c\u00f4ng c\u1ee5 media. H\u00e3y th\u1eed l\u1ea1i.",
  uploadingGif: "\u0110ang t\u1ea3i GIF l\u00ean...",
  uploadingImage: "\u0110ang t\u1ea3i \u1ea3nh l\u00ean...",
  uploadFailed: "Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c file.",
  updateFailed: "Kh\u00f4ng c\u1eadp nh\u1eadt \u0111\u01b0\u1ee3c b\u00e0i t\u1eadp.",
  uploadGifDone: "\u0110\u00e3 c\u1eadp nh\u1eadt GIF cho b\u00e0i n\u00e0y.",
  uploadImageDone: "\u0110\u00e3 c\u1eadp nh\u1eadt \u1ea3nh cho b\u00e0i n\u00e0y.",
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
          {kind === "animation" ? TEXT.noGif : TEXT.noImage}
        </div>
      )}
    </div>
  );
}

export function AdminExerciseMediaCard({ item }: AdminExerciseMediaCardProps) {
  const [datasetFolderName, setDatasetFolderName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [savingAction, setSavingAction] = useState<MediaAction | null>(null);
  const [manualUploadKind, setManualUploadKind] = useState<UploadKind | null>(null);
  const [media, setMedia] = useState<MediaState>({
    imageUrl: item.imageUrl,
    animationUrl: item.animationUrl,
    updatedAtLabel: item.updatedAtLabel,
  });
  const hasGif = hasAnimationUrl(media.animationUrl);
  const isSaving = savingAction !== null;

  async function handleCopySlug() {
    try {
      await copyText(item.slug);
      setStatusMessage(TEXT.copiedSlug);
    } catch {
      setStatusMessage(TEXT.copyFailed);
    }
  }

  async function updateManualMedia(kind: UploadKind, mediaUrl: string) {
    const response = await fetch("/api/admin/exercise-media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: item.slug,
        action: "manual-update",
        mediaKind: kind,
        mediaUrl,
      }),
    });
    const result = (await response.json()) as {
      error?: string;
      message?: string;
      imageUrl?: string | null;
      animationUrl?: string | null;
      updatedAt?: string;
    };

    if (!response.ok) {
      throw new Error(result.error || TEXT.updateFailed);
    }

    setMedia((current) => ({
      imageUrl: result.imageUrl || current.imageUrl,
      animationUrl: result.animationUrl || current.animationUrl,
      updatedAtLabel: result.updatedAt ? new Date(result.updatedAt).toLocaleString("vi-VN") : current.updatedAtLabel,
    }));
    setStatusMessage(result.message || (kind === "animation" ? TEXT.uploadGifDone : TEXT.uploadImageDone));
  }

  async function handleManualUpload(event: ChangeEvent<HTMLInputElement>, kind: UploadKind) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const validation = validateUploadFile(file, kind);
    if (!validation.ok) {
      setStatusMessage(validation.error);
      event.target.value = "";
      return;
    }

    setManualUploadKind(kind);
    setStatusMessage(kind === "animation" ? TEXT.uploadingGif : TEXT.uploadingImage);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadResult = (await uploadResponse.json()) as { secure_url?: string; error?: string };

      if (!uploadResponse.ok || !uploadResult.secure_url) {
        throw new Error(uploadResult.error || TEXT.uploadFailed);
      }

      await updateManualMedia(kind, uploadResult.secure_url);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : TEXT.uploadFailed);
    } finally {
      setManualUploadKind(null);
      event.target.value = "";
    }
  }

  async function handleMediaAction(action: MediaAction) {
    const folderName = datasetFolderName.trim();
    if (!folderName) {
      setStatusMessage(TEXT.enterFolder);
      return;
    }

    setSavingAction(action);
    setStatusMessage(action === "check" ? TEXT.checkingFolder : TEXT.updatingMedia);

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
        setStatusMessage(result.error || TEXT.mediaFailed);
        return;
      }

      if (action === "update") {
        setMedia((current) => ({
          imageUrl: result.imageUrl || current.imageUrl,
          animationUrl: result.animationUrl || current.animationUrl,
          updatedAtLabel: result.updatedAt ? new Date(result.updatedAt).toLocaleString("vi-VN") : current.updatedAtLabel,
        }));
      }

      setStatusMessage(result.message || TEXT.mediaDone);
    } catch {
      setStatusMessage(TEXT.toolFailed);
    } finally {
      setSavingAction(null);
    }
  }

  const gifPolicy = getUploadPolicy("animation");
  const imagePolicy = getUploadPolicy("image");

  return (
    <div className="space-y-4 rounded-[20px] border border-[#243041] bg-[#121A2B] p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="break-words text-[18px] font-bold text-[#F8FAFC]">{item.name}</h2>
            <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${hasGif ? "bg-[#22C55E]/15 text-[#86EFAC]" : "bg-[#F59E0B]/15 text-[#FCD34D]"}`}>
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

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex min-h-[46px] cursor-pointer items-center justify-center rounded-[14px] border border-[#38BDF8]/50 bg-[#0F172A] px-3 py-2 text-center text-[13px] font-semibold text-[#E0F2FE]">
          <input
            type="file"
            accept={imagePolicy.accept}
            className="sr-only"
            disabled={manualUploadKind !== null}
            onChange={(event) => handleManualUpload(event, "image")}
          />
          {manualUploadKind === "image" ? "Đang tải ảnh..." : "Upload ảnh"}
        </label>
        <label className="flex min-h-[46px] cursor-pointer items-center justify-center rounded-[14px] bg-[#38BDF8] px-3 py-2 text-center text-[13px] font-bold text-[#082F49]">
          <input
            type="file"
            accept={gifPolicy.accept}
            className="sr-only"
            disabled={manualUploadKind !== null}
            onChange={(event) => handleManualUpload(event, "animation")}
          />
          {manualUploadKind === "animation" ? "Đang tải GIF..." : "Upload GIF"}
        </label>
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
          Nếu bài có trong free-exercise-db thì nhập folder. Nếu không có, dùng nút upload GIF ở trên.
        </p>
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          className="min-h-[44px] rounded-[14px] border border-[#38BDF8]/50 bg-[#0F172A] px-3 py-2 text-[13px] font-semibold text-[#E0F2FE] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          onClick={() => handleMediaAction("check")}
        >
          {savingAction === "check" ? TEXT.checkingFolder : "Kiểm tra folder"}
        </button>
        <button
          type="button"
          className="min-h-[44px] rounded-[14px] bg-[#38BDF8] px-3 py-2 text-[13px] font-bold text-[#082F49] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          onClick={() => handleMediaAction("update")}
        >
          {savingAction === "update" ? TEXT.updatingMedia : "Cập nhật media"}
        </button>
      </div>

      {statusMessage ? <p className="text-[13px] font-medium text-[#86EFAC]">{statusMessage}</p> : null}
    </div>
  );
}
