import { useEffect, useState } from 'react';

import { fetchProducts } from '../api';
import Navbar from '../components/Navbar';

export default function ProductsPage({ auth }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-cream text-ink">
      <Navbar solid isAuthenticated={auth?.isAuthenticated} onLogout={auth?.onLogout} />

      <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-24 sm:px-7">
        <h1 className="text-3xl font-semibold">Products</h1>
        <p className="mt-2 text-sm text-ink/65">Sustainable packaging available for bulk ordering</p>

        {loading ? (
          <div className="mt-12 text-sm text-ink/60">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="mt-12 text-sm text-ink/60">No products found. Make sure backend is running.</div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((p) => (
              <article key={p.id} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold">{p.name}</h2>
                  <span className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-700">
                    {p.category}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink/65">{p.material}</p>

                {p.certifications?.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.certifications.map((c) => (
                      <span key={c} className="rounded bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-moss">
                        {c}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 grid grid-cols-1 gap-1 text-sm text-ink/75">
                  <p>
                    Retail: <strong className="text-moss">${p.retail_unit_price.toFixed(2)}</strong>/unit
                  </p>
                  <p>
                    Bulk: <strong className="text-moss">${p.bulk_unit_price.toFixed(2)}</strong>/unit
                  </p>
                  <p>
                    Min: <strong className="text-moss">{p.min_bulk_units}</strong> units
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
