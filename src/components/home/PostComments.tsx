"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useScrollLock } from "@/lib/useScrollLock";
import { cn, formatDateTime, pluralize } from "@/lib/utils";

interface PostComment {
  id: string;
  userId: string;
  displayName: string;
  body: string;
  createdAt: string;
}

// Matches the long-press-to-delete gesture used elsewhere — keeps the thread
// visually clean instead of hanging a delete button off every row.
const LONG_PRESS_MS = 550;

// Its own strip along the bottom of a post's card, independent of whether the
// post body itself is expanded. Comments load lazily on first open; the count
// shown before that comes from /api/home.
export function PostComments({
  blockId,
  postTitle,
  count,
  onCountChange,
}: {
  blockId: string;
  postTitle?: string;
  count: number;
  onCountChange: (count: number) => void;
}) {
  const { data: session } = useSession();
  const isAdmin = session?.user.isAdmin ?? false;
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The inline preview is capped at a fixed height and anchored to the newest
  // comment; anything older spills past the top and is clipped. Measured
  // rather than counted, so it never depends on how long each comment runs.
  const previewRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);
  const [clipped, setClipped] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch(`/api/posts/${blockId}/comments`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setComments(data.comments ?? []);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, blockId]);

  useEffect(() => {
    const box = previewRef.current;
    const content = previewContentRef.current;
    if (!box || !content) return;
    setClipped(content.scrollHeight > box.clientHeight + 1);
  }, [comments, open]);

  const applyComments = (next: PostComment[]) => {
    setComments(next);
    onCountChange(next.length);
  };

  const handleAdd = async (body: string) => {
    const res = await fetch(`/api/posts/${blockId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to post comment");
    applyComments([...comments, data]);
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({})))?.error ?? "Failed to delete comment");
      }
      applyComments(comments.filter((c) => c.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete comment");
    }
  };

  const displayCount = loaded ? comments.length : count;

  return (
    <div className="border-t border-white/10">
      <div className="flex items-center justify-between gap-3 px-4 py-1">
        {/* min-h-0 overrides the global 44px button tap target from
            globals.css — without it this strip can't get any shorter than
            that, whatever padding it's given. */}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="min-h-0 py-1 text-xs font-semibold text-accent-light [-webkit-tap-highlight-color:transparent]"
        >
          {open ? "Hide comments" : "Show comments"}
        </button>
        <span className="text-xs text-neutral-500">{pluralize(displayCount, "comment")}</span>
      </div>

      {open && (
        <div className="px-4 pb-3">
          {!loaded ? (
            <p className="pb-2 text-xs text-neutral-500">Loading comments…</p>
          ) : (
            <>
              {comments.length > 0 && (
                <div
                  ref={previewRef}
                  className={cn(
                    "flex max-h-52 flex-col justify-end overflow-hidden",
                    clipped && "[mask-image:linear-gradient(to_bottom,transparent,black_25%)]"
                  )}
                >
                  <div ref={previewContentRef} className="shrink-0 space-y-3">
                    {comments.map((comment) => (
                      <CommentRow
                        key={comment.id}
                        comment={comment}
                        isMine={comment.userId === session?.user.id}
                        canDelete={comment.userId === session?.user.id || isAdmin}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              )}

              {clipped && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="mt-2 text-xs font-semibold text-accent-light [-webkit-tap-highlight-color:transparent]"
                >
                  View all {pluralize(comments.length, "comment")}
                </button>
              )}

              <CommentComposer className="mt-3" onSubmit={handleAdd} onError={setError} />
              {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
            </>
          )}
        </div>
      )}

      {showAll && (
        <AllCommentsPopup
          postTitle={postTitle}
          comments={comments}
          currentUserId={session?.user.id}
          isAdmin={isAdmin}
          error={error}
          onDelete={handleDelete}
          onAdd={handleAdd}
          onError={setError}
          onClose={() => setShowAll(false)}
        />
      )}
    </div>
  );
}

// Same shape as the bear profile popup — floating card, dimmed backdrop, close
// button pinned to an outer non-scrolling wrapper. Laid out as a fixed-height
// column so only the thread scrolls: the header and the composer stay put,
// and the comments pass underneath them.
function AllCommentsPopup({
  postTitle,
  comments,
  currentUserId,
  isAdmin,
  error,
  onDelete,
  onAdd,
  onError,
  onClose,
}: {
  postTitle?: string;
  comments: PostComment[];
  currentUserId?: string;
  isAdmin: boolean;
  error: string | null;
  onDelete: (id: string) => void;
  onAdd: (body: string) => Promise<void>;
  onError: (message: string | null) => void;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollLock();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Open on the newest comment, and stay there as new ones arrive — a thread
  // reads bottom-up, so the far end is where you want to land.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [comments.length]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="absolute inset-x-0 -inset-y-full bg-black/85" />
      <div className="relative w-full max-w-sm">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 text-neutral-200"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface-card">
          {/* Header and composer both sit outside the scroll region, so the
              thread passes between them rather than pushing either away. */}
          <div className="shrink-0 border-b border-white/10 px-4 pb-2.5 pr-10 pt-4">
            <p className="text-xs font-bold uppercase tracking-widest text-accent-light">Comments</p>
            {postTitle && <p className="mt-0.5 text-sm font-bold text-neutral-50">{postTitle}</p>}
          </div>

          <div ref={scrollRef} className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {comments.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                isMine={comment.userId === currentUserId}
                canDelete={comment.userId === currentUserId || isAdmin}
                onDelete={onDelete}
              />
            ))}
          </div>

          <div className="shrink-0 border-t border-white/10 px-4 py-3">
            <CommentComposer onSubmit={onAdd} onError={onError} />
            {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentComposer({
  className,
  onSubmit,
  onError,
}: {
  className?: string;
  onSubmit: (body: string) => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;

    onError(null);
    setSending(true);
    try {
      await onSubmit(body);
      setDraft("");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to post comment");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("flex items-center gap-2", className)}>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Add a comment…"
        maxLength={1000}
        className="min-h-[36px] flex-1 rounded-full border border-white/10 bg-surface-elevated px-3.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <Button type="submit" size="sm" className="rounded-full" loading={sending} disabled={!draft.trim()}>
        Post
      </Button>
    </form>
  );
}

function CommentRow({
  comment,
  isMine,
  canDelete,
  onDelete,
}: {
  comment: PostComment;
  isMine: boolean;
  canDelete: boolean;
  onDelete: (id: string) => void;
}) {
  const [pressing, setPressing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = () => {
    setPressing(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const start = () => {
    if (!canDelete) return;
    setPressing(true);
    timerRef.current = setTimeout(() => {
      setPressing(false);
      if (confirm("Delete this comment?")) onDelete(comment.id);
    }, LONG_PRESS_MS);
  };

  useEffect(() => cancel, []);

  return (
    <div
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => canDelete && e.preventDefault()}
      className={cn(
        "select-none transition-opacity [-webkit-tap-highlight-color:transparent]",
        pressing && "opacity-50"
      )}
    >
      <div className="flex items-baseline gap-2">
        <span className={cn("text-sm font-semibold", isMine ? "text-accent-light" : "text-neutral-100")}>
          {isMine ? "You" : comment.displayName}
        </span>
        <span className="text-xs text-neutral-500">{formatDateTime(comment.createdAt)}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm text-neutral-300">{comment.body}</p>
    </div>
  );
}
