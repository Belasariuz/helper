"use client";

import * as React from "react";

type ToasterToast = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
};

export const toast = (toast: Omit<ToasterToast, "id">) => {
  const event = new CustomEvent("toast", { detail: toast });
  window.dispatchEvent(event);
};

export const useToast = () => {
  const [toasts, setToasts] = React.useState<ToasterToast[]>([]);

  React.useEffect(() => {
    const listener = (e: CustomEvent<Omit<ToasterToast, "id">>) => {
      const newToast = { id: String(Math.random()), ...e.detail };
      setToasts((prev) => [...prev, newToast]);

      // toast verdwijnt automatisch
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 4000);
    };

    window.addEventListener("toast", listener as EventListener);
    return () => window.removeEventListener("toast", listener as EventListener);
  }, []);

  return {
    toasts,
  };
};
