"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Conversation = {
  job_id: string;
  title: string;
  status: string;
  last_message?: string;
  last_time?: string;
};

export default function InboxPage() {
  const supabase = createSupabaseBrowser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // 🔹 Gebruiker ophalen
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setUserId(data.user.id);
    })();
  }, []);

  // 🔹 Gesprekken ophalen
  useEffect(() => {
    if (!userId) return;

    async function loadConversations() {
      console.log("[Inbox] 📦 Gesprekken ophalen...");
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title, status, customer_id, helper_id")
        .or(`customer_id.eq.${userId},helper_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      const convs: Conversation[] = [];
      for (const job of jobs || []) {
        const { data: msg } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("job_id", job.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        convs.push({
          job_id: job.id,
          title: job.title,
          status: job.status,
          last_message: msg?.content || "Nog geen berichten",
          last_time: msg?.created_at || "",
        });
      }

      setConversations(convs);
      setLoading(false);
    }

    loadConversations();
  }, [userId]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Loader2 className="animate-spin w-6 h-6 text-gray-400" />
      </div>
    );

  if (conversations.length === 0)
    return (
      <div className="text-center mt-10 text-gray-500">
        <MessageSquare className="mx-auto h-10 w-10 mb-3 text-gray-400" />
        <p>Je hebt nog geen gesprekken.</p>
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold mb-4">Berichten</h1>

      {conversations.map((c) => (
        <Link key={c.job_id} href={`/messages/${c.job_id}`}>
          <div className="flex items-center justify-between border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <div>
              <p className="font-medium">{c.title}</p>
              <p className="text-sm text-gray-500">
                {c.last_message?.length > 50
                  ? c.last_message.slice(0, 50) + "..."
                  : c.last_message}
              </p>
            </div>
            <div className="text-right">
              <p
                className={`text-xs font-semibold uppercase ${
                  c.status === "open"
                    ? "text-blue-600"
                    : c.status === "accepted"
                    ? "text-green-600"
                    : "text-gray-500"
                }`}
              >
                {c.status}
              </p>
              <Button variant="ghost" size="sm">
                <MessageSquare className="w-4 h-4 mr-1" />
                Open chat
              </Button>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
