// app/jobs/[id]/chat/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Message = {
  id: string;
  job_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type Job = {
  id: string;
  title: string;
  customer_id: string;
  helper_id: string | null;
  status: string;
};

export default function JobChatPage() {
  const supabase = createSupabaseBrowser();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const jobId = params.id;

  const [me, setMe] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll naar laatste bericht
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    (async () => {
      // 1) User ophalen
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setMe(user.id);

      // 2) Job ophalen en toegang controleren (RLS dekt dit ook)
      const { data: jobData, error: jobErr } = await supabase
        .from("jobs")
        .select("id, title, customer_id, helper_id, status")
        .eq("id", jobId)
        .maybeSingle();

      if (jobErr || !jobData) {
        alert("Taak niet gevonden.");
        router.push("/messages");
        return;
      }

      // Client-side guard (extra naast RLS): alleen deelnemers mogen chatten
      if (![jobData.customer_id, jobData.helper_id].includes(user.id)) {
        alert("Je hebt geen toegang tot deze chat.");
        router.push("/messages");
        return;
      }

      setJob(jobData);

      // 3) Initiele berichten
      const { data: initial, error: msgErr } = await supabase
        .from("messages")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true });

      if (!msgErr && initial) setMessages(initial as Message[]);
      setLoading(false);

      // 4) Realtime subscription
      const channel = supabase
        .channel(`messages:job:${jobId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `job_id=eq.${jobId}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const canSend = useMemo(
    () => text.trim().length > 0 && !!me && !!job,
    [text, me, job]
  );

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;

    const content = text.trim();
    setText("");

    const { error } = await supabase.from("messages").insert({
      job_id: jobId,
      sender_id: me!,
      content,
    });

    if (error) {
      console.error("[chat] send error", error);
      alert("Bericht verzenden mislukt.");
      // Zet tekst terug zodat niets verloren gaat
      setText(content);
    }
  }

  if (loading) return <div className="flex justify-center py-10">Laden…</div>;
  if (!job) return null;

  return (
    <div className="flex justify-center px-4 py-10">
      <div className="w-full max-w-3xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
            <p className="text-sm text-muted-foreground">Chat per taak</p>
          </div>
          <Link href="/messages">
            <Button variant="ghost" size="sm">Terug naar inbox</Button>
          </Link>
        </div>

        {/* Chat box */}
        <div className="rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900">
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            {messages.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">
                Nog geen berichten — start het gesprek!
              </p>
            ) : (
              <ul className="space-y-3">
                {messages.map((m) => {
                  const mine = m.sender_id === me;
                  return (
                    <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={[
                          "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow",
                          mine
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100",
                        ].join(" ")}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        <p className={`mt-1 text-[10px] opacity-80 ${mine ? "text-blue-100" : "text-gray-500"}`}>
                          {new Date(m.created_at).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  );
                })}
                <div ref={bottomRef} />
              </ul>
            )}
          </div>

          {/* Composer */}
          <form onSubmit={sendMessage} className="mt-4 flex items-center gap-2">
            <input
              className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-950"
              placeholder="Schrijf een bericht…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <Button type="submit" disabled={!canSend}>
              Verstuur
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
