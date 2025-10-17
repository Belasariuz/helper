"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

// ✅ Dynamisch importeren van de kaart (voorkomt window errors)
const HelperMap = dynamic(() => import("@/components/maps/helper-map"), {
  ssr: false,
});

type Job = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  status: string;
  location_lat: number;
  location_lng: number;
};

export default function HelperDashboard() {
  const supabase = createSupabaseBrowser();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Locatie ophalen bij laden
  useEffect(() => {
    console.log("[HelperDashboard] 🌍 Locatie ophalen...");
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
        (err) => console.error("[HelperDashboard] ❌ Fout bij locatie:", err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // ✅ Taken ophalen
  useEffect(() => {
    loadOpenJobs();
  }, []);

  async function loadOpenJobs() {
    console.log("[HelperDashboard] 📡 Openstaande taken ophalen...");
    const { data, error } = await supabase
      .from("jobs")
      .select(
        "id, title, description, price, status, location_lat, location_lng"
      )
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[HelperDashboard] ❌ Fout bij ophalen:", error);
    } else {
      console.log("[HelperDashboard] ✅ Openstaande taken:", data);
      setJobs(data || []);
    }

    setLoading(false);
  }

  // ✅ Taak accepteren
  async function acceptJob(id: string) {
    console.log("[HelperDashboard] ▶️ Taak accepteren:", id);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert("Je moet ingelogd zijn om een taak te accepteren.");
      console.error("[HelperDashboard] ❌ Geen gebruiker:", userError);
      return;
    }

    console.log("[HelperDashboard] 👤 Ingelogde helper:", user.id);

    const { data, error } = await supabase
      .from("jobs")
      .update({
        status: "accepted",
        helper_id: user.id,
      })
      .eq("id", id)
      .select(); // 👈 laat Supabase teruggeven wat er is gewijzigd

    if (error) {
      console.error("[HelperDashboard] ❌ Fout bij update:", error);
      alert("Er ging iets mis bij het accepteren van de taak.");
    } else {
      console.log("[HelperDashboard] ✅ Update resultaat:", data);
      alert("Taak succesvol geaccepteerd!");
      // ✅ lijst vernieuwen
      loadOpenJobs();
    }
  }

  // ✅ Weergave
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Openstaande taken in de buurt
        </h1>
        <Button variant="outline" onClick={loadOpenJobs}>
          Vernieuwen
        </Button>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground mt-10">
          Taken laden...
        </p>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center border rounded-lg p-10 text-center text-muted-foreground">
          <p className="font-medium">Geen openstaande taken.</p>
          <p className="text-sm">Zodra een klant een taak plaatst, verschijnt die hier.</p>
        </div>
      ) : (
        <>
          {/* ✅ Kaartweergave */}
          {position ? (
            <div className="h-[70vh] w-full overflow-hidden rounded-xl shadow-sm">
              <HelperMap
                position={position}
                jobs={jobs}
                acceptJob={acceptJob}
              />
            </div>
          ) : (
            <p className="text-center text-muted-foreground">
              Locatie ophalen...
            </p>
          )}
        </>
      )}
    </div>
  );
}
