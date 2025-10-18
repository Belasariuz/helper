"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";

// Kaartcomponent (dynamisch importeren om "window is not defined" te voorkomen)
const HelperMap = dynamic(() => import("@/components/maps/helper-map"), {
  ssr: false,
});

type Job = {
  id: string;
  title: string;
  description: string;
  status: string;
  price: number;
  location_lat: number | null;
  location_lng: number | null;
  customer_id: string;
};

export default function HelperDashboard() {
  const supabase = createSupabaseBrowser();
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [openJobs, setOpenJobs] = useState<Job[]>([]);
  const [acceptedJobs, setAcceptedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // 🧭 Huidige gebruiker ophalen
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setUserId(data.user.id);
    })();
  }, []);

  // 📍 Locatie ophalen
  useEffect(() => {
    if (!navigator.geolocation) return;
    console.log("[HelperDashboard] 🌍 Locatie ophalen...");
    navigator.geolocation.getCurrentPosition((pos) => {
      const coords: [number, number] = [
        pos.coords.latitude,
        pos.coords.longitude,
      ];
      setPosition(coords);
      console.log("[HelperDashboard] 📍 Huidige locatie:", coords);
    });
  }, []);

  // 📡 Taken ophalen
  useEffect(() => {
    if (!userId) return;

    async function loadJobs() {
      console.log("[HelperDashboard] 📦 Taken ophalen...");
      // Openstaande taken
      const { data: open } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });

      // Geaccepteerde taken
      const { data: accepted } = await supabase
        .from("jobs")
        .select("*")
        .eq("helper_id", userId)
        .order("created_at", { ascending: false });

      setOpenJobs(open || []);
      setAcceptedJobs(accepted || []);
      setLoading(false);
    }

    loadJobs();
  }, [userId]);

  // ▶️ Helper accepteert taak
  async function acceptJob(id: string) {
    if (!userId) return;
    console.log("[HelperDashboard] ▶️ Taak accepteren:", id);

    const { error } = await supabase
      .from("jobs")
      .update({ status: "accepted", helper_id: userId })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Er ging iets mis bij het accepteren van de taak.");
    } else {
      alert("✅ Taak geaccepteerd!");
      // Herladen van open & accepted taken
      const { data: open } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "open");
      const { data: accepted } = await supabase
        .from("jobs")
        .select("*")
        .eq("helper_id", userId);
      setOpenJobs(open || []);
      setAcceptedJobs(accepted || []);
    }
  }

  if (loading)
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Loader2 className="animate-spin w-6 h-6 text-gray-400" />
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard (Helper)</h1>

      {/* Geaccepteerde taken */}
      <section>
        <h2 className="text-xl font-semibold mb-3">🟢 Geaccepteerde taken</h2>
        {acceptedJobs.length === 0 ? (
          <p className="text-gray-500">Nog geen geaccepteerde taken.</p>
        ) : (
          <ul className="space-y-3">
            {acceptedJobs.map((job) => (
              <li
                key={job.id}
                className="flex flex-col md:flex-row md:items-center justify-between rounded-lg border p-4 bg-gray-50 dark:bg-gray-900"
              >
                <div>
                  <p className="font-medium">{job.title}</p>
                  <p className="text-sm text-gray-500">
                    {job.description?.slice(0, 80)}...
                  </p>
                  <p className="text-sm text-gray-600">
                    💰 €{job.price.toFixed(2)} | Status:{" "}
                    <span className="font-semibold text-green-600">
                      {job.status}
                    </span>
                  </p>
                </div>
                <div className="mt-3 md:mt-0 flex gap-2">
                  <Link href={`/messages/${job.id}`}>
                    <Button variant="outline" size="sm">
                      💬 Chat
                    </Button>
                  </Link>
                  <Link href={`/jobs/${job.id}`}>
                    <Button variant="secondary" size="sm">
                      📋 Bekijk details
                    </Button>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Openstaande taken */}
      <section>
        <h2 className="text-xl font-semibold mb-3">🕐 Openstaande taken</h2>
        {openJobs.length === 0 ? (
          <p className="text-gray-500">Er zijn momenteel geen openstaande taken.</p>
        ) : (
          <ul className="space-y-3">
            {openJobs.map((job) => (
              <li
                key={job.id}
                className="flex flex-col md:flex-row md:items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{job.title}</p>
                  <p className="text-sm text-gray-500">
                    {job.description?.slice(0, 80)}...
                  </p>
                  <p className="text-sm text-gray-600">
                    💰 €{job.price.toFixed(2)}
                  </p>
                </div>
                <div className="mt-3 md:mt-0 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => acceptJob(job.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Accepteren
                  </Button>
                  <Link href={`/jobs/${job.id}`}>
                    <Button variant="secondary" size="sm">
                      📋 Bekijk details
                    </Button>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Kaart */}
      {position && (
        <section>
          <h2 className="text-xl font-semibold mb-3">📍 Kaart met openstaande taken</h2>
          <div className="h-[400px] w-full rounded-lg overflow-hidden border">
            <HelperMap
              position={position}
              jobs={openJobs}
              acceptJob={acceptJob}
            />
          </div>
        </section>
      )}
    </div>
  );
}
