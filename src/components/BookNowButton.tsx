import { useState, ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BookNowModal from './BookNowModal';

interface BookNowButtonProps {
  vendorId?: string;
  vendorName?: string;
  defaultCategorySlug?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
  className?: string;
  children?: ReactNode;
  fullWidth?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

const BookNowButton = ({
  vendorId,
  vendorName,
  defaultCategorySlug,
  size = 'default',
  variant = 'default',
  className = '',
  children,
  fullWidth,
  onClick,
}: BookNowButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size={size}
        variant={variant}
        className={`gap-1.5 ${fullWidth ? 'w-full' : ''} ${className}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick?.(e);
          setOpen(true);
        }}
      >
        <Sparkles className="h-4 w-4" />
        {children ?? 'Book Now'}
      </Button>
      <BookNowModal
        open={open}
        onOpenChange={setOpen}
        vendorId={vendorId}
        vendorName={vendorName}
        defaultCategorySlug={defaultCategorySlug}
      />
    </>
  );
};

export default BookNowButton;
