"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function ProfilePage() {
  const supabase = createSupabaseBrowser();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getProfile();
  }, []);

  async function getProfile() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Niet ingelogd");
      setLoading(false);
      return;
    }

    // Check of profiel bestaat
    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error && error.code === "PGRST116") {
      // Nog geen profiel, aanmaken
      await supabase.from("profiles").insert({
        id: user.id,
        email: user.email,
        role: "customer",
        name: "",
      });
      setMessage("Nieuw profiel aangemaakt");
    } else if (error) {
      console.error(error);
    } else {
      setProfile(profileData);
    }

    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const { error } = await supabase.from("profiles").update(profile).eq("id", profile.id);

    if (error) setMessage(error.message);
    else setMessage("Profiel opgeslagen!");
  }

  if (loading) return <p className="text-center mt-10">Laden...</p>;
  if (!profile) return <p className="text-center mt-10">{message}</p>;

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Mijn profiel</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-3">
            <Input
              placeholder="Naam"
              value={profile.name || ""}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
            <Input
              placeholder="E-mail"
              value={profile.email || ""}
              disabled
            />
            <select
              className="w-full rounded-md border p-2"
              value={profile.role || "customer"}
              onChange={(e) => setProfile({ ...profile, role: e.target.value })}
            >
              <option value="customer">Klant</option>
              <option value="helper">Helper</option>
            </select>
            <Input
              placeholder="Straat"
              value={profile.street || ""}
              onChange={(e) => setProfile({ ...profile, street: e.target.value })}
            />
            <Input
              placeholder="Huisnummer"
              value={profile.housenumber || ""}
              onChange={(e) => setProfile({ ...profile, housenumber: e.target.value })}
            />
            <Input
              placeholder="Postcode"
              value={profile.postalcode || ""}
              onChange={(e) => setProfile({ ...profile, postalcode: e.target.value })}
            />
            <Input
              placeholder="Plaats"
              value={profile.city || ""}
              onChange={(e) => setProfile({ ...profile, city: e.target.value })}
            />

            {profile.role === "helper" && (
              <>
                <Textarea
                  placeholder="Biografie"
                  value={profile.bio || ""}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                />
                <Input
                  placeholder="Specialiteiten (komma-gescheiden)"
                  value={(profile.specialties || []).join(", ")}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      specialties: e.target.value.split(",").map((s) => s.trim()),
                    })
                  }
                />
              </>
            )}
            <Button type="submit" className="w-full">
              Opslaan
            </Button>
            {message && <p className="text-sm text-center text-green-600">{message}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
