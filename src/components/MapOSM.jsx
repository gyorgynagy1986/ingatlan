"use client";

import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from "react-leaflet";
import L from "leaflet";
import { useMemo } from "react";
import "leaflet/dist/leaflet.css";

// Marker ikon fix (különben nem jelenik meg Next alatt)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function MapOSM({ lat, lng, label, height = 260, zoom = 15 }) {
  const center = useMemo(() => [lat, lng], [lat, lng]);

  return (
    <div className="rounded-lg overflow-hidden border">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        zoomControl={false}
        style={{ height }}
        className="z-0"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <ZoomControl position="bottomright" />
        <Marker position={center}>
          <Popup>{label ?? "Ingatlan helye"}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
