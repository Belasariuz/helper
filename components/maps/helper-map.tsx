"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

// ✅ Fix voor gebroken Leaflet-iconen
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadowUrl from "leaflet/dist/images/marker-shadow.png";

const defaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -30],
});

const helperIcon = defaultIcon;
const jobIcon = defaultIcon;

type Props = {
  position: [number, number];
  jobs: {
    id: string;
    title: string;
    price: number;
    location_lat: number;
    location_lng: number;
  }[];
  acceptJob: (id: string) => void;
};

export default function HelperMap({ position, jobs, acceptJob }: Props) {
  useEffect(() => {
    console.log("[HelperMap] rendering map — center:", position, "jobs:", jobs);
  }, [position, jobs]);

  return (
    <div className="w-full h-[75vh] min-h-[500px] relative z-0">
      <MapContainer
        center={position}
        zoom={15}
        scrollWheelZoom={true}
        className="h-full w-full rounded-lg z-0"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* ✅ Huidige locatie van helper */}
        <Marker position={position} icon={helperIcon}>
          <Popup>Jouw locatie</Popup>
        </Marker>

        {/* ✅ Openstaande taken */}
        {jobs.map((job) => (
          <Marker
            key={job.id}
            position={[job.location_lat, job.location_lng]}
            icon={jobIcon}
          >
            <Popup>
              <strong>{job.title}</strong>
              <br />
              €{job.price?.toFixed(2) ?? "0.00"}
              <br />
              <button
                className="mt-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                onClick={() => acceptJob(job.id)}
              >
                Accepteren
              </button>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
