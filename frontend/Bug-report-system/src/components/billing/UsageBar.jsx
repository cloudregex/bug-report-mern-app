export default function UsageBar({ label, used, max, suffix = '' }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const atLimit = used >= max;
  const isWarning = !atLimit && pct >= 80;

  const barColor = atLimit
    ? 'bg-destructive'
    : isWarning
    ? 'bg-amber-500'
    : 'bg-primary';

  const valueColor = atLimit
    ? 'text-destructive font-bold'
    : isWarning
    ? 'text-amber-500 font-semibold'
    : 'text-muted-foreground';

  const displayUsed = suffix ? `${used} ${suffix}` : used;
  const displayMax = suffix ? `${max} ${suffix}` : max;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-semibold">{label}</span>
        <div className="flex items-center gap-2">
          <span className={valueColor}>
            {displayUsed} / {displayMax}
          </span>
          <span className="text-xs text-muted-foreground/60 tabular-nums w-9 text-right">
            {pct}%
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {(atLimit || isWarning) && (
        <p className={`text-xs mt-1 ${atLimit ? 'text-destructive' : 'text-amber-500'}`}>
          {atLimit ? 'Limit reached' : 'Approaching limit'}
        </p>
      )}
    </div>
  );
}
