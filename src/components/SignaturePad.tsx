import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

/**
 * A canvas the signer can draw their signature on (mouse or touch).
 * Calls `onChange` with a PNG data URL, or "" when cleared.
 */
export function SignaturePad({
  onChange,
  height = 180,
}: {
  onChange: (dataUrl: string) => void;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  // Size the canvas to its container (accounting for device pixel ratio).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111827";
    }
  }, [height]);

  function pos(e: PointerEvent | React.PointerEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent) {
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }

  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !last.current) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasInk) setHasInk(true);
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasInk(false);
    onChange("");
  }

  return (
    <div>
      <div className="relative rounded-lg border border-gray-300 bg-white">
        <canvas
          ref={canvasRef}
          style={{ height, width: "100%", touchAction: "none" }}
          className="rounded-lg"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        {!hasInk && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-300">
            Sign here
          </span>
        )}
      </div>
      <div className="mt-1 flex justify-end">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
          onClick={clear}
        >
          <Eraser size={13} /> Clear
        </button>
      </div>
    </div>
  );
}
