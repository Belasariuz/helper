"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function ProfilePage() {
  const supabase = createSupabaseBrowser();
  const router = useRouter();

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
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Niet ingelogd");
      setLoading(false);
      return;
    }

    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error && error.code === "PGRST116") {
      await supabase.from("profiles").insert({
        id: user.id,
        email: user.email,
        name: "",
        is_customer: true,
        is_helper: false,
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

    const { error } = await supabase
      .from("profiles")
      .update({
        name: profile.name,
        street: profile.street,
        housenumber: profile.housenumber,
        postalcode: profile.postalcode,
        city: profile.city,
        bio: profile.bio,
        specialties: profile.specialties,
        is_customer: profile.is_customer,
        is_helper: profile.is_helper,
      })
      .eq("id", profile.id);

    if (error) {
      console.error(error);
      setMessage(error.message);
      return;
    }

    setMessage("Profiel opgeslagen!");

    // Laat de header weten dat profiel is gewijzigd
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("profile-updated"));
    }

    router.refresh();
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
            <Input placeholder="E-mail" value={profile.email || ""} disabled />

            {/* ✅ Rolselectie */}
            <div className="space-y-2 border p-3 rounded-md bg-gray-50 dark:bg-gray-900">
              <p className="font-medium text-sm">Rollen</p>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.is_customer || false}
                  onChange={(e) =>
                    setProfile({ ...profile, is_customer: e.target.checked })
                  }
                />
                Klant (kan taken plaatsen)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.is_helper || false}
                  onChange={(e) =>
                    setProfile({ ...profile, is_helper: e.target.checked })
                  }
                />
                Helper (kan taken accepteren)
              </label>
            </div>

            <Input
              placeholder="Straat"
              value={profile.street || ""}
              onChange={(e) => setProfile({ ...profile, street: e.target.value })}
            />
            <Input
              placeholder="Huisnummer"
              value={profile.housenumber || ""}
              onChange={(e) =>
                setProfile({ ...profile, housenumber: e.target.value })
              }
            />
            <Input
              placeholder="Postcode"
              value={profile.postalcode || ""}
              onChange={(e) =>
                setProfile({ ...profile, postalcode: e.target.value })
              }
            />
            <Input
              placeholder="Plaats"
              value={profile.city || ""}
              onChange={(e) => setProfile({ ...profile, city: e.target.value })}
            />

            {profile.is_helper && (
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
                      specialties: e.target.value
                        .split(",")
                        .map((s) => s.trim()),
                    })
                  }
                />
              </>
            )}

            <Button type="submit" className="w-full">
              Opslaan
            </Button>
            {message && (
              <p className="text-sm text-center text-green-600">{message}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
