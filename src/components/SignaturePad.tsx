"use client";

import { useEffect, useRef } from "react";
import SigPad from "signature_pad";

export type SignaturePadHandle = {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: () => string;
};

type Props = {
  onChange?: (dataUrl: string | null) => void;
};

export default function SignaturePad({ onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SigPad | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const data = padRef.current?.toData();
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);
      padRef.current?.clear();
      if (data) padRef.current?.fromData(data);
    };

    const pad = new SigPad(canvas, {
      backgroundColor: "rgba(255,255,255,0)",
      penColor: "#111827",
      minWidth: 0.7,
      maxWidth: 2.2,
    });
    padRef.current = pad;

    pad.addEventListener("endStroke", () => {
      onChange?.(pad.isEmpty() ? null : pad.toDataURL("image/png"));
    });

    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      pad.off();
      padRef.current = null;
    };
  }, [onChange]);

  const clear = () => {
    padRef.current?.clear();
    onChange?.(null);
  };

  return (
    <div>
      <div className="rounded-md border border-stone-300 bg-white">
        <canvas
          ref={canvasRef}
          className="block h-40 w-full touch-none"
          aria-label="Signature pad"
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-stone-500">
        <span>Sign above using mouse, trackpad, or touchscreen.</span>
        <button type="button" className="underline" onClick={clear}>
          Clear
        </button>
      </div>
    </div>
  );
}
