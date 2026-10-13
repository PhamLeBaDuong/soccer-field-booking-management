"use client";
import { useCallback, useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getPermanentResourceLink, type InvitationKind } from "@/lib/api/shareInvitations";
import { copyToClipboard } from "@/lib/utils/clipboard";

export function TeamInvitationLink({ teamId }: { teamId: string }) {
  return <InvitationLink kind="team" targetId={teamId} />;
}

export function InvitationLink({ kind, targetId }: { kind: InvitationKind; targetId: string }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const load = useCallback(async () => {
    setError("");
    try {
      const link = await getPermanentResourceLink(kind, targetId);
      setUrl(`${window.location.origin}/invite/${link.token}`);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load invitation link."); }
  }, [kind, targetId]);
  useEffect(() => { void load(); }, [load]);
  async function copy() {
    try { await copyToClipboard(url); setCopied(true); setError(""); }
    catch { setError("Select and copy the link directly from the field."); }
  }
  return <div className="space-y-2">
    <label className="block text-sm font-semibold" htmlFor={`invitation-link-${kind}-${targetId}`}>{kind === "team" ? "Team invitation link" : kind === "lobby" ? "Lobby join link" : "Match request link"}</label>
    <div className="flex gap-2">
      <input id={`invitation-link-${kind}-${targetId}`} className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
        value={url} readOnly placeholder={error ? "Link unavailable" : "Loading invitation link…"} onFocus={e => e.target.select()} />
      <Button variant="secondary" disabled={!url} onClick={copy}>
        {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
    {error && <div><p role="alert" className="text-sm text-red-700">{error}</p>{!url && <Button size="sm" variant="secondary" onClick={load}>Retry</Button>}</div>}
  </div>;
}
