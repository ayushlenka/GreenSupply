import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import greensupplyLogo from '../assets/greensupply-logo.svg';

export default function Navbar({ solid, isAuthenticated, onLogout, showLinks = true, accountType, onGoogleLogin, tone = 'default' }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navCls = tone === 'tan'
    ? (solid
      ? 'fixed top-0 left-0 right-0 z-50 border-b border-[rgba(107,128,116,0.16)] bg-[#ebe7db]/95 backdrop-blur'
      : 'absolute top-0 left-0 right-0 z-50 border-b border-[rgba(107,128,116,0.16)] bg-[#ebe7db]/85 backdrop-blur')
    : (solid
      ? 'fixed top-0 left-0 right-0 z-50 border-b border-emerald-100/80 bg-white/95 backdrop-blur'
      : 'absolute top-0 left-0 right-0 z-50 border-b border-emerald-100/70 bg-white/75 backdrop-blur');

  const linkCls = (path) =>
    `text-xs uppercase tracking-[0.12em] transition ${
      location.pathname === path ? 'text-moss' : 'text-ink/65 hover:text-moss'
    }`;

  const isSupplier = accountType === 'supplier';

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const navLinks = isSupplier
    ? [{ to: '/supplier', label: 'Supplier Dashboard' }]
    : [
        { to: '/groups', label: 'Groups' },
        { to: '/orders', label: 'Orders' },
        { to: '/dashboard', label: 'Dashboard' },
      ];

  return (
    <nav className={`${navCls} px-4 py-4 sm:px-7`}>
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        <Link to="/" className="inline-flex items-center gap-2">
          <img src={greensupplyLogo} alt="GreenSupply logo" className="h-7 w-7 object-contain" />
          <span className="text-[17px] font-medium tracking-[0.01em] text-[#1a1d1f]">GreenSupply</span>
        </Link>

        {showLinks && isAuthenticated ? (
          <>
            <div className="hidden items-center gap-5 sm:gap-7 md:flex">
              {navLinks.map((item) => (
                <Link key={item.to} to={item.to} className={linkCls(item.to)}>
                  {item.label}
                </Link>
              ))}
              <button
                onClick={onLogout}
                className="rounded bg-moss px-3 py-2 text-xs font-medium uppercase tracking-[0.1em] text-white transition hover:bg-sage"
              >
                Logout
              </button>
            </div>

            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="inline-flex h-9 w-9 items-center justify-center rounded border border-black/15 text-ink md:hidden"
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {menuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>
          </>
        ) : !isAuthenticated && onGoogleLogin ? (
          <button
            onClick={onGoogleLogin}
            className="inline-flex items-center gap-3 rounded-xl border border-[#DADCE0] bg-white px-3 py-2 text-[13px] font-medium text-[#3c4043] shadow-sm transition hover:bg-[#F8F9FA] sm:px-5 sm:py-2.5 sm:text-[15px]"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 48 48"
              aria-hidden="true"
              focusable="false"
            >
              <path
                fill="#FFC107"
                d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.208 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.955 3.045l5.657-5.657C34.05 6.053 29.277 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
              />
              <path
                fill="#FF3D00"
                d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.955 3.045l5.657-5.657C34.05 6.053 29.277 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.176 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.146 35.091 26.715 36 24 36c-5.188 0-9.617-3.317-11.283-7.946l-6.522 5.025C9.507 39.556 16.227 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.611 20.083H42V20H24v8h11.303a12.05 12.05 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
              />
            </svg>
            <span className="hidden sm:inline">Sign in with Google</span>
            <span className="sm:hidden">Sign In</span>
          </button>
        ) : null}
      </div>

      {showLinks && isAuthenticated && menuOpen ? (
        <div className="mx-auto mt-3 w-full max-w-7xl rounded-lg border border-black/10 bg-white/95 p-3 shadow-sm md:hidden">
          <div className="flex flex-col gap-2">
            {navLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded px-3 py-2 text-sm ${
                  location.pathname === item.to ? 'bg-moss/10 text-moss' : 'text-ink/80'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={onLogout}
              className="mt-1 rounded bg-moss px-3 py-2 text-xs font-medium uppercase tracking-[0.1em] text-white transition hover:bg-sage"
            >
              Logout
            </button>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
