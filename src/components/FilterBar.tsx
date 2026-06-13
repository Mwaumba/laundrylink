import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const FilterBar = (props: FilterBarProps) => {
  const {
    searchQuery, onSearchChange,
    selectedNeighborhood, onNeighborhoodChange,
    selectedTags, onTagsChange,
    pickupOnly, onPickupChange,
    openNow, onOpenNowChange,
  } = props;
  const [open, setOpen] = useState(false);

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

  const Filters = (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onPickupChange(!pickupOnly)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            pickupOnly ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-secondary/80'
          }`}
        >🚗 Pickup & Delivery</button>
        <button
          onClick={() => onOpenNowChange(!openNow)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            openNow ? 'bg-success text-success-foreground' : 'bg-secondary text-foreground hover:bg-secondary/80'
          }`}
        >🟢 Open Now</button>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Services</label>
        <div className="flex flex-wrap gap-1.5">
          {serviceTags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? 'default' : 'outline'}
              className="cursor-pointer rounded-full px-3 py-1"
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Neighborhood</label>
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={selectedNeighborhood === '' ? 'default' : 'outline'}
            className="cursor-pointer rounded-full px-3 py-1"
            onClick={() => onNeighborhoodChange('')}
          >All Areas</Badge>
          {neighborhoods.map((n) => (
            <Badge
              key={n.id}
              variant={selectedNeighborhood === n.slug ? 'default' : 'outline'}
              className="cursor-pointer rounded-full px-3 py-1"
              onClick={() => onNeighborhoodChange(n.slug === selectedNeighborhood ? '' : n.slug)}
            >{n.name}</Badge>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="sticky top-16 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:rounded-none">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search laundries, services, neighborhoods…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-11 rounded-xl border-border bg-card pl-10 shadow-sm"
          />
        </div>

        {/* Desktop quick filters */}
        <div className="hidden items-center gap-2 md:flex">
          <Select value={selectedNeighborhood || 'all'} onValueChange={(v) => onNeighborhoodChange(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-11 w-[180px] rounded-xl border-border bg-card shadow-sm">
              <SelectValue placeholder="Neighborhood" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All neighborhoods</SelectItem>
              {neighborhoods.map((n) => (
                <SelectItem key={n.slug} value={n.slug}>{n.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={() => onPickupChange(!pickupOnly)}
            className={`h-11 rounded-xl px-4 text-sm font-medium transition-colors ${
              pickupOnly ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground shadow-sm hover:bg-secondary'
            }`}
          >Pickup</button>
          <button
            onClick={() => onOpenNowChange(!openNow)}
            className={`h-11 rounded-xl px-4 text-sm font-medium transition-colors ${
              openNow ? 'bg-success text-success-foreground' : 'bg-card text-foreground shadow-sm hover:bg-secondary'
            }`}
          >Open now</button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 rounded-full text-muted-foreground">
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>

        {/* Mobile filters button + bottom sheet */}
        <div className="flex md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-11 w-full gap-2 rounded-xl">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
              <SheetHeader className="text-left">
                <SheetTitle className="font-display">Filters</SheetTitle>
              </SheetHeader>
              <div className="py-4">{Filters}</div>
              <SheetFooter className="gap-2">
                <Button variant="ghost" onClick={clearAll} className="rounded-xl">Clear all</Button>
                <Button onClick={() => setOpen(false)} className="rounded-xl">Show results</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Active tag chips row (desktop) */}
      {selectedTags.length > 0 && (
        <div className="mt-3 hidden flex-wrap gap-1.5 md:flex">
          {selectedTags.map((t) => (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/15"
            >
              {t} <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
