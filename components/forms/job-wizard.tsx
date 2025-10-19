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
  price: string;
  date: string;
  time: string;
  street: string;
  house_number: string;
  city: string;
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
    street: "",
    house_number: "",
    city: "",
    location_lat: "",
    location_lng: "",
  });

  // ✅ Automatische geocoding op basis van straat + huisnummer + plaats
  useEffect(() => {
    const fullAddress = `${form.street} ${form.house_number}, ${form.city}`.trim();
    if (fullAddress.length < 5) return;

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            fullAddress
          )}&format=json&limit=1`
        );
        const data = await res.json();
        if (data?.[0]) {
          setForm((f) => ({
            ...f,
            location_lat: data[0].lat,
            location_lng: data[0].lon,
          }));
        }
      } catch (err) {
        console.error("[Wizard] Geocoding mislukt:", err);
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [form.street, form.house_number, form.city]);

  const canNext = useMemo(() => {
    if (step === 1) return !!form.category;
    if (step === 2) return !!form.title && !!form.description && !!form.price;
    if (step === 3) return !!form.date && !!form.time;
    if (step === 4)
      return (
        !!form.street &&
        !!form.house_number &&
        !!form.city &&
        !!form.location_lat &&
        !!form.location_lng
      );
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

  async function handleSubmit() {
    setSubmitting(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSubmitting(false);
      setError("Je bent niet ingelogd.");
      return;
    }

    const priceNumber = Number(form.price.replace(",", "."));
    const lat = Number(form.location_lat);
    const lng = Number(form.location_lng);

    if (Number.isNaN(priceNumber) || Number.isNaN(lat) || Number.isNaN(lng)) {
      setSubmitting(false);
      setError("Controleer prijs en locatie (adres kon niet worden omgezet).");
      return;
    }

    // Combineer adresvelden tot één leesbaar adres
    const fullAddress = `${form.street} ${form.house_number}, ${form.city}`.trim();

    const payload = {
      customer_id: user.id,
      helper_id: null as string | null,
      category: form.category,
      title: form.title.trim(),
      description: form.description.trim(),
      price: priceNumber,
      status: "open" as const,
      date: form.date || null,
      time: form.time || null,
      address: fullAddress,
      street: form.street.trim(),
      house_number: form.house_number.trim(),
      city: form.city.trim(),
      location_lat: lat,
      location_lng: lng,
    };

    console.log("[Wizard] inserting job payload:", payload);

    const { data, error: insertError } = await supabase
      .from("jobs")
      .insert(payload)
      .select("id")
      .single();

    if (insertError) {
      console.error("[Wizard] insert error", insertError);
      setSubmitting(false);
      setError(insertError.message || "Database insert mislukt.");
      return;
    }

    router.push("/dashboard/customer");
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-white/60 dark:bg-gray-900/60">
        <CardTitle className="text-2xl">Nieuwe taak</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Step indicator */}
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

        {/* ✅ Stap 4: Locatie */}
        {step === 4 && (
          <section className="space-y-4">
            <div className="rounded-lg border p-3">
              <p className="text-sm mb-2 font-medium">Locatie</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Straat</label>
                  <Input
                    placeholder="Bijv. Damrak"
                    value={form.street}
                    onChange={(e) => update("street", e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Huisnummer</label>
                  <Input
                    placeholder="Bijv. 1"
                    value={form.house_number}
                    onChange={(e) => update("house_number", e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium mb-1">Plaats</label>
                <Input
                  placeholder="Bijv. Amsterdam"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                />
              </div>

              {form.location_lat && form.location_lng && (
                <p className="mt-2 text-xs text-green-700 dark:text-green-400">
                  📍 Locatie herkend via adres.
                </p>
              )}
            </div>
          </section>
        )}

        {/* Foutmelding */}
        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Navigatie */}
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
