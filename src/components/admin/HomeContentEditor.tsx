"use client";
import { useEffect, useRef, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FloatingActions } from "@/components/ui/FloatingActions";
import { generateId } from "@/lib/utils";
import { Trash2, ImagePlus, Image as ImageIcon, ChevronUp, ChevronDown } from "lucide-react";
import type { HomeContentBlock } from "@/lib/settings";

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/admin/home/image", { method: "POST", body: formData });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Failed to upload image");
  return body.url as string;
}

export function HomeContentEditor() {
  const [blocks, setBlocks] = useState<HomeContentBlock[]>([]);
  const [paymentInfo, setPaymentInfo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [coverUploadingId, setCoverUploadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/home")
      .then((r) => r.json())
      .then((data) => {
        setBlocks(data.blocks ?? []);
        setPaymentInfo(data.paymentInfo ?? "");
        setLoading(false);
      });
  }, []);

  const updateBlock = (id: string, patch: Partial<HomeContentBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    setSaved(false);
  };

  // Stored array order IS display order, newest first — so a new post goes on
  // the front of the list, and this editor shows posts in exactly the order
  // players see them.
  const addBlock = () => {
    setBlocks((prev) => [{ id: generateId(), title: "", body: "" }, ...prev]);
    setSaved(false);
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSaved(false);
  };

  const moveBlock = (id: string, direction: -1 | 1) => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSaved(false);
  };

  // Header/cover image — the one image shown above the block, separate from
  // any images embedded inline in the body text.
  const handleCoverImageFile = async (blockId: string, file: File | undefined) => {
    if (!file) return;
    setError(null);
    setCoverUploadingId(blockId);
    try {
      const url = await uploadImage(file);
      updateBlock(blockId, { imageUrl: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload image");
    } finally {
      setCoverUploadingId(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/home", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks, paymentInfo }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    // pb-24 keeps the last post clear of the floating Save button
    <div className="space-y-4 pb-24">
      {error && <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

      <Card>
        <CardBody className="gap-2">
          <div>
            <p className="font-semibold text-neutral-100">Payment info</p>
            <p className="text-xs text-neutral-500">
              Shown in a compact box above the posts on the home page. Markdown works. Leave empty to hide it.
            </p>
          </div>
          <textarea
            placeholder="e.g. **$20 per bracket** — Venmo @someone"
            value={paymentInfo}
            onChange={(e) => {
              setPaymentInfo(e.target.value);
              setSaved(false);
            }}
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-surface-elevated px-4 py-3 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </CardBody>
      </Card>

      {/* Add sits above the list because new posts go to the top — the order
          here is the order players see, newest first. Save is floating. */}
      <Button size="sm" variant="secondary" onClick={addBlock}>
        Add post
      </Button>

      {blocks.map((block, index) => (
        <BlockEditor
          key={block.id}
          block={block}
          coverUploading={coverUploadingId === block.id}
          onChange={(patch) => updateBlock(block.id, patch)}
          onCoverFile={(file) => handleCoverImageFile(block.id, file)}
          onRemoveCoverImage={() => updateBlock(block.id, { imageUrl: undefined })}
          onRemove={() => removeBlock(block.id)}
          onMove={(direction) => moveBlock(block.id, direction)}
          canMoveUp={index > 0}
          canMoveDown={index < blocks.length - 1}
          onError={setError}
        />
      ))}

      <FloatingActions>
        <Button onClick={handleSave} loading={saving}>
          {saved ? "Saved!" : "Save"}
        </Button>
      </FloatingActions>
    </div>
  );
}

function BlockEditor({
  block,
  coverUploading,
  onChange,
  onCoverFile,
  onRemoveCoverImage,
  onRemove,
  onMove,
  canMoveUp,
  canMoveDown,
  onError,
}: {
  block: HomeContentBlock;
  coverUploading: boolean;
  onChange: (patch: Partial<HomeContentBlock>) => void;
  onCoverFile: (file: File | undefined) => void;
  onRemoveCoverImage: () => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onError: (message: string | null) => void;
}) {
  const coverFileInput = useRef<HTMLInputElement>(null);
  const inlineFileInput = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inlineUploading, setInlineUploading] = useState(false);

  // Uploads the file to the server, then inserts markdown `![](url)` at the
  // textarea's current cursor position (or appends to the end as a fallback).
  const insertInlineImage = async (file: File | undefined) => {
    if (!file) return;
    onError(null);
    setInlineUploading(true);
    try {
      const url = await uploadImage(file);
      const textarea = textareaRef.current;
      const markdown = `![](${url})`;
      const start = textarea?.selectionStart ?? block.body.length;
      const end = textarea?.selectionEnd ?? block.body.length;
      const needsLeadingNewline = start > 0 && block.body[start - 1] !== "\n";
      const insertion = `${needsLeadingNewline ? "\n" : ""}${markdown}\n`;
      const nextBody = block.body.slice(0, start) + insertion + block.body.slice(end);
      onChange({ body: nextBody });

      // Restore focus/cursor just after the inserted image once React re-renders
      requestAnimationFrame(() => {
        if (!textarea) return;
        const cursor = start + insertion.length;
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
      });
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to upload image");
    } finally {
      setInlineUploading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imageItem = Array.from(e.clipboardData.items).find((item) => item.type.startsWith("image/"));
    if (!imageItem) return;
    e.preventDefault();
    insertInlineImage(imageItem.getAsFile() ?? undefined);
  };

  return (
    <Card>
      <CardBody className="gap-2">
        <Input placeholder="Title" value={block.title} onChange={(e) => onChange({ title: e.target.value })} />
        <textarea
          ref={textareaRef}
          placeholder="Body text (Markdown) — paste an image anywhere in here to embed it inline"
          value={block.body}
          onChange={(e) => onChange({ body: e.target.value })}
          onPaste={handlePaste}
          rows={5}
          className="w-full rounded-xl border border-white/10 bg-surface-elevated px-4 py-3 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <div>
          <Button
            size="sm"
            variant="secondary"
            loading={inlineUploading}
            onClick={() => inlineFileInput.current?.click()}
          >
            <ImageIcon size={14} />
            Insert image in text
          </Button>
          <input
            ref={inlineFileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              insertInlineImage(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 pt-1">Cover image (shown above the block)</p>
        {block.imageUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={block.imageUrl} alt="" className="max-h-64 w-full rounded-xl object-cover" />
            <button
              type="button"
              onClick={onRemoveCoverImage}
              className="absolute right-2 top-2 rounded-lg bg-black/70 px-2 py-1 text-xs font-semibold text-white"
            >
              Remove image
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => coverFileInput.current?.click()}
            disabled={coverUploading}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-4 text-sm text-neutral-400"
          >
            {coverUploading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent" />
            ) : (
              <ImagePlus size={16} />
            )}
            Add cover image
          </button>
        )}
        <input
          ref={coverFileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => onCoverFile(e.target.files?.[0])}
        />

        <div className="flex items-center gap-2">
          <Button size="sm" variant="danger" onClick={onRemove}>
            <Trash2 size={14} />
            Remove post
          </Button>
          {/* Reorder, so posts carried over from before "newest first" — or any
              post that should be pinned higher — can be moved without retyping. */}
          <Button size="sm" variant="secondary" onClick={() => onMove(-1)} disabled={!canMoveUp} aria-label="Move post up">
            <ChevronUp size={14} />
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onMove(1)} disabled={!canMoveDown} aria-label="Move post down">
            <ChevronDown size={14} />
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
