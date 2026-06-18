"use client";

import Image from "next/image";
import { useState, type ChangeEvent } from "react";
import { AppInput } from "@/components/ui";

export function ImageUpload({ defaultValue }: { defaultValue?: string | null }) {
  const [imageUrl, setImageUrl] = useState(defaultValue || "");
  const [status, setStatus] = useState<string | null>(null);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatus("Chỉ hỗ trợ file ảnh.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatus("Ảnh tối đa 5MB.");
      return;
    }

    setStatus("Đang tải ảnh...");
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const result = (await response.json()) as { secure_url?: string; error?: string };
    if (!response.ok || !result.secure_url) {
      setStatus(result.error || "Không tải được ảnh.");
      return;
    }

    setImageUrl(result.secure_url);
    setStatus("Ảnh đã sẵn sàng.");
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="imageUrl" value={imageUrl} />
      <AppInput type="file" accept="image/*" onChange={handleUpload} />
      {imageUrl ? <Image src={imageUrl} alt="Ảnh bài tập" width={640} height={320} className="h-40 w-full rounded-[14px] object-cover" /> : null}
      {status ? <p className="text-[13px] font-semibold text-[#9CA3AF]">{status}</p> : null}
      {!imageUrl ? <p className="text-[13px] text-[#9CA3AF]">Ảnh sẽ được lưu lên Cloudinary khi cấu hình sẵn sàng.</p> : null}
    </div>
  );
}
