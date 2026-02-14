import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { fetchProducts } from '../api';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar solid />
      <div className="products-page">
        <h1>Products</h1>
        <p className="subtitle">Sustainable packaging available for bulk ordering</p>

        {loading ? (
          <div className="loading-container" style={{ height: 200 }}>
            <div className="loading-spinner" />
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">No products found. Make sure the backend is running.</div>
        ) : (
          <div className="products-grid">
            {products.map((p) => (
              <div key={p.id} className="product-card">
                <div className="card-top">
                  <div className="product-name">{p.name}</div>
                  <span className={`badge badge-${p.category.toLowerCase()}`}>{p.category}</span>
                </div>
                <div className="product-material">{p.material}</div>
                {p.certifications?.length > 0 && (
                  <div className="product-certs">
                    {p.certifications.map((c) => (
                      <span key={c} className="cert-tag">{c}</span>
                    ))}
                  </div>
                )}
                <div className="product-pricing">
                  <span className="price-item">Retail: <strong>${p.retail_unit_price.toFixed(2)}</strong>/unit</span>
                  <span className="price-item">Bulk: <strong>${p.bulk_unit_price.toFixed(2)}</strong>/unit</span>
                  <span className="price-item">Min: <strong>{p.min_bulk_units}</strong> units</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
