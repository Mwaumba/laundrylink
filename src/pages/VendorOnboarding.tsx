import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, MapPin, Clock, Truck, Camera,
  FileText, Send, Loader2, X, CloudUpload, CheckCircle2, Shield, Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useServiceCategories } from '@/hooks/useServiceCategories';
import { neighborhoods } from '@/data/neighborhoods';
import { toast } from 'sonner';

// NOTE: Two private Supabase Storage buckets must exist before this page works:
//   • vendor-images  (public access ON)  — for business photos
//   • vendor-docs    (public access OFF) — for identity/legal documents

const CURRENT_YEAR = new Date().getFullYear();

const VENDOR_TYPES = [
  { value: 'laundry-shop',   label: 'Laundry Shop',                    desc: 'Registered laundry business with physical premises' },
  { value: 'dry-cleaner',    label: 'Dry Cleaner',                     desc: 'Specialist dry cleaning with professional equipment' },
  { value: 'ironing-service',label: 'Ironing Service',                 desc: 'Professional pressing and ironing service' },
  { value: 'pickup-delivery',label: 'Pickup & Delivery',               desc: 'Doorstep laundry collection and delivery service' },
  { value: 'independent',    label: 'Independent Provider (Mamafua)',   desc: 'Individual home-based or mobile laundry provider' },
] as const;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PAYMENT_METHODS = ['M-Pesa', 'Cash', 'Bank Transfer', 'Card'];
const TURNAROUND_OPTIONS = ['Same day', 'Next day', '2–3 days', 'Weekly'];
const EXPERIENCE_OPTIONS = ['Less than 1 year', '1–2 years', '3–5 years', '5+ years'];

const STEPS = [
  { id: 1,  title: 'Business Type' },
  { id: 2,  title: 'Details'       },
  { id: 3,  title: 'Contact'       },
  { id: 4,  title: 'Location'      },
  { id: 5,  title: 'Coverage'      },
  { id: 6,  title: 'Services'      },
  { id: 7,  title: 'Pricing'       },
  { id: 8,  title: 'Hours'         },
  { id: 9,  title: 'Pickup'        },
  { id: 10, title: 'Legal'         },
  { id: 11, title: 'Photos'        },
  { id: 12, title: 'Review'        },
];

// ── Document upload config ────────────────────────────────────────────────────

type DocKey =
  | 'registration-cert'
  | 'business-permit'
  | 'kra-pin'
  | 'national-id-front'
  | 'national-id-selfie';

interface DocConfig {
  filename: string;
  formField: keyof FormData;
  dbColumn: string;
  label: string;
}

