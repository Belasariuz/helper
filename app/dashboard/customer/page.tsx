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
};

export default function CustomerDashboard() {
  const supabase = createSupabaseBrowser();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("jobs")
      .select("id, title, status, price")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) setJobs(data);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Taak verwijderen?")) return;
    await supabase.from("jobs").delete().eq("id", id);
    setJobs(jobs.filter((j) => j.id !== id));
  }

  if (loading) return <p>Laden...</p>;

return (
  <div className="flex justify-center px-4 py-10">
    <div className="w-full max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-3xl font-semibold tracking-tight">Mijn taken</h1>
        <Link href="/jobs/new">
          <Button size="sm" className="shadow-sm">
            Nieuwe taak
          </Button>
        </Link>
      </div>

      {/* Content */}
      {jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-10 text-center text-muted-foreground">
          <p className="text-sm">Nog geen taken geplaatst.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li
              key={job.id}
              className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md dark:bg-gray-900"
            >
              <div>
                <p className="font-medium text-lg">{job.title}</p>
                <p className="text-sm text-muted-foreground">
                  Status: {job.status} – €{job.price.toFixed(2)}
                </p>
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
  </div>
);
