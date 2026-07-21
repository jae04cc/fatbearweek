"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardBody } from "@/components/ui/Card";
import type { HomeContentBlock } from "@/lib/settings";

export default function HomePage() {
  const { data: session } = useSession();
  const [blocks, setBlocks] = useState<HomeContentBlock[]>([]);
  const [bracketLocked, setBracketLocked] = useState(false);
  const [paid, setPaid] = useState({ paid: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/home")
      .then((r) => r.json())
      .then((data) => {
        setBlocks(data.blocks ?? []);
        setBracketLocked(data.bracketLocked ?? false);
        setPaid(data.paid ?? { paid: 0, total: 0 });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const paidPct = paid.total > 0 ? Math.round((paid.paid / paid.total) * 100) : 0;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-5 pt-10 pb-6">
        <h1 className="text-2xl font-black text-neutral-50">🐻 Fat Bear Week</h1>
        <p className="text-sm text-neutral-400 mt-0.5">
          Welcome{session?.user.displayName ? `, ${session.user.displayName}` : ""}
        </p>
      </header>

      <main className="flex-1 px-5 pb-10 space-y-4">
        {blocks.length === 0 ? (
          <p className="text-neutral-500 text-sm">No announcements yet.</p>
        ) : (
          blocks.map((block) => (
            <Card key={block.id}>
              <CardBody className="gap-1.5">
                {block.title && <h2 className="text-lg font-bold text-neutral-50">{block.title}</h2>}
                <p className="text-sm text-neutral-300 whitespace-pre-wrap">{block.body}</p>
              </CardBody>
            </Card>
          ))
        )}

        {!bracketLocked && paid.total > 0 && (
          <Card>
            <CardBody className="gap-2">
              <p className="text-sm font-semibold text-neutral-300">
                Paid up: {paid.paid} of {paid.total}
              </p>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-black/30">
                <div className="h-full bg-success" style={{ width: `${paidPct}%` }} />
              </div>
            </CardBody>
          </Card>
        )}
      </main>
    </div>
  );
}
