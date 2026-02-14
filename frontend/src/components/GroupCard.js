export default function GroupCard({ group, isActive, onSelect, onJoin, style }) {
  const product = group.product || {};
  const pct = Math.round(group.progress_pct || 0);
  const fillCls = pct < 40 ? 'fill-low' : pct < 75 ? 'fill-mid' : 'fill-high';
  const category = (product.category || '').toLowerCase();

  const retail = product.retail_unit_price || 0;
  const bulk = product.bulk_unit_price || 0;
  const savingsPerUnit = (retail - bulk).toFixed(2);

  const deadline = group.deadline ? new Date(group.deadline) : null;
  const daysLeft = deadline
    ? Math.max(0, Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div
      className={`group-card ${isActive ? 'active' : ''}`}
      style={style}
      onClick={(e) => {
        if (e.target.classList.contains('join-btn')) return;
        onSelect(group.id);
      }}
    >
      <div className="card-top">
        <div className="card-name">{product.name || group.id}</div>
        <span className={`badge badge-${category}`}>{category}</span>
      </div>

      <div className="progress-wrap">
        <div className="progress-meta">
          <span>{(group.current_units || 0).toLocaleString()} / {(group.target_units || 0).toLocaleString()} units</span>
          <span className="pct">{pct}%</span>
        </div>
        <div className="progress-track">
          <div className={`progress-fill ${fillCls}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="card-footer">
        <div className="card-stats">
          <span className="stat-chip">Save ${savingsPerUnit}/unit</span>
          <span className="stat-chip">{group.business_count || 0} businesses</span>
        </div>
        {daysLeft !== null && (
          <span className={`deadline ${daysLeft <= 2 ? 'urgent' : ''}`}>
            {daysLeft <= 2 ? '⚠ ' : ''}{daysLeft}d left
          </span>
        )}
      </div>

      <button className="join-btn" onClick={(e) => { e.stopPropagation(); onJoin(group); }}>
        Join This Group →
      </button>
    </div>
  );
}