const DOC_CONFIGS: Record<DocKey, DocConfig> = {
  'registration-cert':  { filename: 'registration-cert',  formField: 'docsRegistrationCertPath', dbColumn: 'docs_registration_cert_path',  label: 'Business Registration Certificate' },
  'business-permit':    { filename: 'business-permit',    formField: 'docsBusinessPermitPath',    dbColumn: 'docs_business_permit_path',    label: 'Business Permit / Single Business Permit' },
  'kra-pin':            { filename: 'kra-pin',            formField: 'docsKraPinPath',            dbColumn: 'docs_kra_pin_path',            label: 'KRA PIN Certificate' },
  'national-id-front':  { filename: 'national-id-front',  formField: 'docsNationalIdFrontPath',   dbColumn: 'docs_national_id_front_path',  label: 'National ID (front side)' },
  'national-id-selfie': { filename: 'national-id-selfie', formField: 'docsNationalIdSelfiePath',  dbColumn: 'docs_national_id_selfie_path', label: 'Selfie holding National ID' },
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface HourEntry { day: string; open: string; close: string; isClosed: boolean }

interface FormData {
  // track
  vendorType: string;
  isIndividual: boolean;
  // step 2
  businessName: string;
  shortDescription: string;
  description: string;
  yearEstablished: string;
  yearsExperience: string;
  // step 3
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  // step 4
  address: string;
  townArea: string;
  neighborhood: string;
  // step 5
  neighborhoodsServed: string[];
  // step 6
  selectedCategoryIds: string[];
  servicePrices: Record<string, string>;
  // step 7
  priceRange: string;
  minimumOrder: string;
  turnaroundTime: string;
  paymentMethods: string[];
  // step 8
  hours: HourEntry[];
  // step 9
  hasPickup: boolean;
  hasDelivery: boolean;
  pickupRadius: number;
  // step 10 – legal
  registrationNumber: string;
  kraPin: string;
  nationalIdNumber: string;
  referenceName: string;
  referencePhone: string;
  legalDeclarationAgreed: boolean;
  docsRegistrationCertPath: string;
  docsBusinessPermitPath: string;
  docsKraPinPath: string;
  docsNationalIdFrontPath: string;
  docsNationalIdSelfiePath: string;
  // step 11
  images: string[];
  // step 12
  termsAgreed: boolean;
}

const defaultHours: HourEntry[] = DAYS.map((day) => ({
  day, open: '08:00', close: '18:00', isClosed: day === 'Sunday',
}));

const emptyForm: FormData = {
  vendorType: '', isIndividual: false,
  businessName: '', shortDescription: '', description: '',
  yearEstablished: '', yearsExperience: '',
  phone: '', whatsapp: '', email: '', website: '',
  address: '', townArea: '', neighborhood: '',
  neighborhoodsServed: [],
  selectedCategoryIds: [], servicePrices: {},
  priceRange: '', minimumOrder: '', turnaroundTime: '', paymentMethods: [],
  hours: defaultHours,
  hasPickup: false, hasDelivery: false, pickupRadius: 5,
  registrationNumber: '', kraPin: '', nationalIdNumber: '',
  referenceName: '', referencePhone: '', legalDeclarationAgreed: false,
  docsRegistrationCertPath: '', docsBusinessPermitPath: '',
  docsKraPinPath: '', docsNationalIdFrontPath: '', docsNationalIdSelfiePath: '',
  images: [],
  termsAgreed: false,
};

// ─────────────────────────────────────────────────────────────────────────────

const VendorOnboarding = () => {
  const navigate = useNavigate();
  const { categories, loading: categoriesLoading } = useServiceCategories();

  const [step, setStep] = useState(1);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadingDocs, setUploadingDocs] = useState<Record<string, boolean>>({});
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(false);
  const [pendingServiceTags, setPendingServiceTags] = useState<string[]>([]);
  const [currentDocTarget, setCurrentDocTarget] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auth check + draft resume ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }

      const { data: profile } = await supabase
        .from('vendor_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) {
        const { data: created, error } = await supabase
          .from('vendor_profiles')
          .insert({
            user_id: user.id,
            name: '',
            slug: `draft-${user.id.slice(0, 8)}`,
            status: 'draft',
            onboarding_step: 1,
            email: user.email,
          })
          .select('id')
          .single();
        if (error) { toast.error('Failed to start onboarding. Please try again.'); return; }
        setVendorId(created.id);
        setForm((prev) => ({ ...prev, email: user.email ?? '' }));
        return;
      }

      if (profile.status === 'pending') { navigate('/vendor/onboarding/pending'); return; }
      if (profile.status === 'approved') { navigate('/vendor/dashboard'); return; }

      if (profile.status === 'rejected') {
        await supabase
          .from('vendor_profiles')
          .update({ status: 'draft', onboarding_step: 1 })
          .eq('id', profile.id);
        setVendorId(profile.id);
        setForm((prev) => ({ ...prev, email: user.email ?? '' }));
        return;
      }

      // status === 'draft' — resume
      setVendorId(profile.id);
      setStep(Math.max(1, Math.min((profile.onboarding_step ?? 1), STEPS.length)));

      const { data: hoursRows } = await supabase
        .from('business_hours')
        .select('*')
        .eq('vendor_id', profile.id);
      const hoursMap: Record<string, HourEntry> = {};
      (hoursRows ?? []).forEach((h: any) => {
        hoursMap[h.day] = { day: h.day, open: h.open_time, close: h.close_time, isClosed: h.is_closed };
      });
      const loadedHours = DAYS.map((d) => hoursMap[d] ?? { day: d, open: '08:00', close: '18:00', isClosed: d === 'Sunday' });

      const savedTags: string[] = (profile as any).service_tags ?? [];
      setPendingServiceTags(savedTags);

      const p = profile as any;
      setForm({
        vendorType: p.type ?? '',
        isIndividual: p.is_individual ?? false,
        businessName: p.name ?? '',
        shortDescription: p.short_description ?? '',
        description: p.description ?? '',
        yearEstablished: p.year_established?.toString() ?? '',
        yearsExperience: p.years_experience ?? '',
        phone: p.phone ?? '',
        whatsapp: p.whatsapp ?? '',
        email: p.email ?? user.email ?? '',
        website: p.website ?? '',
        address: p.address ?? '',
        townArea: '',
        neighborhood: p.neighborhood_slug ?? '',
        neighborhoodsServed: p.neighborhoods_served ?? [],
        selectedCategoryIds: [],
        servicePrices: {},
        priceRange: p.price_range ?? '',
        minimumOrder: p.minimum_order ?? '',
        turnaroundTime: p.turnaround_time ?? '',
        paymentMethods: p.payment_methods ?? [],
        hours: loadedHours,
        hasPickup: p.has_pickup ?? false,
        hasDelivery: p.has_delivery ?? false,
        pickupRadius: p.pickup_radius ?? 5,
        registrationNumber: p.registration_number ?? '',
        kraPin: p.kra_pin ?? '',
        nationalIdNumber: p.national_id_number ?? '',
        referenceName: p.reference_name ?? '',
        referencePhone: p.reference_phone ?? '',
        legalDeclarationAgreed: false,
        docsRegistrationCertPath: p.docs_registration_cert_path ?? '',
        docsBusinessPermitPath: p.docs_business_permit_path ?? '',
        docsKraPinPath: p.docs_kra_pin_path ?? '',
        docsNationalIdFrontPath: p.docs_national_id_front_path ?? '',
        docsNationalIdSelfiePath: p.docs_national_id_selfie_path ?? '',
        images: p.images ?? [],
        termsAgreed: false,
      });
    })();
  }, [navigate]);

  // ── Resolve draft service tags → category IDs ────────────────────────────────
  useEffect(() => {
    if (!categoriesLoading && pendingServiceTags.length > 0 && categories.length > 0) {
      const ids = categories.filter((c) => pendingServiceTags.includes(c.name)).map((c) => c.id);
      setForm((prev) => ({ ...prev, selectedCategoryIds: ids }));
      setPendingServiceTags([]);
    }
  }, [categoriesLoading, categories, pendingServiceTags]);

  // ── Sync WhatsApp when "same as phone" is active ─────────────────────────────
  useEffect(() => {
    if (whatsappSameAsPhone) {
      setForm((prev) => ({ ...prev, whatsapp: prev.phone }));
    }
  }, [whatsappSameAsPhone, form.phone]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const updateForm = (field: keyof FormData, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleCategory = (id: string) =>
    setForm((prev) => ({
      ...prev,
      selectedCategoryIds: prev.selectedCategoryIds.includes(id)
        ? prev.selectedCategoryIds.filter((c) => c !== id)
        : [...prev.selectedCategoryIds, id],
    }));

  const toggleNeighborhood = (slug: string) =>
    setForm((prev) => ({
      ...prev,
      neighborhoodsServed: prev.neighborhoodsServed.includes(slug)
        ? prev.neighborhoodsServed.filter((n) => n !== slug)
        : [...prev.neighborhoodsServed, slug],
    }));

  const togglePayment = (method: string) =>
    setForm((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.includes(method)
        ? prev.paymentMethods.filter((m) => m !== method)
        : [...prev.paymentMethods, method],
    }));

  // ── Step validation ───────────────────────────────────────────────────────────
  const validateStep = (s: number, data: FormData): string | null => {
    switch (s) {
      case 1: return data.vendorType ? null : 'Please select a business type.';
      case 2:
        if (data.businessName.trim().length < 3)
          return data.isIndividual
            ? 'Full legal name must be at least 3 characters.'
            : 'Business name must be at least 3 characters.';
        if (!data.shortDescription.trim())
          return data.isIndividual ? 'Short bio is required.' : 'Short description is required.';
        return null;
      case 3:
        if (data.phone.trim().length < 7) return 'Please enter a valid phone number (min 7 digits).';
        if (!data.email.trim()) return 'Contact email is required.';
        return null;
      case 4:
        if (!data.neighborhood) return 'Please select a neighborhood.';
        if (!data.isIndividual && !data.address.trim()) return 'Physical address is required.';
        return null;
      case 5:
        return data.neighborhoodsServed.length > 0
          ? null
          : 'Select at least one neighborhood you serve.';
      case 6:
        return data.selectedCategoryIds.length > 0
          ? null
          : 'Select at least one service category.';
      case 7:
        if (!data.priceRange.trim()) return 'Please enter your general price range.';
        if (!data.turnaroundTime) return 'Please select a typical turnaround time.';
        if (data.paymentMethods.length === 0) return 'Please select at least one payment method.';
        return null;
      case 10:
        if (data.isIndividual) {
          if (!data.nationalIdNumber.trim()) return 'National ID number is required.';
          if (!data.docsNationalIdFrontPath) return 'Please upload a photo of your National ID (front side).';
          if (!data.docsNationalIdSelfiePath) return 'Please upload a selfie holding your National ID.';
        } else {
          if (!data.registrationNumber.trim()) return 'Business registration number is required.';
          if (!data.kraPin.trim()) return 'KRA PIN is required.';
          if (!data.docsRegistrationCertPath) return 'Please upload your Business Registration Certificate.';
          if (!data.docsBusinessPermitPath) return 'Please upload your Business Permit.';
        }
        if (!data.legalDeclarationAgreed) return 'Please confirm the declaration before proceeding.';
        return null;
      case 11:
        return data.images.length > 0
          ? null
          : 'Please upload at least one photo before proceeding.';
      default:
        return null;
    }
  };

  // ── Background auto-save ──────────────────────────────────────────────────────
  const autoSave = useCallback(async (savedStep: number, data: FormData, id: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    try {
      const typeLabel = VENDOR_TYPES.find((t) => t.value === data.vendorType)?.label ?? '';
      const service_tags = data.selectedCategoryIds
        .map((cid) => categories.find((c) => c.id === cid)?.name)
        .filter(Boolean) as string[];
      const neighborhoodName = neighborhoods.find((n) => n.slug === data.neighborhood)?.name ?? data.neighborhood;

      const patch: Record<string, any> = { onboarding_step: savedStep + 1 };

      switch (savedStep) {
        case 1:
          Object.assign(patch, { type: data.vendorType, type_label: typeLabel, is_individual: data.isIndividual });
          break;
        case 2:
          if (data.isIndividual) {
            Object.assign(patch, {
              name: data.businessName.trim() || '',
              short_description: data.shortDescription,
              years_experience: data.yearsExperience || null,
            });
          } else {
            Object.assign(patch, {
              name: data.businessName.trim() || '',
              short_description: data.shortDescription,
              description: data.description,
              year_established: parseInt(data.yearEstablished) || null,
            });
          }
          break;
        case 3:
          Object.assign(patch, { phone: data.phone, whatsapp: data.whatsapp, email: data.email, website: data.website });
          break;
        case 4:
          Object.assign(patch, {
            address: data.isIndividual
              ? neighborhoodName
              : [data.address, data.townArea].filter(Boolean).join(', '),
            neighborhood: neighborhoodName,
            neighborhood_slug: data.neighborhood,
          });
          break;
        case 5:
          Object.assign(patch, { neighborhoods_served: data.neighborhoodsServed });
          break;
        case 6:
          Object.assign(patch, { service_tags });
          break;
        case 7:
          Object.assign(patch, {
            price_range: data.priceRange,
            minimum_order: data.minimumOrder || null,
            turnaround_time: data.turnaroundTime,
            payment_methods: data.paymentMethods,
          });
          break;
        case 8:
          // Hours saved separately below
          break;
        case 9:
          Object.assign(patch, {
            has_pickup: data.hasPickup,
            has_delivery: data.hasDelivery,
            pickup_radius: data.hasPickup || data.hasDelivery ? data.pickupRadius : 0,
          });
          break;
        case 10:
          if (data.isIndividual) {
            Object.assign(patch, {
              national_id_number: data.nationalIdNumber,
              kra_pin: data.kraPin || null,
              reference_name: data.referenceName || null,
              reference_phone: data.referencePhone || null,
            });
          } else {
            Object.assign(patch, {
              registration_number: data.registrationNumber,
              kra_pin: data.kraPin,
            });
          }
          break;
        // step 11 photos are saved on each upload; just bump onboarding_step
      }

      await supabase.from('vendor_profiles').update(patch).eq('id', id);

      if (savedStep === 8) {
        await supabase.from('business_hours').delete().eq('vendor_id', id);
        await supabase.from('business_hours').insert(
          data.hours.map((h) => ({
            vendor_id: id, day: h.day, open_time: h.open, close_time: h.close, is_closed: h.isClosed,
          })),
        );
      }

      setSaveStatus('saved');
      saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('idle');
    }
  }, [categories]);

  // ── Navigation ────────────────────────────────────────────────────────────────
  const handleNext = () => {
    const err = validateStep(step, form);
    if (err) { toast.error(err); return; }
    if (vendorId) autoSave(step, form, vendorId);
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const prev = () => setStep((s) => Math.max(s - 1, 1));

  // ── Business photo uploads (Step 11) ─────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!vendorId || !e.target.files) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const files = Array.from(e.target.files).filter((f) => allowed.includes(f.type));
    const slots = 6 - form.images.length;
    if (slots <= 0) { toast.error('Maximum 6 photos allowed.'); return; }
    if (files.length === 0) { toast.error('Only JPG, PNG, and WEBP files are accepted.'); return; }

    const toUpload = files.slice(0, slots);
    setUploadingCount((n) => n + toUpload.length);

    for (const file of toUpload) {
      try {
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${vendorId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('vendor-images').upload(path, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('vendor-images').getPublicUrl(path);
        setForm((prev) => {
          const newImages = [...prev.images, publicUrl];
          supabase.from('vendor_profiles').update({ images: newImages }).eq('id', vendorId);
          return { ...prev, images: newImages };
        });
      } catch (err: any) {
        toast.error(`Failed to upload ${file.name}: ${err.message}`);
      } finally {
        setUploadingCount((n) => Math.max(0, n - 1));
      }
    }
    if (e.target) e.target.value = '';
  };

  const handleRemovePhoto = async (url: string) => {
    if (!vendorId) return;
    try {
      const marker = '/vendor-images/';
      const idx = url.indexOf(marker);
      if (idx !== -1) {
        await supabase.storage.from('vendor-images').remove([url.slice(idx + marker.length)]);
      }
      const newImages = form.images.filter((u) => u !== url);
      setForm((prev) => ({ ...prev, images: newImages }));
      await supabase.from('vendor_profiles').update({ images: newImages }).eq('id', vendorId);
    } catch (err: any) {
      toast.error(`Failed to remove photo: ${err.message}`);
    }
  };

  // ── Document uploads (Step 10) ────────────────────────────────────────────────
  const triggerDocUpload = (docKey: DocKey) => {
    setCurrentDocTarget(docKey);
    docInputRef.current?.click();
  };

  const handleDocSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentDocTarget || !e.target.files?.[0] || !vendorId) return;
    const file = e.target.files[0];
    const config = DOC_CONFIGS[currentDocTarget as DocKey];
    if (!config) return;

    // Guard: confirm active session before attempting the upload.
    // Without this, an expired token sends an unauthenticated request and
    // RLS sees auth.uid() = null even though the policy is correct.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Your session expired. Please sign in again.');
      if (e.target) e.target.value = '';
      return;
    }

    // Temporary debug log — confirms the user is present at upload time.
    // Remove once the RLS issue is confirmed resolved.
    const { data: { user: debugUser } } = await supabase.auth.getUser();
    console.log('[doc-upload] user at upload time:', debugUser?.id ?? 'NULL — unauthenticated!');

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) { toast.error('File must be under 5 MB.'); if (e.target) e.target.value = ''; return; }
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) { toast.error('Only PDF, JPG, and PNG files are accepted.'); if (e.target) e.target.value = ''; return; }

    const ext = file.name.split('.').pop() ?? 'pdf';
    const storagePath = `${vendorId}/${config.filename}.${ext}`;

    setUploadingDocs((prev) => ({ ...prev, [currentDocTarget]: true }));
    try {
      const { error } = await supabase.storage
        .from('vendor-docs')
        .upload(storagePath, file, { upsert: true });
      if (error) throw error;

      setForm((prev) => ({ ...prev, [config.formField]: storagePath }));
      await supabase.from('vendor_profiles').update({ [config.dbColumn]: storagePath }).eq('id', vendorId);
      toast.success(`${config.label} uploaded.`);
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploadingDocs((prev) => ({ ...prev, [currentDocTarget!]: false }));
      if (e.target) e.target.value = '';
    }
  };

  // ── Final submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.vendorType)                      { toast.error('Please select a business type.');        setStep(1);  return; }
    if (form.businessName.trim().length < 3)   { toast.error('Name must be at least 3 characters.');  setStep(2);  return; }
    if (form.phone.trim().length < 7)          { toast.error('Please enter a valid phone number.');    setStep(3);  return; }
    if (!form.neighborhood)                    { toast.error('Please select a neighborhood.');         setStep(4);  return; }
    if (form.images.length === 0)              { toast.error('Please upload at least one photo.');     setStep(11); return; }
    if (!form.termsAgreed)                     { toast.error('Please agree to the Terms of Service.'); return; }
    if (!vendorId) return;

    setSubmitting(true);
    try {
      const rand = Math.random().toString(36).slice(2, 6);
      const slug = form.businessName.trim().toLowerCase()
        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + rand;
      const neighborhoodName = neighborhoods.find((n) => n.slug === form.neighborhood)?.name ?? form.neighborhood;
      const service_tags = form.selectedCategoryIds
        .map((id) => categories.find((c) => c.id === id)?.name)
        .filter(Boolean) as string[];
      const typeLabel = VENDOR_TYPES.find((t) => t.value === form.vendorType)?.label ?? form.vendorType;

      const { error: profileError } = await supabase
        .from('vendor_profiles')
        .update({
          name: form.businessName.trim(),
          slug,
          type: form.vendorType as any,
          type_label: typeLabel,
          description: form.isIndividual ? null : (form.description || null),
          short_description: form.shortDescription,
          phone: form.phone,
          whatsapp: form.whatsapp || null,
          email: form.email,
          website: form.website || null,
          address: form.isIndividual
            ? neighborhoodName
            : [form.address, form.townArea].filter(Boolean).join(', '),
          neighborhood: neighborhoodName,
          neighborhood_slug: form.neighborhood,
          service_tags,
          price_range: form.priceRange,
          minimum_order: form.minimumOrder || null,
          turnaround_time: form.turnaroundTime,
          payment_methods: form.paymentMethods,
          has_pickup: form.hasPickup,
          has_delivery: form.hasDelivery,
          pickup_radius: form.hasPickup || form.hasDelivery ? form.pickupRadius : 0,
          neighborhoods_served: form.neighborhoodsServed,
          images: form.images,
          status: 'pending',
          onboarding_step: 12,
          is_individual: form.isIndividual,
          year_established: form.isIndividual ? null : (parseInt(form.yearEstablished) || null),
          years_experience: form.isIndividual ? (form.yearsExperience || null) : null,
          kra_pin: form.kraPin || null,
          registration_number: form.isIndividual ? null : (form.registrationNumber || null),
          national_id_number: form.isIndividual ? (form.nationalIdNumber || null) : null,
          reference_name: form.isIndividual ? (form.referenceName || null) : null,
          reference_phone: form.isIndividual ? (form.referencePhone || null) : null,
          docs_registration_cert_path: form.docsRegistrationCertPath || null,
          docs_business_permit_path: form.docsBusinessPermitPath || null,
          docs_kra_pin_path: form.docsKraPinPath || null,
          docs_national_id_front_path: form.docsNationalIdFrontPath || null,
          docs_national_id_selfie_path: form.docsNationalIdSelfiePath || null,
        })
        .eq('id', vendorId);
      if (profileError) throw profileError;

      await supabase.from('business_hours').delete().eq('vendor_id', vendorId);
      const { error: hoursError } = await supabase.from('business_hours').insert(
        form.hours.map((h) => ({
          vendor_id: vendorId, day: h.day, open_time: h.open, close_time: h.close, is_closed: h.isClosed,
        })),
      );
      if (hoursError) throw hoursError;

      if (form.selectedCategoryIds.length > 0) {
        await supabase.from('vendor_services').delete().eq('vendor_id', vendorId);
        const { error: svcError } = await supabase.from('vendor_services').insert(
          form.selectedCategoryIds.map((category_id) => ({
            vendor_id: vendorId,
            category_id,
            base_price: parseFloat(form.servicePrices[category_id] || '') || null,
          })),
        );
        if (svcError) throw svcError;
      }

      toast.success('Application submitted!');
      navigate('/vendor/onboarding/pending');
    } catch (err: any) {
      toast.error(err?.message ?? 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const progress = (step / STEPS.length) * 100;

  // ── Render helpers ────────────────────────────────────────────────────────────
  const selectCls = 'h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background';

  const DocField = ({ docKey, required, hint }: { docKey: DocKey; required?: boolean; hint?: string }) => {
    const config = DOC_CONFIGS[docKey];
    const path = form[config.formField as keyof FormData] as string;
    const busy = uploadingDocs[docKey];
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Label className="text-sm">{config.label} {required && <Req />}</Label>
          {path && (
            <span className="flex items-center gap-1 text-xs text-success">
              <CheckCircle2 className="h-3 w-3" /> Uploaded
            </span>
          )}
        </div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => triggerDocUpload(docKey)}
          disabled={busy}
          className="gap-2"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {busy ? 'Uploading…' : path ? 'Replace file' : 'Choose file (PDF · JPG · PNG · max 5 MB)'}
        </Button>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Minimal locked header — no nav links, vendor cannot navigate away */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-glow">
              <MapPin className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">
              Laundry<span className="text-gradient-blue">Link</span>
            </span>
          </div>
          <span className="text-sm font-medium text-muted-foreground">Business Setup</span>
        </div>
      </header>

      {/* Hidden file inputs */}
      <input ref={fileInputRef}  type="file" accept=".jpg,.jpeg,.png,.webp" multiple className="hidden" onChange={handleFileSelect} />
      <input ref={docInputRef}   type="file" accept=".pdf,.jpg,.jpeg,.png"           className="hidden" onChange={handleDocSelect} />

      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Step {step} of {STEPS.length}</span>
            <div className="flex items-center gap-3">
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-xs text-success">
                  <CheckCircle2 className="h-3 w-3" /> Saved
                </span>
              )}
              <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
            </div>
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
                onClick={() => { if (s.id < step) setStep(s.id); }}
                className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  s.id === step
                    ? 'bg-primary text-primary-foreground'
                    : s.id < step
                    ? 'cursor-pointer bg-success/10 text-success'
                    : 'cursor-default bg-secondary text-muted-foreground'
                }`}
              >
                {s.id < step ? <Check className="h-3 w-3" /> : null}
                {s.title}
              </button>
            ))}
          </div>
        </div>

        {/* Step cards */}
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
                  {step === 1  && 'What type of laundry service do you provide?'}
                  {step === 2  && (form.isIndividual ? 'Tell customers about yourself and your experience' : 'Tell customers about your business')}
                  {step === 3  && 'How can customers reach you?'}
                  {step === 4  && (form.isIndividual ? 'Where are you usually based?' : 'Where is your business located?')}
                  {step === 5  && 'Which neighborhoods do you serve?'}
                  {step === 6  && 'What services do you offer?'}
                  {step === 7  && 'Pricing, turnaround, and payment methods'}
                  {step === 8  && 'Set your operating hours'}
                  {step === 9  && 'Do you offer pickup and delivery?'}
                  {step === 10 && 'Legal verification — required for approval'}
                  {step === 11 && 'Upload photos of your business'}
                  {step === 12 && 'Review your listing before submission'}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">

                {/* ── Step 1: Business Type ── */}
                {step === 1 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {VENDOR_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => {
                          updateForm('vendorType', type.value);
                          updateForm('isIndividual', type.value === 'independent');
                        }}
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

                {/* ── Step 2: Details (branched) ── */}
                {step === 2 && form.isIndividual && (
                  <>
                    <div className="space-y-2">
                      <Label>Full Legal Name <Req /></Label>
                      <Input value={form.businessName} onChange={(e) => updateForm('businessName', e.target.value)} placeholder="As it appears on your National ID" />
                    </div>
                    <div className="space-y-2">
                      <Label>Short Bio <Req /></Label>
                      <Textarea
                        value={form.shortDescription}
                        onChange={(e) => updateForm('shortDescription', e.target.value)}
                        placeholder="Tell customers about yourself and your experience…"
                        rows={4}
                        maxLength={300}
                      />
                      <p className="text-right text-xs text-muted-foreground">{form.shortDescription.length}/300</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Years of Experience</Label>
                      <select className={selectCls} value={form.yearsExperience} onChange={(e) => updateForm('yearsExperience', e.target.value)}>
                        <option value="">Select…</option>
                        {EXPERIENCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {step === 2 && !form.isIndividual && (
                  <>
                    <div className="space-y-2">
                      <Label>Business Trading Name <Req /></Label>
                      <Input value={form.businessName} onChange={(e) => updateForm('businessName', e.target.value)} placeholder="e.g., CleanWave Laundry" />
                    </div>
                    <div className="space-y-2">
                      <Label>Short Description <Req /></Label>
                      <Input
                        value={form.shortDescription}
                        onChange={(e) => updateForm('shortDescription', e.target.value)}
                        placeholder="One sentence about your service"
                        maxLength={120}
                      />
                      <p className="text-right text-xs text-muted-foreground">{form.shortDescription.length}/120</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Full Description <Req /></Label>
                      <Textarea
                        value={form.description}
                        onChange={(e) => updateForm('description', e.target.value)}
                        placeholder="Tell customers what makes you different…"
                        rows={4}
                        maxLength={600}
                      />
                      <p className="text-right text-xs text-muted-foreground">{form.description.length}/600</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Year Established <Req /></Label>
                      <Input
                        type="number"
                        min={1970}
                        max={CURRENT_YEAR}
                        value={form.yearEstablished}
                        onChange={(e) => updateForm('yearEstablished', e.target.value)}
                        placeholder={String(CURRENT_YEAR)}
                      />
                    </div>
                  </>
                )}

                {/* ── Step 3: Contact ── */}
                {step === 3 && (
                  <>
                    <div className="space-y-2">
                      <Label>Primary Contact Number <Req /></Label>
                      <Input
                        value={form.phone}
                        onChange={(e) => updateForm('phone', e.target.value)}
                        placeholder="+254 7XX XXX XXX"
                      />
                      <p className="text-xs text-muted-foreground">M-Pesa registered number preferred</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>WhatsApp Number</Label>
                        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={whatsappSameAsPhone}
                            onChange={(e) => setWhatsappSameAsPhone(e.target.checked)}
                            className="h-3.5 w-3.5 rounded"
                          />
                          Same as phone
                        </label>
                      </div>
                      <Input
                        value={form.whatsapp}
                        onChange={(e) => { if (!whatsappSameAsPhone) updateForm('whatsapp', e.target.value); }}
                        placeholder="254 7XX XXX XXX"
                        disabled={whatsappSameAsPhone}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Business / Contact Email <Req /></Label>
                      <Input type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} placeholder="business@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Website or Social Media</Label>
                      <Input value={form.website} onChange={(e) => updateForm('website', e.target.value)} placeholder="Website, Instagram, or Facebook page" />
                    </div>
                  </>
                )}

                {/* ── Step 4: Location (branched) ── */}
                {step === 4 && !form.isIndividual && (
                  <>
                    <div className="space-y-2">
                      <Label>Physical Address <Req /></Label>
                      <Input value={form.address} onChange={(e) => updateForm('address', e.target.value)} placeholder="Street name, building, or landmark" />
                    </div>
                    <div className="space-y-2">
                      <Label>Town / Area <Req /></Label>
                      <Input value={form.townArea} onChange={(e) => updateForm('townArea', e.target.value)} placeholder="e.g., Westlands, Nairobi" />
                    </div>
                    <div className="space-y-2">
                      <Label>Neighborhood <Req /></Label>
                      <div className="flex flex-wrap gap-2">
                        {neighborhoods.map((n) => (
                          <Badge key={n.slug} variant={form.neighborhood === n.slug ? 'default' : 'outline'} className="cursor-pointer" onClick={() => updateForm('neighborhood', n.slug)}>
                            {n.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/50 p-8 text-center">
                      <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">Map pin placement coming soon</p>
                    </div>
                  </>
                )}

                {step === 4 && form.isIndividual && (
                  <>
                    <div className="space-y-2">
                      <Label>Base Area / Neighborhood <Req /></Label>
                      <p className="text-xs text-muted-foreground">Where you are usually based</p>
                      <div className="flex flex-wrap gap-2">
                        {neighborhoods.map((n) => (
                          <Badge key={n.slug} variant={form.neighborhood === n.slug ? 'default' : 'outline'} className="cursor-pointer" onClick={() => updateForm('neighborhood', n.slug)}>
                            {n.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                      Your exact address will not be shown to customers.
                    </div>
                  </>
                )}

                {/* ── Step 5: Coverage ── */}
                {step === 5 && (
                  <>
                    <p className="text-sm text-muted-foreground">Select all neighborhoods you serve:</p>
                    <div className="flex flex-wrap gap-2">
                      {neighborhoods.map((n) => (
                        <Badge key={n.slug} variant={form.neighborhoodsServed.includes(n.slug) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleNeighborhood(n.slug)}>
                          {n.name}
                        </Badge>
                      ))}
                    </div>
                    {!form.isIndividual && (
                      <div className="space-y-2">
                        <Label>Approximate Service Radius (km)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={form.pickupRadius}
                          onChange={(e) => updateForm('pickupRadius', parseInt(e.target.value) || 0)}
                          placeholder="e.g., 10"
                        />
                        <p className="text-xs text-muted-foreground">Approximate delivery/pickup radius from your location</p>
                      </div>
                    )}
                  </>
                )}

                {/* ── Step 6: Services ── */}
                {step === 6 && (
                  <>
                    <p className="text-sm text-muted-foreground">Select services you offer:</p>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((c) => (
                        <Badge key={c.id} variant={form.selectedCategoryIds.includes(c.id) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleCategory(c.id)}>
                          {c.icon ? `${c.icon} ` : ''}{c.name}
                        </Badge>
                      ))}
                    </div>
                    {form.selectedCategoryIds.length > 0 && (
                      <div className="mt-2 space-y-3 rounded-xl border border-border p-4">
                        <p className="text-sm font-medium text-foreground">Starting prices (optional)</p>
                        {form.selectedCategoryIds.map((id) => {
                          const cat = categories.find((c) => c.id === id);
                          if (!cat) return null;
                          return (
                            <div key={id} className="flex items-center gap-3">
                              <span className="w-40 shrink-0 text-sm text-muted-foreground">{cat.name}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm text-muted-foreground">KES</span>
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder="0"
                                  value={form.servicePrices[id] ?? ''}
                                  onChange={(e) => updateForm('servicePrices', { ...form.servicePrices, [id]: e.target.value })}
                                  className="w-28"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* ── Step 7: Pricing & Turnaround ── */}
                {step === 7 && (
                  <>
                    <div className="space-y-2">
                      <Label>General Price Range <Req /></Label>
                      <Input value={form.priceRange} onChange={(e) => updateForm('priceRange', e.target.value)} placeholder="e.g., KES 200–800 per load" />
                    </div>
                    <div className="space-y-2">
                      <Label>Minimum Order</Label>
                      <Input value={form.minimumOrder} onChange={(e) => updateForm('minimumOrder', e.target.value)} placeholder="e.g., KES 500 minimum" />
                    </div>
                    <div className="space-y-2">
                      <Label>Typical Turnaround Time <Req /></Label>
                      <select className={selectCls} value={form.turnaroundTime} onChange={(e) => updateForm('turnaroundTime', e.target.value)}>
                        <option value="">Select…</option>
                        {TURNAROUND_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Methods Accepted <Req /></Label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {PAYMENT_METHODS.map((method) => (
                          <label key={method} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                            <input
                              type="checkbox"
                              checked={form.paymentMethods.includes(method)}
                              onChange={() => togglePayment(method)}
                              className="h-4 w-4 rounded border-input"
                            />
                            <span className="text-sm text-foreground">{method}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ── Step 8: Hours ── */}
                {step === 8 && (
                  <>
                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                      Customers will see these hours on your profile. Kenyan public holidays are not automatically accounted for.
                    </div>
                    <div className="space-y-3">
                      {form.hours.map((h, i) => (
                        <div key={h.day} className="flex items-center gap-3 rounded-lg border border-border p-3">
                          <span className="w-24 shrink-0 text-sm font-medium text-foreground">{h.day}</span>
                          <Switch
                            checked={!h.isClosed}
                            onCheckedChange={(checked) => {
                              const hours = [...form.hours];
                              hours[i] = { ...hours[i], isClosed: !checked };
                              updateForm('hours', hours);
                            }}
                          />
                          {!h.isClosed ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <Input type="time" value={h.open} onChange={(e) => { const hours = [...form.hours]; hours[i] = { ...hours[i], open: e.target.value }; updateForm('hours', hours); }} className="w-28" />
                              <span className="text-muted-foreground">to</span>
                              <Input type="time" value={h.close} onChange={(e) => { const hours = [...form.hours]; hours[i] = { ...hours[i], close: e.target.value }; updateForm('hours', hours); }} className="w-28" />
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Closed</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ── Step 9: Pickup & Delivery ── */}
                {step === 9 && (
                  <>
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div>
                        <p className="font-medium text-foreground">Pickup Service</p>
                        <p className="text-sm text-muted-foreground">Collect laundry from the customer's location</p>
                      </div>
                      <Switch checked={form.hasPickup} onCheckedChange={(v) => updateForm('hasPickup', v)} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div>
                        <p className="font-medium text-foreground">Delivery Service</p>
                        <p className="text-sm text-muted-foreground">Return clean laundry to the customer's door</p>
                      </div>
                      <Switch checked={form.hasDelivery} onCheckedChange={(v) => updateForm('hasDelivery', v)} />
                    </div>
                    {(form.hasPickup || form.hasDelivery) && (
                      <div className="space-y-2">
                        <Label>Pickup / Delivery Radius (km)</Label>
                        <Input type="number" value={form.pickupRadius} onChange={(e) => updateForm('pickupRadius', parseInt(e.target.value) || 0)} min={1} max={30} />
                      </div>
                    )}
                  </>
                )}

                {/* ── Step 10: Legal & Verification (branched) ── */}
                {step === 10 && (
                  <>
                    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      Your documents are stored securely and will only be reviewed by LaundryLink admins. They will never be shared with customers.
                    </div>

                    {!form.isIndividual && (
                      <>
                        <div className="space-y-2">
                          <Label>Business Registration Number <Req /></Label>
                          <Input value={form.registrationNumber} onChange={(e) => updateForm('registrationNumber', e.target.value)} placeholder="As registered with BRS or Registrar of Companies" />
                        </div>
                        <div className="space-y-2">
                          <Label>KRA PIN <Req /></Label>
                          <Input value={form.kraPin} onChange={(e) => updateForm('kraPin', e.target.value)} placeholder="Business KRA PIN" />
                        </div>
                        <div className="space-y-4 rounded-xl border border-border p-4">
                          <p className="text-sm font-medium text-foreground">Document Uploads</p>
                          <DocField docKey="registration-cert" required hint="Certificate from the Registrar of Companies or Business Registration Service (BRS)" />
                          <DocField docKey="business-permit" required hint="County business permit / Single Business Permit" />
                          <DocField docKey="kra-pin" hint="KRA PIN Certificate for tax compliance (optional)" />
                        </div>
                        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-4">
                          <input
                            type="checkbox"
                            checked={form.legalDeclarationAgreed}
                            onChange={(e) => updateForm('legalDeclarationAgreed', e.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded"
                          />
                          <span className="text-sm text-foreground">
                            I confirm that all documents submitted are genuine and belong to this business. I understand that submitting false documents may result in permanent removal from the platform.
                          </span>
                        </label>
                      </>
                    )}

                    {form.isIndividual && (
                      <>
                        <div className="space-y-2">
                          <Label>National ID Number <Req /></Label>
                          <Input value={form.nationalIdNumber} onChange={(e) => updateForm('nationalIdNumber', e.target.value)} placeholder="Kenya National ID number" />
                        </div>
                        <div className="space-y-2">
                          <Label>KRA PIN (optional)</Label>
                          <Input value={form.kraPin} onChange={(e) => updateForm('kraPin', e.target.value)} placeholder="Personal KRA PIN" />
                        </div>
                        <div className="space-y-4 rounded-xl border border-border p-4">
                          <p className="text-sm font-medium text-foreground">Identity Documents</p>
                          <DocField docKey="national-id-front" required hint="Clear photo of the front side of your National ID" />
                          <DocField docKey="national-id-selfie" required hint="A selfie of you holding your National ID next to your face — verifies your identity" />
                        </div>
                        <div className="space-y-3 rounded-xl border border-border p-4">
                          <p className="text-sm font-medium text-foreground">Reference in Nairobi (optional)</p>
                          <p className="text-xs text-muted-foreground">Someone who can vouch for your work</p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label className="text-sm">Reference Name</Label>
                              <Input value={form.referenceName} onChange={(e) => updateForm('referenceName', e.target.value)} placeholder="Full name" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-sm">Reference Phone</Label>
                              <Input value={form.referencePhone} onChange={(e) => updateForm('referencePhone', e.target.value)} placeholder="+254 7XX XXX XXX" />
                            </div>
                          </div>
                        </div>
                        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-4">
                          <input
                            type="checkbox"
                            checked={form.legalDeclarationAgreed}
                            onChange={(e) => updateForm('legalDeclarationAgreed', e.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded"
                          />
                          <span className="text-sm text-foreground">
                            I confirm that I will provide professional, reliable service and that all information I have submitted is accurate and truthful.
                          </span>
                        </label>
                      </>
                    )}
                  </>
                )}

                {/* ── Step 11: Photos ── */}
                {step === 11 && (
                  <>
                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                      {form.isIndividual
                        ? 'Upload a clear profile photo and photos of your work (folded laundry, ironed clothes, etc.). Avoid blurry or dark photos.'
                        : 'Upload photos of your shop front, equipment, washing area, and finished laundry. Clear, well-lit photos significantly improve your chances of approval and customer bookings.'}
                      {' '}<span className="text-foreground font-medium">At least 1 photo required.</span>
                    </div>

                    {form.images.length < 6 && uploadingCount === 0 && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-10 transition-colors hover:border-primary/50 hover:bg-primary/5"
                      >
                        <CloudUpload className="h-10 w-10 text-muted-foreground" />
                        <p className="font-medium text-foreground">Click to upload photos</p>
                        <p className="text-sm text-muted-foreground">
                          JPG · PNG · WEBP &nbsp;·&nbsp; {6 - form.images.length} slot{6 - form.images.length !== 1 ? 's' : ''} remaining
                        </p>
                      </button>
                    )}

                    {uploadingCount > 0 && (
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Uploading {uploadingCount} photo{uploadingCount > 1 ? 's' : ''}…</span>
                      </div>
                    )}

                    {form.images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {form.images.map((url) => (
                          <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                            <img src={url} alt="Business photo" className="h-full w-full object-cover" />
                            <button
                              onClick={() => handleRemovePhoto(url)}
                              className="absolute right-1 top-1 rounded-full bg-background/80 p-1 opacity-0 shadow transition-opacity group-hover:opacity-100"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        {form.images.length < 6 && uploadingCount === 0 && (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors hover:border-primary/50"
                          >
                            <Camera className="h-6 w-6 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* ── Step 12: Review & Submit ── */}
                {step === 12 && (
                  <div className="space-y-5">
                    {/* Hero */}
                    <div className="rounded-xl bg-sky/30 p-4">
                      <h3 className="font-display text-lg font-bold text-foreground">{form.businessName || 'Your Business'}</h3>
                      <p className="mt-0.5 text-sm text-muted-foreground">{form.shortDescription || '—'}</p>
                    </div>

                    {/* Details grid */}
                    <div className="space-y-1 text-sm">
                      <SummaryRow label="Type" value={VENDOR_TYPES.find((t) => t.value === form.vendorType)?.label} />
                      <SummaryRow label="Phone" value={form.phone} />
                      {form.whatsapp && <SummaryRow label="WhatsApp" value={form.whatsapp} />}
                      <SummaryRow label="Email" value={form.email} />
                      {form.website && <SummaryRow label="Website" value={form.website} />}
                      {!form.isIndividual && <SummaryRow label="Address" value={[form.address, form.townArea].filter(Boolean).join(', ')} />}
                      <SummaryRow label="Neighborhood" value={neighborhoods.find((n) => n.slug === form.neighborhood)?.name} />
                      <SummaryRow label="Price Range" value={form.priceRange} />
                      {form.minimumOrder && <SummaryRow label="Min. Order" value={form.minimumOrder} />}
                      <SummaryRow label="Turnaround" value={form.turnaroundTime} />
                      <SummaryRow label="Payment" value={form.paymentMethods.join(', ') || '—'} />
                      <SummaryRow label="Pickup" value={form.hasPickup ? `Yes · ${form.pickupRadius} km` : 'No'} />
                      <SummaryRow label="Delivery" value={form.hasDelivery ? `Yes · ${form.pickupRadius} km` : 'No'} />
                    </div>

                    {/* Areas */}
                    {form.neighborhoodsServed.length > 0 && (
                      <SummarySection label="Areas Served">
                        {form.neighborhoodsServed.map((slug) => (
                          <Badge key={slug} variant="secondary">{neighborhoods.find((n) => n.slug === slug)?.name ?? slug}</Badge>
                        ))}
                      </SummarySection>
                    )}

                    {/* Services */}
                    {form.selectedCategoryIds.length > 0 && (
                      <SummarySection label="Services">
                        {form.selectedCategoryIds.map((id) => {
                          const cat = categories.find((c) => c.id === id);
                          return cat ? (
                            <Badge key={id} variant="secondary">
                              {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                              {form.servicePrices[id] ? ` · KES ${form.servicePrices[id]}` : ''}
                            </Badge>
                          ) : null;
                        })}
                      </SummarySection>
                    )}

                    {/* Hours */}
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Business Hours</p>
                      <div className="overflow-hidden rounded-lg border border-border text-sm">
                        {form.hours.map((h, i) => (
                          <div key={h.day} className={`flex items-center justify-between px-3 py-2 ${i % 2 === 0 ? 'bg-muted/30' : ''}`}>
                            <span className="w-24 font-medium text-foreground">{h.day}</span>
                            {h.isClosed ? <span className="text-muted-foreground">Closed</span> : <span className="text-foreground">{h.open} – {h.close}</span>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Documents uploaded */}
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Documents Uploaded</p>
                      <div className="space-y-1 text-sm">
                        {!form.isIndividual && (
                          <>
                            <DocStatus label="Business Registration Certificate" uploaded={!!form.docsRegistrationCertPath} />
                            <DocStatus label="Business Permit" uploaded={!!form.docsBusinessPermitPath} />
                            <DocStatus label="KRA PIN Certificate" uploaded={!!form.docsKraPinPath} />
                          </>
                        )}
                        {form.isIndividual && (
                          <>
                            <DocStatus label="National ID (front)" uploaded={!!form.docsNationalIdFrontPath} />
                            <DocStatus label="Selfie with National ID" uploaded={!!form.docsNationalIdSelfiePath} />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Photos */}
                    {form.images.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Photos ({form.images.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {form.images.map((url) => (
                            <img key={url} src={url} alt="" className="h-16 w-16 rounded-lg border border-border object-cover" />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Review note */}
                    <div className="rounded-xl border border-border bg-warning/5 p-4">
                      <p className="text-sm text-foreground">
                        <strong>Note:</strong> Your listing will be reviewed by our team before going live. This usually takes 1–2 business days.
                      </p>
                    </div>

                    {/* Final agreement */}
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-4">
                      <input
                        type="checkbox"
                        checked={form.termsAgreed}
                        onChange={(e) => updateForm('termsAgreed', e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded"
                      />
                      <span className="text-sm text-foreground">
                        I agree to LaundryLink's Terms of Service and understand that my listing will go live only after admin approval.
                      </span>
                    </label>
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
            <Button onClick={handleNext} className="gap-2">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2 bg-success hover:bg-success/90">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? 'Submitting…' : 'Submit for Review'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Helper components ─────────────────────────────────────────────────────────

const Req = () => <span className="text-destructive">*</span>;

const SummaryRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex items-start justify-between gap-4 rounded px-1 py-1.5 odd:bg-muted/20">
    <span className="shrink-0 text-muted-foreground">{label}</span>
    <span className="text-right font-medium text-foreground">{value || '—'}</span>
  </div>
);

const SummarySection = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    <div className="flex flex-wrap gap-1">{children}</div>
  </div>
);

const DocStatus = ({ label, uploaded }: { label: string; uploaded: boolean }) => (
  <div className="flex items-center gap-2">
    {uploaded
      ? <CheckCircle2 className="h-4 w-4 text-success" />
      : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40" />}
    <span className={uploaded ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
  </div>
);

export default VendorOnboarding;
