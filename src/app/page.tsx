"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardBody } from "@/components/ui/Card";
import { AnnouncementBody } from "@/components/home/AnnouncementBody";
import { PostComments } from "@/components/home/PostComments";
import { cn } from "@/lib/utils";
import type { HomeContentBlock } from "@/lib/settings";

export default function HomePage() {
  const { data: session } = useSession();
  const [blocks, setBlocks] = useState<HomeContentBlock[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [paymentInfo, setPaymentInfo] = useState("");
  const [bracketLocked, setBracketLocked] = useState(false);
  const [paid, setPaid] = useState({ paid: 0, total: 0 });
  const [pot, setPot] = useState({ collected: 0, winnerShare: 0, donationShare: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/home")
      .then((r) => r.json())
      .then((data) => {
        setBlocks(data.blocks ?? []);
        setCommentCounts(data.commentCounts ?? {});
        setPaymentInfo(data.paymentInfo ?? "");
        setBracketLocked(data.bracketLocked ?? false);
        setPaid(data.paid ?? { paid: 0, total: 0 });
        setPot(data.pot ?? { collected: 0, winnerShare: 0, donationShare: 0 });
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
  // Only worth drawing when there's actually something on both sides of it
  const hasPoolSummary = paid.total > 0 || (!bracketLocked && paymentInfo.trim().length > 0);
  const showDivider = hasPoolSummary && blocks.length > 0;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-5 pt-10 pb-6 text-center">
        <h1 className="text-2xl font-black text-neutral-50">🐻 Fat Bear Week</h1>
        <p className="text-sm text-neutral-400 mt-0.5">
          Welcome{session?.user.displayName ? `, ${session.user.displayName}` : ""}
        </p>
      </header>

      <main className="flex-1 px-5 pb-10 space-y-3">
        {paid.total > 0 && (
          <Card>
            <CardBody className="gap-2 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-accent-light">Total Collected</p>
                  <p className="mt-1.5 text-2xl font-black leading-none text-neutral-50">${pot.collected}</p>
                </div>
                <div className="space-y-0.5 text-right text-sm text-neutral-400">
                  <p>
                    <span className="font-bold text-neutral-100">${pot.winnerShare}</span> to the winner(s)
                  </p>
                  <p>
                    <span className="font-bold text-neutral-100">${pot.donationShare}</span> to The Otis Fund
                  </p>
                </div>
              </div>
              {/* Paid-up progress lives in the bottom of this box rather than a
                  card of its own — it's the same story as the money above it.
                  Hidden once locked, when chasing people for entry fees is moot. */}
              {!bracketLocked && (
                <div className="border-t border-white/10 pt-2">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-semibold text-neutral-300">Paid up</span>
                    <span className="text-neutral-500">
                      {paid.paid} of {paid.total}
                    </span>
                  </div>
                  <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-black/30">
                    <div className="h-full bg-success" style={{ width: `${paidPct}%` }} />
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Joining instructions are only actionable while there's still a
            bracket to fill in — once locked, this is just stale clutter. */}
        {!bracketLocked && paymentInfo.trim() && (
          <Card>
            <CardBody className="gap-1 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-accent-light">How to play</p>
              <AnnouncementBody body={paymentInfo} compact />
            </CardBody>
          </Card>
        )}

        {showDivider && <SectionDivider />}

        {blocks.length === 0 ? (
          <p className="text-neutral-500 text-sm">No announcements yet.</p>
        ) : (
          blocks.map((block) => (
            <AnnouncementCard
              key={block.id}
              block={block}
              commentCount={commentCounts[block.id] ?? 0}
              onCommentCountChange={(count) =>
                setCommentCounts((prev) => ({ ...prev, [block.id]: count }))
              }
            />
          ))
        )}
      </main>
    </div>
  );
}

// Hairline fading out at both ends — enough to separate the pool summary above
// from the announcement feed below without reading as a hard section break.
function SectionDivider() {
  return (
    <div className="py-2">
      <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </div>
  );
}

// Collapsed by default, to a fixed height that's the same for every post
// regardless of whether it has a cover image or how long the body runs — so
// the feed reads as an even stack of previews rather than a wall of text.
// The preview is faded out with a mask rather than a gradient overlay, so it
// works without having to match the card's translucent background colour.
function AnnouncementCard({
  block,
  commentCount,
  onCommentCountChange,
}: {
  block: HomeContentBlock;
  commentCount: number;
  onCommentCountChange: (count: number) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <div className={cn("flex flex-col overflow-hidden", !open && "h-36")}>
        {block.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={block.imageUrl}
            alt=""
            className={cn("w-full shrink-0 rounded-t-2xl object-cover", open ? "max-h-80" : "h-20")}
          />
        )}
        <div
          className={cn(
            "min-h-0 flex-1 px-4 py-3",
            !open && "[mask-image:linear-gradient(to_bottom,black_65%,transparent)]"
          )}
        >
          {block.title && <h2 className="mb-1 text-base font-bold text-neutral-50">{block.title}</h2>}
          <AnnouncementBody body={block.body} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="w-full px-4 pb-3 pt-1 text-left text-xs font-semibold text-accent-light [-webkit-tap-highlight-color:transparent]"
      >
        {open ? "Collapse" : "Expand"}
      </button>

      {/* Its own strip below the post body, with its own show/hide — reading
          the post and reading the thread are separate decisions. */}
      <PostComments
        blockId={block.id}
        postTitle={block.title}
        count={commentCount}
        onCountChange={onCommentCountChange}
      />
    </Card>
  );
}
