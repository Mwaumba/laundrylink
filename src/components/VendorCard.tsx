import { Link } from 'react-router-dom';
import { Star, MapPin, Clock, Truck, Zap, CheckCircle, Shield, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Vendor, AvailabilityStatus } from '@/types';
import BookNowButton from '@/components/BookNowButton';

const availabilityConfig: Record<AvailabilityStatus, { label: string; className: string }> = {
  accepting: { label: 'Accepting Laundry', className: 'bg-success/10 text-success border-success/20' },
  limited: { label: 'Limited Capacity', className: 'bg-warning/10 text-warning border-warning/20' },
  'fully-booked': { label: 'Fully Booked', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const badgeIcons: Record<string, React.ReactNode> = {
  verified: <CheckCircle className="h-3 w-3" />,
  trusted: <Shield className="h-3 w-3" />,
  'top-rated': <Award className="h-3 w-3" />,
  'fast-response': <Zap className="h-3 w-3" />,
};

interface VendorCardProps {
  vendor: Vendor;
}

const VendorCard = ({ vendor }: VendorCardProps) => {
  const availability = availabilityConfig[vendor.availability];

  return (
    <Link to={`/vendor/${vendor.slug}`} className="group block">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5">
        {/* Header with gradient */}
        <div className="gradient-hero relative h-32 p-4">
          {vendor.isFeatured && (
            <Badge className="absolute right-3 top-3 border-0 bg-warning text-warning-foreground text-xs font-semibold">
              Featured
            </Badge>
          )}
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-lg font-display font-bold text-primary-foreground truncate">{vendor.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <MapPin className="h-3.5 w-3.5 text-primary-foreground/70" />
              <span className="text-sm text-primary-foreground/80">{vendor.neighborhood}</span>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Rating + Response */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <span className="text-sm font-semibold text-foreground">{vendor.rating}</span>
              <span className="text-sm text-muted-foreground">({vendor.reviewCount})</span>
            </div>
            {vendor.responseMinutes <= 5 && (
              <div className="flex items-center gap-1 text-cobalt">
                <Zap className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{vendor.responseTime}</span>
              </div>
            )}
          </div>

          {/* Availability */}
          <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${availability.className}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {availability.label}
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2">{vendor.shortDescription}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {vendor.serviceTags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{tag}</span>
            ))}
            {vendor.serviceTags.length > 3 && (
              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">+{vendor.serviceTags.length - 3}</span>
            )}
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between border-t border-border pt-3">
            <div className="flex items-center gap-2">
              {vendor.hasPickup && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Truck className="h-3.5 w-3.5" />
                  <span>Pickup</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{vendor.priceRange}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {vendor.badges.slice(0, 2).map((badge) => (
                <span key={badge.type} className="text-cobalt" title={badge.label}>
                  {badgeIcons[badge.type]}
                </span>
              ))}
            </div>
          </div>

          <BookNowButton size="sm" fullWidth vendorId={vendor.id} vendorName={vendor.name} />
        </div>
      </div>
    </Link>
  );
};

export default VendorCard;
