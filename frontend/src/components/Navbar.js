import { Link, useLocation } from 'react-router-dom';
import greensupplyLogo from '../assets/greensupply-logo.svg';

export default function Navbar({ solid, isAuthenticated, onLogout, showLinks = true, accountType, onGoogleLogin, tone = 'default' }) {
  const location = useLocation();
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

  return (
    <nav className={`${navCls} px-4 py-4 sm:px-7`}>
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        <Link to="/" className="inline-flex items-center gap-2">
          <img src={greensupplyLogo} alt="GreenSupply logo" className="h-7 w-7 object-contain" />
          <span className="text-[17px] font-medium tracking-[0.01em] text-[#1a1d1f]">GreenSupply</span>
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
                  Orders
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
        ) : !isAuthenticated && onGoogleLogin ? (
          <button
            onClick={onGoogleLogin}
            className="inline-flex items-center gap-3 rounded-xl border border-[#DADCE0] bg-white px-5 py-2.5 text-[15px] font-medium text-[#3c4043] shadow-sm transition hover:bg-[#F8F9FA]"
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
            Sign in with Google
          </button>
        ) : null}
      </div>
    </nav>
  );
}
