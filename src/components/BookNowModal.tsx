import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Calendar, MapPin, Loader2, Building2, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useServiceCategories } from '@/hooks/useServiceCategories';

type ProviderType = 'vendor' | 'independent';

interface BookNowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, pre-selects this vendor and locks the provider type to 'vendor' */
  vendorId?: string;
  vendorName?: string;
  defaultCategorySlug?: string;
}

const bookingSchema = z.object({
  categoryId: z.string().uuid('Pick a service'),
  providerType: z.enum(['vendor', 'independent']),
  scheduledAt: z.string().min(1, 'Pick a date & time'),
  address: z.string().trim().min(3, 'Address is required').max(300),
  notes: z.string().trim().max(1000).optional(),
  customerName: z.string().trim().min(1, 'Name is required').max(120),
  customerPhone: z.string().trim().min(7, 'Valid phone required').max(20),
  pickup: z.boolean().optional(),
  delivery: z.boolean().optional(),
});

const BookNowModal = ({
  open,
  onOpenChange,
  vendorId,
  vendorName,
  defaultCategorySlug,
}: BookNowModalProps) => {
  const navigate = useNavigate();
  const { categories } = useServiceCategories();

  const [providerType, setProviderType] = useState<ProviderType>(vendorId ? 'vendor' : 'vendor');
  const [categoryId, setCategoryId] = useState<string>('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pickup, setPickup] = useState(false);
  const [delivery, setDelivery] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pre-select category from slug
  useEffect(() => {
    if (defaultCategorySlug && categories.length && !categoryId) {
      const match = categories.find((c) => c.slug === defaultCategorySlug);
      if (match) setCategoryId(match.id);
    }
  }, [defaultCategorySlug, categories, categoryId]);

  // Lock to vendor type when a vendor is provided
  useEffect(() => {
    if (vendorId) setProviderType('vendor');
  }, [vendorId]);

  const handleSubmit = async () => {
    const parsed = bookingSchema.safeParse({
      categoryId,
      providerType,
      scheduledAt,
      address,
      notes,
      customerName,
      customerPhone,
      pickup,
      delivery,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please sign in to book');
      onOpenChange(false);
      navigate('/auth');
      return;
    }

    setSubmitting(true);
    try {
      if (providerType === 'vendor') {
        const { data, error } = await supabase
          .from('bookings')
          .insert({
            customer_id: user.id,
            vendor_id: vendorId ?? null,
            category_id: categoryId,
            scheduled_at: scheduledAt,
            address,
            notes: notes || null,
            customer_name: customerName,
            customer_phone: customerPhone,
            pickup_required: pickup,
            delivery_required: delivery,
            status: 'requested',
          })
          .select('id')
          .single();
        if (error) throw error;
        toast.success('Booking sent! The vendor will confirm shortly.');
        onOpenChange(false);
        navigate(`/bookings/${data.id}`);
      } else {
        const { data, error } = await supabase
          .from('job_requests')
          .insert({
            customer_id: user.id,
            category_id: categoryId,
            address,
            notes: notes || null,
            customer_name: customerName,
            customer_phone: customerPhone,
            scheduled_at: scheduledAt,
            status: 'broadcasting',
          })
          .select('id')
          .single();
        if (error) throw error;
        toast.success('Job broadcast to nearby providers!');
        onOpenChange(false);
        navigate(`/jobs/${data.id}`);
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Could not create booking');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {vendorName ? `Book ${vendorName}` : 'Book a Service'}
          </DialogTitle>
          <DialogDescription>
            {vendorName
              ? 'Tell us a few details and the vendor will confirm.'
              : 'Choose a vendor or have a nearby independent provider come to you.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Provider type toggle (hidden when vendor preselected) */}
          {!vendorId && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProviderType('vendor')}
                className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-sm transition-all ${
                  providerType === 'vendor'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <Building2 className="h-5 w-5 text-cobalt" />
                <span className="font-semibold">Established Vendor</span>
                <span className="text-xs text-muted-foreground">Listed shops</span>
              </button>
              <button
                type="button"
                onClick={() => setProviderType('independent')}
                className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-sm transition-all ${
                  providerType === 'independent'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <User className="h-5 w-5 text-cobalt" />
                <span className="font-semibold">Independent Provider</span>
                <span className="text-xs text-muted-foreground">On-demand</span>
              </button>
            </div>
          )}

          {/* Service */}
          <div className="space-y-2">
            <Label>Service</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={`flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition-all ${
                    categoryId === c.id
                      ? 'border-primary bg-primary/5 font-semibold'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <span className="text-lg">{c.icon}</span>
                  <span className="line-clamp-1">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> When
            </Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> Service address
            </Label>
            <Input
              placeholder="e.g. Westlands, Nairobi"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={300}
            />
          </div>

          {/* Pickup/Delivery — only for vendor flow */}
          {providerType === 'vendor' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <Label htmlFor="pickup" className="text-sm">Pickup</Label>
                <Switch id="pickup" checked={pickup} onCheckedChange={setPickup} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <Label htmlFor="delivery" className="text-sm">Delivery</Label>
                <Switch id="delivery" checked={delivery} onCheckedChange={setDelivery} />
              </div>
            </div>
          )}

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Your name</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} maxLength={20} placeholder="+254..." />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the provider should know"
              maxLength={1000}
              rows={3}
            />
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full" size="lg">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {providerType === 'vendor' ? 'Send booking' : 'Broadcast job'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookNowModal;
