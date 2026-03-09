import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <MapPin className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-display font-bold text-foreground">
                Laundry<span className="text-cobalt">Link</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Find the best laundry services near you in Nairobi.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">Discover</h4>
            <div className="space-y-2">
              <Link to="/browse" className="block text-sm text-muted-foreground hover:text-foreground">Browse Vendors</Link>
              <Link to="/neighborhoods" className="block text-sm text-muted-foreground hover:text-foreground">Neighborhoods</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">Popular Areas</h4>
            <div className="space-y-2">
              {['Westlands', 'Kilimani', 'Kileleshwa', 'Karen'].map((n) => (
                <Link key={n} to={`/neighborhoods/${n.toLowerCase()}`} className="block text-sm text-muted-foreground hover:text-foreground">{n}</Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">For Vendors</h4>
            <div className="space-y-2">
              <span className="block text-sm text-muted-foreground">List Your Business</span>
              <span className="block text-sm text-muted-foreground">Vendor Dashboard</span>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} LaundryLink Nairobi. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
