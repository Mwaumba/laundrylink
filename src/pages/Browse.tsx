import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { List, Map } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import VendorCard from '@/components/VendorCard';
import FilterBar from '@/components/FilterBar';
import MapView from '@/components/MapView';
import { vendors } from '@/data/vendors';
import { Button } from '@/components/ui/button';

const Browse = () => {
  const [searchParams] = useSearchParams();
  const initialNeighborhood = searchParams.get('neighborhood') || '';
  const initialTag = searchParams.get('tag') || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(initialNeighborhood);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTag ? [initialTag] : []);
  const [pickupOnly, setPickupOnly] = useState(false);
  const [openNow, setOpenNow] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'split'>('split');

  const filtered = useMemo(() => {
    return vendors.filter((v) => {
      const q = searchQuery.toLowerCase();
      if (q && !v.name.toLowerCase().includes(q) && !v.neighborhood.toLowerCase().includes(q) && !v.serviceTags.some((t) => t.toLowerCase().includes(q))) return false;
      if (selectedNeighborhood && v.neighborhoodSlug !== selectedNeighborhood) return false;
      if (selectedTags.length && !selectedTags.some((t) => v.serviceTags.includes(t))) return false;
      if (pickupOnly && !v.hasPickup) return false;
      if (openNow && v.availability === 'fully-booked') return false;
      return true;
    });
  }, [searchQuery, selectedNeighborhood, selectedTags, pickupOnly, openNow]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="container mx-auto flex-1 px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Browse Laundry Services</h1>
            <p className="mt-1 text-muted-foreground">Find the perfect laundry provider in Nairobi</p>
          </div>
          <div className="hidden items-center gap-1 rounded-lg border border-border bg-card p-1 md:flex">
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
              className="gap-1.5"
            >
              <List className="h-4 w-4" /> List
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'split' ? 'default' : 'ghost'}
              onClick={() => setViewMode('split')}
              className="gap-1.5"
            >
              <Map className="h-4 w-4" /> Split
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              onClick={() => setViewMode('map')}
              className="gap-1.5"
            >
              <Map className="h-4 w-4" /> Map
            </Button>
          </div>
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

        <div className="mt-2 text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? 'vendor' : 'vendors'} found
        </div>

        <div className={`mt-4 ${viewMode === 'split' ? 'flex gap-6' : ''}`}>
          {/* List view */}
          {(viewMode === 'list' || viewMode === 'split') && (
            <div className={viewMode === 'split' ? 'w-1/2 overflow-y-auto' : 'w-full'}>
              <div className={`grid gap-4 ${viewMode === 'list' ? 'sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {filtered.map((vendor, i) => (
                  <motion.div
                    key={vendor.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
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
          )}

          {/* Map view */}
          {(viewMode === 'map' || viewMode === 'split') && (
            <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} sticky top-20`} style={{ height: viewMode === 'map' ? 'calc(100vh - 280px)' : '600px' }}>
              <MapView vendors={filtered} />
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Browse;
