import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, MessageCircle, Star, ShieldCheck, MapPin, Clock, Loader2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface AssignedParty {
  kind: 'vendor' | 'provider';
  name: string;
  slug?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  avatar_url?: string | null;
  rating?: number | null;
  review_count?: number | null;
  neighborhood?: string | null;
  is_verified?: boolean | null;
  type_label?: string | null;
  accepted_at?: string | null;
}

interface Props {
  loading?: boolean;
  party?: AssignedParty | null;
}

const wa = (n?: string | null) => (n ? `https://wa.me/${n.replace(/\D/g, '')}` : '#');

const AssignedProviderCard = ({ loading, party }: Props) => {
  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-6 shadow-card">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Provider assigned — details loading…</span>
      </div>
    );
  }

  if (!party) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-dashed border-border bg-card p-6 text-center shadow-card"
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Clock className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="font-display text-base font-semibold text-foreground">Awaiting provider assignment</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Nearby providers have been notified — you'll see who accepts here in real time.
        </p>
      </motion.div>
    );
  }

  const initials = party.name.split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const profileHref = party.kind === 'vendor' && party.slug ? `/vendor/${party.slug}` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-6 shadow-card-hover"
    >
      <div className="pointer-events-none absolute inset-0 gradient-hero opacity-[0.05]" />
      <div className="relative">
        <div className="mb-4 flex items-center gap-2">
          <Badge className="bg-success/15 text-success border border-success/30 hover:bg-success/15">
            Accepted
          </Badge>
          {party.accepted_at && (
            <span className="text-xs text-muted-foreground">
              {new Date(party.accepted_at).toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex items-start gap-4">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-primary/10 ring-2 ring-primary/20">
            {party.avatar_url ? (
              <img src={party.avatar_url} alt={party.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-display text-lg font-bold text-primary">
                {initials || <UserRound className="h-6 w-6" />}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
                {profileHref ? (
                  <Link to={profileHref} className="hover:text-primary">{party.name}</Link>
                ) : party.name}
              </h3>
              {party.is_verified && (
                <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </Badge>
              )}
            </div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {party.kind === 'vendor' ? (party.type_label ?? 'Verified Vendor') : 'Independent Provider'}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {typeof party.rating === 'number' && party.rating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  {party.rating.toFixed(1)}
                  {party.review_count ? ` · ${party.review_count} reviews` : ''}
                </span>
              )}
              {party.neighborhood && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {party.neighborhood}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {party.phone && (
            <a href={`tel:${party.phone}`} className="flex-1 min-w-[140px]">
              <Button className="w-full gap-2"><Phone className="h-4 w-4" /> Call</Button>
            </a>
          )}
          {(party.whatsapp || party.phone) && (
            <a href={wa(party.whatsapp ?? party.phone)} target="_blank" rel="noreferrer" className="flex-1 min-w-[140px]">
              <Button variant="outline" className="w-full gap-2 border-success/40 text-success hover:bg-success/10 hover:text-success">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </Button>
            </a>
          )}
          {profileHref && (
            <Link to={profileHref} className="flex-1 min-w-[140px]">
              <Button variant="ghost" className="w-full">View profile</Button>
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AssignedProviderCard;
