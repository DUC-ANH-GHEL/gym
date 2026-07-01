import { NextResponse } from "next/server";
import { isAdminIdentifier } from "@/lib/admin-config";
import { getSessionUserId } from "@/lib/auth";
import { cloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";
import {
  buildFreeExerciseDbImageUrl,
  isAllowedDatasetFolderName,
  normalizeDatasetFolderName,
} from "@/lib/exercise-media-admin";
import { prisma } from "@/lib/prisma";

type MediaAction = "check" | "update";
type CloudinaryUploadResult = {
  secure_url?: string;
};

function isSameOriginPost(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    return false;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function requireAdminJson() {
  const userId = await getSessionUserId();
  if (!userId) {
    return { error: NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user || !isAdminIdentifier(user.email)) {
    return { error: NextResponse.json({ error: "Tài khoản hiện tại không có quyền admin." }, { status: 403 }) };
  }

  return { user };
}

async function imageExists(url: string) {
  const response = await fetch(url, { method: "HEAD", cache: "no-store" });
  return response.ok && response.headers.get("content-type")?.startsWith("image/");
}

function cloudinaryPublicId(slug: string, kind: "image" | "gif" | "frame0" | "frame1") {
  if (kind === "gif") {
    return `gym/exercises/gifs/${slug}`;
  }

  if (kind === "frame0" || kind === "frame1") {
    return `gym/exercises/frames/${slug}-${kind === "frame0" ? "0" : "1"}`;
  }

  return `gym/exercises/${slug}`;
}

async function uploadExerciseMedia(slug: string, imageUrls: string[]) {
  const tag = `gym-exercise-${slug}-frames`;
  const imageUpload = (await cloudinary.uploader.upload(imageUrls[0], {
    public_id: cloudinaryPublicId(slug, "image"),
    overwrite: true,
    invalidate: true,
    resource_type: "image",
    format: "webp",
  })) as CloudinaryUploadResult;

  await Promise.all(
    imageUrls.slice(0, 2).map((url, index) =>
      cloudinary.uploader.upload(url, {
        public_id: cloudinaryPublicId(slug, index === 0 ? "frame0" : "frame1"),
        overwrite: true,
        invalidate: true,
        resource_type: "image",
        tags: [tag],
      }),
    ),
  );

  const gifUpload = (await cloudinary.uploader.multi(tag, { format: "gif" })) as CloudinaryUploadResult;

  if (!imageUpload.secure_url || !gifUpload.secure_url) {
    throw new Error("Cloudinary upload did not return secure URLs");
  }

  return {
    imageUrl: imageUpload.secure_url,
    animationUrl: gifUpload.secure_url,
  };
}

export async function POST(request: Request) {
  const admin = await requireAdminJson();
  if ("error" in admin) {
    return admin.error;
  }

  if (!isSameOriginPost(request)) {
    return NextResponse.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    slug?: unknown;
    folderName?: unknown;
    action?: unknown;
  } | null;

  const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  const folderName = normalizeDatasetFolderName(typeof body?.folderName === "string" ? body.folderName : "");
  const action: MediaAction = body?.action === "update" ? "update" : "check";

  if (!slug || !folderName || !isAllowedDatasetFolderName(folderName)) {
    return NextResponse.json({ error: "Nhập đúng slug và tên folder trong dataset." }, { status: 400 });
  }

  const item = await prisma.exerciseCatalogItem.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });

  if (!item) {
    return NextResponse.json({ error: "Không tìm thấy bài tập theo slug này." }, { status: 404 });
  }

  const imageUrls = [buildFreeExerciseDbImageUrl(folderName, 0), buildFreeExerciseDbImageUrl(folderName, 1)];
  const checks = await Promise.all(imageUrls.map((url) => imageExists(url)));

  if (checks.some((ok) => !ok)) {
    return NextResponse.json(
      {
        error: "Không tìm thấy đủ ảnh 0.jpg và 1.jpg trong folder này.",
        folderName,
        imageUrls,
      },
      { status: 404 },
    );
  }

  if (action === "check") {
    return NextResponse.json(
      {
        ok: true,
        message: "Folder hợp lệ. Đã tìm thấy 0.jpg và 1.jpg.",
        folderName,
        imageUrls,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: "Chưa cấu hình Cloudinary." }, { status: 503 });
  }

  const uploaded = await uploadExerciseMedia(slug, imageUrls);
  const updated = await prisma.exerciseCatalogItem.update({
    where: { id: item.id },
    data: uploaded,
    select: {
      imageUrl: true,
      animationUrl: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      message: "Đã cập nhật media cho bài tập.",
      folderName,
      imageUrl: updated.imageUrl,
      animationUrl: updated.animationUrl,
      updatedAt: updated.updatedAt,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
