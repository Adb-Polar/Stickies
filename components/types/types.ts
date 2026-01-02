export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface Coordinates {
  x: number;
  y: number;
}

export interface Note {
  id: string;
  x: number;
  y: number;
  z: number;
  textContent: string;
}
