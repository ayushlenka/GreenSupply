import { useEffect, useState } from 'react';

import { createSupplierProduct, fetchGroups, fetchSupplierOrders, fetchSupplierProducts, supplierApproveGroup } from '../api';
import Navbar from '../components/Navbar';

const PRODUCT_NAME_OPTIONS = [
  '9x9 Bagasse Clamshell',
  '12oz Compostable Cup',
  'Cold Cup Lid (PLA)',
  '8oz Soup Container',
  'Fiber Tray',
  'Takeout Paper Bag',
  'Compostable Fork',
  'Compostable Spoon',
  'Compostable Straw',
  'Kraft Napkin'
];

const CATEGORY_OPTIONS = ['container', 'cup', 'clamshell', 'tray', 'bag', 'utensil', 'straw', 'napkin'];
const MATERIAL_OPTIONS = ['compostable fiber', 'bagasse', 'paper', 'kraft paper', 'molded fiber', 'CPLA', 'PLA', 'recycled paper'];

const INIT_FORM = {
  name: '9x9 Bagasse Clamshell',
  category: 'container',
  material: 'compostable fiber',
  available_units: 5000,
  unit_price: 0.25,
  min_order_units: 1
};

export default function SupplierPage({ auth }) {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [approvalCandidates, setApprovalCandidates] = useState([]);
  const [form, setForm] = useState(INIT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approvingGroupId, setApprovingGroupId] = useState('');
  const [error, setError] = useState('');

  const supplierId = auth?.profile?.id;

  const load = async () => {
    if (!supplierId) return;
    setLoading(true);
    try {
      const [p, o, groups] = await Promise.all([fetchSupplierProducts(supplierId), fetchSupplierOrders(supplierId), fetchGroups()]);
      setProducts(p);
      setOrders(o);
      const candidates = groups.filter(
        (group) =>
          group.supplier_business_id === supplierId &&
          group.status === 'capacity_reached' &&
          Number(group.current_units || 0) > 0 &&
          Number(group.business_count || 0) < Number(group.min_businesses_required || 1)
      );
      setApprovalCandidates(candidates);
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

  const onApprove = async (groupId) => {
    if (!supplierId) return;
    setApprovingGroupId(groupId);
    try {
      await supplierApproveGroup(groupId, supplierId);
      await load();
    } catch (err) {
      setError(String(err?.message || 'Failed to approve group'));
    } finally {
      setApprovingGroupId('');
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
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-ink/70">Product Name</span>
                <select value={form.name} onChange={onChange('name')} className="w-full rounded border border-black/15 bg-white px-3 py-2" required>
                  {PRODUCT_NAME_OPTIONS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-ink/70">Category</span>
                <select
                  value={form.category}
                  onChange={onChange('category')}
                  className="w-full rounded border border-black/15 bg-white px-3 py-2"
                  required
                >
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-ink/70">Material</span>
                <select
                  value={form.material}
                  onChange={onChange('material')}
                  className="w-full rounded border border-black/15 bg-white px-3 py-2"
                  required
                >
                  {MATERIAL_OPTIONS.map((material) => (
                    <option key={material} value={material}>
                      {material}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-ink/70">Available Units</span>
                <input
                  type="number"
                  min="1"
                  value={form.available_units}
                  onChange={onChange('available_units')}
                  className="w-full rounded border border-black/15 px-3 py-2"
                  required
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-ink/70">Unit Price (USD)</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.unit_price}
                  onChange={onChange('unit_price')}
                  className="w-full rounded border border-black/15 px-3 py-2"
                  required
                />
              </label>

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
                    <p className="text-ink/70">Units: {o.total_units} | Businesses: {o.business_count}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>

        <section className="mt-6 rounded-xl border border-black/10 bg-white p-5">
          <h2 className="text-lg font-semibold">Approval Needed</h2>
          <p className="mt-1 text-sm text-ink/65">Confirm groups below the business minimum when inventory has been fully reserved.</p>
          {loading ? (
            <p className="mt-4 text-sm text-ink/60">Loading...</p>
          ) : approvalCandidates.length === 0 ? (
            <p className="mt-4 text-sm text-ink/60">No groups currently need supplier approval.</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {approvalCandidates.map((group) => (
                <li key={group.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-black/10 p-3">
                  <div>
                    <p className="font-medium">{group.product?.name || 'Group Order'}</p>
                    <p className="text-ink/70">
                      Group {group.id.slice(0, 8)} | Units: {group.current_units} | Businesses: {group.business_count}/{group.min_businesses_required}
                    </p>
                  </div>
                  <button
                    className="rounded bg-moss px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    onClick={() => onApprove(group.id)}
                    disabled={approvingGroupId === group.id}
                  >
                    {approvingGroupId === group.id ? 'Approving...' : 'Approve & Confirm'}
                  </button>
                </li>
              ))}
            </ul>
          )}
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
                  <p className="text-ink/70">{p.category} | {p.material}</p>
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
