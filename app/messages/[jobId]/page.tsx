import { createSupabaseServer } from "@/lib/supabase/server";
import ChatBox from "@/components/chat/chat-box";
import { redirect } from "next/navigation";

export default async function ChatPage({ params }: { params: { jobId: string } }) {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, customer_id, helper_id")
    .eq("id", params.jobId)
    .single();

  if (!job) return <div className="p-4">Taak niet gevonden.</div>;

  // 🔒 Toegang controleren
  if (job.customer_id !== user.id && job.helper_id !== user.id) {
    return <div className="p-4 text-red-500">Je hebt geen toegang tot deze chat.</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">
        Chat over taak: <span className="text-blue-600">{job.title}</span>
      </h1>
      <ChatBox jobId={params.jobId} userId={user.id} />
    </div>
  );
}
