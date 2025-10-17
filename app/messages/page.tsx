"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function InboxPage() {
  const supabase = createSupabaseBrowser();
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    loadChats();
  }, []);

  async function loadChats() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("jobs")
      .select("id, title, status")
      .or(`customer_id.eq.${user.id},helper_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    else setJobs(data || []);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Berichten</h1>

      {jobs.length === 0 ? (
        <p className="text-muted-foreground text-center">
          Nog geen gesprekken gestart.
        </p>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li
              key={job.id}
              className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition"
            >
              <Link href={`/messages/${job.id}`}>
                <div className="flex justify-between">
                  <span className="font-medium">{job.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {job.status}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
