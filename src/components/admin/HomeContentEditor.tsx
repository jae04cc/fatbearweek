"use client";
import { useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { generateId } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import type { HomeContentBlock } from "@/lib/settings";

export function HomeContentEditor() {
  const [blocks, setBlocks] = useState<HomeContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/home")
      .then((r) => r.json())
      .then((data) => {
        setBlocks(data.blocks ?? []);
        setLoading(false);
      });
  }, []);

  const updateBlock = (id: string, patch: Partial<HomeContentBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    setSaved(false);
  };

  const addBlock = () => {
    setBlocks((prev) => [...prev, { id: generateId(), title: "", body: "" }]);
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/home", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks }),
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
    <div className="space-y-4">
      {blocks.map((block) => (
        <Card key={block.id}>
          <CardBody className="gap-2">
            <Input
              placeholder="Title"
              value={block.title}
              onChange={(e) => updateBlock(block.id, { title: e.target.value })}
            />
            <textarea
              placeholder="Body text"
              value={block.body}
              onChange={(e) => updateBlock(block.id, { body: e.target.value })}
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-surface-elevated px-4 py-3 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <Button size="sm" variant="danger" onClick={() => removeBlock(block.id)} className="self-start">
              <Trash2 size={14} />
              Remove
            </Button>
          </CardBody>
        </Card>
      ))}

      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={addBlock}>
          Add block
        </Button>
        <Button size="sm" onClick={handleSave} loading={saving}>
          {saved ? "Saved!" : "Save"}
        </Button>
      </div>
    </div>
  );
}
