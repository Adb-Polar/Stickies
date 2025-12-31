import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

export interface Note {
  id: string;
  x: number;
  y: number;
  z: number;
  textContent: string;
}

export default function StickyNote(noteProps: Note) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: noteProps.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    left: noteProps.x,
    top: noteProps.y,
    zIndex: noteProps.z
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="absolute rotate-3 w-30 h-30 bg-maroon border-[0.5px] border-text/50 shadow-lg cursor-grab active:cursor-grabbing"
      style={style}
    >
      <div className="w-full h-5 bg-maroon-dark border-b-[0.5px] border-text/50"></div>
      <p className="px-2 pt-1">{noteProps.textContent}</p>
    </div>
  );
}
