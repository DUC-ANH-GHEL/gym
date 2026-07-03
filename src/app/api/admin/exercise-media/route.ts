import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminIdentifier } from "@/lib/admin-config";
import { getSessionUserId } from "@/lib/auth";
import { cloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";
import { isAllowedExerciseAnimationUrl } from "@/lib/exercise-media";
import {
  buildFreeExerciseDbImageUrl,
  isAllowedDatasetFolderName,
  normalizeDatasetFolderName,
} from "@/lib/exercise-media-admin";
import { prisma } from "@/lib/prisma";

type MediaAction = "check" | "update" | "manual-update";

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
    return { error: NextResponse.json({ error: "Vui l\u00f2ng \u0111\u0103ng nh\u1eadp." }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user || !isAdminIdentifier(user.email)) {
    return { error: NextResponse.json({ error: "T\u00e0i kho\u1ea3n hi\u1ec7n t\u1ea1i kh\u00f4ng c\u00f3 quy\u1ec1n admin." }, { status: 403 }) };
  }

  return { user };
}

async function imageExists(url: string) {
  const response = await fetch(url, { method: "HEAD", cache: "no-store" });
  return response.ok && response.headers.get("content-type")?.startsWith("image/");
}

function isAllowedCatalogImageUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith("/")) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" && parsed.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
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

function revalidateMediaPaths() {
  revalidatePath("/admin/exercise-media");
  revalidatePath("/admin/exercises");
  revalidatePath("/exercises");
  revalidatePath("/schedule");
  revalidatePath("/today");
}

export async function POST(request: Request) {
  const admin = await requireAdminJson();
  if ("error" in admin) {
    return admin.error;
  }

  if (!isSameOriginPost(request)) {
    return NextResponse.json({ error: "Ngu\u1ed3n y\u00eau c\u1ea7u kh\u00f4ng h\u1ee3p l\u1ec7." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    slug?: unknown;
    folderName?: unknown;
    mediaKind?: unknown;
    mediaUrl?: unknown;
    action?: unknown;
  } | null;

  const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  const folderName = normalizeDatasetFolderName(typeof body?.folderName === "string" ? body.folderName : "");
  const action: MediaAction = body?.action === "manual-update" ? "manual-update" : body?.action === "update" ? "update" : "check";

  if (!slug) {
    return NextResponse.json({ error: "Thi\u1ebfu slug b\u00e0i t\u1eadp." }, { status: 400 });
  }

  const item = await prisma.exerciseCatalogItem.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });

  if (!item) {
    return NextResponse.json({ error: "Kh\u00f4ng t\u00ecm th\u1ea5y b\u00e0i t\u1eadp theo slug n\u00e0y." }, { status: 404 });
  }

  if (action === "manual-update") {
    const mediaKind = body?.mediaKind === "animation" ? "animation" : body?.mediaKind === "image" ? "image" : null;
    const mediaUrl = typeof body?.mediaUrl === "string" ? body.mediaUrl.trim() : "";

    if (!mediaKind || !mediaUrl) {
      return NextResponse.json({ error: "Thi\u1ebfu lo\u1ea1i media ho\u1eb7c link media." }, { status: 400 });
    }

    const isAllowedUrl = mediaKind === "animation" ? isAllowedExerciseAnimationUrl(mediaUrl) : isAllowedCatalogImageUrl(mediaUrl);
    if (!isAllowedUrl) {
      return NextResponse.json({ error: "Ch\u1ec9 nh\u1eadn link Cloudinary ho\u1eb7c \u0111\u01b0\u1eddng d\u1eabn n\u1ed9i b\u1ed9." }, { status: 400 });
    }

    const updated = await prisma.exerciseCatalogItem.update({
      where: { id: item.id },
      data: mediaKind === "animation" ? { animationUrl: mediaUrl } : { imageUrl: mediaUrl },
      select: {
        imageUrl: true,
        animationUrl: true,
        updatedAt: true,
      },
    });

    revalidateMediaPaths();

    return NextResponse.json(
      {
        ok: true,
        message: mediaKind === "animation" ? "\u0110\u00e3 c\u1eadp nh\u1eadt GIF cho b\u00e0i t\u1eadp." : "\u0110\u00e3 c\u1eadp nh\u1eadt \u1ea3nh cho b\u00e0i t\u1eadp.",
        imageUrl: updated.imageUrl,
        animationUrl: updated.animationUrl,
        updatedAt: updated.updatedAt,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!folderName || !isAllowedDatasetFolderName(folderName)) {
    return NextResponse.json({ error: "Nh\u1eadp \u0111\u00fang slug v\u00e0 t\u00ean folder trong dataset." }, { status: 400 });
  }

  const imageUrls = [buildFreeExerciseDbImageUrl(folderName, 0), buildFreeExerciseDbImageUrl(folderName, 1)];
  const checks = await Promise.all(imageUrls.map((url) => imageExists(url)));

  if (checks.some((ok) => !ok)) {
    return NextResponse.json(
      {
        error: "Kh\u00f4ng t\u00ecm th\u1ea5y \u0111\u1ee7 \u1ea3nh 0.jpg v\u00e0 1.jpg trong folder n\u00e0y.",
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
        message: "Folder h\u1ee3p l\u1ec7. \u0110\u00e3 t\u00ecm th\u1ea5y 0.jpg v\u00e0 1.jpg.",
        folderName,
        imageUrls,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: "Ch\u01b0a c\u1ea5u h\u00ecnh Cloudinary." }, { status: 503 });
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

  revalidateMediaPaths();

  return NextResponse.json(
    {
      ok: true,
      message: "\u0110\u00e3 c\u1eadp nh\u1eadt media cho b\u00e0i t\u1eadp.",
      folderName,
      imageUrl: updated.imageUrl,
      animationUrl: updated.animationUrl,
      updatedAt: updated.updatedAt,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
