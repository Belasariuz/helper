"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"; // ⚡️ Nieuw: import voor dropdown

const HelperMap = dynamic(() => import("@/components/maps/helper-map"), {
  ssr: false,
});

type Job = {
  id: string;
  title: string;
  price: number;
  status: string;
  location_lat: number;
  location_lng: number;
  customer_id: string;
};

export default function HelperDashboard() {
  const supabase = createSupabaseBrowser();
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [radiusKm, setRadiusKm] = useState(10); // ⚡️ nu dynamisch aanpasbaar

  // ✅ Afstand berekenen (Haversine)
  function getDistanceKm(
    [lat1, lon1]: [number, number],
    [lat2, lon2]: [number, number]
  ) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // ✅ Locatie ophalen
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [
            pos.coords.latitude,
            pos.coords.longitude,
          ];
          console.log("[HelperDashboard] 📍 Huidige locatie:", coords);
          setPosition(coords);
        },
        (err) => console.error("[HelperDashboard] ⚠️ Fout bij locatie:", err)
      );
    }
  }, []);

  async function loadJobs() {
    console.log("[HelperDashboard] 📡 Taken ophalen...");
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("status", "open");

    if (error) {
      console.error("[HelperDashboard] ❌ Fout bij ophalen taken:", error);
      setJobs([]);
    } else {
      console.log("[HelperDashboard] ✅ Data uit Supabase:", data);
      setJobs(data || []);
    }

    setLoading(false);
  }

  // ✅ Initial load + realtime updates
  useEffect(() => {
    loadJobs();

    const channel = supabase
      .channel("jobs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs" },
        (payload) => {
          console.log("[HelperDashboard] 🔔 Realtime update:", payload);
          loadJobs();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function acceptJob(id: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return alert("Je moet ingelogd zijn om taken te accepteren.");

    const { error } = await supabase
      .from("jobs")
      .update({ status: "accepted", helper_id: user.id })
      .eq("id", id);

    if (error) {
      console.error("[HelperDashboard] ❌ Fout bij accepteren:", error);
      alert("Fout bij accepteren van taak");
    } else {
      alert("Taak geaccepteerd!");
    }
  }

  // ✅ Filter taken op afstand
  const nearbyJobs =
    position && jobs.length > 0
      ? jobs.filter((job) => {
          const distance = getDistanceKm(position, [
            job.location_lat,
            job.location_lng,
          ]);
          return distance <= radiusKm;
        })
      : [];

  if (loading)
    return (
      <p className="text-center mt-10 text-muted-foreground">Laden...</p>
    );

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-semibold">
          Taken in je buurt (±{radiusKm} km)
        </h1>

        {/* ⚡️ Nieuw: dropdown voor radius */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Zoekradius:</span>
          <Select
            value={radiusKm.toString()}
            onValueChange={(value) => setRadiusKm(Number(value))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Radius" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 km</SelectItem>
              <SelectItem value="10">10 km</SelectItem>
              <SelectItem value="20">20 km</SelectItem>
              <SelectItem value="50">50 km</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadJobs} variant="outline" size="sm">
            Vernieuwen
          </Button>
        </div>
      </div>

      {position ? (
        nearbyJobs.length > 0 ? (
          <HelperMap
            position={position}
            jobs={nearbyJobs}
            acceptJob={acceptJob}
          />
        ) : (
          <div className="rounded-lg border p-8 text-center text-muted-foreground">
            <p className="font-medium">Geen taken in de buurt.</p>
            <p className="text-sm">
              Probeer later opnieuw of vergroot je radius.
            </p>
          </div>
        )
      ) : (
        <p className="text-center text-muted-foreground">
          Locatie wordt opgehaald...
        </p>
      )}
    </div>
  );
}
