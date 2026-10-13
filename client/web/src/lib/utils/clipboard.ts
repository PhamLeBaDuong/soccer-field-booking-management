export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    try { await navigator.clipboard.writeText(text); return; } catch { /* Try the HTTP-compatible fallback. */ }
  }
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const input = document.createElement("textarea");
  input.value = text;
  input.readOnly = true;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  try {
    input.focus(); input.select();
    if (!document.execCommand("copy")) throw new Error("Clipboard access unavailable");
  } finally { input.remove(); previous?.focus(); }
}
