export default function GroupCard({ group, isActive, onSelect, onJoin, style }) {
  const product = group.product || {};
  const pct = Math.round(group.progress_pct || 0);
  const fillClass = pct < 40 ? 'bg-amber-500' : pct < 75 ? 'bg-sage' : 'bg-moss';
  const category = (product.category || '').toLowerCase();

  const retail = product.retail_unit_price || 0;
  const bulk = product.bulk_unit_price || 0;
  const savingsPerUnit = (retail - bulk).toFixed(2);

  const deadline = group.deadline ? new Date(group.deadline) : null;
  const daysLeft = deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24))) : null;

  return (
    <article
      className={`rounded-xl border bg-white p-4 shadow-sm transition ${
        isActive ? 'border-moss shadow-md' : 'border-black/10 hover:border-black/20'
      }`}
      style={style}
      onClick={(e) => {
        if (e.target.closest('button')) return;
        onSelect(group.id);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-ink">{product.name || group.id}</h3>
        <span className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.09em] text-emerald-700">
          {category || 'group'}
        </span>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-ink/60">
          <span>
            {(group.current_units || 0).toLocaleString()} / {(group.target_units || 0).toLocaleString()} units
          </span>
          <span className="font-semibold text-moss">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded bg-emerald-100">
          <div className={`h-full ${fillClass}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-ink/70">
        <span>Save ${savingsPerUnit}/unit</span>
        <span>{group.business_count || 0} businesses</span>
        {daysLeft !== null ? <span>{daysLeft}d left</span> : null}
      </div>

      <button
        className="mt-4 w-full rounded bg-moss px-3 py-2 text-sm font-medium text-parchment transition hover:bg-sage"
        onClick={(e) => {
          e.stopPropagation();
          onJoin(group);
        }}
      >
        Join This Group
      </button>
    </article>
  );
}
