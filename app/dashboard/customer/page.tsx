"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Job = {
  id: string;
  title: string;
  status: string;
  price: number;
  helper_id: string | null;
  helper_name?: string | null;
};

export default function CustomerDashboard() {
  const supabase = createSupabaseBrowser();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ taken laden en realtime updates luisteren
  useEffect(() => {
    loadJobs();

    // Luister naar wijzigingen in de jobs-tabel
    const channel = supabase
      .channel("jobs-realtime-customer")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs" },
        (payload) => {
          console.log("[CustomerDashboard] 🔔 Realtime update:", payload);
          loadJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ✅ taken ophalen uit Supabase
  async function loadJobs() {
    console.log("[CustomerDashboard] 📦 Taken ophalen...");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("jobs")
      .select(`
        id,
        title,
        status,
        price,
        helper_id,
        profiles:profiles!jobs_helper_id_fkey(name)
      `)
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[CustomerDashboard] ❌ Fout bij ophalen:", error);
    } else {
      console.log("[CustomerDashboard] ✅ Taken:", data);

      // helpernaam extraheren
      const formatted = data.map((job: any) => ({
        ...job,
        helper_name: job.profiles?.name ?? null,
      }));

      setJobs(formatted);
    }

    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Weet je zeker dat je deze taak wil verwijderen?")) return;
    await supabase.from("jobs").delete().eq("id", id);
    setJobs(jobs.filter((j) => j.id !== id));
  }

  if (loading)
    return (
      <p className="text-center text-muted-foreground mt-10">
        Taken laden...
      </p>
    );

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mijn taken</h1>
        <Link href="/jobs/new">
          <Button>Nieuwe taak</Button>
        </Link>
      </div>

      {jobs.length === 0 ? (
        <p className="text-muted-foreground text-center">
          Je hebt nog geen taken geplaatst.
        </p>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li
              key={job.id}
              className="flex items-center justify-between border rounded-lg p-4"
            >
              <div>
                <p className="font-medium">{job.title}</p>
                <p className="text-sm text-muted-foreground">
                  Status:{" "}
                  <span
                    className={
                      job.status === "open"
                        ? "text-gray-500"
                        : job.status === "accepted"
                        ? "text-blue-600"
                        : job.status === "completed"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }
                  >
                    {job.status}
                  </span>{" "}
                  – €{job.price.toFixed(2)}
                </p>

                {/* 👇 toon helpernaam als taak is geaccepteerd */}
                {job.helper_name && (
                  <p className="text-xs text-gray-500">
                    Helper: {job.helper_name}
                  </p>
                )}
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(job.id)}
              >
                Verwijderen
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
