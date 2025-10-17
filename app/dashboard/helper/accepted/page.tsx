"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Job = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  status: string;
  customer_id: string;
  created_at: string;
};

export default function HelperAcceptedPage() {
  const supabase = createSupabaseBrowser();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ taken ophalen
  useEffect(() => {
    loadAcceptedJobs();
  }, []);

  async function loadAcceptedJobs() {
    console.log("[Helper] 📦 Geaccepteerde taken ophalen...");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.warn("[Helper] ❌ Geen ingelogde gebruiker");
      return;
    }

    const { data, error } = await supabase
      .from("jobs")
      .select(
        "id, title, description, price, status, customer_id, created_at"
      )
      .eq("helper_id", user.id)
      .in("status", ["accepted", "in_progress"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Helper] ❌ Fout bij ophalen:", error);
      setJobs([]);
    } else {
      console.log("[Helper] ✅ Geaccepteerde taken:", data);
      setJobs(data || []);
    }

    setLoading(false);
  }

  async function markAsCompleted(id: string) {
    const { error } = await supabase
      .from("jobs")
      .update({ status: "completed" })
      .eq("id", id);

    if (error) {
      console.error("[Helper] ❌ Fout bij voltooien:", error);
      alert("Er ging iets mis bij het voltooien van de taak.");
    } else {
      alert("Taak gemarkeerd als voltooid!");
      loadAcceptedJobs();
    }
  }

  if (loading)
    return (
      <p className="text-center mt-10 text-muted-foreground">
        Geaccepteerde taken laden...
      </p>
    );

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mijn geaccepteerde taken</h1>
        <Button variant="outline" onClick={loadAcceptedJobs}>
          Vernieuwen
        </Button>
      </div>

      {jobs.length === 0 ? (
        <p className="text-muted-foreground text-center">
          Je hebt nog geen geaccepteerde taken.
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
                      job.status === "completed"
                        ? "text-green-600"
                        : job.status === "accepted"
                        ? "text-blue-600"
                        : "text-yellow-600"
                    }
                  >
                    {job.status}
                  </span>{" "}
                  – €{job.price.toFixed(2)}
                </p>
              </div>

              {job.status !== "completed" && (
                <Button
                  size="sm"
                  onClick={() => markAsCompleted(job.id)}
                >
                  Markeer als voltooid
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
