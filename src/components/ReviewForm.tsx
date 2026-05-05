import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReviewFormProps {
  bookingId: string;
  vendorId: string;
  defaultName?: string;
  onSubmitted?: () => void;
}

const ReviewForm = ({ bookingId, vendorId, defaultName = '', onSubmitted }: ReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState(defaultName);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (rating < 1) {
      toast.error('Pick a rating');
      return;
    }
    if (!name.trim()) {
      toast.error('Add your name');
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sign in first');
      const { error } = await supabase.from('reviews').insert({
        booking_id: bookingId,
        vendor_id: vendorId,
        user_id: user.id,
        customer_name: name,
        rating,
        comment: comment || null,
      });
      if (error) throw error;
      toast.success('Thanks for your review!');
      onSubmitted?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h3 className="font-display text-lg font-semibold">Write a review</h3>
        <p className="text-sm text-muted-foreground">Help others by sharing your experience.</p>
      </div>

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className="p-0.5"
            aria-label={`${n} star`}
          >
            <Star
              className={`h-7 w-7 transition-colors ${
                (hover || rating) >= n ? 'fill-warning text-warning' : 'text-border'
              }`}
            />
          </button>
        ))}
      </div>

      <Input
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={120}
      />
      <Textarea
        placeholder="Share details about your experience (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        maxLength={1000}
      />

      <Button onClick={submit} disabled={submitting} className="w-full">
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit review
      </Button>
    </div>
  );
};

export default ReviewForm;
