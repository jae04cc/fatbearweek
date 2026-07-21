"use client";
import { useEffect, useRef, useState } from "react";
import type { Bear } from "@/lib/db/schema";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Trash2, Upload } from "lucide-react";

type Draft = Pick<Bear, "number" | "name" | "identification" | "bio" | "isBye" | "sortOrder">;

function draftFromBear(bear: Bear): Draft {
  return {
    number: bear.number,
    name: bear.name,
    identification: bear.identification,
    bio: bear.bio,
    isBye: bear.isBye,
    sortOrder: bear.sortOrder,
  };
}

export function BearEditor() {
  const [bears, setBears] = useState<Bear[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newBear, setNewBear] = useState({ number: "", name: "" });
  const [creating, setCreating] = useState(false);

  const load = () => {
    fetch("/api/admin/bears")
      .then((r) => r.json())
      .then((data: Bear[]) => {
        setBears(Array.isArray(data) ? data : []);
        setDrafts(Object.fromEntries(data.map((b) => [b.id, draftFromBear(b)])));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  const byeCount = bears.filter((b) => b.isBye).length;

  const updateDraft = (id: string, patch: Partial<Draft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const handleSave = async (id: string) => {
    setError(null);
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/bears/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(drafts[id]),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Failed to save");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this bear? This cannot be undone.")) return;
    setError(null);
    const res = await fetch(`/api/admin/bears/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError((await res.json().catch(() => ({})))?.error ?? "Failed to delete bear");
      return;
    }
    load();
  };

  const handleCreate = async () => {
    if (!newBear.number.trim() || !newBear.name.trim()) return;
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/bears", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newBear, sortOrder: bears.length }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Failed to create bear");
      setNewBear({ number: "", name: "" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create bear");
    } finally {
      setCreating(false);
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
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-neutral-400">
        <Badge variant={bears.length === 12 ? "success" : "warning"}>{bears.length}/12 bears</Badge>
        <Badge variant={byeCount === 4 ? "success" : "warning"}>{byeCount}/4 byes</Badge>
      </div>

      <div className="space-y-3">
        {bears.map((bear) => (
          <BearRow
            key={bear.id}
            bear={bear}
            draft={drafts[bear.id]}
            onChange={(patch) => updateDraft(bear.id, patch)}
            onSave={() => handleSave(bear.id)}
            onDelete={() => handleDelete(bear.id)}
            onPhotoUploaded={load}
            saving={savingId === bear.id}
          />
        ))}
      </div>

      {error && <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

      <Card>
        <CardBody className="gap-3">
          <p className="text-sm font-semibold text-neutral-300">Add a bear</p>
          <div className="flex gap-2">
            <Input
              placeholder="Number (e.g. 32)"
              value={newBear.number}
              onChange={(e) => setNewBear((p) => ({ ...p, number: e.target.value }))}
            />
            <Input
              placeholder="Name (e.g. Chunk)"
              value={newBear.name}
              onChange={(e) => setNewBear((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <Button size="sm" onClick={handleCreate} loading={creating}>
            Add bear
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

function BearRow({
  bear,
  draft,
  onChange,
  onSave,
  onDelete,
  onPhotoUploaded,
  saving,
}: {
  bear: Bear;
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  onSave: () => void;
  onDelete: () => void;
  onPhotoUploaded: () => void;
  saving: boolean;
}) {
  const [uploading, setUploading] = useState<"before" | "after" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const beforeInput = useRef<HTMLInputElement>(null);
  const afterInput = useRef<HTMLInputElement>(null);

  const handleFile = async (slot: "before" | "after", file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    setUploading(slot);
    try {
      const formData = new FormData();
      formData.append("slot", slot);
      formData.append("file", file);
      const res = await fetch(`/api/admin/bears/${bear.id}/photo`, { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Upload failed");
      onPhotoUploaded();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const handlePaste = (slot: "before" | "after") => (e: React.ClipboardEvent) => {
    const imageItem = Array.from(e.clipboardData.items).find((item) => item.type.startsWith("image/"));
    if (!imageItem) return;
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (file) handleFile(slot, file);
  };

  if (!draft) return null;

  return (
    <Card>
      <CardBody className="gap-3">
        <div className="flex gap-2">
          <Input value={draft.number} onChange={(e) => onChange({ number: e.target.value })} className="w-24" />
          <Input value={draft.name} onChange={(e) => onChange({ name: e.target.value })} className="flex-1" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Identification
          </label>
          <textarea
            placeholder="Distinguishing features — scars, ear tags, size, coloring…"
            value={draft.identification ?? ""}
            onChange={(e) => onChange({ identification: e.target.value })}
            rows={2}
            className="w-full rounded-xl border border-white/10 bg-surface-elevated px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Biography</label>
          <textarea
            placeholder="This bear's story…"
            value={draft.bio ?? ""}
            onChange={(e) => onChange({ bio: e.target.value })}
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-surface-elevated px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input type="checkbox" checked={draft.isBye} onChange={(e) => onChange({ isBye: e.target.checked })} />
            Has a bye (skips round 1)
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-300">
            Sort order
            <Input
              type="number"
              value={draft.sortOrder}
              onChange={(e) => onChange({ sortOrder: parseInt(e.target.value, 10) || 0 })}
              className="w-16"
            />
          </label>
        </div>

        <div className="flex gap-3">
          <PhotoUploadSlot
            label="Before photo"
            url={bear.photoBeforeUrl}
            uploading={uploading === "before"}
            inputRef={beforeInput}
            onPick={() => beforeInput.current?.click()}
            onFile={(f) => handleFile("before", f)}
            onPaste={handlePaste("before")}
          />
          <PhotoUploadSlot
            label="After photo"
            url={bear.photoAfterUrl}
            uploading={uploading === "after"}
            inputRef={afterInput}
            onPick={() => afterInput.current?.click()}
            onFile={(f) => handleFile("after", f)}
            onPaste={handlePaste("after")}
          />
        </div>
        {uploadError && <p className="text-xs text-danger">{uploadError}</p>}

        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={onSave} loading={saving}>
            Save
          </Button>
          <Button size="sm" variant="danger" onClick={onDelete}>
            <Trash2 size={14} />
            Delete
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function PhotoUploadSlot({
  label,
  url,
  uploading,
  inputRef,
  onPick,
  onFile,
  onPaste,
}: {
  label: string;
  url: string | null;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onPick: () => void;
  onFile: (file: File | undefined) => void;
  onPaste: (e: React.ClipboardEvent) => void;
}) {
  return (
    <div className="flex-1">
      <button
        type="button"
        onClick={onPick}
        onPaste={onPaste}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-surface-elevated flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-accent"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <Upload size={20} className="text-neutral-500" />
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <p className="mt-1 text-center text-xs text-neutral-500">{label} — click, then paste (Ctrl+V) or choose a file</p>
    </div>
  );
}
