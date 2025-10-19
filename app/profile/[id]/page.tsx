import { createSupabaseServer } from "@/lib/supabase/server";

export default async function UserProfilePage({ params }: { params: { id: string } }) {
  const supabase = await createSupabaseServer();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, bio, is_helper")
    .eq("id", params.id)
    .single();

  if (!profile) return <div className="p-6">❌ Gebruiker niet gevonden</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">{profile.name}</h1>
      <p className="text-gray-700">{profile.email}</p>
      {profile.bio && <p className="mt-2 text-gray-500">{profile.bio}</p>}
      <p className="mt-4">
        Rol: {profile.is_helper ? "Helper" : "Klant"}
      </p>
    </div>
  );
}
