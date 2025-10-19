import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_customer, is_helper")
    .eq("id", user.id)
    .single();

  if (error || !profile) redirect("/profile");

  if (profile.is_helper && !profile.is_customer) redirect("/dashboard/helper");
  if (profile.is_customer && !profile.is_helper) redirect("/dashboard/customer");

  // Als gebruiker beide rollen heeft → keuze tonen
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <h1 className="text-2xl font-semibold">Kies een dashboard</h1>
      <p className="text-gray-600">
        Je hebt zowel een <strong>klant</strong> als <strong>helper</strong> profiel.
      </p>
      <div className="flex gap-4">
        <Link href="/dashboard/customer">
          <Button className="bg-blue-600 hover:bg-blue-700">
            👤 Naar klant-dashboard
          </Button>
        </Link>
        <Link href="/dashboard/helper">
          <Button className="bg-green-600 hover:bg-green-700">
            🛠️ Naar helper-dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
