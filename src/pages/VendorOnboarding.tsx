import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, MapPin, Clock, Truck, Camera, FileText, Send } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { serviceTags } from '@/data/serviceTags';
import { neighborhoods } from '@/data/neighborhoods';

const VENDOR_TYPES = [
  { value: 'laundry-shop', label: 'Laundry Shop', desc: 'Full-service laundry with machines' },
  { value: 'dry-cleaner', label: 'Dry Cleaner', desc: 'Specialist dry cleaning services' },
  { value: 'ironing-service', label: 'Ironing Service', desc: 'Professional pressing & ironing' },
  { value: 'pickup-delivery', label: 'Pickup & Delivery', desc: 'Doorstep laundry collection' },
  { value: 'independent', label: 'Independent Provider', desc: 'Freelance laundry services' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const STEPS = [
  { id: 1, title: 'Vendor Type', icon: MapPin },
  { id: 2, title: 'Business Details', icon: FileText },
  { id: 3, title: 'Contact Info', icon: MapPin },
  { id: 4, title: 'Location', icon: MapPin },
  { id: 5, title: 'Service Area', icon: Truck },
  { id: 6, title: 'Services', icon: Check },
  { id: 7, title: 'Pricing', icon: FileText },
  { id: 8, title: 'Hours', icon: Clock },
  { id: 9, title: 'Pickup & Delivery', icon: Truck },
  { id: 10, title: 'Photos', icon: Camera },
  { id: 11, title: 'Review & Submit', icon: Send },
];

interface FormData {
  vendorType: string;
  businessName: string;
  description: string;
  shortDescription: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  address: string;
  neighborhood: string;
  selectedTags: string[];
  priceRange: string;
  hasPickup: boolean;
  hasDelivery: boolean;
  pickupRadius: number;
  neighborhoodsServed: string[];
  hours: { day: string; open: string; close: string; isClosed: boolean }[];
}

const VendorOnboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    vendorType: '',
    businessName: '',
    description: '',
    shortDescription: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    address: '',
    neighborhood: '',
    selectedTags: [],
    priceRange: '',
    hasPickup: false,
    hasDelivery: false,
    pickupRadius: 5,
    neighborhoodsServed: [],
    hours: DAYS.map((day) => ({ day, open: '08:00', close: '18:00', isClosed: day === 'Sunday' })),
  });

  const updateForm = (field: keyof FormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleTag = (tag: string) => {
    updateForm('selectedTags',
      form.selectedTags.includes(tag)
        ? form.selectedTags.filter((t) => t !== tag)
        : [...form.selectedTags, tag]
    );
  };

  const toggleNeighborhood = (slug: string) => {
    updateForm('neighborhoodsServed',
      form.neighborhoodsServed.includes(slug)
        ? form.neighborhoodsServed.filter((n) => n !== slug)
        : [...form.neighborhoodsServed, slug]
    );
  };

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = () => {
    // In production, this would save to Supabase
    navigate('/vendor/onboarding/pending');
  };

  const progress = (step / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Step {step} of {STEPS.length}</span>
            <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto pb-2">
            {STEPS.map((s) => (
              <button
                key={s.id}
                onClick={() => s.id <= step && setStep(s.id)}
                className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  s.id === step
                    ? 'bg-primary text-primary-foreground'
                    : s.id < step
                    ? 'bg-success/10 text-success'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {s.id < step ? <Check className="h-3 w-3" /> : null}
                {s.title}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="font-display">{STEPS[step - 1].title}</CardTitle>
                <CardDescription>
                  {step === 1 && 'What type of laundry service do you provide?'}
                  {step === 2 && 'Tell customers about your business'}
                  {step === 3 && 'How can customers reach you?'}
                  {step === 4 && 'Where is your business located?'}
                  {step === 5 && 'Which areas do you serve?'}
                  {step === 6 && 'What services do you offer?'}
                  {step === 7 && 'Set your pricing range'}
                  {step === 8 && 'Set your operating hours'}
                  {step === 9 && 'Do you offer pickup and delivery?'}
                  {step === 10 && 'Upload photos of your business'}
                  {step === 11 && 'Review your listing before submission'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Step 1: Vendor Type */}
                {step === 1 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {VENDOR_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => updateForm('vendorType', type.value)}
                        className={`rounded-xl border-2 p-4 text-left transition-all ${
                          form.vendorType === type.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/30'
                        }`}
                      >
                        <p className="font-display font-bold text-foreground">{type.label}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{type.desc}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Step 2: Business Details */}
                {step === 2 && (
                  <>
                    <div className="space-y-2">
                      <Label>Business Name</Label>
                      <Input value={form.businessName} onChange={(e) => updateForm('businessName', e.target.value)} placeholder="e.g., CleanWave Laundry" />
                    </div>
                    <div className="space-y-2">
                      <Label>Short Description</Label>
                      <Input value={form.shortDescription} onChange={(e) => updateForm('shortDescription', e.target.value)} placeholder="One-line summary..." maxLength={100} />
                    </div>
                    <div className="space-y-2">
                      <Label>Full Description</Label>
                      <Textarea value={form.description} onChange={(e) => updateForm('description', e.target.value)} placeholder="Tell customers about your business..." rows={4} />
                    </div>
                  </>
                )}

                {/* Step 3: Contact Info */}
                {step === 3 && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} placeholder="+254..." />
                      </div>
                      <div className="space-y-2">
                        <Label>WhatsApp Number</Label>
                        <Input value={form.whatsapp} onChange={(e) => updateForm('whatsapp', e.target.value)} placeholder="254..." />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} placeholder="business@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Website (optional)</Label>
                      <Input value={form.website} onChange={(e) => updateForm('website', e.target.value)} placeholder="https://..." />
                    </div>
                  </>
                )}

                {/* Step 4: Location */}
                {step === 4 && (
                  <>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input value={form.address} onChange={(e) => updateForm('address', e.target.value)} placeholder="Street address..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Neighborhood</Label>
                      <div className="flex flex-wrap gap-2">
                        {neighborhoods.map((n) => (
                          <Badge
                            key={n.slug}
                            variant={form.neighborhood === n.slug ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => updateForm('neighborhood', n.slug)}
                          >
                            {n.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/50 p-8 text-center">
                      <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">Map pin placement will be available after connecting Mapbox</p>
                    </div>
                  </>
                )}

                {/* Step 5: Service Area */}
                {step === 5 && (
                  <>
                    <p className="text-sm text-muted-foreground">Select all neighborhoods you serve:</p>
                    <div className="flex flex-wrap gap-2">
                      {neighborhoods.map((n) => (
                        <Badge
                          key={n.slug}
                          variant={form.neighborhoodsServed.includes(n.slug) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleNeighborhood(n.slug)}
                        >
                          {n.name}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}

                {/* Step 6: Services */}
                {step === 6 && (
                  <>
                    <p className="text-sm text-muted-foreground">Select services you offer:</p>
                    <div className="flex flex-wrap gap-2">
                      {serviceTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={form.selectedTags.includes(tag) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleTag(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}

                {/* Step 7: Pricing */}
                {step === 7 && (
                  <div className="space-y-2">
                    <Label>Price Range</Label>
                    <Input value={form.priceRange} onChange={(e) => updateForm('priceRange', e.target.value)} placeholder="e.g., KES 200-800" />
                    <p className="text-xs text-muted-foreground">This gives customers a general idea of your pricing</p>
                  </div>
                )}

                {/* Step 8: Hours */}
                {step === 8 && (
                  <div className="space-y-3">
                    {form.hours.map((h, i) => (
                      <div key={h.day} className="flex items-center gap-3 rounded-lg border border-border p-3">
                        <span className="w-24 text-sm font-medium text-foreground">{h.day}</span>
                        <Switch
                          checked={!h.isClosed}
                          onCheckedChange={(checked) => {
                            const hours = [...form.hours];
                            hours[i] = { ...hours[i], isClosed: !checked };
                            updateForm('hours', hours);
                          }}
                        />
                        {!h.isClosed ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={h.open}
                              onChange={(e) => {
                                const hours = [...form.hours];
                                hours[i] = { ...hours[i], open: e.target.value };
                                updateForm('hours', hours);
                              }}
                              className="w-28"
                            />
                            <span className="text-muted-foreground">to</span>
                            <Input
                              type="time"
                              value={h.close}
                              onChange={(e) => {
                                const hours = [...form.hours];
                                hours[i] = { ...hours[i], close: e.target.value };
                                updateForm('hours', hours);
                              }}
                              className="w-28"
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Closed</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Step 9: Pickup & Delivery */}
                {step === 9 && (
                  <>
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div>
                        <p className="font-medium text-foreground">Pickup Service</p>
                        <p className="text-sm text-muted-foreground">Collect laundry from customer's location</p>
                      </div>
                      <Switch checked={form.hasPickup} onCheckedChange={(v) => updateForm('hasPickup', v)} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div>
                        <p className="font-medium text-foreground">Delivery Service</p>
                        <p className="text-sm text-muted-foreground">Deliver clean laundry to customer's location</p>
                      </div>
                      <Switch checked={form.hasDelivery} onCheckedChange={(v) => updateForm('hasDelivery', v)} />
                    </div>
                    {(form.hasPickup || form.hasDelivery) && (
                      <div className="space-y-2">
                        <Label>Pickup/Delivery Radius (km)</Label>
                        <Input
                          type="number"
                          value={form.pickupRadius}
                          onChange={(e) => updateForm('pickupRadius', parseInt(e.target.value) || 0)}
                          min={1}
                          max={30}
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Step 10: Photos */}
                {step === 10 && (
                  <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
                    <Camera className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-3 font-medium text-foreground">Upload Business Photos</p>
                    <p className="mt-1 text-sm text-muted-foreground">Shop front, equipment, workspace, finished laundry</p>
                    <Button variant="outline" className="mt-4">Choose Files</Button>
                  </div>
                )}

                {/* Step 11: Review */}
                {step === 11 && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-sky/30 p-4">
                      <h3 className="font-display font-bold text-foreground">{form.businessName || 'Your Business'}</h3>
                      <p className="text-sm text-muted-foreground">{form.shortDescription || 'No description yet'}</p>
                    </div>
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      <div><span className="text-muted-foreground">Type:</span> <span className="font-medium text-foreground">{VENDOR_TYPES.find((t) => t.value === form.vendorType)?.label || '—'}</span></div>
                      <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium text-foreground">{form.phone || '—'}</span></div>
                      <div><span className="text-muted-foreground">Email:</span> <span className="font-medium text-foreground">{form.email || '—'}</span></div>
                      <div><span className="text-muted-foreground">Address:</span> <span className="font-medium text-foreground">{form.address || '—'}</span></div>
                      <div><span className="text-muted-foreground">Price Range:</span> <span className="font-medium text-foreground">{form.priceRange || '—'}</span></div>
                      <div><span className="text-muted-foreground">Pickup:</span> <span className="font-medium text-foreground">{form.hasPickup ? 'Yes' : 'No'}</span></div>
                    </div>
                    {form.selectedTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {form.selectedTags.map((t) => (
                          <Badge key={t} variant="secondary">{t}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="rounded-xl border border-border bg-warning/5 p-4">
                      <p className="text-sm text-foreground">
                        <strong>Note:</strong> Your listing will be reviewed by our team before going live. This usually takes 1-2 business days.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={prev} disabled={step === 1} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < STEPS.length ? (
            <Button onClick={next} className="gap-2">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="gap-2 bg-success hover:bg-success/90">
              <Send className="h-4 w-4" /> Submit for Review
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorOnboarding;
