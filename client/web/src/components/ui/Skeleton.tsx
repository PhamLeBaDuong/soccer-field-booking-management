import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-[8px] bg-stone-200/80", className)}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-[8px] border border-stone-200 bg-white/80 p-5 shadow-[0_18px_48px_rgba(23,23,23,0.06)]">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="mt-4 h-6 w-2/3" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-4/5" />
      <Skeleton className="mt-5 h-10 w-full" />
    </div>
  );
}
