import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Truck, Zap, Star, Shield, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import VendorCard from '@/components/VendorCard';
import { vendors } from '@/data/vendors';
import { neighborhoods } from '@/data/neighborhoods';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const featuredVendors = vendors.filter((v) => v.isFeatured).slice(0, 6);
  const fastResponseVendors = vendors.filter((v) => v.responseMinutes <= 5).slice(0, 4);
  const topRated = [...vendors].sort((a, b) => b.rating - a.rating).slice(0, 4);
  const topNeighborhoods = neighborhoods.slice(0, 8);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/browse?q=${encodeURIComponent(search)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_70%)]" />
        <div className="container relative mx-auto px-4 py-20 md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <h1 className="text-4xl font-display font-bold leading-tight text-primary-foreground md:text-5xl lg:text-6xl">
              Find the Best{' '}
              <span className="bg-primary-foreground/20 px-2 rounded-lg">Laundry</span>{' '}
              Near You in Nairobi
            </h1>
            <p className="mt-5 text-lg text-primary-foreground/80 md:text-xl">
              Compare prices, read reviews, and contact trusted laundry providers in your neighborhood. Pickup & delivery available.
            </p>

            <form onSubmit={handleSearch} className="mt-8 flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by area, service, or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-12 rounded-xl bg-card pl-12 text-foreground shadow-lg border-0"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 rounded-xl px-6 bg-cobalt hover:bg-cobalt/90 text-cobalt-foreground">
                Search
              </Button>
            </form>

            <div className="mt-5 flex flex-wrap gap-2">
              {['Westlands', 'Kilimani', 'Pickup & Delivery', 'Same Day'].map((tag) => (
                <Link
                  key={tag}
                  to={`/browse?q=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-primary-foreground/20 px-3 py-1 text-sm text-primary-foreground/70 transition-colors hover:bg-primary-foreground/10"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="border-b border-border bg-card">
        <div className="container mx-auto grid grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4">
          {[
            { icon: MapPin, label: '17 Neighborhoods', sub: 'Across Nairobi' },
            { icon: Star, label: '20+ Vendors', sub: 'Verified providers' },
            { icon: Truck, label: 'Pickup & Delivery', sub: 'At your doorstep' },
            { icon: Zap, label: 'Fast Response', sub: 'Under 5 minutes' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky">
                <item.icon className="h-5 w-5 text-sky-foreground" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Vendors */}
      <section className="container mx-auto px-4 py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground md:text-3xl">Featured Laundries</h2>
            <p className="mt-1 text-muted-foreground">Top-rated and recommended providers</p>
          </div>
          <Link to="/browse" className="hidden items-center gap-1 text-sm font-medium text-cobalt hover:underline md:flex">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredVendors.map((vendor, i) => (
            <motion.div
              key={vendor.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <VendorCard vendor={vendor} />
            </motion.div>
          ))}
        </div>
        <div className="mt-6 text-center md:hidden">
          <Link to="/browse">
            <Button variant="outline" className="gap-2">View all vendors <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>
      </section>

      {/* Fast Response Section */}
      <section className="gradient-sky py-14">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 mb-8">
            <Zap className="h-6 w-6 text-cobalt" />
            <h2 className="text-2xl font-display font-bold text-foreground md:text-3xl">Fast Response Laundries</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {fastResponseVendors.map((vendor, i) => (
              <motion.div
                key={vendor.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <VendorCard vendor={vendor} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Neighborhoods */}
      <section className="container mx-auto px-4 py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground md:text-3xl">Browse by Neighborhood</h2>
            <p className="mt-1 text-muted-foreground">Discover laundries in your area</p>
          </div>
          <Link to="/neighborhoods" className="hidden items-center gap-1 text-sm font-medium text-cobalt hover:underline md:flex">
            All neighborhoods <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {topNeighborhoods.map((n, i) => {
            const count = vendors.filter((v) => v.neighborhoodSlug === n.slug).length;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/browse?neighborhood=${n.slug}`}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:shadow-card-hover"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky">
                    <MapPin className="h-5 w-5 text-sky-foreground" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground">{n.name}</h3>
                    <p className="text-sm text-muted-foreground">{count} vendor{count !== 1 ? 's' : ''}</p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Why LaundryLink */}
      <section className="border-t border-border bg-card py-14">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-2xl font-display font-bold text-foreground md:text-3xl">Why LaundryLink?</h2>
          <p className="mt-2 text-center text-muted-foreground">Find the right laundry in under 2 minutes</p>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              { icon: MapPin, title: 'Location-Based Discovery', desc: 'Find laundries near your home or office across 17+ Nairobi neighborhoods.' },
              { icon: Shield, title: 'Verified & Trusted', desc: 'Every vendor is verified. Look for badges like Verified Business and Top Rated.' },
              { icon: Truck, title: 'Pickup & Delivery', desc: 'Filter by pickup & delivery availability. See coverage areas instantly.' },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky">
                  <item.icon className="h-7 w-7 text-sky-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-display font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="gradient-hero py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-display font-bold text-primary-foreground md:text-3xl">
            Are You a Laundry Provider?
          </h2>
          <p className="mt-3 text-primary-foreground/80">
            Join LaundryLink and reach thousands of customers in Nairobi
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 rounded-xl">
              List Your Business
            </Button>
            <Link to="/browse">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 rounded-xl">
                Browse Vendors
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
