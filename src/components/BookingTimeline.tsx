import { Check, Clock, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type BookingStatus =
  | 'requested'
  | 'accepted'
  | 'pickup_scheduled'
  | 'picked_up'
  | 'in_progress'
  | 'ready'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled';

const STAGES: { key: BookingStatus; label: string; hint: string }[] = [
  { key: 'requested', label: 'Requested', hint: 'Awaiting provider' },
  { key: 'accepted', label: 'Accepted', hint: 'Provider confirmed' },
  { key: 'pickup_scheduled', label: 'Pickup scheduled', hint: 'Pickup time set' },
  { key: 'picked_up', label: 'Picked up', hint: 'Items collected' },
  { key: 'in_progress', label: 'In progress', hint: 'Being cleaned' },
  { key: 'ready', label: 'Ready', hint: 'Ready for delivery' },
  { key: 'out_for_delivery', label: 'Out for delivery', hint: 'On the way' },
  { key: 'completed', label: 'Completed', hint: 'All done' },
];

interface BookingTimelineProps {
  status: BookingStatus;
  className?: string;
}

const BookingTimeline = ({ status, className }: BookingTimelineProps) => {
  if (status === 'cancelled') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4',
          className,
        )}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <X className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-destructive">Booking cancelled</p>
          <p className="text-xs text-destructive/70">This booking is no longer active.</p>
        </div>
      </motion.div>
    );
  }

  const currentIdx = STAGES.findIndex((s) => s.key === status);
  const progress = ((currentIdx + 1) / STAGES.length) * 100;

  return (
    <div className={cn('relative', className)}>
      {/* Progress bar (mobile-friendly summary) */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">Step {currentIdx + 1} of {STAGES.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-primary via-cobalt to-accent"
          />
        </div>
      </div>

      {/* Vertical timeline */}
      <div className="relative space-y-4">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" aria-hidden />
        {STAGES.map((stage, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <motion.div
              key={stage.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
              className="relative flex items-start gap-3"
            >
              <div
                className={cn(
                  'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                  done && 'border-primary bg-primary text-primary-foreground shadow-sm',
                  active && 'border-primary bg-background text-primary animate-pulse-ring',
                  !done && !active && 'border-border bg-card text-muted-foreground',
                )}
              >
                {done ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </motion.div>
                ) : active ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <span className="text-[11px] font-semibold">{i + 1}</span>
                )}
              </div>
              <div className="min-w-0 pt-0.5">
                <p
                  className={cn(
                    'text-sm leading-tight transition-colors',
                    done && 'text-foreground/80',
                    active && 'font-semibold text-foreground',
                    !done && !active && 'text-muted-foreground',
                  )}
                >
                  {stage.label}
                </p>
                <p className={cn('text-xs', active ? 'text-primary' : 'text-muted-foreground/70')}>
                  {stage.hint}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default BookingTimeline;
