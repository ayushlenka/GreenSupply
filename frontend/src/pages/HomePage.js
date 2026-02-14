import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function HomePage() {
  return (
    <>
      <Navbar solid />
      <div className="home-page">
        <h1>Sustainable Packaging,<br /><span>Together</span></h1>
        <p>
          Join San Francisco's local food businesses in bulk-purchasing
          eco-friendly packaging. Save money, reduce waste, and cut delivery emissions
          through cooperative buying groups.
        </p>
        <div className="cta-row">
          <Link to="/groups" className="cta-primary">Browse Groups</Link>
          <Link to="/products" className="cta-secondary">View Products</Link>
        </div>
      </div>
    </>
  );
}
