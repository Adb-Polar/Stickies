"use client";
import { useState, useRef } from "react";
import { CameraContext } from "../context/viewport-context";
import type { Camera } from "../types/types";

export function Viewport({ children }: { children: React.ReactNode }) {
  const [camera, setCamera] = useState<Camera>({
    x: 0,
    y: 0,
    zoom: 1,
  });

  const isPanning = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    isPanning.current = true;
    last.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return;

    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;

    setCamera((c) => ({
      ...c,
      x: c.x + dx,
      y: c.y + dy,
    }));

    last.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseUp = () => {
    isPanning.current = false;
  };

  const onWheel = (e: React.WheelEvent) => {
    // e.preventDefault();

    const zoomSpeed = 0.001;
    const nextZoom = Math.min(
      4,
      Math.max(0.2, camera.zoom - e.deltaY * zoomSpeed),
    );

    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    setCamera((c) => ({
      zoom: nextZoom,
      x: mx - (mx - c.x) * (nextZoom / c.zoom),
      y: my - (my - c.y) * (nextZoom / c.zoom),
    }));
  };

  return (
    <div
      className="
        fixed inset-0 overflow-hidden
        bg-neutral-100
        cursor-grab active:cursor-grabbing
        bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)]
        bg-size-[40px_40px]
      "
      style={{
        backgroundPosition: `${camera.x}px ${camera.y}px`,
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onWheel={onWheel}
    >
      <CameraContext.Provider value={camera} >{children}</CameraContext.Provider>
    </div>
  );
}
