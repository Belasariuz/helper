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
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createSupabaseBrowser();

  const [userId, setUserId] = useState<string | null>(null);
  const [isCustomer, setIsCustomer] = useState(false);
  const [isHelper, setIsHelper] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState(0);

  // 🔄 Haal profiel en rollen op
  async function refreshProfile(source: string) {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) return;
    setUserId(data.user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_customer, is_helper")
      .eq("id", data.user.id)
      .single();

    if (profile) {
      setIsCustomer(!!profile.is_customer);
      setIsHelper(!!profile.is_helper);
      console.log(`[Header][${source}]`, profile);
    }
  }

  // 📡 Initial + route changes
  useEffect(() => {
    refreshProfile("mount");
  }, [pathname]);

  // 🔔 Update bij profielwijziging
  useEffect(() => {
    const handler = () => refreshProfile("profile-updated");
    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, []);

  // 📬 Tel ongelezen berichten
  useEffect(() => {
    if (!userId) return;

    async function countUnread() {
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id")
        .or(`customer_id.eq.${userId},helper_id.eq.${userId}`);

      if (!jobs?.length) return;
      const jobIds = jobs.map((j) => j.id);

      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("job_id", jobIds)
        .neq("sender_id", userId)
        .eq("read", false);

      setUnreadCount(count || 0);
    }

    countUnread();

    // 🔄 Realtime updates
    const channel = supabase
      .channel("unread-counter")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as any;
          if (msg.sender_id !== userId) {
            setUnreadCount((prev) => prev + 1);
            toast({
              title: "Nieuw bericht 💬",
              description: "Je hebt een nieuw bericht ontvangen.",
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as any;
          if (msg.read === true && msg.sender_id !== userId)
            setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  // 🧭 Realtime notificaties voor taakstatus
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "jobs" },
        (payload) => {
          const { old, new: newData } = payload;
          if (
            old.status !== newData.status &&
            (newData.customer_id === userId || newData.helper_id === userId)
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

  // 🧹 Reset badges bij navigatie
  useEffect(() => {
    if (pathname.startsWith("/messages") || pathname.startsWith("/dashboard")) {
      setNotifications(0);
      setUnreadCount(0);
    }
  }, [pathname]);

  // 🔗 Dashboard-link bepalen
  const dashboardLink =
    isHelper && !isCustomer
      ? "/dashboard/helper"
      : !isHelper && isCustomer
      ? "/dashboard/customer"
      : "/dashboard"; // beide → keuzepagina

  // 📋 Navigatie
  const nav = [
    { href: "/", label: "Home", icon: Home },
    { href: dashboardLink, label: "Dashboard", icon: MapPin },
    ...(isCustomer
      ? [{ href: "/jobs/new", label: "Nieuwe taak", icon: PlusCircle }]
      : []),
    { href: "/messages", label: "Berichten", icon: MessageSquare },
    { href: "/profile", label: "Profiel", icon: User },
  ];

  // 🚪 Uitloggen
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

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
                {item.href === "/messages" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600 text-[10px] text-white flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Logout */}
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
