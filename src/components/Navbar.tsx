import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { MapPin, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import BookNowButton from '@/components/BookNowButton';
import ThemeToggle from '@/components/ThemeToggle';
import { useUserRole, type UserRole } from '@/hooks/useUserRole';

const NAV_BY_ROLE: Record<UserRole, { to: string; label: string }[]> = {
  guest: [
    { to: '/', label: 'Home' },
    { to: '/browse', label: 'Browse' },
    { to: '/neighborhoods', label: 'Neighborhoods' },
  ],
  customer: [
    { to: '/', label: 'Home' },
    { to: '/browse', label: 'Browse' },
    { to: '/bookings', label: 'My Bookings' },
  ],
  vendor: [
    { to: '/vendor/dashboard', label: 'Dashboard' },
    { to: '/bookings', label: 'Bookings' },
  ],
  admin: [
    { to: '/admin', label: 'Admin' },
    { to: '/browse', label: 'Vendors' },
  ],
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { role, userId } = useUserRole();
  const links = NAV_BY_ROLE[role];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/70 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-glow">
            <MapPin className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-display font-bold text-foreground">
            Laundry<span className="text-gradient-blue">Link</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {location.pathname === link.to && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-lg bg-secondary"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative">{link.label}</span>
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {role === 'guest' || role === 'customer' ? <BookNowButton size="sm" variant="outline" /> : null}
          {!userId ? (
            <>
              <Link to="/auth"><Button variant="outline" size="sm">Log in</Button></Link>
              <Link to="/vendor/onboarding"><Button size="sm">List Your Business</Button></Link>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={async () => { await supabase.auth.signOut(); }}>
              Sign Out
            </Button>
          )}
        </div>

        {/* Mobile toggle */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-lg p-2 text-foreground"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border bg-card md:hidden"
          >
            <div className="container mx-auto space-y-1 px-4 py-4">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsOpen(false)}
                  className={`block rounded-lg px-4 py-2.5 text-sm font-medium ${
                    location.pathname === link.to
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {!userId ? (
                <div className="flex gap-2 pt-3">
                  <Link to="/auth" onClick={() => setIsOpen(false)} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">Log in</Button>
                  </Link>
                  <Link to="/vendor/onboarding" onClick={() => setIsOpen(false)} className="flex-1">
                    <Button size="sm" className="w-full">List Your Business</Button>
                  </Link>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={async () => { await supabase.auth.signOut(); setIsOpen(false); }}
                >
                  Sign Out
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
