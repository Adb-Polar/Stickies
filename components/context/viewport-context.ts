import { createContext } from "react";
import type { Camera } from "../types/types";

export const CameraContext = createContext<Camera>({ x: 0, y: 0, zoom: 1 });
