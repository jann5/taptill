"use client";

import Image from "next/image";
import { useRef } from "react";

type ImagePositionPickerProps = {
  active: boolean;
  imageDataUrl: string;
  onChange: (x: number, y: number) => void;
  positionX: number;
  positionY: number;
  sizes: string;
};

export function ImagePositionPicker({
  active,
  imageDataUrl,
  onChange,
  positionX,
  positionY,
  sizes,
}: ImagePositionPickerProps) {
  const draggingRef = useRef(false);

  const updatePosition = (
    clientX: number,
    clientY: number,
    element: HTMLDivElement,
  ) => {
    const rect = element.getBoundingClientRect();
    const nextX = clampPercent(((clientX - rect.left) / rect.width) * 100);
    const nextY = clampPercent(((clientY - rect.top) / rect.height) * 100);

    onChange(nextX, nextY);
  };

  return (
    <div
      className={`relative h-[188px] w-full overflow-hidden rounded-[22px] bg-slate-50 ${
        active ? "cursor-grab active:cursor-grabbing" : ""
      }`}
      style={{ touchAction: active ? "none" : "auto" }}
      onPointerDown={(event) => {
        if (!active) {
          return;
        }

        draggingRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        updatePosition(event.clientX, event.clientY, event.currentTarget);
      }}
      onPointerMove={(event) => {
        if (!active || !draggingRef.current) {
          return;
        }

        updatePosition(event.clientX, event.clientY, event.currentTarget);
      }}
      onPointerUp={(event) => {
        if (!active) {
          return;
        }

        draggingRef.current = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
      }}
    >
      <Image
        src={imageDataUrl}
        alt=""
        fill
        unoptimized
        sizes={sizes}
        className="object-cover"
        style={{ objectPosition: `${positionX}% ${positionY}%` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.04)_0%,rgba(15,23,42,0.10)_100%)]" />
      <div
        className={`pointer-events-none absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/90 bg-white/20 shadow-[0_8px_24px_rgba(15,23,42,0.18)] backdrop-blur-[2px] transition ${
          active ? "opacity-100" : "opacity-72"
        }`}
        style={{ left: `${positionX}%`, top: `${positionY}%` }}
      >
        <span className="absolute left-1/2 top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-white" />
        <span className="absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 bg-white" />
      </div>
    </div>
  );
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
