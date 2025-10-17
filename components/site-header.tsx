"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  MapPin,
  MessageSquare,
  User,
  PlusCircle,
  LogOut,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  const [notifications, setNotifications] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<"customer" | "helper" | null>(null);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  // 🧭 Haal huidige gebruiker + rol op
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);

        // ✅ Haal profiel en rol op
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profile?.role === "helper" || profile?.role === "customer") {
          setRole(profile.role);
          console.log("[Header] Gebruikersrol:", profile.role);
        }
      }
    })();
  }, []);

  // 📡 Luister naar realtime events
  useEffect(() => {
    if (!userId) return;

    console.log("[🔔] Notificatie listener gestart:", userId);

    const channel = supabase
      .channel("notifications")
      // 💬 Nieuw bericht
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as any;
          if (msg.sender_id !== userId) {
            setNotifications((prev) => prev + 1);
            toast({
              title: "Nieuw bericht 💬",
              description: "Je hebt een nieuw bericht ontvangen.",
            });
          }
        }
      )
      // 🔄 Taakstatus update
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "jobs" },
        (payload) => {
          const { old, new: newData } = payload;
          if (
            old.status !== newData.status &&
            (newData.customer_id === userId ||
              newData.helper_id === userId)
          ) {
            setNotifications((prev) => prev + 1);
            toast({
              title: "Taakstatus gewijzigd 🔄",
              description: `Status is nu: ${newData.status}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // 🧹 Badge resetten
  useEffect(() => {
    if (pathname.startsWith("/messages") || pathname.startsWith("/dashboard")) {
      setNotifications(0);
    }
  }, [pathname]);

  // Dynamisch dashboard-pad
  const dashboardPath =
    role === "helper"
      ? "/dashboard/helper"
      : role === "customer"
      ? "/dashboard/customer"
      : "/dashboard";

  const nav = [
    { href: "/", label: "Home", icon: Home },
    { href: dashboardPath, label: "Dashboard", icon: MapPin },
    { href: "/jobs/new", label: "Nieuwe taak", icon: PlusCircle },
    { href: "/messages", label: "Berichten", icon: MessageSquare },
    { href: "/profile", label: "Profiel", icon: User },
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur dark:bg-gray-950/80">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="font-semibold tracking-tight">
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Helper
          </span>
        </Link>

        {/* Navigatie */}
        <nav className="flex items-center gap-1">
          {nav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}

                {/* 🔔 Badge */}
                {item.href === "/messages" && notifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600 text-[10px] text-white flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Logout knop */}
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-red-600"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-1" />
            Uitloggen
          </Button>
        </nav>
      </div>
    </header>
  );
}
