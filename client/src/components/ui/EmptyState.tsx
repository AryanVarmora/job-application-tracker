export function EmptyState({ message = "Not enough data yet" }: { message?: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">
      {message}
    </div>
  );
}
