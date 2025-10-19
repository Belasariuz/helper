// app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Welkom bij Helper</h1>
      <p className="text-muted-foreground">
        Plaats taken als <strong>klant</strong> of accepteer klussen als{" "}
        <strong>helper</strong>. In de volgende stappen voegen we inloggen,
        profielen, taken en chat toe.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/dashboard"
          className="rounded-2xl border p-6 transition hover:bg-muted"
        >
          <h2 className="font-semibold">Ga naar Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Bekijk jouw taken (klant) of openstaande klussen (helper).
          </p>
        </Link>

        <Link
          href="/messages"
          className="rounded-2xl border p-6 transition hover:bg-muted"
        >
          <h2 className="font-semibold">Berichten</h2>
          <p className="text-sm text-muted-foreground">
            Chat met je klant of helper (per taak).
          </p>
        </Link>
      </div>
    </div>
  );
}
