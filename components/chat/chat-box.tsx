"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

type Message = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read: boolean;
};

export default function ChatBox({ jobId, userId }: { jobId: string; userId: string }) {
  const supabase = createSupabaseBrowser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // 📦 Berichten laden + markeren als gelezen
  useEffect(() => {
    const loadMessages = async () => {
      console.log("[ChatBox] 📦 Berichten laden...");
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[ChatBox] ❌", error);
        return;
      }

      setMessages(data);

      // ✅ Markeer berichten van de ander als gelezen
      const unread = data.filter((msg) => msg.sender_id !== userId && msg.read === false);
      if (unread.length > 0) {
        const ids = unread.map((m) => m.id);
        await supabase.from("messages").update({ read: true }).in("id", ids);
        console.log(`[ChatBox] 🟢 ${ids.length} berichten gemarkeerd als gelezen`);
      }
    };

    loadMessages();
  }, [jobId]);

  // 🔔 Realtime updates
  useEffect(() => {
    console.log("[ChatBox] 🔔 Realtime listener actief voor job", jobId);

    const channel = supabase
      .channel(`chat:${jobId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `job_id=eq.${jobId}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => [...prev, msg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  // 📜 Scroll naar onder bij nieuwe berichten
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✉️ Nieuw bericht versturen
  async function sendMessage() {
    if (!newMessage.trim()) return;
    const { error } = await supabase.from("messages").insert({
      job_id: jobId,
      sender_id: userId,
      content: newMessage.trim(),
    });

    if (error) console.error("[ChatBox] ❌", error);
    else setNewMessage("");
  }

  return (
    <div className="flex flex-col h-[80vh] max-w-2xl mx-auto border rounded-lg bg-white dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender_id === userId ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`rounded-lg px-3 py-2 text-sm max-w-[70%] ${
                msg.sender_id === userId
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
              }`}
            >
              <p>{msg.content}</p>
              <p className="text-[10px] opacity-70 mt-1">
                {format(new Date(msg.created_at), "HH:mm", { locale: nl })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ✏️ Inputveld */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="flex items-center gap-2 border-t p-3 bg-gray-50 dark:bg-gray-950"
      >
        <Input
          placeholder="Typ een bericht..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1"
        />
        <Button type="submit">Verstuur</Button>
      </form>
    </div>
  );
}
