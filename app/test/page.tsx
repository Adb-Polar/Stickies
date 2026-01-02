"use client"
import React, { useState, useRef } from 'react';
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragMoveEvent,
  DragEndEvent,
  pointerWithin,
  useDraggable, // <-- Added useDraggable import
} from '@dnd-kit/core';


// 1. Define your data types
interface Coordinates {
  x: number;
  y: number;
}

interface CanvasObject {
  id: string;
  x: number;
  y: number;
  // Add other properties (width, height, type, etc.)
}

interface CanvasState {
  [key: string]: CanvasObject;
}

export default function CanvasComponent() {
  // 2. Setup State for the World (Scale/Pan) and Objects
  const [objects, setObjects] = useState<CanvasState>({
    'obj-1': { id: 'obj-1', x: 100, y: 100 },
  });

  // These might come from a parent component or a zoom/pan hook
  const [scale] = useState<number>(1);
  const [pan] = useState<Coordinates>({ x: 0, y: 0 });

  // Ref for tracking the initial position of the object being dragged
  // This helps calculate the final position accurately based on total drag distance.
  const initialObjectPosition = useRef<Coordinates | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 20 } })
  );

  // 4. Helper: Convert Screen Coordinates (Pixels) to World Coordinates (Units)
  const screenToWorld = (screenX: number, screenY: number): Coordinates => {
    return {
      x: (screenX - pan.x) / scale,
      y: (screenY - pan.y) / scale,
    };
  };

  // 5. Drag Handlers
  const handleDragStart = ({ active }: DragStartEvent) => {
    const currentObj = objects[active.id];
    if (!currentObj) return;

    // Store the initial world position of the object when the drag starts.
    // This is crucial for calculating the final position based on the total delta.
    initialObjectPosition.current = { x: currentObj.x, y: currentObj.y };
  };

  // IMPORTANT: We are intentionally NOT updating state in handleDragMove.
  // The visual movement during drag is handled by useDraggable's 'transform' prop
  // in the DraggableBox component. This prevents conflicts and "drift" caused by
  // frequent state updates during an active drag.
  const handleDragMove = (event: DragMoveEvent) => {
    // You could use this for non-state-updating actions,
    // like showing snap indicators, collision feedback, etc.
  };

  const handleDragEnd = ({ active, delta }: DragEndEvent) => {
    const currentObj = objects[active.id];

    if (!currentObj || !initialObjectPosition.current) {
        // If for some reason initial position wasn't set, or object is gone.
        initialObjectPosition.current = null;
        return;
    }

    // Convert the total screen pixel delta (movement from start of drag) to world units.
    const worldDeltaX = delta.x / scale;
    const worldDeltaY = delta.y / scale;

    // Calculate the new world position by adding the total world delta
    // to the object's position at the start of the drag.
    const newX = initialObjectPosition.current.x + worldDeltaX;
    const newY = initialObjectPosition.current.y + worldDeltaY;

    // Update React state immutably with the final position.
    setObjects((prev) => ({
      ...prev,
      [active.id]: {
        ...prev[active.id],
        x: newX,
        y: newY,
      },
    }));

    // Reset the ref for the next drag operation.
    initialObjectPosition.current = null;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove} // HandleMove is present but doesn't update state.
      onDragEnd={handleDragEnd}
    >
      <div
        style={{
            position: 'relative',
            width: '100%',
            height: '500px',
            overflow: 'hidden',
            border: '1px solid #ccc',
            // Prevent unwanted scroll/zoom on touch devices within the canvas area.
            touchAction: 'none',
        }}
      >
        {/* Render DraggableBox components, which now use useDraggable */}
        {Object.values(objects).map((obj) => (
          <DraggableBox
            key={obj.id}
            id={obj.id}
            x={obj.x}
            y={obj.y}
            scale={scale}
            pan={pan}
          />
        ))}
      </div>
    </DndContext>
  );
}

// DraggableBox component, now fully integrated with useDraggable
const DraggableBox = ({ id, x, y, scale, pan }: { id: string, x: number, y: number, scale: number, pan: Coordinates }) => {
    // Use the useDraggable hook to make this element draggable.
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: id,
    });

    // Calculate the visual position of the box during drag.
    // 1. `x` and `y` are the object's world coordinates from the component's state.
    // 2. `pan` and `scale` convert these world coordinates to a base screen position.
    // 3. `transform` from `useDraggable` provides the real-time visual offset (delta)
    //    in screen pixels during the drag. This is added on top of the base screen position.
    const finalScreenX = (x * scale + pan.x) + (transform ? transform.x : 0);
    const finalScreenY = (y * scale + pan.y) + (transform ? transform.y : 0);

    const style: React.CSSProperties = {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        backgroundColor: 'royalblue',
        // Apply the combined transformation via CSS.
        // The `scale` here also scales the element itself visually.
        transform: `translate3d(${finalScreenX}px, ${finalScreenY}px, 0) scale(${scale})`,
        cursor: 'grab',
        // Crucial: `touchAction: 'none'` on the draggable element itself prevents
        // browser default scrolling/zooming gestures on touch devices during drag.
        touchAction: 'none',
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            {id}
        </div>
    );
};
