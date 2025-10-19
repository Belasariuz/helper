"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Job = {
  id: string;
  title: string;
  description: string;
  status: string;
  price: number;
  helper_id: string | null;
  profiles?: { name: string | null };
};

export default function CustomerDashboard() {
  const supabase = createSupabaseBrowser();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);

  // ✅ Controleer of gebruiker klant is
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.push("/auth/login");
        return;
      }
      setUserId(data.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_customer")
        .eq("id", data.user.id)
        .single();

      if (!profile?.is_customer) {
        router.push("/dashboard");
        return;
      }

      setRoleChecked(true);
    })();
  }, [supabase, router]);

  // 📦 Taken ophalen
  useEffect(() => {
    if (!userId) return;
    async function loadJobs() {
      console.log("[CustomerDashboard] 📦 Taken ophalen...");
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id, title, description, status, price, helper_id, profiles:helper_id(name)"
        )
        .eq("customer_id", userId)
        .order("created_at", { ascending: false });

      if (error) console.error(error);
      setJobs(data || []);
      setLoading(false);
    }
    loadJobs();
  }, [userId, supabase]);

  // ❌ Taak verwijderen
  async function handleDelete(id: string) {
    if (!confirm("Weet je zeker dat je deze taak wilt verwijderen?")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) {
      alert("Er ging iets mis bij het verwijderen van de taak.");
    } else {
      setJobs(jobs.filter((j) => j.id !== id));
    }
  }

  // ✅ Taak afronden
  async function handleComplete(id: string) {
    const { error } = await supabase
      .from("jobs")
      .update({ status: "completed" })
      .eq("id", id);
    if (error) alert("Er ging iets mis bij het afronden van de taak.");
    else {
      alert("🎉 Taak gemarkeerd als afgerond!");
      setJobs(
        jobs.map((j) => (j.id === id ? { ...j, status: "completed" } : j))
      );
    }
  }

  if (!roleChecked || loading)
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Loader2 className="animate-spin w-6 h-6 text-gray-400" />
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard (Klant)</h1>
        <Link href="/jobs/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            Nieuwe taak
          </Button>
        </Link>
      </div>

      {jobs.length === 0 ? (
        <p className="text-gray-500 mt-10 text-center">
          Je hebt nog geen taken geplaatst.
        </p>
      ) : (
        <ul className="space-y-4">
          {jobs.map((job) => (
            <li
              key={job.id}
              className="flex flex-col md:flex-row md:items-center justify-between rounded-lg border p-4 bg-gray-50 dark:bg-gray-900"
            >
              <div>
                <p className="font-medium text-lg">{job.title}</p>
                <p className="text-sm text-gray-600">
                  {job.description?.slice(0, 80)}...
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  💰 €{job.price.toFixed(2)} |{" "}
                  <span
                    className={`font-semibold ${
                      job.status === "open"
                        ? "text-blue-600"
                        : job.status === "accepted"
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    {job.status === "completed" ? "Afgerond" : job.status}
                  </span>
                </p>

                {job.profiles?.name && (
                  <p className="text-sm text-gray-500">
                    👷 Helper: {job.profiles.name}
                  </p>
                )}
              </div>

              <div className="flex gap-2 mt-3 md:mt-0">
                <Link href={`/jobs/${job.id}`}>
                  <Button variant="secondary" size="sm">
                    📋 Bekijk details
                  </Button>
                </Link>

                {job.status === "accepted" && (
                  <Link href={`/messages/${job.id}`}>
                    <Button variant="outline" size="sm">
                      💬 Chat
                    </Button>
                  </Link>
                )}

                {job.status === "open" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(job.id)}
                  >
                    Verwijderen
                  </Button>
                )}

                {job.status === "accepted" && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleComplete(job.id)}
                  >
                    ✅ Markeer als afgerond
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
