import { Link } from 'react-router-dom';
import { Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';

const VendorOnboardingPending = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sky">
        <Clock className="h-10 w-10 text-primary" />
      </div>
      <h1 className="mt-6 text-3xl font-display font-bold text-foreground">Application Submitted!</h1>
      <p className="mt-3 text-muted-foreground">
        Your business listing is under review. Our team typically reviews new listings within 1-2 business days.
      </p>
      <div className="mt-8 space-y-3 text-left">
        {['Application received', 'Under admin review', 'Profile goes live'].map((item, i) => (
          <div key={item} className="flex items-center gap-3">
            <CheckCircle className={`h-5 w-5 ${i === 0 ? 'text-success' : 'text-muted-foreground/30'}`} />
            <span className={`text-sm ${i === 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{item}</span>
          </div>
        ))}
      </div>
      <Link to="/" className="mt-8">
        <Button variant="outline">Back to Home</Button>
      </Link>
    </div>
  </div>
);

export default VendorOnboardingPending;
