import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ solid }) {
  const location = useLocation();
  const cls = solid ? 'navbar navbar-solid' : 'navbar';

  return (
    <nav className={cls}>
      <Link to="/" className="logo">
        🌿 Green<span>Supply</span>
      </Link>
      <div className="nav-links">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Link>
        <Link to="/groups" className={location.pathname === '/groups' ? 'active' : ''}>Groups</Link>
        <Link to="/products" className={location.pathname === '/products' ? 'active' : ''}>Products</Link>
        <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>Dashboard</Link>
        <Link to="/groups" className="cta">Get Started</Link>
      </div>
    </nav>
  );
}
