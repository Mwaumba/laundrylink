import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { neighborhoods } from '@/data/neighborhoods';
import { serviceTags } from '@/data/serviceTags';
import { useState } from 'react';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedNeighborhood: string;
  onNeighborhoodChange: (n: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  pickupOnly: boolean;
  onPickupChange: (v: boolean) => void;
  openNow: boolean;
  onOpenNowChange: (v: boolean) => void;
}

const FilterBar = ({
  searchQuery, onSearchChange,
  selectedNeighborhood, onNeighborhoodChange,
  selectedTags, onTagsChange,
  pickupOnly, onPickupChange,
  openNow, onOpenNowChange,
}: FilterBarProps) => {
  const [showFilters, setShowFilters] = useState(false);

  const toggleTag = (tag: string) => {
    onTagsChange(
      selectedTags.includes(tag)
        ? selectedTags.filter((t) => t !== tag)
        : [...selectedTags, tag]
    );
  };

  const activeFilterCount = [
    selectedNeighborhood, pickupOnly, openNow, selectedTags.length > 0,
  ].filter(Boolean).length;

  const clearAll = () => {
    onSearchChange('');
    onNeighborhoodChange('');
    onTagsChange([]);
    onPickupChange(false);
    onOpenNowChange(false);
  };

  return (
    <div className="space-y-4">
      {/* Search + filter toggle */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search laundries, services, neighborhoods..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showFilters ? 'default' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-xs font-bold text-primary">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          {/* Quick filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={pickupOnly ? 'default' : 'outline'}
              onClick={() => onPickupChange(!pickupOnly)}
            >
              🚗 Pickup & Delivery
            </Button>
            <Button
              size="sm"
              variant={openNow ? 'default' : 'outline'}
              onClick={() => onOpenNowChange(!openNow)}
            >
              🟢 Open Now
            </Button>
          </div>

          {/* Neighborhoods */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Neighborhood</label>
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant={selectedNeighborhood === '' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => onNeighborhoodChange('')}
              >
                All Areas
              </Badge>
              {neighborhoods.map((n) => (
                <Badge
                  key={n.id}
                  variant={selectedNeighborhood === n.slug ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => onNeighborhoodChange(n.slug === selectedNeighborhood ? '' : n.slug)}
                >
                  {n.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Service Tags */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Services</label>
            <div className="flex flex-wrap gap-1.5">
              {serviceTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-muted-foreground">
              <X className="h-3 w-3" />
              Clear all filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
