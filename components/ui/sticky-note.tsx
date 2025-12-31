"use client";
import React, { useState, useEffect } from "react";

const StickyNote = ({ color = "bg-teal-500", initialText = "" }) => {
  let clientX = 0;
  let clientY = 0;
  const [text, setText] = useState(initialText);

  useEffect(() => {
    const handleDrag = (e) => {
      e.preventDefault();
    };

    const handleDrop = (e) => {
      clientX = e.clientX;
      clientY = e.clientY;
    };

    document.addEventListener("drag", handleDrag);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("drag", handleDrag);
      document.removeEventListener("drop", handleDrop);
    };
  }, []);

  return (
    <div
      className={` shadow-xl rotate-3 relative w-64 h-64 p-4 transform border-t-28 border-t-teal-600 hover:scale-102 transition-all duration-100 ease-in ${color}`}
      draggable
      onDrag={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        clientX = e.clientX;
        clientY = e.clientY;
      }}
    >
      <textarea
        className={`text-2xl w-full h-full bg-transparent resize-none border-none focus:ring-0 text-gray-800 font-handwriting leading-tight placeholder-gray-500/50`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a note..."
      />
    </div>
  );
};

export default StickyNote;
