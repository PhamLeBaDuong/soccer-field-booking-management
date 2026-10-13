export function DemoAccountNotice() {
  if (process.env.NEXT_PUBLIC_INVITATION_DEMO !== "true") return null;
  return <div role="note" className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
    <p className="font-semibold">Invitation demo — sample accounts only</p>
    <p className="mt-1">Your real account won’t work here. Sign in with <strong>player / demo123</strong> or <strong>owner / demo123</strong>, or create a sample account.</p>
    <p className="mt-1">Sample accounts are cleared when the demo restarts.</p>
  </div>;
}
