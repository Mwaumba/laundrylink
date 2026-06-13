import { Link } from 'react-router-dom';
import { MapPin, Instagram, Twitter, Facebook, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="mt-12 bg-[#1a1a2e] text-white/80">
      <div className="container mx-auto px-4 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary shadow-sm">
                <MapPin className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-display font-bold text-white">
                Laundry<span className="text-amber">Link</span>
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              The warmest way to find trusted laundry providers across Nairobi.
            </p>
            <div className="mt-5 flex gap-2">
              {[Instagram, Twitter, Facebook, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="social"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Discover</h4>
            <div className="space-y-2.5">
              <Link to="/browse" className="block text-sm text-white/70 hover:text-white">Browse Vendors</Link>
              <Link to="/neighborhoods" className="block text-sm text-white/70 hover:text-white">Neighborhoods</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Popular Areas</h4>
            <div className="space-y-2.5">
              {['Westlands', 'Kilimani', 'Kileleshwa', 'Karen'].map((n) => (
                <Link key={n} to={`/browse?neighborhood=${n.toLowerCase()}`} className="block text-sm text-white/70 hover:text-white">{n}</Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">For Vendors</h4>
            <div className="space-y-2.5">
              <Link to="/auth?mode=signup" className="block text-sm text-white/70 hover:text-white">List Your Business</Link>
              <Link to="/vendor/dashboard" className="block text-sm text-white/70 hover:text-white">Vendor Dashboard</Link>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/60 md:flex-row">
          <span>© {new Date().getFullYear()} LaundryLink Nairobi. Made with care in Nairobi.</span>
          <div className="flex gap-5">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
