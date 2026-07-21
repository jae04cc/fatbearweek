"use client";
import { useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Copy } from "lucide-react";

export function SignupCodePanel() {
  const [code, setCode] = useState("");
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setCode(data.signupCode ?? "");
        setSavedCode(data.signupCode ?? null);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signupCode: code }),
      });
      setSavedCode(code);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/signup`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <Card>
      <CardBody className="gap-3">
        <p className="font-semibold text-neutral-100">Self-service sign-up</p>
        <p className="text-sm text-neutral-400">
          Anyone with this invite code can create their own account at <span className="font-mono">/signup</span>.
          Leave it blank to turn self-service sign-up off entirely.
        </p>
        <Input placeholder="e.g. fatbear2026" value={code} onChange={(e) => setCode(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} loading={saving}>
            {saved ? "Saved!" : "Save"}
          </Button>
          <Button size="sm" variant="secondary" onClick={handleCopyLink} disabled={!savedCode}>
            <Copy size={14} />
            {copied ? "Copied!" : "Copy sign-up link"}
          </Button>
        </div>
        {!savedCode && <p className="text-xs text-warning">Sign-up is currently off — set a code above to enable it.</p>}
      </CardBody>
    </Card>
  );
}
