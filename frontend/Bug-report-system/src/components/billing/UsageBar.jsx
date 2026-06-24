export default function UsageBar({ label, used, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const atLimit = used >= max;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-semibold">{label}</span>
        <span className={atLimit ? 'text-destructive font-bold' : 'text-muted-foreground'}>
          {used} / {max}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${atLimit ? 'bg-destructive' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
