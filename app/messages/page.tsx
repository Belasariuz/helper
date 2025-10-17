// app/messages/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type Job = {
  id: string;
  title: string;
  status: string;
  customer_id: string;
  helper_id: string | null;
  created_at: string;
};

type Row = Job & {
  lastMessage?: { content: string; created_at: string } | null;
};

export default function MessagesPage() {
  const supabase = createSupabaseBrowser();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadConversations() {
    setLoading(true);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      setLoading(false);
      return;
    }

    // 1) Haal alle jobs waar de gebruiker deelnemer is (klant of helper)
    const { data: jobs, error } = await supabase
      .from("jobs")
      .select("id, title, status, customer_id, helper_id, created_at")
      .or(`customer_id.eq.${user.id},helper_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error || !jobs) {
      setLoading(false);
      return;
    }

    // 2) Voor elk job: haal het laatste bericht (N+1; prima voor start, later optimaliseren met een view)
    const withLast = await Promise.all(
      jobs.map(async (job) => {
        const { data: last, error: msgErr } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("job_id", job.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return { ...job, lastMessage: msgErr ? null : last ?? null } as Row;
      })
    );

    setRows(withLast);
    setLoading(false);
  }

  const empty = useMemo(() => !loading && rows.length === 0, [loading, rows]);

  if (loading) return <div className="flex justify-center py-10">Laden…</div>;

  return (
    <div className="flex justify-center px-4 py-10">
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Berichten</h1>
        </div>

        {empty ? (
          <div className="rounded-xl border border-dashed bg-muted/30 p-10 text-center text-muted-foreground">
            Je hebt nog geen gesprekken. Plaats of accepteer eerst een taak.
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md dark:bg-gray-900"
              >
                <Link href={`/jobs/${row.id}/chat`} className="block">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-lg">{row.title}</p>
                    <span className="text-xs rounded-full border px-2 py-1 text-muted-foreground">
                      {row.status}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {row.lastMessage?.content ?? "Nog geen berichten"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
