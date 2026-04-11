import L from 'leaflet';

/**
 * Creates a custom stylized teardrop marker icon
 * @param {string} color - The primary color of the marker
 * @returns {L.DivIcon}
 */
export const createCustomMarkerIcon = (color) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    background-color: ${color};
    width: 32px;
    height: 32px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3px solid white;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    ">
      <div style="
        width: 10px;
        height: 10px;
        background-color: white;
        border-radius: 50%;
        transform: rotate(45deg);
      "></div>
    </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

export const MAP_TILES = {
  LIGHT: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
};

export const FACILITY_MARKER_COLOR = '#3b82f6'; // blue-500
export const EVENT_MARKER_COLOR = '#a855f7'; // purple-500

export const facilityIcon = createCustomMarkerIcon(FACILITY_MARKER_COLOR);
export const eventIcon = createCustomMarkerIcon(EVENT_MARKER_COLOR);
