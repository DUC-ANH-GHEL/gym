"use client";

import { useState, type ChangeEvent } from "react";
import { ExerciseMediaPreview } from "@/components/exercise-media-preview";
import { getUploadPolicy, type UploadKind, validateUploadFile } from "@/lib/media-upload-policy";

const TEXT = {
  imageLabel: "\u1ea2nh thumbnail",
  animationLabel: "GIF \u0111\u1ed9ng",
  imageHelp: "\u1ea2nh s\u1ebd \u0111\u01b0\u1ee3c l\u01b0u l\u00ean Cloudinary.",
  animationHelp: "Ch\u1ecdn file .gif \u0111\u1ec3 l\u00e0m h\u01b0\u1edbng d\u1eabn \u0111\u1ed9ng cho b\u00e0i t\u1eadp.",
  uploadingImage: "\u0110ang t\u1ea3i \u1ea3nh...",
  uploadingGif: "\u0110ang t\u1ea3i GIF...",
  imageReady: "\u1ea2nh \u0111\u00e3 s\u1eb5n s\u00e0ng.",
  gifReady: "GIF \u0111\u00e3 s\u1eb5n s\u00e0ng.",
  uploadFailed: "Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c file.",
  chooseImage: "Ch\u1ecdn \u1ea3nh",
  chooseGif: "Ch\u1ecdn GIF",
};

export function ImageUpload({
  defaultValue,
  kind = "image",
  name = "imageUrl",
  label,
}: {
  defaultValue?: string | null;
  kind?: UploadKind;
  name?: string;
  label?: string;
}) {
  const [mediaUrl, setMediaUrl] = useState(defaultValue || "");
  const [status, setStatus] = useState<string | null>(null);
  const policy = getUploadPolicy(kind);
  const displayLabel = label || (kind === "animation" ? TEXT.animationLabel : TEXT.imageLabel);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const validation = validateUploadFile(file, kind);
    if (!validation.ok) {
      setStatus(validation.error);
      event.target.value = "";
      return;
    }

    setStatus(kind === "animation" ? TEXT.uploadingGif : TEXT.uploadingImage);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const result = (await response.json()) as { secure_url?: string; error?: string };
    if (!response.ok || !result.secure_url) {
      setStatus(result.error || TEXT.uploadFailed);
      event.target.value = "";
      return;
    }

    setMediaUrl(result.secure_url);
    setStatus(kind === "animation" ? TEXT.gifReady : TEXT.imageReady);
    event.target.value = "";
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={mediaUrl} />
      <label className="block space-y-2">
        <span className="text-[13px] font-bold text-[#D1D5DB]">{displayLabel}</span>
        <input type="file" accept={policy.accept} onChange={handleUpload} className="sr-only" />
        <span className="flex min-h-[48px] w-full cursor-pointer items-center justify-center rounded-[12px] border border-[#38BDF8]/45 bg-[#082F49] px-3 text-[15px] font-black text-[#7DD3FC]">
          {kind === "animation" ? TEXT.chooseGif : TEXT.chooseImage}
        </span>
      </label>
      {mediaUrl ? (
        <ExerciseMediaPreview
          media={{ src: mediaUrl, kind: kind === "animation" ? "animation" : "image", isPlaceholder: false }}
          alt={displayLabel}
          width={640}
          height={320}
          imageClassName="h-40 w-full rounded-[14px] object-cover"
          placeholderClassName="hidden"
          buttonClassName="block w-full rounded-[14px]"
          sizes="(max-width: 640px) 100vw, 640px"
        />
      ) : null}
      {status ? <p className="text-[13px] font-semibold text-[#9CA3AF]">{status}</p> : null}
      {!mediaUrl ? <p className="text-[13px] text-[#9CA3AF]">{kind === "animation" ? TEXT.animationHelp : TEXT.imageHelp}</p> : null}
    </div>
  );
}
