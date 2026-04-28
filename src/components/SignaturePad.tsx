"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SignaturePadLib from "signature_pad";

type Props = {
  onChange: (dataUrl: string | null) => void;
};

export default function SignaturePad({ onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const [empty, setEmpty] = useState(true);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext("2d");
    ctx?.scale(ratio, ratio);
    padRef.current?.clear();
    setEmpty(true);
    onChange(null);
  }, [onChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext("2d");
    ctx?.scale(ratio, ratio);

    const pad = new SignaturePadLib(canvas, {
      penColor: "rgb(15, 23, 42)",
      backgroundColor: "rgb(255, 255, 255)",
      minWidth: 0.7,
      maxWidth: 2.2,
    });
    padRef.current = pad;

    const handleEnd = () => {
      const isEmpty = pad.isEmpty();
      setEmpty(isEmpty);
      onChange(isEmpty ? null : pad.toDataURL("image/png"));
    };
    pad.addEventListener("endStroke", handleEnd);

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    return () => {
      pad.removeEventListener("endStroke", handleEnd);
      pad.off();
      window.removeEventListener("resize", onResize);
    };
  }, [onChange, resize]);

  function clear() {
    padRef.current?.clear();
    setEmpty(true);
    onChange(null);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="w-full h-44 rounded-lg border border-stone-300 bg-white touch-none"
      />
      <div className="mt-2 flex justify-between items-center">
        <p className="text-xs text-stone-500">
          {empty ? "Sign with your mouse, finger, or stylus." : "Looks good."}
        </p>
        <button
          type="button"
          onClick={clear}
          className="text-sm text-stone-600 underline"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
