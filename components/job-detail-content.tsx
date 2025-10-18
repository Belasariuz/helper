"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// kaart dynamisch laden
const Map = dynamic(() => import("@/components/maps/job-detail-map"), {
  ssr: false,
});

export default function JobDetailContent({
  job,
  userId,
  handleAccept,
  isHelper,
  isCustomer,
}: {
  job: any;
  userId: string;
  handleAccept: () => Promise<void>;
  isHelper: boolean;
  isCustomer: boolean;
}) {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{job.title}</h1>
      <p className="text-gray-700 dark:text-gray-300">{job.description}</p>

      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
        <p>
          💰 <strong>Prijs:</strong> €{job.price}
        </p>
        <p>
          📅 <strong>Datum:</strong>{" "}
          {job.scheduled_date
            ? new Date(job.scheduled_date).toLocaleString("nl-NL")
            : "Niet opgegeven"}
        </p>
        <p>
          📍 <strong>Locatie:</strong> {job.street} {job.house_number},{" "}
          {job.postal_code} {job.city}
        </p>
        <p>
          👤 <strong>Klant:</strong> {job.profiles?.name || "Onbekend"} (
          {job.profiles?.email})
        </p>
        <p>
          📦 <strong>Status:</strong>{" "}
          <span
            className={`font-semibold ${
              job.status === "open"
                ? "text-blue-600"
                : job.status === "accepted"
                ? "text-green-600"
                : "text-gray-500"
            }`}
          >
            {job.status}
          </span>
        </p>
      </div>

      {/* Kaart */}
      {job.location_lat && job.location_lng && (
        <div className="h-[300px] w-full">
          <Map position={[job.location_lat, job.location_lng]} title={job.title} />
        </div>
      )}

      <div className="flex gap-3">
        {isHelper && job.status === "open" && (
          <Button onClick={handleAccept} className="bg-green-600 hover:bg-green-700">
            Taak accepteren
          </Button>
        )}

        {job.status === "accepted" && (
          <Link href={`/messages/${job.id}`}>
            <Button variant="secondary">Chat openen 💬</Button>
          </Link>
        )}

        {isCustomer && (
          <Link href="/dashboard/customer">
            <Button variant="ghost">Terug naar dashboard</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
