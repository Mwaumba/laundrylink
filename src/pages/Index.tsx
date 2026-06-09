import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Truck, Zap, Star, Shield, ArrowRight, ChevronDown, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import VendorCard from '@/components/VendorCard';
import BookNowButton from '@/components/BookNowButton';
import { vendors } from '@/data/vendors';
import { neighborhoods } from '@/data/neighborhoods';
import heroImg from '@/assets/hero-laundry.jpg';

const SERVICE_TYPES = [
  { value: '', label: 'All services' },
  { value: 'laundry', label: 'Laundry & wash' },
  { value: 'dry-cleaning', label: 'Dry cleaning' },
  { value: 'ironing', label: 'Ironing' },
  { value: 'pickup-delivery', label: 'Pickup & delivery' },
];

const Index = () => {
  const [neighborhood, setNeighborhood] = useState('');
  const [service, setService] = useState('');
  const navigate = useNavigate();

  const featuredVendors = vendors.filter((v) => v.isFeatured).slice(0, 6);
  const fastResponseVendors = vendors.filter((v) => v.responseMinutes <= 5).slice(0, 4);
  const topNeighborhoods = neighborhoods.slice(0, 8);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (neighborhood) qs.set('neighborhood', neighborhood);
    if (service) qs.set('q', service);
    navigate(`/browse${qs.toString() ? `?${qs}` : ''}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ───── HERO ───── */}
      <section className="relative overflow-hidden">
        {/* Background image with warm overlay */}
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt=""
            width={1920}
            height={1280}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-deep-blue/85 via-primary/75 to-[hsl(28_85%_45%/0.7)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(255,255,255,0.15),transparent_55%)]" />
        </div>

        <div className="container relative mx-auto px-4 py-20 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-amber animate-pulse" />
              Trusted by thousands across Nairobi
            </span>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-white md:text-6xl lg:text-7xl">
              Book trusted{' '}
              <span className="relative inline-block">
                <span className="relative z-10">cleaning</span>
                <span className="absolute inset-x-0 bottom-1 -z-0 h-3 rounded-full bg-amber/70 md:h-4" />
              </span>{' '}
              services in Nairobi
            </h1>
            <p className="mt-5 max-w-xl text-base text-white/85 md:text-lg">
              From your neighborhood laundromat to pickup & delivery — find a vetted provider in under two minutes.
            </p>

            {/* Search card */}
            <form
              onSubmit={handleSearch}
              className="mt-8 rounded-2xl bg-white/95 p-2 shadow-2xl ring-1 ring-black/5 backdrop-blur md:flex md:items-center md:gap-2"
            >
              <div className="flex items-center gap-2 px-3 py-2 md:flex-1">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <Select value={neighborhood} onValueChange={setNeighborhood}>
                  <SelectTrigger className="h-9 border-0 bg-transparent p-0 text-sm font-medium shadow-none focus:ring-0">
                    <SelectValue placeholder="Where in Nairobi?" />
                  </SelectTrigger>
                  <SelectContent>
                    {neighborhoods.map((n) => (
                      <SelectItem key={n.slug} value={n.slug}>{n.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="hidden h-8 w-px bg-border md:block" />
              <div className="flex items-center gap-2 border-t border-border px-3 py-2 md:flex-1 md:border-0 md:border-l-0">
                <Search className="h-4 w-4 shrink-0 text-primary" />
                <Select value={service} onValueChange={setService}>
                  <SelectTrigger className="h-9 border-0 bg-transparent p-0 text-sm font-medium shadow-none focus:ring-0">
                    <SelectValue placeholder="What service?" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((s) => (
                      <SelectItem key={s.value || 'all'} value={s.value || 'all'}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 p-1 md:p-0">
                <Button type="submit" size="lg" className="h-11 flex-1 rounded-xl bg-primary px-6 hover:bg-primary/90 md:flex-none">
                  <Search className="h-4 w-4" /> Search
                </Button>
                <BookNowButton size="lg" className="h-11 rounded-xl bg-amber text-amber-foreground hover:bg-amber/90" />
              </div>
            </form>

            {/* Quick filter pills */}
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { label: 'Westlands', q: 'neighborhood=westlands' },
                { label: 'Kilimani', q: 'neighborhood=kilimani' },
                { label: 'Pickup & Delivery', q: 'pickup=1' },
                { label: 'Same Day', q: 'q=same-day' },
              ].map((tag) => (
                <Link
                  key={tag.label}
                  to={`/browse?${tag.q}`}
                  className="rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/20"
                >
                  {tag.label}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ───── TRUST BAR ───── */}
      <section className="border-b border-border bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 gap-4 rounded-2xl bg-secondary/60 p-6 md:grid-cols-4">
            {[
              { icon: MapPin, label: '17 Neighborhoods', sub: 'Across Nairobi' },
              { icon: Users, label: '20+ Vendors', sub: 'Verified providers' },
              { icon: Truck, label: 'Pickup & Delivery', sub: 'At your doorstep' },
              { icon: Zap, label: 'Fast Response', sub: 'Under 5 minutes' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-display text-sm font-bold text-foreground">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── FEATURED ───── */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">Featured laundries</h2>
            <p className="mt-1.5 text-muted-foreground">Top-rated providers, handpicked for you</p>
          </div>
          <Link to="/browse" className="hidden items-center gap-1 text-sm font-semibold text-primary hover:gap-2 transition-all md:flex">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredVendors.map((vendor, i) => (
            <motion.div
              key={vendor.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
            >
              <VendorCard vendor={vendor} />
            </motion.div>
          ))}
        </div>
        <div className="mt-8 text-center md:hidden">
          <Link to="/browse">
            <Button variant="outline" className="gap-2 rounded-full">View all vendors <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>
      </section>

      {/* ───── FAST RESPONSE ───── */}
      <section className="bg-secondary/40 py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber/20 px-3 py-1 text-xs font-semibold text-amber-foreground">
                <Zap className="h-3.5 w-3.5" /> Under 5 min response
              </div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">Fast response laundries</h2>
            </div>
          </div>
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 lg:grid-cols-4">
            {fastResponseVendors.map((vendor, i) => (
              <motion.div
                key={vendor.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="w-[78%] shrink-0 snap-start md:w-auto"
              >
                <VendorCard vendor={vendor} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── NEIGHBORHOODS ───── */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">Browse by neighborhood</h2>
            <p className="mt-1.5 text-muted-foreground">Discover laundries in your area</p>
          </div>
          <Link to="/neighborhoods" className="hidden items-center gap-1 text-sm font-semibold text-primary hover:gap-2 transition-all md:flex">
            All neighborhoods <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {topNeighborhoods.map((n, i) => {
            const count = vendors.filter((v) => v.neighborhoodSlug === n.slug).length;
            const hues = [
              'from-primary to-cobalt',
              'from-[hsl(214_78%_42%)] to-[hsl(28_85%_55%)]',
              'from-[hsl(218_70%_28%)] to-[hsl(200_85%_55%)]',
              'from-[hsl(36_92%_55%)] to-[hsl(214_78%_42%)]',
            ];
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  to={`/browse?neighborhood=${n.slug}`}
                  className="group relative block aspect-[4/3] overflow-hidden rounded-2xl shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${hues[i % hues.length]}`} />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.2),transparent_60%)]" />
                  <div className="relative flex h-full flex-col justify-end p-5">
                    <MapPin className="mb-2 h-5 w-5 text-white/80" />
                    <h3 className="font-display text-xl font-bold text-white">{n.name}</h3>
                    <p className="text-sm text-white/85">{count} vendor{count !== 1 ? 's' : ''}</p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ───── WHY ───── */}
      <section className="border-y border-border bg-secondary/40 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">Why LaundryLink?</h2>
            <p className="mt-2 text-muted-foreground">Find the right laundry in under 2 minutes</p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { icon: MapPin, title: 'Location-based discovery', desc: 'Find laundries near home or office across 17+ Nairobi neighborhoods.' },
              { icon: Shield, title: 'Verified & trusted', desc: 'Every vendor is vetted. Look for Verified Business and Top Rated badges.' },
              { icon: Truck, title: 'Pickup & delivery', desc: 'Filter by pickup & delivery coverage. See areas served instantly.' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl bg-card p-6 shadow-card">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── PROVIDER CTA ───── */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 gradient-warm" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.2),transparent_60%)]" />
        <div className="container relative mx-auto px-4 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
            Are you a laundry provider?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-white/90">
            Join LaundryLink and reach thousands of customers across Nairobi. Setup takes minutes.
          </p>
          <Link to="/auth?mode=signup" className="mt-7 inline-block">
            <Button size="lg" className="rounded-full bg-white px-8 text-primary shadow-lg hover:bg-white/95">
              Sign Up as a Vendor <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
