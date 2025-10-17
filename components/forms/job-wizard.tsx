// components/forms/job-wizard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type FormData = {
  category: string;
  title: string;
  description: string;
  price: string; // we bewaren als string in het formulier, converteren bij submit
  date: string;  // yyyy-mm-dd
  time: string;  // hh:mm
  location_lat: string;
  location_lng: string;
};

const CATEGORIES = [
  "Schoonmaken",
  "Tuinieren",
  "Klussen",
  "Autowassen",
  "Oppassen",
  "Overig",
];

export default function JobWizard() {
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  const [form, setForm] = useState<FormData>({
    category: "",
    title: "",
    description: "",
    price: "",
    date: "",
    time: "",
    location_lat: "",
    location_lng: "",
  });

  // ✅ Debug logging (je ziet elke stap + formulier in je DevTools console)
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[Wizard] step:", step, "form:", form);
  }, [step, form]);

  const canNext = useMemo(() => {
    if (step === 1) return !!form.category;
    if (step === 2) return !!form.title && !!form.description && !!form.price;
    if (step === 3) return !!form.date && !!form.time;
    if (step === 4) return !!form.location_lat && !!form.location_lng;
    return false;
  }, [step, form]);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function next() {
    if (!canNext) return;
    setStep((s) => Math.min(4, s + 1));
  }

  function prev() {
    setStep((s) => Math.max(1, s - 1));
  }

  async function useMyLocation() {
    setError("");
    if (!("geolocation" in navigator)) {
      setError("Geolocatie wordt niet ondersteund door deze browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update("location_lat", String(pos.coords.latitude));
        update("location_lng", String(pos.coords.longitude));
      },
      (err) => {
        console.warn("[Wizard] geolocation error", err);
        setError("Kon je locatie niet ophalen. Sta locatie-toegang toe en probeer opnieuw.");
      },
      { enableHighAccuracy: true }
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");

    // 1) Check user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSubmitting(false);
      setError("Je bent niet ingelogd.");
      return;
    }

    // 2) Bouw payload
    const priceNumber = Number(form.price.replace(",", "."));
    const lat = Number(form.location_lat);
    const lng = Number(form.location_lng);

    if (Number.isNaN(priceNumber) || Number.isNaN(lat) || Number.isNaN(lng)) {
      setSubmitting(false);
      setError("Controleer prijs en locatie (moeten nummers zijn).");
      return;
    }

    const payload = {
      customer_id: user.id,
      helper_id: null as string | null,
      category: form.category,
      title: form.title.trim(),
      description: form.description.trim(),
      price: priceNumber,
      status: "open" as const,
      date: form.date || null, // jobs.date is een DATE kolom
      time: form.time || null, // jobs.time is text bij ons
      location_lat: lat,
      location_lng: lng,
    };

    // ✅ Debug
    // eslint-disable-next-line no-console
    console.log("[Wizard] inserting job payload:", payload);

    // 3) Insert
    const { data, error: insertError } = await supabase.from("jobs").insert(payload).select("id").single();

    if (insertError) {
      console.error("[Wizard] insert error", insertError);
      setSubmitting(false);
      setError(insertError.message);
      return;
    }

    // 4) Klaar -> naar dashboard customer (lijst toont nieuwste bovenaan)
    // eslint-disable-next-line no-console
    console.log("[Wizard] job inserted with id:", data?.id);
    router.push("/dashboard/customer");
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-white/60 dark:bg-gray-900/60">
        <CardTitle className="text-2xl">Nieuwe taak</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Progress / Stepper */}
        <ol className="flex items-center justify-between gap-2 text-sm">
          {[1, 2, 3, 4].map((n) => (
            <li key={n} className="flex-1">
              <div
                className={[
                  "flex h-10 items-center justify-center rounded-lg border",
                  n === step
                    ? "bg-blue-600 text-white border-blue-600"
                    : n < step
                    ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-900"
                    : "bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300",
                ].join(" ")}
              >
                Stap {n}
              </div>
            </li>
          ))}
        </ol>

        {/* Stap 1: Categorie */}
        {step === 1 && (
          <section className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Categorie</label>
              <select
                className="w-full rounded-md border bg-white p-2 dark:bg-gray-950"
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
              >
                <option value="">Kies een categorie…</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Dit helpt helpers om jouw klus te vinden.
              </p>
            </div>
          </section>
        )}

        {/* Stap 2: Details */}
        {step === 2 && (
          <section className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Titel</label>
              <Input
                placeholder="Bijv. Auto wassen voorrijden"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Beschrijving</label>
              <Textarea
                placeholder="Beschrijf wat er moet gebeuren…"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={5}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Prijs (€)</label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Bijv. 35"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Bedrag in euro’s. Gebruik een punt of komma voor decimalen.
              </p>
            </div>
          </section>
        )}

        {/* Stap 3: Datum & Tijd */}
        {step === 3 && (
          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Datum</label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tijd</label>
              <Input
                type="time"
                value={form.time}
                onChange={(e) => update("time", e.target.value)}
              />
            </div>
          </section>
        )}

        {/* Stap 4: Locatie */}
        {step === 4 && (
          <section className="space-y-4">
            <div className="rounded-lg border p-3">
              <p className="text-sm mb-2 font-medium">Locatie</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Latitude</label>
                  <Input
                    placeholder="52.3728"
                    value={form.location_lat}
                    onChange={(e) => update("location_lat", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Longitude</label>
                  <Input
                    placeholder="4.8936"
                    value={form.location_lng}
                    onChange={(e) => update("location_lng", e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-3">
                <Button type="button" variant="secondary" onClick={useMyLocation}>
                  Gebruik mijn locatie
                </Button>
                <p className="mt-1 text-xs text-muted-foreground">
                  We gebruiken je browserlocatie om de kaart voor helpers nauwkeurig te tonen.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Foutmelding */}
        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Navigatieknoppen */}
        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={prev} disabled={step === 1 || submitting}>
            Vorige
          </Button>

          {step < 4 ? (
            <Button type="button" onClick={next} disabled={!canNext || submitting}>
              Volgende
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={!canNext || submitting}>
              {submitting ? "Bezig met plaatsen…" : "Plaatsen"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
