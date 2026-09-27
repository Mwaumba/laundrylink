#!/usr/bin/env node
// Turns a filled-in shop template (scripts/shop-template.csv) into SQL that
// lists those shops as approved but unclaimed (no owner account yet).
// Paste the output into the Supabase SQL editor and run it once. Re-running is
// safe: a shop whose name and neighborhood are already listed is skipped.
//
//   node scripts/shops-to-sql.mjs shops.csv > import_shops.sql
//
// Plain Node, no dependencies. The parsing helpers are exported for tests.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const NEIGHBORHOODS = {
  westlands: 'Westlands', kilimani: 'Kilimani', kileleshwa: 'Kileleshwa', lavington: 'Lavington',
  karen: 'Karen', parklands: 'Parklands', 'ngong-road': 'Ngong Road', 'south-b': 'South B',
  'south-c': 'South C', langata: "Lang'ata", kasarani: 'Kasarani', roysambu: 'Roysambu',
  embakasi: 'Embakasi', donholm: 'Donholm', umoja: 'Umoja', runda: 'Runda', ruaka: 'Ruaka',
};

export const SHOP_TYPES = {
  'laundry-shop': 'Laundry Shop',
  'dry-cleaner': 'Dry Cleaner',
  'ironing-service': 'Ironing Service',
  'pickup-delivery': 'Pickup & Delivery',
};

// Template column -> service_categories.slug and display name.
export const SERVICE_COLUMNS = {
  laundry: ['laundry', 'Laundry'],
  dry_cleaning: ['dry-cleaning', 'Dry Cleaning'],
  ironing: ['ironing', 'Ironing'],
  house_cleaning: ['house-cleaning', 'House Cleaning'],
  sofa_cleaning: ['sofa-cleaning', 'Sofa Cleaning'],
  carpet_cleaning: ['carpet-cleaning', 'Carpet Cleaning'],
  mattress_cleaning: ['mattress-cleaning', 'Mattress Cleaning'],
  office_cleaning: ['office-cleaning', 'Office Cleaning'],
  car_interior: ['car-interior', 'Car Interior Cleaning'],
};

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/** RFC 4180-ish CSV: quoted fields, doubled quotes, CRLF or LF. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [header = [], ...body] = rows;
  const keys = header.map((h) => h.trim().toLowerCase());
  return body
    .filter((r) => r.some((v) => v.trim() !== ''))
    .map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

export function slugify(s) {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const yes = (v) => /^(y|yes|true|1)$/i.test(v);

/** "-1.2672, 36.8115" (Google Maps "copy coordinates") -> {lat, lng}. */
export function parsePin(v) {
  if (!v) return null;
  const m = v.match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);
  if (!m) throw new Error(`map_pin "${v}" should look like -1.2672, 36.8115`);
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  // Nairobi sits near -1.3, 36.8; swapped values are a common paste mistake.
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error(`map_pin "${v}" is not a valid location`);
  return { lat, lng };
}

/** "8:00-19:00" -> {open, close}; "closed" or blank -> closed. */
export function parseHours(v) {
  if (!v || /^closed$/i.test(v)) return { open: '08:00', close: '18:00', closed: true };
  const m = v.match(/^(\d{1,2})(?::(\d{2}))?\s*(?:-|–|to)\s*(\d{1,2})(?::(\d{2}))?$/i);
  if (!m) throw new Error(`hours "${v}" should look like 8:00-19:00 or closed`);
  const t = (h, mm) => `${String(Number(h)).padStart(2, '0')}:${mm ?? '00'}`;
  return { open: t(m[1], m[2]), close: t(m[3], m[4]), closed: false };
}

/** "" -> not offered; "yes" -> offered, no price; "150/kg" -> 150 per kg. */
export function parseService(v) {
  if (!v) return null;
  if (yes(v)) return { price: null, unit: null };
  const m = v.replace(/,/g, '').match(/^(?:kes|ksh)?\s*(\d+(?:\.\d+)?)\s*(?:\/|per)?\s*(.*)$/i);
  if (!m) throw new Error(`service price "${v}" should look like 150/kg, 300/item or yes`);
  return { price: Number(m[1]), unit: m[2].trim() || null };
}

export function parseNeighborhood(v) {
  const slug = slugify(v ?? '');
  if (NEIGHBORHOODS[slug]) return slug;
  const byName = Object.entries(NEIGHBORHOODS).find(([, name]) => slugify(name) === slug);
  if (byName) return byName[0];
  throw new Error(`neighborhood "${v}" must be one of: ${Object.values(NEIGHBORHOODS).join(', ')}`);
}

