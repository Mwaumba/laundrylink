import { Link } from 'react-router-dom';
import { Star, MapPin, Truck, Zap, CheckCircle, Shield, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Vendor, AvailabilityStatus } from '@/types';
import BookNowButton from '@/components/BookNowButton';

const availabilityConfig: Record<AvailabilityStatus, { label: string; className: string; dot: string }> = {
  accepting: { label: 'Accepting now', className: 'bg-success/10 text-success border-success/20', dot: 'bg-success' },
  limited: { label: 'Limited capacity', className: 'bg-amber/15 text-amber-foreground border-amber/30', dot: 'bg-amber' },
  'fully-booked': { label: 'Fully booked', className: 'bg-destructive/10 text-destructive border-destructive/20', dot: 'bg-destructive' },
};

const badgeIcons: Record<string, React.ReactNode> = {
  verified: <CheckCircle className="h-3.5 w-3.5" />,
  trusted: <Shield className="h-3.5 w-3.5" />,
  'top-rated': <Award className="h-3.5 w-3.5" />,
  'fast-response': <Zap className="h-3.5 w-3.5" />,
};

const getInitials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

interface VendorCardProps {
  vendor: Vendor;
}

const VendorCard = ({ vendor }: VendorCardProps) => {
  const availability = availabilityConfig[vendor.availability];
  const cover = vendor.images?.[0];
  const initials = getInitials(vendor.name);

  return (
    <Link to={`/vendor/${vendor.slug}`} className="group block">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover shadow-card">
        {/* Cover photo / fallback */}
        <div className="relative aspect-[3/2] overflow-hidden">
          {cover ? (
            <img
              src={cover}
              alt={vendor.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="gradient-fallback relative flex h-full w-full items-center justify-center">
              <span className="font-display text-5xl font-bold text-white/90 drop-shadow-md">{initials}</span>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_60%)]" />
            </div>
          )}

          {/* Gradient overlay for legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

          {/* Featured badge */}
          {vendor.isFeatured && (
            <Badge className="absolute right-3 top-3 rounded-full border-0 bg-amber px-2.5 py-1 text-xs font-semibold text-amber-foreground shadow-md">
              Featured
            </Badge>
          )}

          {/* Availability pill (top-left) */}
          <div className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border bg-background/95 px-2.5 py-1 text-[11px] font-medium backdrop-blur ${availability.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${availability.dot}`} />
            {availability.label}
          </div>

          {/* Name + neighborhood overlay */}
          <div className="absolute inset-x-0 bottom-0 p-4">
            <h3 className="font-display text-lg font-bold text-white drop-shadow-sm line-clamp-1">{vendor.name}</h3>
            <div className="mt-0.5 flex items-center gap-1.5 text-sm text-white/90">
              <MapPin className="h-3.5 w-3.5" />
              <span>{vendor.neighborhood}</span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-amber text-amber" />
              <span className="text-sm font-semibold text-foreground">{vendor.rating}</span>
              <span className="text-xs text-muted-foreground">({vendor.reviewCount})</span>
            </div>
            {vendor.responseMinutes <= 5 && (
              <div className="inline-flex items-center gap-1 rounded-full bg-amber/15 px-2 py-0.5 text-[11px] font-medium text-amber-foreground">
                <Zap className="h-3 w-3" />
                {vendor.responseTime}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {vendor.serviceTags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-border/60 pt-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{vendor.priceRange}</span>
              {vendor.hasPickup && (
                <span className="inline-flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5" /> Pickup
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-primary">
              {vendor.badges.slice(0, 2).map((badge) => (
                <span key={badge.type} title={badge.label}>{badgeIcons[badge.type]}</span>
              ))}
            </div>
          </div>

          <BookNowButton
            size="sm"
            fullWidth
            vendorId={vendor.id}
            vendorName={vendor.name}
            className="rounded-full bg-primary hover:bg-primary/90"
          />
        </div>
      </div>
    </Link>
  );
};

export default VendorCard;
