"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { cn, formatDateTime } from "@/lib/utils";

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

// Mounted only when its post is expanded, so the feed doesn't fetch every
// thread on load — the counts shown while collapsed come from /api/home.
export function PostComments({
  blockId,
  onCountChange,
}: {
  blockId: string;
  onCountChange: (count: number) => void;
}) {
  const { data: session } = useSession();
  const isAdmin = session?.user.isAdmin ?? false;
  const [comments, setComments] = useState<PostComment[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/posts/${blockId}/comments`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setComments(data.comments ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [blockId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;

    setError(null);
    setSending(true);
    try {
      const res = await fetch(`/api/posts/${blockId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to post comment");
      setComments((prev) => {
        const next = [...prev, data];
        onCountChange(next.length);
        return next;
      });
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post comment");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({})))?.error ?? "Failed to delete comment");
      }
      setComments((prev) => {
        const next = prev.filter((c) => c.id !== id);
        onCountChange(next.length);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete comment");
    }
  };

  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      {loading ? (
        <p className="text-xs text-neutral-500">Loading comments…</p>
      ) : (
        <>
          {comments.length > 0 && (
            <div className="mb-3 space-y-3">
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
          )}

          <form onSubmit={handleSend} className="flex items-center gap-2">
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

          {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
        </>
      )}
    </div>
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

  const start = () => {
    if (!canDelete) return;
    setPressing(true);
    timerRef.current = setTimeout(() => {
      setPressing(false);
      if (confirm("Delete this comment?")) onDelete(comment.id);
    }, LONG_PRESS_MS);
  };

  const cancel = () => {
    setPressing(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
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
