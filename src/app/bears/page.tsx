"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { Bear } from "@/lib/db/schema";
import { BearCard } from "@/components/bears/BearCard";

export default function BearsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user.isAdmin ?? false;
  const [bears, setBears] = useState<Bear[]>([]);
  const [bearsRevealed, setBearsRevealed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch("/api/bears").then((r) => r.json()), fetch("/api/config").then((r) => r.json())]).then(
      ([bearsData, configData]) => {
        setBears(Array.isArray(bearsData) ? bearsData : []);
        setBearsRevealed(configData.bearsRevealed ?? false);
        setLoading(false);
      }
    );
  }, []);

  // Bears get added one at a time while setting up for the season — admins
  // can watch that happen, but players see a placeholder until the roster
  // is revealed, so nobody sees the roster trickle in mid-setup.
  const hiddenFromPlayer = !isAdmin && !bearsRevealed;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-5 pt-10 pb-6 text-center">
        <h1 className="text-2xl font-black text-neutral-50">The Bears</h1>
        <p className="text-sm text-neutral-400 mt-0.5">This year's contestants</p>
      </header>

      <main className="flex-1 px-5 pb-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
          </div>
        ) : hiddenFromPlayer ? (
          <p className="text-center text-neutral-500 py-20">Bears haven't been added yet.</p>
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
