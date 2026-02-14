import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { createGroup, fetchProducts, fetchSupplierProducts, joinGroup } from '../api';
import Navbar from '../components/Navbar';

export default function ProductsPage({ auth }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    product_id: '',
    supplier_product_id: '',
    target_units: '',
    min_businesses_required: '5',
    initial_commitment_units: '',
  });

  useEffect(() => {
    Promise.allSettled([fetchProducts(), fetchSupplierProducts()])
      .then(([productsResult, supplierProductsResult]) => {
        const productsData = productsResult.status === 'fulfilled' ? productsResult.value : [];
        const supplierProductsData = supplierProductsResult.status === 'fulfilled' ? supplierProductsResult.value : [];
        setProducts(productsData);
        setSupplierProducts(supplierProductsData);

        if (productsData.length > 0) {
          setForm((prev) => ({ ...prev, product_id: prev.product_id || productsData[0].id }));
        }
        if (supplierProductsData.length > 0) {
          const firstSupplierProduct = supplierProductsData[0];
          setForm((prev) => ({
            ...prev,
            supplier_product_id: prev.supplier_product_id || firstSupplierProduct.id,
            target_units: prev.target_units || String(firstSupplierProduct.available_units),
            initial_commitment_units: prev.initial_commitment_units || String(firstSupplierProduct.min_order_units || 1),
          }));
        }
      })
      .catch(() => {
        setProducts([]);
        setSupplierProducts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedSupplierProduct = useMemo(
    () => supplierProducts.find((item) => item.id === form.supplier_product_id) || null,
    [supplierProducts, form.supplier_product_id]
  );

  const onChange = (key) => (event) => {
    const value = event.target.value;
    setError('');
    setMessage('');
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSupplierProductChange = (event) => {
    const supplierProductId = event.target.value;
    const chosen = supplierProducts.find((item) => item.id === supplierProductId);
    setError('');
    setMessage('');
    setForm((prev) => ({
      ...prev,
      supplier_product_id: supplierProductId,
      target_units: chosen ? String(chosen.available_units) : prev.target_units,
      initial_commitment_units: chosen ? String(chosen.min_order_units || 1) : prev.initial_commitment_units,
    }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const businessId = auth?.profile?.id;
    if (!businessId) {
      setError('Create/load your business profile before proposing an order.');
      return;
    }

    if (!form.product_id || !form.supplier_product_id) {
      setError('Choose both a catalog product and a supplier listing.');
      return;
    }

    const targetUnits = Number(form.target_units);
    const minBusinessesRequired = Number(form.min_businesses_required);
    const initialCommitmentUnits = Number(form.initial_commitment_units);

    if (!Number.isFinite(targetUnits) || targetUnits <= 0) {
      setError('Target units must be greater than 0.');
      return;
    }
    if (!Number.isFinite(minBusinessesRequired) || minBusinessesRequired <= 0) {
      setError('Minimum businesses must be greater than 0.');
      return;
    }
    if (!Number.isFinite(initialCommitmentUnits) || initialCommitmentUnits <= 0) {
      setError('Your initial commitment must be greater than 0.');
      return;
    }

    if (selectedSupplierProduct && targetUnits > Number(selectedSupplierProduct.available_units)) {
      setError(`Target units cannot exceed supplier inventory (${selectedSupplierProduct.available_units}).`);
      return;
    }
    if (initialCommitmentUnits > targetUnits) {
      setError('Your initial commitment cannot exceed target units.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const group = await createGroup({
        product_id: form.product_id,
        created_by_business_id: businessId,
        supplier_business_id: selectedSupplierProduct?.supplier_business_id || null,
        supplier_product_id: form.supplier_product_id,
        target_units: targetUnits,
        min_businesses_required: minBusinessesRequired,
      });

      await joinGroup(group.id, businessId, initialCommitmentUnits);
      setMessage('Group order proposed and your commitment was added.');
      navigate('/groups');
    } catch (err) {
      setError(String(err?.message || 'Unable to create group order.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream text-ink">
      <Navbar
        solid
        isAuthenticated={auth?.isAuthenticated}
        onLogout={auth?.onLogout}
        accountType={auth?.profile?.account_type}
      />

      <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-24 sm:px-7">
        <h1 className="text-3xl font-semibold">Propose Group Order</h1>
        <p className="mt-2 text-sm text-ink/65">
          Choose a supplier listing, set your group target, and auto-join as the first business.
        </p>

        {loading ? (
          <div className="mt-12 text-sm text-ink/60">Loading order data...</div>
        ) : products.length === 0 || supplierProducts.length === 0 ? (
          <div className="mt-12 text-sm text-ink/60">
            {products.length === 0
              ? 'No catalog products found. Seed products first.'
              : 'No supplier listings found. A supplier must add inventory first.'}
          </div>
        ) : (
          <section className="mt-8 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
            <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-ink/70">Catalog Product</span>
                <select
                  value={form.product_id}
                  onChange={onChange('product_id')}
                  className="w-full rounded border border-black/15 px-3 py-2"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category})
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-ink/70">Supplier Listing</span>
                <select
                  value={form.supplier_product_id}
                  onChange={onSupplierProductChange}
                  className="w-full rounded border border-black/15 px-3 py-2"
                >
                  {supplierProducts.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name} - {sp.available_units} units available
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-ink/70">Group Target Units</span>
                <input
                  type="number"
                  min="1"
                  value={form.target_units}
                  onChange={onChange('target_units')}
                  className="w-full rounded border border-black/15 px-3 py-2"
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-ink/70">Minimum Businesses</span>
                <input
                  type="number"
                  min="1"
                  value={form.min_businesses_required}
                  onChange={onChange('min_businesses_required')}
                  className="w-full rounded border border-black/15 px-3 py-2"
                />
              </label>

              <label className="text-sm md:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-ink/70">Your Initial Commitment (Units)</span>
                <input
                  type="number"
                  min="1"
                  value={form.initial_commitment_units}
                  onChange={onChange('initial_commitment_units')}
                  className="w-full rounded border border-black/15 px-3 py-2"
                />
              </label>

              {selectedSupplierProduct ? (
                <div className="rounded bg-emerald-50 p-3 text-sm text-ink/80 md:col-span-2">
                  Supplier inventory cap: <strong>{selectedSupplierProduct.available_units}</strong> units.
                  Unit price: <strong>${Number(selectedSupplierProduct.unit_price).toFixed(2)}</strong>.
                </div>
              ) : null}

              {error ? <p className="text-sm text-red-600 md:col-span-2">{error}</p> : null}
              {message ? <p className="text-sm text-emerald-700 md:col-span-2">{message}</p> : null}

              <button
                type="submit"
                disabled={submitting}
                className="rounded bg-moss px-4 py-2 text-sm font-semibold text-white transition hover:bg-sage disabled:opacity-60 md:col-span-2"
              >
                {submitting ? 'Creating Group...' : 'Create Group Order'}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
