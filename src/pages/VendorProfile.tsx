import { useParams, Link } from 'react-router-dom';
import { Star, MapPin, Clock, Truck, Phone, MessageCircle, Mail, Zap, CheckCircle, Shield, Award, ArrowLeft, Heart, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BookNowButton from '@/components/BookNowButton';
import { vendors } from '@/data/vendors';
import { AvailabilityStatus } from '@/types';

const availabilityConfig: Record<AvailabilityStatus, { label: string; className: string; dot: string }> = {
  accepting: { label: 'Accepting Laundry Today', className: 'bg-success/10 text-success border-success/20', dot: 'bg-success' },
  limited: { label: 'Limited Capacity', className: 'bg-warning/10 text-warning border-warning/20', dot: 'bg-warning' },
  'fully-booked': { label: 'Fully Booked', className: 'bg-destructive/10 text-destructive border-destructive/20', dot: 'bg-destructive' },
};

const badgeIcons: Record<string, React.ReactNode> = {
  verified: <CheckCircle className="h-4 w-4" />,
  trusted: <Shield className="h-4 w-4" />,
  'top-rated': <Award className="h-4 w-4" />,
  'fast-response': <Zap className="h-4 w-4" />,
};

const VendorProfile = () => {
  const { slug } = useParams();
  const vendor = vendors.find((v) => v.slug === slug);

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground">Vendor not found</h1>
          <Link to="/browse" className="mt-4 inline-block text-cobalt hover:underline">Browse vendors</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const availability = availabilityConfig[vendor.availability];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <div className="gradient-hero">
        <div className="container mx-auto px-4 py-12">
          <Link to="/browse" className="mb-6 inline-flex items-center gap-1.5 text-sm text-primary-foreground/70 hover:text-primary-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to search
          </Link>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-md bg-primary-foreground/20 px-2.5 py-0.5 text-xs font-medium text-primary-foreground">{vendor.typeLabel}</span>
                {vendor.isFeatured && (
                  <span className="rounded-md bg-warning px-2.5 py-0.5 text-xs font-semibold text-warning-foreground">Featured</span>
                )}
              </div>
              <h1 className="text-3xl font-display font-bold text-primary-foreground md:text-4xl">{vendor.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-primary-foreground/80">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{vendor.address}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-warning text-warning" />
                  <span className="text-sm font-semibold text-primary-foreground">{vendor.rating}</span>
                  <span className="text-sm">({vendor.reviewCount} reviews)</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <BookNowButton vendorId={vendor.id} vendorName={vendor.name} className="bg-cobalt text-cobalt-foreground hover:bg-cobalt/90" />
              <Button variant="outline" size="sm" className="gap-1.5 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <Heart className="h-4 w-4" />
                Save
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="space-y-8 lg:col-span-2">
            {/* Status + Badges */}
            <div className="flex flex-wrap items-center gap-3">
              <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${availability.className}`}>
                <span className={`h-2 w-2 rounded-full ${availability.dot}`} />
                {availability.label}
              </div>
              {vendor.badges.map((badge) => (
                <div key={badge.type} className="inline-flex items-center gap-1.5 rounded-full border border-cobalt/20 bg-cobalt/5 px-3 py-1.5 text-sm font-medium text-cobalt">
                  {badgeIcons[badge.type]}
                  {badge.label}
                </div>
              ))}
            </div>

            {/* About */}
            <div>
              <h2 className="text-xl font-display font-semibold text-foreground">About</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">{vendor.description}</p>
            </div>

            {/* Services */}
            <div>
              <h2 className="text-xl font-display font-semibold text-foreground">Services</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {vendor.serviceTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-sm">{tag}</Badge>
                ))}
              </div>
            </div>

            {/* Pickup & Delivery */}
            {(vendor.hasPickup || vendor.hasDelivery) && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
                  <Truck className="h-5 w-5 text-cobalt" />
                  Pickup & Delivery
                </h2>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {vendor.hasPickup && <p>✅ Pickup available (within {vendor.pickupRadius}km radius)</p>}
                  {vendor.hasDelivery && <p>✅ Delivery available</p>}
                  <p className="font-medium text-foreground">Neighborhoods served:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {vendor.neighborhoodsServed.map((n) => (
                      <span key={n} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{n}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Hours */}
            <div>
              <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-5 w-5 text-cobalt" />
                Operating Hours
              </h2>
              <div className="mt-3 space-y-1.5">
                {vendor.businessHours.map((h) => (
                  <div key={h.day} className="flex items-center justify-between text-sm">
                    <span className="text-foreground font-medium">{h.day}</span>
                    <span className="text-muted-foreground">
                      {h.isClosed ? 'Closed' : `${h.open} - ${h.close}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Reviews */}
            <div>
              <h2 className="text-xl font-display font-semibold text-foreground">
                Reviews ({vendor.reviewCount})
              </h2>
              <div className="mt-4 space-y-4">
                {vendor.reviews.map((review) => (
                  <div key={review.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{review.customerName}</span>
                      <span className="text-xs text-muted-foreground">{review.date}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? 'fill-warning text-warning' : 'text-border'}`} />
                      ))}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="sticky top-24 space-y-4">
              {/* Contact Card */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-card">
                <h3 className="text-lg font-display font-semibold text-foreground">Contact {vendor.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{vendor.priceRange}</p>

                {vendor.responseMinutes <= 5 && (
                  <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-cobalt/5 px-3 py-2 text-sm font-medium text-cobalt">
                    <Zap className="h-4 w-4" />
                    Responds {vendor.responseTime}
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  <a href={`https://wa.me/${vendor.whatsapp}`} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full gap-2 bg-success hover:bg-success/90 text-success-foreground">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  </a>
                  <a href={`tel:${vendor.phone}`}>
                    <Button variant="outline" className="w-full gap-2 mt-2">
                      <Phone className="h-4 w-4" />
                      Call Now
                    </Button>
                  </a>
                  <a href={`mailto:${vendor.email}`}>
                    <Button variant="outline" className="w-full gap-2 mt-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Button>
                  </a>
                </div>
              </div>

              {/* Stats */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground">Vendor Stats</h3>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="text-xl font-bold text-foreground">{vendor.profileViews.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Profile Views</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-foreground">{vendor.favorites}</div>
                    <div className="text-xs text-muted-foreground">Favorites</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-foreground">{vendor.inquiries}</div>
                    <div className="text-xs text-muted-foreground">Inquiries</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-foreground">{vendor.responseTime}</div>
                    <div className="text-xs text-muted-foreground">Response</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default VendorProfile;
