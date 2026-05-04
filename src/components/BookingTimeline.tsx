import { Check, Clock } from 'lucide-react';
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

const STAGES: { key: BookingStatus; label: string }[] = [
  { key: 'requested', label: 'Requested' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'pickup_scheduled', label: 'Pickup scheduled' },
  { key: 'picked_up', label: 'Picked up' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'ready', label: 'Ready' },
  { key: 'out_for_delivery', label: 'Out for delivery' },
  { key: 'completed', label: 'Completed' },
];

interface BookingTimelineProps {
  status: BookingStatus;
  className?: string;
}

const BookingTimeline = ({ status, className }: BookingTimelineProps) => {
  if (status === 'cancelled') {
    return (
      <div className={cn('rounded-lg border border-destructive/30 bg-destructive/5 p-4', className)}>
        <p className="text-sm font-medium text-destructive">Booking cancelled</p>
      </div>
    );
  }

  const currentIdx = STAGES.findIndex((s) => s.key === status);

  return (
    <div className={cn('space-y-3', className)}>
      {STAGES.map((stage, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={stage.key} className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
                done && 'border-cobalt bg-cobalt text-primary-foreground',
                active && 'border-cobalt bg-cobalt/10 text-cobalt',
                !done && !active && 'border-border bg-card text-muted-foreground',
              )}
            >
              {done ? (
                <Check className="h-4 w-4" />
              ) : active ? (
                <Clock className="h-4 w-4 animate-pulse" />
              ) : (
                <span className="text-xs font-semibold">{i + 1}</span>
              )}
            </div>
            <span
              className={cn(
                'text-sm',
                done && 'text-muted-foreground',
                active && 'font-semibold text-foreground',
                !done && !active && 'text-muted-foreground/60',
              )}
            >
              {stage.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default BookingTimeline;
