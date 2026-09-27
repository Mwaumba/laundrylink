import { useState } from 'react';
import { Crosshair, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getCurrentPosition, type LatLng } from '@/lib/geo';

interface UseLocationButtonProps {
  value: LatLng | null;
  onChange: (value: LatLng) => void;
  label?: string;
}

/** Fills in a lat/lng from the device's location. */
const UseLocationButton = ({ value, onChange, label = 'Use my current location' }: UseLocationButtonProps) => {
  const [locating, setLocating] = useState(false);

  const locate = async () => {
    setLocating(true);
    try {
      onChange(await getCurrentPosition());
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLocating(false);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={locate} disabled={locating} className="gap-1.5">
      {locating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : value ? (
        <Check className="h-4 w-4 text-success" />
      ) : (
        <Crosshair className="h-4 w-4" />
      )}
      {value ? 'Location set' : label}
    </Button>
  );
};

export default UseLocationButton;
