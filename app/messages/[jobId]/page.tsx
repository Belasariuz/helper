"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export default function JobChatPage() {
  const { jobId } = useParams();
  const supabase = createSupabaseBrowser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadMessages();
    getUserId();

    // ✅ Realtime kanaal
    const channel = supabase
      .channel(`messages:${jobId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `job_id=eq.${jobId}` },
        (payload) => {
          console.log("[Chat] Nieuw bericht:", payload);
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  async function getUserId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  }

  async function loadMessages() {
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, content, created_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true });

    if (error) console.error("[Chat] ❌ Fout bij laden:", error);
    else setMessages(data || []);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !userId) return;

    const { error } = await supabase.from("messages").insert({
      job_id: jobId,
      sender_id: userId,
      content: newMessage,
    });

    if (error) console.error("[Chat] ❌ Fout bij verzenden:", error);
    else setNewMessage("");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
      <h1 className="text-2xl font-semibold mb-4">Chat over taak</h1>

      <div className="border rounded-lg p-4 h-[60vh] overflow-y-auto bg-white dark:bg-gray-900 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.sender_id === userId ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`px-3 py-2 rounded-xl text-sm ${
                msg.sender_id === userId
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Typ een bericht..."
        />
        <Button type="submit">Verstuur</Button>
      </form>
    </div>
  );
}
