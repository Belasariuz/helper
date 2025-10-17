"use client";

import * as React from "react";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-[100]">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
            className="bg-gray-900 text-white rounded-lg px-4 py-3 shadow-lg w-72 border border-gray-700"
          >
            {t.title && <p className="font-semibold">{t.title}</p>}
            {t.description && (
              <p className="text-sm text-gray-300 mt-1">{t.description}</p>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
