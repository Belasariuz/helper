"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

export default function JobDetailMap({
  position,
  title,
}: {
  position: [number, number];
  title: string;
}) {
  const icon = L.icon({
    iconUrl: "/marker-icon.png",
    shadowUrl: "/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  return (
    <MapContainer
      center={position}
      zoom={13}
      scrollWheelZoom={false}
      className="h-full w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position} icon={icon}>
        <Popup>{title}</Popup>
      </Marker>
    </MapContainer>
  );
}
