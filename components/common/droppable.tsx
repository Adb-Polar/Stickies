"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import type { Note } from "../ui/draggable";
import StickyNote from "../ui/draggable";

export default function StickyCanvas() {
  const [notes, setNotes] = useState<Note[]>([
    {
      id: "note-1",
      x: 100,
      y: 400,
      textContent: "Drag me anywhere ✨",
    },
    {
      id: "note-2",
      x: 100,
      y: 100,
      textContent: "Drag me anywhere ✨",
    },
    {
      id: "note-3",
      x: 300,
      y: 100,
      textContent: "Drag me anywhere ✨",
    },
    {
      id: "note-4",
      x: 150,
      y: 100,
      textContent: "Drag me anywhere ✨",
    },
    {
      id: "note-5",
      x: 100,
      y: 100,
      textContent: "Drag me anywhere ✨",
    },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { delta, active } = event;

    setNotes((prev) =>
      prev.map((note) =>
        note.id === active.id
          ? {
              ...note,
              x: note.x + delta.x,
              y: note.y + delta.y,
              // z: 0, so  notes will stay on top even after dragging
            }
          : note,
      ),
    );
  };

  const [topZ, setTopZ] = useState(2);

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;

    setTopZ((prev) => {
          const next = prev + 1;

          setNotes((notes) =>
            notes.map((n) =>
              n.id === id ? { ...n, z: next } : n
            )
          );

          return next;
        });

  };

  return (
    <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart} sensors={sensors}>
      <div className="relative w-full h-screen bg-neutral-100 overflow-hidden">
        {notes.map((note) => (
          <StickyNote key={note.id} {...note} />
        ))}
      </div>
    </DndContext>
  );
}
