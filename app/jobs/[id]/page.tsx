import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import JobDetailContent from "@/components/job-detail-content";

/**
 * JobDetailPage
 * - Werkt in Next.js 15 met async params
 * - Toont helper + klant info
 * - Laat helper taak accepteren of afronden
 */
export default async function JobDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // ✅ Uitgebreide query met klant + helper info
  const { data: job, error } = await supabase
    .from("jobs")
    .select(
      `
        *,
        profiles:customer_id(name, email),
        helper:helper_id(name, email)
      `
    )
    .eq("id", params.id)
    .single();

  if (error || !job) {
    console.error(error);
    return <div className="p-6">❌ Taak niet gevonden.</div>;
  }

  const isHelper = job.helper_id === user.id;
  const isCustomer = job.customer_id === user.id;

  // ✅ Server actions
  async function handleAccept() {
    "use server";
    const supabase = await createSupabaseServer();
    await supabase
      .from("jobs")
      .update({ status: "accepted", helper_id: user.id })
      .eq("id", params.id);
  }

  async function handleComplete() {
    "use server";
    const supabase = await createSupabaseServer();
    await supabase
      .from("jobs")
      .update({ status: "completed" })
      .eq("id", params.id);
  }

  return (
    <JobDetailContent
      job={job}
      userId={user.id}
      handleAccept={handleAccept}
      handleComplete={handleComplete}
      isHelper={isHelper}
      isCustomer={isCustomer}
    />
  );
}
