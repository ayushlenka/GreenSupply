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
    supplier_business_id: '',
    supplier_product_id: '',
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

        if (supplierProductsData.length > 0) {
          const firstSupplierProduct = supplierProductsData[0];
          const firstSupplierId = firstSupplierProduct.supplier_business_id;
          setForm((prev) => ({
            ...prev,
            supplier_business_id: prev.supplier_business_id || firstSupplierId,
            supplier_product_id: prev.supplier_product_id || firstSupplierProduct.id,
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

  const supplierOptions = useMemo(() => {
    const seen = new Set();
    const options = [];
    for (const item of supplierProducts) {
      if (!seen.has(item.supplier_business_id)) {
        seen.add(item.supplier_business_id);
        options.push(item.supplier_business_id);
      }
    }
    return options;
  }, [supplierProducts]);

  const supplierNamesById = useMemo(() => {
    const map = {};
    for (const item of supplierProducts) {
      if (!map[item.supplier_business_id] && item.supplier_business_name) {
        map[item.supplier_business_id] = item.supplier_business_name;
      }
    }
    return map;
  }, [supplierProducts]);

  const supplierProductOptions = useMemo(
    () => supplierProducts.filter((item) => item.supplier_business_id === form.supplier_business_id),
    [supplierProducts, form.supplier_business_id]
  );

  const resolvedCatalogProduct = useMemo(() => {
    if (!selectedSupplierProduct) return null;
    const byName = products.find((item) => item.name === selectedSupplierProduct.name);
    if (byName) return byName;

    return (
      products.find(
        (item) =>
          item.category?.toLowerCase() === selectedSupplierProduct.category?.toLowerCase() &&
          item.material?.toLowerCase() === selectedSupplierProduct.material?.toLowerCase()
      ) || null
    );
  }, [products, selectedSupplierProduct]);

  const onChange = (key) => (event) => {
    const value = event.target.value;
    setError('');
    setMessage('');
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSupplierChange = (event) => {
    const supplierBusinessId = event.target.value;
    const options = supplierProducts.filter((item) => item.supplier_business_id === supplierBusinessId);
    const first = options[0] || null;
    setError('');
    setMessage('');
    setForm((prev) => ({
      ...prev,
      supplier_business_id: supplierBusinessId,
      supplier_product_id: first ? first.id : '',
      initial_commitment_units: first ? String(first.min_order_units || 1) : prev.initial_commitment_units,
    }));
  };

  const onSupplierProductChange = (event) => {
    const supplierProductId = event.target.value;
    const chosen = supplierProducts.find((item) => item.id === supplierProductId);
    setError('');
    setMessage('');
    setForm((prev) => ({
      ...prev,
      supplier_product_id: supplierProductId,
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

    if (!form.supplier_business_id || !form.supplier_product_id) {
      setError('Choose both a supplier and a product.');
      return;
    }

    const minBusinessesRequired = Number(form.min_businesses_required);
    const initialCommitmentUnits = Number(form.initial_commitment_units);

    if (!Number.isFinite(minBusinessesRequired) || minBusinessesRequired <= 0) {
      setError('Minimum businesses must be greater than 0.');
      return;
    }
    if (!Number.isFinite(initialCommitmentUnits) || initialCommitmentUnits <= 0) {
      setError('Your initial commitment must be greater than 0.');
      return;
    }

    if (!selectedSupplierProduct) {
      setError('Selected supplier product not found.');
      return;
    }
    if (!resolvedCatalogProduct) {
      setError('No matching catalog product found for this supplier listing.');
      return;
    }
    if (initialCommitmentUnits > Number(selectedSupplierProduct.available_units)) {
      setError(`Your requested units cannot exceed supplier inventory (${selectedSupplierProduct.available_units}).`);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const group = await createGroup({
        product_id: resolvedCatalogProduct.id,
        created_by_business_id: businessId,
        supplier_business_id: form.supplier_business_id,
        supplier_product_id: form.supplier_product_id,
        target_units: Number(selectedSupplierProduct.available_units),
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
          Choose a supplier and product. Group capacity is set to the supplier's full available inventory.
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
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-ink/70">Supplier</span>
                <select
                  value={form.supplier_business_id}
                  onChange={onSupplierChange}
                  className="w-full rounded border border-black/15 px-3 py-2"
                >
                  {supplierOptions.map((supplierId) => (
                    <option key={supplierId} value={supplierId}>
                      {supplierNamesById[supplierId] || `Supplier ${supplierId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-ink/70">Product</span>
                <select
                  value={form.supplier_product_id}
                  onChange={onSupplierProductChange}
                  className="w-full rounded border border-black/15 px-3 py-2"
                >
                  {supplierProductOptions.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name} ({sp.available_units} available)
                    </option>
                  ))}
                </select>
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
                  Group capacity (auto): <strong>{selectedSupplierProduct.available_units}</strong> units.
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
