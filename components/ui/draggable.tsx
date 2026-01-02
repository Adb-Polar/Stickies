"use client";
import { useDraggable } from "@dnd-kit/core";
import type { Note, Camera } from "../types/types";

// interface so we can easily pass NoteProps
// typescript stuff dont worry abt this
interface NoteProps {
  noteData: Note;
  cameraData: Camera;
}

// StickyNote component
// noteData for note coordinates
// cameraData for scaling and relative positioning
export default function StickyNote({
  noteData,
  cameraData,
}: NoteProps) {
  // Dnd-kit things we need ts i js dk why
  const { attributes, listeners, setNodeRef, transform } =
    useDraggable({
      id: noteData.id,
    });

  // relative position calculations
  // yeah math stuff fuck ts
  const finalScreenX =
    noteData.x * cameraData.zoom +
    cameraData.x +
    (transform ? transform.x : 0);
  const finalScreenY =
    noteData.y * cameraData.zoom +
    cameraData.y +
    (transform ? transform.y : 0);

  // this is just CSSProperties
  // set the location of the note on the canvas
  const style: React.CSSProperties = {
    left: 0,
    top: 0,
    transform: `translate3d(${finalScreenX}px, ${finalScreenY}px, 0) scale(${cameraData.zoom})`,
    touchAction: "none",
  };

  return (
    // the actual note is inside the div coz for some reason rotate css property breaks the position
    <div
      className={`absolute`}
      ref={setNodeRef}
      style={style}
      {...listeners}      {...attributes}
    >
      {/*we need to add dynamic width make some width and height variable im too lazy to do ts*/}
      <div className="-rotate-2 w-[100px] h-[100px] border-text/60 bg-maroon shadow-lg border">
        <div className="h-3 bg-maroon-dark border-b border-text/50"></div>
        <p className="pt-1 px-2 text-[12px]">
          {noteData.textContent}
        </p>
      </div>
    </div>
  );
}
