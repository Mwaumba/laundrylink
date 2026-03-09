import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import VendorCard from '@/components/VendorCard';
import FilterBar from '@/components/FilterBar';
import { vendors } from '@/data/vendors';

const Browse = () => {
  const [searchParams] = useSearchParams();
  const initialNeighborhood = searchParams.get('neighborhood') || '';
  const initialTag = searchParams.get('tag') || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(initialNeighborhood);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTag ? [initialTag] : []);
  const [pickupOnly, setPickupOnly] = useState(false);
  const [openNow, setOpenNow] = useState(false);

  const filtered = useMemo(() => {
    return vendors.filter((v) => {
      const q = searchQuery.toLowerCase();
      if (q && !v.name.toLowerCase().includes(q) && !v.neighborhood.toLowerCase().includes(q) && !v.serviceTags.some((t) => t.toLowerCase().includes(q))) return false;
      if (selectedNeighborhood && v.neighborhoodSlug !== selectedNeighborhood) return false;
      if (selectedTags.length && !selectedTags.some((t) => v.serviceTags.includes(t))) return false;
      if (pickupOnly && !v.hasPickup) return false;
      // Simple "open now" - just checks if it's not fully booked
      if (openNow && v.availability === 'fully-booked') return false;
      return true;
    });
  }, [searchQuery, selectedNeighborhood, selectedTags, pickupOnly, openNow]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-display font-bold text-foreground">Browse Laundry Services</h1>
          <p className="mt-1 text-muted-foreground">Find the perfect laundry provider in Nairobi</p>
        </div>

        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedNeighborhood={selectedNeighborhood}
          onNeighborhoodChange={setSelectedNeighborhood}
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
          pickupOnly={pickupOnly}
          onPickupChange={setPickupOnly}
          openNow={openNow}
          onOpenNowChange={setOpenNow}
        />

        <div className="mt-4 text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? 'vendor' : 'vendors'} found
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((vendor, i) => (
            <motion.div
              key={vendor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <VendorCard vendor={vendor} />
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-lg font-medium text-foreground">No vendors found</p>
            <p className="mt-1 text-muted-foreground">Try adjusting your filters</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Browse;
