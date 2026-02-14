import { useState, useEffect, useRef } from 'react';

export default function JoinModal({ group, open, onClose, onSubmit }) {
  const [units, setUnits] = useState('');
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setUnits('');
      setError(false);
      setSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  if (!group) return null;

  const product = group.product || {};
  const retail = product.retail_unit_price || 0;
  const bulk = product.bulk_unit_price || 0;
  const savingsPerUnit = retail - bulk;
  const u = parseInt(units) || 0;

  const totalSaved = u > 0 ? (savingsPerUnit * u).toFixed(2) : null;
  const pctOff = retail > 0 ? Math.round((1 - bulk / retail) * 100) : 0;

  const handleSubmit = async () => {
    if (u < 1) {
      setError(true);
      return;
    }
    setSubmitting(true);
    await onSubmit(group.id, u);
    setSubmitting(false);
  };

  return (
    <div
      className={`modal-overlay ${open ? 'open' : ''}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="eyebrow">Join Buying Group</div>
        <h2>{product.name || 'Product'}</h2>
        <div className="modal-sub">{product.category || ''}</div>

        <div className="modal-field">
          <label>Units you need this month</label>
          <input
            ref={inputRef}
            type="number"
            placeholder="e.g. 200"
            min="1"
            value={units}
            className={error && u < 1 ? 'error' : ''}
            onChange={(e) => { setUnits(e.target.value); setError(false); }}
          />
        </div>

        <div className="savings-preview">
          <div className="savings-label">Estimated savings</div>
          <div className="savings-amount">{totalSaved ? `$${totalSaved}` : '—'}</div>
          <div className="savings-sub">
            {totalSaved
              ? `${pctOff}% off retail`
              : 'Enter units above to calculate'}
          </div>
        </div>

        <button className="modal-submit" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Joining...' : 'Commit to Group →'}
        </button>
      </div>
    </div>
  );
}