/** One template row -> a validated shop object. Throws with a readable message. */
export function toShop(r) {
  if (!r.name) throw new Error('name is required');
  if (/^example\b/i.test(r.name)) throw new Error('this is the example row, delete it');
  if (!r.phone && !r.whatsapp) throw new Error('phone or whatsapp is required');
  const type = r.type ? slugify(r.type) : 'laundry-shop';
  if (!SHOP_TYPES[type]) throw new Error(`type "${r.type}" must be one of: ${Object.keys(SHOP_TYPES).join(', ')}`);
  const neighborhood = parseNeighborhood(r.neighborhood);
  const pin = parsePin(r.map_pin);

  const weekday = parseHours(r.mon_fri_hours);
  const hours = [
    ...WEEKDAYS.map((day) => ({ day, ...weekday })),
    { day: 'Saturday', ...parseHours(r.saturday_hours) },
    { day: 'Sunday', ...parseHours(r.sunday_hours) },
  ];

  const services = Object.entries(SERVICE_COLUMNS)
    .map(([col, [slug, label]]) => ({ slug, label, offer: parseService(r[col]) }))
    .filter((s) => s.offer);
  if (services.length === 0) throw new Error('list at least one service (e.g. laundry = 150/kg or yes)');

  const pickup = yes(r.pickup);
  const delivery = yes(r.delivery);
  return {
    name: r.name,
    slug: `${slugify(r.name)}-${neighborhood}`,
    type,
    typeLabel: SHOP_TYPES[type],
    neighborhood,
    neighborhoodName: NEIGHBORHOODS[neighborhood],
    address: r.address || NEIGHBORHOODS[neighborhood],
    lat: pin?.lat ?? null,
    lng: pin?.lng ?? null,
    phone: r.phone || r.whatsapp,
    whatsapp: r.whatsapp || null,
    email: r.email || null,
    website: r.website || null,
    shortDescription: r.short_description || null,
    description: r.description || null,
    priceRange: r.price_range || null,
    turnaroundTime: r.turnaround_time || null,
    minimumOrder: r.minimum_order || null,
    hasPickup: pickup,
    hasDelivery: delivery,
    pickupRadius: pickup || delivery ? Number(r.pickup_radius_km) || 5 : 0,
    hours,
    services,
  };
}

const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const arr = (xs) => (xs.length ? `ARRAY[${xs.map(q).join(', ')}]::text[]` : "'{}'::text[]");

export function shopSql(s) {
  const hours = s.hours
    .map((h) => `(v_id, ${q(h.day)}, ${q(h.open)}, ${q(h.close)}, ${h.closed})`)
    .join(',\n      ');
  const services = s.services
    .map((x) => `(v_id, (SELECT id FROM public.service_categories WHERE slug = ${q(x.slug)}), ${x.offer.price ?? 'NULL'}, ${q(x.offer.unit)})`)
    .join(',\n      ');
  return `-- ${s.name} (${s.neighborhoodName})
DO $$
DECLARE v_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.vendor_profiles WHERE slug = ${q(s.slug)}) THEN
    RAISE NOTICE 'Skipping %, already listed', ${q(s.name)};
    RETURN;
  END IF;
  INSERT INTO public.vendor_profiles (
    user_id, name, slug, type, type_label, short_description, description,
    neighborhood, neighborhood_slug, address, lat, lng, phone, whatsapp, email, website,
    service_tags, price_range, turnaround_time, minimum_order,
    has_pickup, has_delivery, pickup_radius, neighborhoods_served,
    status, onboarding_step, reviewed_at
  ) VALUES (
    NULL, ${q(s.name)}, ${q(s.slug)}, ${q(s.type)}, ${q(s.typeLabel)}, ${q(s.shortDescription)}, ${q(s.description)},
    ${q(s.neighborhoodName)}, ${q(s.neighborhood)}, ${q(s.address)}, ${s.lat ?? 'NULL'}, ${s.lng ?? 'NULL'},
    ${q(s.phone)}, ${q(s.whatsapp)}, ${q(s.email)}, ${q(s.website)},
    ${arr(s.services.map((x) => x.label))}, ${q(s.priceRange)}, ${q(s.turnaroundTime)}, ${q(s.minimumOrder)},
    ${s.hasPickup}, ${s.hasDelivery}, ${s.pickupRadius}, ${arr([s.neighborhood])},
    'approved', 12, now()
  ) RETURNING id INTO v_id;
  INSERT INTO public.business_hours (vendor_id, day, open_time, close_time, is_closed) VALUES
      ${hours};
  INSERT INTO public.vendor_services (vendor_id, category_id, base_price, price_unit) VALUES
      ${services};
END $$;
`;
}

export function csvToSql(text) {
  const rows = parseCsv(text);
  const errors = [];
  const shops = [];
  rows.forEach((r, i) => {
    try { shops.push(toShop(r)); } catch (e) { errors.push(`Row ${i + 2} (${r.name || 'no name'}): ${e.message}`); }
  });
  const dupes = shops.filter((s, i) => shops.findIndex((o) => o.slug === s.slug) !== i);
  dupes.forEach((s) => errors.push(`${s.name} in ${s.neighborhoodName} appears twice`));
  if (errors.length) {
    const err = new Error(errors.join('\n'));
    err.errors = errors;
    throw err;
  }
  return `-- Laundry Link: list ${shops.length} shop(s) without an owner account yet.
-- Generated by scripts/shops-to-sql.mjs. Run once in the Supabase SQL editor.
-- Needs supabase/migrations/20260928000000_unclaimed_shops.sql applied first.
BEGIN;

${shops.map(shopSql).join('\n')}
COMMIT;
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/shops-to-sql.mjs shops.csv > import_shops.sql');
    process.exit(1);
  }
  try {
    process.stdout.write(csvToSql(readFileSync(file, 'utf8')));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
