import { useEffect, useRef, useState } from 'react';

export default function JoinModal({ group, open, onClose, onSubmit }) {
  const [units, setUnits] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setUnits('');
      setError('');
      setSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  if (!open || !group) return null;

  const product = group.product || {};
  const retail = product.retail_unit_price || 0;
  const bulk = product.bulk_unit_price || 0;
  const savingsPerUnit = retail - bulk;
  const parsedUnits = parseInt(units, 10) || 0;

  const maxAllowed = Math.max(
    0,
    Number.isFinite(group.remaining_units)
      ? group.remaining_units
      : (group.target_units || 0) - (group.current_units || 0)
  );

  const totalSaved = parsedUnits > 0 ? (savingsPerUnit * parsedUnits).toFixed(2) : null;
  const pctOff = retail > 0 ? Math.round((1 - bulk / retail) * 100) : 0;

  const handleSubmit = async () => {
    if (parsedUnits < 1) {
      setError('Enter at least 1 unit.');
      return;
    }
    if (parsedUnits > maxAllowed) {
      setError(`Max you can commit right now is ${maxAllowed} units.`);
      return;
    }

    setSubmitting(true);
    const result = await onSubmit(group.id, parsedUnits);
    if (result?.ok === false) {
      setError(result.message || 'Unable to join group.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md rounded-xl bg-cream p-6 shadow-2xl sm:p-8">
        <button className="absolute right-4 top-3 text-xl text-ink/40 hover:text-ink" onClick={onClose}>
          x
        </button>

        <p className="text-xs uppercase tracking-[0.12em] text-sage">Join Buying Group</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">{product.name || 'Product'}</h2>
        <p className="mt-1 text-sm text-ink/60">{product.category || ''}</p>

        <div className="mt-6">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-ink/70">
            Units you need this month
          </label>
          <input
            ref={inputRef}
            type="number"
            placeholder="e.g. 200"
            min="1"
            max={maxAllowed}
            value={units}
            className={`w-full rounded border px-3 py-2 outline-none ${error ? 'border-red-500' : 'border-black/20 focus:border-moss'}`}
            onChange={(e) => {
              setUnits(e.target.value);
              setError('');
            }}
          />
        </div>

        <div className="mt-4 rounded bg-emerald-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-moss">Estimated savings</p>
          <p className="mt-1 text-2xl font-semibold text-moss">{totalSaved ? `$${totalSaved}` : '-'}</p>
          <p className="text-xs text-moss/80">{totalSaved ? `${pctOff}% off retail` : 'Enter units to calculate'}</p>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <button
          className="mt-6 w-full rounded bg-moss px-3 py-2.5 text-sm font-semibold text-parchment transition hover:bg-sage disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleSubmit}
          disabled={submitting || maxAllowed <= 0}
        >
          {submitting ? 'Joining...' : maxAllowed <= 0 ? 'Group Capacity Reached' : 'Commit to Group'}
        </button>
      </div>
    </div>
  );
}
