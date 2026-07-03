export type UploadKind = "image" | "animation";

export type UploadFileLike = {
  type: string;
  size: number;
};

const TEXT = {
  imageOnly: "Ch\u1ec9 h\u1ed7 tr\u1ee3 file \u1ea3nh PNG, JPG ho\u1eb7c WEBP.",
  imageTooLarge: "\u1ea2nh t\u1ed1i \u0111a 5MB.",
  gifOnly: "GIF \u0111\u1ed9ng ch\u1ec9 nh\u1eadn file .gif.",
  gifTooLarge: "GIF t\u1ed1i \u0111a 20MB.",
};

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function getUploadPolicy(kind: UploadKind) {
  if (kind === "animation") {
    return {
      accept: "image/gif",
      maxBytes: 20 * 1024 * 1024,
      allowedTypes: ["image/gif"],
      typeError: TEXT.gifOnly,
      sizeError: TEXT.gifTooLarge,
    };
  }

  return {
    accept: "image/png,image/jpeg,image/webp",
    maxBytes: 5 * 1024 * 1024,
    allowedTypes: [...IMAGE_TYPES],
    typeError: TEXT.imageOnly,
    sizeError: TEXT.imageTooLarge,
  };
}

export function normalizeUploadKind(value: FormDataEntryValue | null): UploadKind {
  return value === "animation" ? "animation" : "image";
}

export function validateUploadFile(file: UploadFileLike, kind: UploadKind) {
  const policy = getUploadPolicy(kind);

  if (!policy.allowedTypes.includes(file.type)) {
    return { ok: false as const, error: policy.typeError };
  }

  if (file.size > policy.maxBytes) {
    return { ok: false as const, error: policy.sizeError };
  }

  return { ok: true as const };
}
