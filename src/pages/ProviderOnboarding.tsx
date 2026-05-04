import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Loader2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useServiceCategories } from '@/hooks/useServiceCategories';

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(20),
  whatsapp: z.string().trim().max(20).optional(),
  bio: z.string().trim().max(500).optional(),
  neighborhood: z.string().trim().min(2).max(120),
  radius: z.number().int().min(1).max(50),
});

const ProviderOnboarding = () => {
  const navigate = useNavigate();
  const { categories } = useServiceCategories();
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [bio, setBio] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [radius, setRadius] = useState(5);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate('/auth?redirect=/provider/onboarding');
      else setUser(data.user);
    });
  }, [navigate]);

  const submit = async () => {
    const parsed = schema.safeParse({ fullName, phone, whatsapp, bio, neighborhood, radius });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    if (selectedCats.length === 0) {
      toast.error('Pick at least one service');
      return;
    }
    if (!user) return;

    setSubmitting(true);
    try {
      const { data: provider, error } = await supabase
        .from('independent_providers')
        .insert({
          user_id: user.id,
          full_name: fullName,
          phone,
          whatsapp: whatsapp || null,
          bio: bio || null,
          neighborhood,
          neighborhood_slug: neighborhood.toLowerCase().replace(/\s+/g, '-'),
          service_radius_km: radius,
          status: 'pending_approval',
        })
        .select('id')
        .single();
      if (error) throw error;

      // Insert services
      const services = selectedCats.map((cid) => ({ provider_id: provider.id, category_id: cid }));
      const { error: svcErr } = await supabase.from('provider_services').insert(services);
      if (svcErr) throw svcErr;

      // Add provider role
      await supabase.from('user_roles').insert({ user_id: user.id, role: 'provider' });

      toast.success('Profile submitted! An admin will review shortly.');
      navigate('/provider/dashboard');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="container mx-auto max-w-2xl flex-1 px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Become a Provider</h1>
        <p className="mt-1 text-muted-foreground">
          Sign up as an independent provider (Mamafua, mobile cleaner) to receive on-demand job requests.
        </p>

        <div className="mt-8 space-y-5 rounded-xl border border-border bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} placeholder="+254..." />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp (optional)</Label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} maxLength={20} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Base neighborhood</Label>
              <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} maxLength={120} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Service radius (km)</Label>
            <Input type="number" min={1} max={50} value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
          </div>

          <div className="space-y-2">
            <Label>Bio (optional)</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={3} placeholder="Tell customers about your experience..." />
          </div>

          <div className="space-y-2">
            <Label>Services you offer</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {categories.map((c) => {
                const on = selectedCats.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCats((s) => on ? s.filter((x) => x !== c.id) : [...s, c.id])}
                    className={`flex items-center gap-1.5 rounded-md border p-2 text-sm transition-all ${
                      on ? 'border-primary bg-primary/5 font-semibold' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <span>{c.icon}</span>
                    <span className="line-clamp-1">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Button onClick={submit} disabled={submitting} className="w-full" size="lg">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit for review
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProviderOnboarding;
