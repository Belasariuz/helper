import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

export default async function DashboardPage() {
  // ✅ wacht op de Supabase serverclient
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <div className="flex flex-col items-center justify-center py-10">
      <h1 className="text-3xl font-semibold mb-4">Welkom bij Helper</h1>
      <p className="text-gray-600">
        Ingelogd als: <strong>{user.email}</strong>
      </p>
    </div>
  );
}
