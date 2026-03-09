import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { neighborhoods } from '@/data/neighborhoods';
import { vendors } from '@/data/vendors';
import { MapPin, ChevronRight } from 'lucide-react';

const Neighborhoods = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="gradient-hero py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl font-display font-bold text-primary-foreground md:text-4xl">
            Nairobi Neighborhoods
          </h1>
          <p className="mt-2 text-primary-foreground/80">
            Discover top-rated laundry services across Nairobi
          </p>
        </div>
      </div>
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {neighborhoods.map((n, i) => {
            const count = vendors.filter((v) => v.neighborhoodSlug === n.slug).length;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  to={`/browse?neighborhood=${n.slug}`}
                  className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky">
                      <MapPin className="h-5 w-5 text-sky-foreground" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-foreground">{n.name}</h3>
                      <p className="text-sm text-muted-foreground">{count} vendor{count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Neighborhoods;
