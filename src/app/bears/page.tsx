"use client";
import { useEffect, useState } from "react";
import type { Bear } from "@/lib/db/schema";
import { BearCard } from "@/components/bears/BearCard";

export default function BearsPage() {
  const [bears, setBears] = useState<Bear[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bears")
      .then((r) => r.json())
      .then((data) => {
        setBears(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-5 pt-10 pb-6">
        <h1 className="text-2xl font-black text-neutral-50">The Bears</h1>
        <p className="text-sm text-neutral-400 mt-0.5">This year's contestants</p>
      </header>

      <main className="flex-1 px-5 pb-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
          </div>
        ) : bears.length === 0 ? (
          <p className="text-center text-neutral-500 py-20">No bears added yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bears.map((bear) => (
              <BearCard key={bear.id} bear={bear} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
