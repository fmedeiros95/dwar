export type MapSettings = {
  width: number;
  height: number;
  minimapSize: number;
  contextMenu: boolean;
  popup: boolean;
};
export const defaultMapSettings: MapSettings = {
  width: 13,
  height: 9,
  minimapSize: 50,
  contextMenu: true,
  popup: true,
};
