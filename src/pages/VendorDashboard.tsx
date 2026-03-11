import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Eye, Heart, MessageSquare, Star, Clock,
  Settings, Bell, TrendingUp, Phone, Mail, MapPin, Edit2, Save, X
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type VendorProfile = Tables<'vendor_profiles'>;
type Inquiry = Tables<'inquiries'>;

const VendorDashboard = () => {
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<VendorProfile>>({});
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: vendorData } = await supabase
        .from('vendor_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!vendorData) {
        navigate('/vendor/onboarding');
        return;
      }

      setVendor(vendorData);
      setEditForm(vendorData);

      const { data: inqData } = await supabase
        .from('inquiries')
        .select('*')
        .eq('vendor_id', vendorData.id)
        .order('created_at', { ascending: false });

      setInquiries(inqData || []);
      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleSave = async () => {
    if (!vendor) return;
    const { error } = await supabase
      .from('vendor_profiles')
      .update({
        name: editForm.name,
        short_description: editForm.short_description,
        description: editForm.description,
        phone: editForm.phone,
        whatsapp: editForm.whatsapp,
        email: editForm.email,
        website: editForm.website,
        address: editForm.address,
        price_range: editForm.price_range,
        has_pickup: editForm.has_pickup,
        has_delivery: editForm.has_delivery,
      })
      .eq('id', vendor.id);

    if (error) {
      toast.error('Failed to save changes');
    } else {
      setVendor({ ...vendor, ...editForm } as VendorProfile);
      setEditing(false);
      toast.success('Profile updated successfully');
    }
  };

  const handleAvailabilityChange = async (value: string) => {
    if (!vendor) return;
    const { error } = await supabase
      .from('vendor_profiles')
      .update({ availability: value as VendorProfile['availability'] })
      .eq('id', vendor.id);

    if (error) {
      toast.error('Failed to update availability');
    } else {
      setVendor({ ...vendor, availability: value as VendorProfile['availability'] });
      toast.success('Availability updated');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!vendor) return null;

  const availabilityColor = vendor.availability === 'accepting'
    ? 'bg-success text-success-foreground'
    : vendor.availability === 'limited'
    ? 'bg-warning text-warning-foreground'
    : 'bg-destructive text-destructive-foreground';

  const availabilityLabel = vendor.availability === 'accepting'
    ? 'Accepting Laundry'
    : vendor.availability === 'limited'
    ? 'Limited Availability'
    : 'Fully Booked';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{vendor.name}</h1>
            <p className="text-muted-foreground">{vendor.type_label} · {vendor.neighborhood || 'No location set'}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={availabilityColor}>{availabilityLabel}</Badge>
            {vendor.is_verified && <Badge variant="secondary">✓ Verified</Badge>}
            {vendor.status === 'pending' && <Badge variant="outline" className="text-warning">Pending Approval</Badge>}
          </div>
        </div>

        {/* Quick availability control */}
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Availability Status</p>
                <p className="text-sm text-muted-foreground">Control how customers see your availability</p>
              </div>
            </div>
            <Select value={vendor.availability || 'accepting'} onValueChange={handleAvailabilityChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="accepting">🟢 Accepting Laundry</SelectItem>
                <SelectItem value="limited">🟡 Limited Availability</SelectItem>
                <SelectItem value="fully-booked">🔴 Fully Booked</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 w-full justify-start">
            <TabsTrigger value="overview" className="gap-2"><LayoutDashboard className="h-4 w-4" /> Overview</TabsTrigger>
            <TabsTrigger value="inquiries" className="gap-2"><MessageSquare className="h-4 w-4" /> Inquiries</TabsTrigger>
            <TabsTrigger value="profile" className="gap-2"><Settings className="h-4 w-4" /> Profile</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Profile Views', value: vendor.profile_views || 0, icon: Eye, color: 'text-cobalt' },
                { label: 'Inquiries', value: vendor.inquiries_count || 0, icon: MessageSquare, color: 'text-success' },
                { label: 'Favorites', value: vendor.favorites_count || 0, icon: Heart, color: 'text-destructive' },
                { label: 'Rating', value: vendor.rating?.toFixed(1) || '0.0', icon: Star, color: 'text-warning' },
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={`rounded-lg bg-secondary p-2.5 ${stat.color}`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent inquiries preview */}
            <Card className="mt-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-display">Recent Inquiries</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('inquiries')}>View All</Button>
              </CardHeader>
              <CardContent>
                {inquiries.length === 0 ? (
                  <div className="py-8 text-center">
                    <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/40" />
                    <p className="mt-2 text-muted-foreground">No inquiries yet</p>
                    <p className="text-sm text-muted-foreground">They'll appear here when customers reach out</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inquiries.slice(0, 5).map((inq) => (
                      <div key={inq.id} className="flex items-start justify-between rounded-lg border border-border p-3">
                        <div>
                          <p className="font-medium text-foreground">{inq.customer_name || 'Anonymous'}</p>
                          <p className="text-sm text-muted-foreground">{inq.message || 'No message'}</p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            {inq.customer_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {inq.customer_phone}</span>}
                            {inq.customer_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {inq.customer_email}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs">{inq.contact_method}</Badge>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(inq.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick tips */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" /> Tips to Get More Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { tip: 'Add photos of your shop and equipment', done: (vendor.images?.length || 0) > 0 },
                    { tip: 'Complete your business description', done: !!vendor.description },
                    { tip: 'Set your business hours', done: true },
                    { tip: 'Enable pickup & delivery', done: vendor.has_pickup || vendor.has_delivery },
                  ].map((item) => (
                    <div key={item.tip} className={`flex items-center gap-2 rounded-lg border p-3 ${item.done ? 'border-success/30 bg-success/5' : 'border-border'}`}>
                      <div className={`h-2 w-2 rounded-full ${item.done ? 'bg-success' : 'bg-muted-foreground/30'}`} />
                      <p className={`text-sm ${item.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{item.tip}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inquiries */}
          <TabsContent value="inquiries">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">All Inquiries</CardTitle>
                <CardDescription>{inquiries.length} total inquiries</CardDescription>
              </CardHeader>
              <CardContent>
                {inquiries.length === 0 ? (
                  <div className="py-12 text-center">
                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/40" />
                    <p className="mt-3 font-medium text-foreground">No inquiries yet</p>
                    <p className="text-sm text-muted-foreground">When customers contact you, their inquiries will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inquiries.map((inq) => (
                      <div key={inq.id} className="rounded-lg border border-border p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-foreground">{inq.customer_name || 'Anonymous'}</p>
                            <p className="mt-1 text-sm text-foreground">{inq.message || 'No message provided'}</p>
                          </div>
                          <Badge variant="outline">{inq.contact_method}</Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          {inq.customer_phone && (
                            <a href={`tel:${inq.customer_phone}`} className="flex items-center gap-1 text-primary hover:underline">
                              <Phone className="h-3.5 w-3.5" /> {inq.customer_phone}
                            </a>
                          )}
                          {inq.customer_email && (
                            <a href={`mailto:${inq.customer_email}`} className="flex items-center gap-1 text-primary hover:underline">
                              <Mail className="h-3.5 w-3.5" /> {inq.customer_email}
                            </a>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(inq.created_at).toLocaleDateString()} at {new Date(inq.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Management */}
          <TabsContent value="profile">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-display">Business Profile</CardTitle>
                  <CardDescription>Manage your business information</CardDescription>
                </div>
                {!editing ? (
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditing(true)}>
                    <Edit2 className="h-4 w-4" /> Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-2" onClick={handleSave}>
                      <Save className="h-4 w-4" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditForm(vendor); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <Label>Business Name</Label>
                      {editing ? (
                        <Input value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                      ) : (
                        <p className="mt-1 text-foreground">{vendor.name}</p>
                      )}
                    </div>
                    <div>
                      <Label>Short Description</Label>
                      {editing ? (
                        <Input value={editForm.short_description || ''} onChange={(e) => setEditForm({ ...editForm, short_description: e.target.value })} />
                      ) : (
                        <p className="mt-1 text-sm text-foreground">{vendor.short_description || '—'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Full Description</Label>
                      {editing ? (
                        <Textarea value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={4} />
                      ) : (
                        <p className="mt-1 text-sm text-foreground">{vendor.description || '—'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Price Range</Label>
                      {editing ? (
                        <Input value={editForm.price_range || ''} onChange={(e) => setEditForm({ ...editForm, price_range: e.target.value })} placeholder="e.g. KES 200-500" />
                      ) : (
                        <p className="mt-1 text-sm text-foreground">{vendor.price_range || '—'}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Phone</Label>
                      {editing ? (
                        <Input value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                      ) : (
                        <p className="mt-1 text-sm text-foreground">{vendor.phone || '—'}</p>
                      )}
                    </div>
                    <div>
                      <Label>WhatsApp</Label>
                      {editing ? (
                        <Input value={editForm.whatsapp || ''} onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })} />
                      ) : (
                        <p className="mt-1 text-sm text-foreground">{vendor.whatsapp || '—'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Email</Label>
                      {editing ? (
                        <Input value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                      ) : (
                        <p className="mt-1 text-sm text-foreground">{vendor.email || '—'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Website</Label>
                      {editing ? (
                        <Input value={editForm.website || ''} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} />
                      ) : (
                        <p className="mt-1 text-sm text-foreground">{vendor.website || '—'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Address</Label>
                      {editing ? (
                        <Input value={editForm.address || ''} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                      ) : (
                        <p className="mt-1 flex items-center gap-1 text-sm text-foreground">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {vendor.address || '—'}
                        </p>
                      )}
                    </div>

                    {editing && (
                      <div className="space-y-3 rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="pickup">Pickup Service</Label>
                          <Switch id="pickup" checked={editForm.has_pickup || false} onCheckedChange={(v) => setEditForm({ ...editForm, has_pickup: v })} />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="delivery">Delivery Service</Label>
                          <Switch id="delivery" checked={editForm.has_delivery || false} onCheckedChange={(v) => setEditForm({ ...editForm, has_delivery: v })} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VendorDashboard;
