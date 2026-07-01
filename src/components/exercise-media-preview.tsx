"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { getExerciseMediaViewerTarget, type ExerciseMedia } from "@/lib/exercise-media";

const TEXT = {
  image: "\u1ea2nh",
  viewImagePrefix: "Xem \u1ea3nh",
  close: "\u0110\u00f3ng",
};

type ExerciseMediaPreviewProps = {
  media: ExerciseMedia;
  alt: string;
  width: number;
  height: number;
  imageClassName: string;
  placeholderClassName: string;
  placeholderLabel?: string;
  buttonClassName?: string;
  sizes?: string;
  priority?: boolean;
};

export function ExerciseMediaPreview({
  media,
  alt,
  width,
  height,
  imageClassName,
  placeholderClassName,
  placeholderLabel = TEXT.image,
  buttonClassName = "block shrink-0 rounded-[14px]",
  sizes,
  priority = false,
}: ExerciseMediaPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const viewerTarget = getExerciseMediaViewerTarget(media, alt);

  if (!viewerTarget) {
    return <div className={placeholderClassName}>{placeholderLabel}</div>;
  }

  return (
    <>
      <button
        type="button"
        className={`${buttonClassName} overflow-hidden p-0 text-left outline-none ring-offset-2 ring-offset-[#0B0F14] transition active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#38BDF8]`}
        aria-label={`${TEXT.viewImagePrefix} ${alt}`}
        onClick={() => setIsOpen(true)}
      >
        <Image
          src={viewerTarget.src}
          alt={viewerTarget.alt}
          width={width}
          height={height}
          className={imageClassName}
          sizes={sizes}
          priority={priority}
          unoptimized={viewerTarget.kind === "animation"}
        />
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 px-3 py-[calc(16px+env(safe-area-inset-top))]"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-[760px] overflow-hidden rounded-[18px] border border-[#374151] bg-[#0B0F14] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex min-w-0 items-center gap-3 border-b border-[#263241] px-3 py-3">
              <h2 id={titleId} className="min-w-0 flex-1 break-words text-[17px] font-bold leading-5 text-[#F9FAFB]">
                {alt}
              </h2>
              <button
                type="button"
                className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-[#374151] bg-[#111827] px-3 text-[15px] font-bold text-[#F9FAFB]"
                onClick={() => setIsOpen(false)}
              >
                {TEXT.close}
              </button>
            </div>
            <div className="relative aspect-[4/3] max-h-[74dvh] w-full min-w-0 bg-black">
              <Image
                src={viewerTarget.src}
                alt={viewerTarget.alt}
                fill
                className="object-contain"
                sizes="100vw"
                unoptimized={viewerTarget.kind === "animation"}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
