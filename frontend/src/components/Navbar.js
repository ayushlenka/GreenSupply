import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ solid, isAuthenticated, onLogout, showLinks = true, accountType }) {
  const location = useLocation();
  const navCls = solid
    ? 'fixed top-0 left-0 right-0 z-50 border-b border-emerald-100/80 bg-white/95 backdrop-blur'
    : 'absolute top-0 left-0 right-0 z-50 border-b border-emerald-100/70 bg-white/75 backdrop-blur';

  const linkCls = (path) =>
    `text-xs uppercase tracking-[0.12em] transition ${
      location.pathname === path ? 'text-moss' : 'text-ink/65 hover:text-moss'
    }`;

  const isSupplier = accountType === 'supplier';

  return (
    <nav className={`${navCls} px-4 py-4 sm:px-7`}>
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        <Link to="/" className="text-lg font-semibold text-ink">
          Green<span className="text-fern">Supply</span>
        </Link>

        {showLinks && isAuthenticated ? (
          <div className="flex items-center gap-5 sm:gap-7">
            {isSupplier ? (
              <Link to="/supplier" className={linkCls('/supplier')}>
                Supplier Dashboard
              </Link>
            ) : (
              <>
                <Link to="/groups" className={linkCls('/groups')}>
                  Groups
                </Link>
                <Link to="/products" className={linkCls('/products')}>
                  Products
                </Link>
                <Link to="/dashboard" className={linkCls('/dashboard')}>
                  Dashboard
                </Link>
              </>
            )}
            <button
              onClick={onLogout}
              className="rounded bg-moss px-3 py-2 text-xs font-medium uppercase tracking-[0.1em] text-white transition hover:bg-sage"
            >
              Logout
            </button>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
