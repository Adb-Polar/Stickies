"use client"
//Do i need to explain these imports??
import { useContext, useRef, useState } from "react";
import { Coordinates, Note } from "../types/types";
import { CameraContext } from "../context/viewport-context";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";

import StickyNote from "../ui/draggable";

// Map interface for Notes
// Use map to easily find the dragged note using its id(key) this prevent loop when
// coz we dont need to use .find() (absolute optimization)
interface CanvasState {
  [key: string]: Note;
}

//Inifinite Canvas component this is
// *viewport not included i made a seperate component for the viewport
export default function Canvas() {
  // all Notes is store here will trigger rerender when updated using setNotes()
  // We prolly need to fix the Note type
  const [notes, setNotes] = useState<CanvasState>({
    // *Placeholder notes
    "obj-1": {
      id: "obj-1",
      x: 100,
      y: 100,
      z: 0,
      textContent: "Hello Note",
    },
    "obj-2": {
      id: "obj-2",
      x: 100,
      y: 100,
      z: 0,
      textContent: "Hello Note",
    },
  });

  // useContex basically were using the CameraContext from /context/viewport-context
  // we store all the camera information to that object so we can access it anywhere
  // just use it like this
  // this is reactive so no need to use useState
  const camera = useContext(CameraContext);

  // we need to track the note Coordinates before being dragged
  // idrk how the calculation works but it works
  // PLS DONT TOUCH MATH STUFF IDK HOW TO FIX TS
  const initialNotePosition = useRef<Coordinates | null>(
    null,
  );

  // This will trigger once when you start dragging
  // will save the start Coordinates of the note
  const handleDragStart = ({ active }: DragStartEvent) => {
    const currentNote = notes[active.id];
    // safety case
    if (!currentNote) return;

    initialNotePosition.current = {
      x: currentNote.x,
      y: currentNote.y,
    };
  };

  //will calculate location when you stop dragging
  // idk math stuff blablabla
  const handleDragEnd = ({
    active,
    delta,
  }: DragEndEvent) => {
    const currentNote = notes[active.id];

    if (!currentNote || !initialNotePosition.current) {
      initialNotePosition.current = null;
      return;
    }

    const wordlDeltaX = delta.x / camera.zoom;
    const wordlDeltaY = delta.y / camera.zoom;

    const newX =
      initialNotePosition.current.x + wordlDeltaX;
    const newY =
      initialNotePosition.current.y + wordlDeltaY;

    setNotes((prev) => ({
      ...prev,
      [active.id]: { ...prev[active.id], x: newX, y: newY },
    }));

    initialNotePosition.current = null;
  };

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/*just a loop to render all notes while passing all the noteData*/}
      {Object.values(notes).map((note) => (
        //dragable here
        <StickyNote
          key={note.id}
          noteData={note}
          cameraData={camera}
        />
      ))}
    </DndContext>
  );
}
