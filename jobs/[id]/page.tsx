import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import dynamic from "next/dynamic";

const Map = dynamic(() => import("@/components/maps/job-detail-map"), {
  ssr: false,
});

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: job, error } = await supabase
    .from("jobs")
    .select("*, profiles:customer_id(name, email)")
    .eq("id", params.id)
    .single();

  if (error || !job) {
    console.error(error);
    return <div className="p-6">❌ Taak niet gevonden.</div>;
  }

  const isHelper = job.helper_id === user.id;
  const isCustomer = job.customer_id === user.id;

  // 🔹 Helper kan taak accepteren
  async function handleAccept() {
    "use server";
    const supabase = await createSupabaseServer();
    await supabase
      .from("jobs")
      .update({ status: "accepted", helper_id: user.id })
      .eq("id", params.id);
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{job.title}</h1>

      <p className="text-gray-700 dark:text-gray-300">{job.description}</p>

      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
        <p>
          💰 <strong>Prijs:</strong> €{job.price}
        </p>
        <p>
          📅 <strong>Datum:</strong>{" "}
          {job.scheduled_date
            ? new Date(job.scheduled_date).toLocaleString("nl-NL")
            : "Niet opgegeven"}
        </p>
        <p>
          📍 <strong>Locatie:</strong> {job.street} {job.house_number},{" "}
          {job.postal_code} {job.city}
        </p>
        <p>
          👤 <strong>Klant:</strong> {job.profiles?.name || "Onbekend"} (
          {job.profiles?.email})
        </p>
        <p>
          📦 <strong>Status:</strong>{" "}
          <span
            className={`font-semibold ${
              job.status === "open"
                ? "text-blue-600"
                : job.status === "accepted"
                ? "text-green-600"
                : "text-gray-500"
            }`}
          >
            {job.status}
          </span>
        </p>
      </div>

      {/* 🌍 Kaart */}
      {job.location_lat && job.location_lng && (
        <div className="h-[300px] w-full">
          <Map
            position={[job.location_lat, job.location_lng]}
            title={job.title}
          />
        </div>
      )}

      <div className="flex gap-3">
        {isHelper && job.status === "open" && (
          <form action={handleAccept}>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              Taak accepteren
            </Button>
          </form>
        )}

        {job.status === "accepted" && (
          <Link href={`/messages/${job.id}`}>
            <Button variant="secondary">Chat openen 💬</Button>
          </Link>
        )}

        {isCustomer && (
          <Link href="/dashboard/customer">
            <Button variant="ghost">Terug naar dashboard</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
