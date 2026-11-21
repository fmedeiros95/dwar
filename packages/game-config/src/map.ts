export type MapSettings = {
  width: number;
  height: number;
  minimapSize: number;
  contextMenu: boolean;
  popup: boolean;
  /** Popup: mostra as tropas presentes na aldeia (só nas suas). */
  popupUnits: boolean;
  /** Popup: mostra o tempo de viagem de cada unidade até a aldeia. */
  popupTimes: boolean;
  /** Mapa: ponto colorido ao lado das aldeias que você atacou, com o resultado do último ataque. */
  reportDots: boolean;
};
export const defaultMapSettings: MapSettings = {
  width: 13,
  height: 9,
  minimapSize: 50,
  contextMenu: true,
  popup: true,
  popupUnits: true,
  popupTimes: true,
  reportDots: true,
};
