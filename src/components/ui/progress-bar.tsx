export function ProgressBar({ value, label }: { value: number; label: string }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} className="h-2 w-full overflow-hidden rounded-full bg-primary-soft">
      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${v}%` }} />
    </div>
  );
}
