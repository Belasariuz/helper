import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: "Helper – Takenplatform",
  description: "Helper verbindt klanten en helpers voor dagelijkse klussen in jouw buurt.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <SiteHeader />

          <main className="container mx-auto px-4 py-8">{children}</main>

          {/* ✅ Hier komt de toaster */}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
