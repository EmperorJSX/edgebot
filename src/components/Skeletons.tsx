// Loading skeletons for every fetch-shaped surface. Colors come from the
// shimmer CSS vars, so they flip with the theme.

export function Skeleton({ className }: { className: string }) {
  return <div className={"shimmer rounded-md " + className} />;
}

export function AlertsSkeleton() {
  return (
    <section className="flex items-center gap-3 rounded-xl border border-line bg-panel px-5 py-3">
      <Skeleton className="h-4 w-40 shrink-0" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="hidden h-8 w-64 md:block" />
    </section>
  );
}

export function FeedSkeleton() {
  return (
    <section className="rounded-xl border border-line bg-panel px-5 py-4">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-7 w-56" />
      </div>
      {Array.from({ length: 7 }, (_, i) => (
        <Skeleton key={i} className="mb-2.5 h-9 w-full" />
      ))}
    </section>
  );
}

export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <section className="rounded-xl border border-line bg-panel px-5 py-4">
      <Skeleton className="mb-4 h-4 w-36" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="mb-2.5 h-9 w-full" />
      ))}
    </section>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-line bg-panel p-5 md:col-span-3 lg:col-span-1">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="mt-4 h-56 w-full" />
    </div>
  );
}

export function TileSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-panel p-5">
      <Skeleton className="h-3 w-24" />
      <div className="shimmer mt-1 h-14 w-14 rounded-full" />
      <Skeleton className="h-8 w-28" />
      <Skeleton className="mt-auto h-8 w-full" />
    </div>
  );
}
