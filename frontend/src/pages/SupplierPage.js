import { useEffect, useState } from 'react';

import { createSupplierProduct, fetchSupplierOrders, fetchSupplierProducts } from '../api';
import Navbar from '../components/Navbar';

const INIT_FORM = {
  name: '',
  category: 'container',
  material: 'compostable fiber',
  available_units: 5000,
  unit_price: 0.25,
  min_order_units: 500
};

export default function SupplierPage({ auth }) {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(INIT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const supplierId = auth?.profile?.id;

  const load = async () => {
    if (!supplierId) return;
    setLoading(true);
    try {
      const [p, o] = await Promise.all([fetchSupplierProducts(supplierId), fetchSupplierOrders(supplierId)]);
      setProducts(p);
      setOrders(o);
      setError('');
    } catch (err) {
      setError(String(err?.message || 'Failed to load supplier data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId]);

  const onChange = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const onCreate = async (e) => {
    e.preventDefault();
    if (!supplierId) return;
    setSaving(true);
    try {
      await createSupplierProduct({
        supplier_business_id: supplierId,
        name: form.name,
        category: form.category,
        material: form.material,
        available_units: Number(form.available_units),
        unit_price: Number(form.unit_price),
        min_order_units: Number(form.min_order_units)
      });
      setForm(INIT_FORM);
      await load();
    } catch (err) {
      setError(String(err?.message || 'Failed to create supplier product'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream text-ink">
      <Navbar solid isAuthenticated={auth?.isAuthenticated} onLogout={auth?.onLogout} accountType="supplier" />

      <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-24 sm:px-7">
        <h1 className="text-3xl font-semibold">Supplier Dashboard</h1>
        <p className="mt-2 text-sm text-ink/65">Manage available inventory and view auto-confirmed group orders.</p>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <article className="rounded-xl border border-black/10 bg-white p-5">
            <h2 className="text-lg font-semibold">Add Product Inventory</h2>
            <form className="mt-4 grid grid-cols-1 gap-3" onSubmit={onCreate}>
              <input value={form.name} onChange={onChange('name')} placeholder="Product name" className="rounded border border-black/15 px-3 py-2" required />
              <input value={form.category} onChange={onChange('category')} placeholder="Category" className="rounded border border-black/15 px-3 py-2" required />
              <input value={form.material} onChange={onChange('material')} placeholder="Material" className="rounded border border-black/15 px-3 py-2" required />
              <input type="number" value={form.available_units} onChange={onChange('available_units')} placeholder="Available units" className="rounded border border-black/15 px-3 py-2" required />
              <input type="number" step="0.01" value={form.unit_price} onChange={onChange('unit_price')} placeholder="Unit price" className="rounded border border-black/15 px-3 py-2" required />
              <input type="number" value={form.min_order_units} onChange={onChange('min_order_units')} placeholder="Min order units" className="rounded border border-black/15 px-3 py-2" required />
              <button className="rounded bg-moss px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={saving}>
                {saving ? 'Saving...' : 'Add Product'}
              </button>
            </form>
          </article>

          <article className="rounded-xl border border-black/10 bg-white p-5">
            <h2 className="text-lg font-semibold">Confirmed Orders</h2>
            {loading ? (
              <p className="mt-4 text-sm text-ink/60">Loading...</p>
            ) : orders.length === 0 ? (
              <p className="mt-4 text-sm text-ink/60">No confirmed orders yet.</p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm">
                {orders.map((o) => (
                  <li key={o.id} className="rounded border border-black/10 p-3">
                    <p className="font-medium">Group {o.group_id}</p>
                    <p className="text-ink/70">Units: {o.total_units} · Businesses: {o.business_count}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>

        <section className="mt-6 rounded-xl border border-black/10 bg-white p-5">
          <h2 className="text-lg font-semibold">Current Inventory</h2>
          {loading ? (
            <p className="mt-4 text-sm text-ink/60">Loading...</p>
          ) : products.length === 0 ? (
            <p className="mt-4 text-sm text-ink/60">No products added yet.</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((p) => (
                <article key={p.id} className="rounded border border-black/10 p-3 text-sm">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-ink/70">{p.category} · {p.material}</p>
                  <p className="text-ink/70">Available: {p.available_units}</p>
                  <p className="text-ink/70">Unit price: ${Number(p.unit_price).toFixed(2)}</p>
                  <p className="text-ink/70">Status: {p.status}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
