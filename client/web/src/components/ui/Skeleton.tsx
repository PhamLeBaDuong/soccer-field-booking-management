import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[8px] bg-gradient-to-r from-stone-200/80 via-stone-100 to-stone-200/80 bg-[length:200%_100%]",
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-[8px] border border-stone-200/75 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_14px_44px_rgba(12,12,12,0.06)]">
      <Skeleton className="h-3.5 w-1/3" />
      <Skeleton className="mt-4 h-6 w-2/3" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-4/5" />
      <Skeleton className="mt-6 h-10 w-full" />
    </div>
  );
}
