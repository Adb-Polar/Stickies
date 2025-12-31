'use client';

import { Stage, Layer, Rect, Text } from 'react-konva';
import { useState, useRef, useEffect } from 'react';

export function KonvaCanvas() {
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        setStageSize({
          width: containerWidth,
          height: containerHeight,
        });
      }
    }

    updateSize();
    window.addEventListener('resize', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full bg-gray-50">
      {stageSize.width > 0 && stageSize.height > 0 && (
        <Stage width={stageSize.width} height={stageSize.height}>
          <Layer>
            <Rect
              x={50}
              y={50}
              width={200}
              height={200}
              fill="#fef3c7"
              stroke="#fbbf24"
              strokeWidth={2}
              draggable
            />
            <Text
              x={60}
              y={60}
              text="Welcome to Stickies!"
              fontSize={16}
              fontFamily="Arial"
              fill="#1f2937"
            />
          </Layer>
        </Stage>
      )}
    </div>
  );
}

