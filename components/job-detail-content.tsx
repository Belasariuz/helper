"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
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
  handleComplete,
  isHelper,
  isCustomer,
}: {
  job: any;
  userId: string;
  handleAccept: () => Promise<void>;
  handleComplete: () => Promise<void>;
  isHelper: boolean;
  isCustomer: boolean;
}) {
  // ✅ Lokale jobstatus bijhouden (optimistische UI)
  const [localJob, setLocalJob] = useState(job);
  const [isPending, startTransition] = useTransition();

  async function onAccept() {
    startTransition(async () => {
      await handleAccept();
      setLocalJob({ ...localJob, status: "accepted" });
    });
  }

  async function onComplete() {
    startTransition(async () => {
      await handleComplete();
      setLocalJob({ ...localJob, status: "completed" });
    });
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{localJob.title}</h1>
      <p className="text-gray-700 dark:text-gray-300">{localJob.description}</p>

      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
        <p>
          💰 <strong>Prijs:</strong> €{localJob.price}
        </p>
        <p>
          📅 <strong>Datum:</strong>{" "}
          {localJob.scheduled_date
            ? new Date(localJob.scheduled_date).toLocaleString("nl-NL")
            : "Niet opgegeven"}
        </p>
        <p>
          📍 <strong>Locatie:</strong>{" "}
          {localJob.street} {localJob.house_number},{" "}
          {localJob.postal_code} {localJob.city}
        </p>
        <p>
          👤 <strong>Klant:</strong> {localJob.profiles?.name || "Onbekend"} (
          {localJob.profiles?.email})
        </p>

        {/* ✅ Helper-info alleen tonen bij accepted of completed */}
        {(localJob.status === "accepted" || localJob.status === "completed") &&
          localJob.helper && (
            <p>
              🧰 <strong>Helper:</strong>{" "}
              <Link
                href={`/profile/${localJob.helper_id}`}
                className="text-blue-600 hover:underline"
              >
                {localJob.helper.name || "Onbekend"}
              </Link>{" "}
              ({localJob.helper.email})
            </p>
          )}

        <p>
          📦 <strong>Status:</strong>{" "}
          <span
            className={`font-semibold ${
              localJob.status === "open"
                ? "text-blue-600"
                : localJob.status === "accepted"
                ? "text-green-600"
                : "text-gray-500"
            }`}
          >
            {localJob.status}
          </span>
        </p>
      </div>

      {/* Kaart */}
      {localJob.location_lat && localJob.location_lng && (
        <div className="h-[300px] w-full">
          <Map position={[localJob.location_lat, localJob.location_lng]} title={localJob.title} />
        </div>
      )}

      {/* Actieknoppen */}
      <div className="flex gap-3">
        {/* Helper kan open taak accepteren */}
        {isHelper && localJob.status === "open" && (
          <Button
            onClick={onAccept}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {isPending ? "Bezig..." : "Taak accepteren"}
          </Button>
        )}

        {/* Helper kan geaccepteerde taak afronden */}
        {isHelper && localJob.status === "accepted" && (
          <Button
            onClick={onComplete}
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isPending ? "Bezig..." : "✅ Markeer als afgerond"}
          </Button>
        )}

        {/* Chat openen als taak is geaccepteerd */}
        {(localJob.status === "accepted" || localJob.status === "completed") && (
          <Link href={`/messages/${localJob.id}`}>
            <Button variant="secondary">Chat openen 💬</Button>
          </Link>
        )}

        {/* Terugknop voor klant */}
        {isCustomer && (
          <Link href="/dashboard/customer">
            <Button variant="ghost">Terug naar dashboard</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
