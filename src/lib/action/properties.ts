// lib/actions/properties.ts
'use server';

import 'server-only';

export interface Property {
  id: string;
  date: string;
  agencia: string;
  email: string;
  telefono: string;
  ref: string;
  price: number;
  currency: string;
  price_freq: string;
  new_build: number;
  part_ownership: number;
  leasehold: number;
  type: string;
  country: string;
  province: string;
  town: string;
  location_detail: string;
  cp: string;
  postal_code: string;
  beds: number;
  baths: number;
  estado_propiedad: number;
  antiguedad: number;
  pool: number;
  energy_rating?: string;
  title_extra?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  surface_area?: number;
  url?: string;
  description?: string;
  images?: Array<{
    id: string;
    url: string;
    floorplan?: boolean;
  }>;
  features?: Array<{
    name: string;
  }>;
  formatted_date?: string;
  formatted_price?: string;
  _index: number;
}


export type PropertySearchParams = {
  page?: number; limit?: number; type?: string; town?: string;
  minPrice?: number; maxPrice?: number; minBeds?: number;
  pool?: boolean | null; sortBy?: 'price'|'date'|'beds'; sortOrder?: 'asc'|'desc';
};
export type PropertySearchResult = {
  properties: Property[];
  pagination: { currentPage: number; totalPages: number; totalItems: number; hasNext: boolean; hasPrev: boolean; limit: number; };
  filters: { availableTypes: string[]; availableTowns: string[]; priceRange: { min: number; max: number } };
};

const buildQuery = (p: PropertySearchParams) => {
  const qs = new URLSearchParams();
  if (p.page) qs.set('page', String(p.page));
  if (p.limit) qs.set('limit', String(p.limit));
  if (p.type) qs.set('type', p.type);
  if (p.town) qs.set('town', p.town);
  if (p.minPrice) qs.set('minPrice', String(p.minPrice));
  if (p.maxPrice) qs.set('maxPrice', String(p.maxPrice));
  if (p.minBeds) qs.set('minBeds', String(p.minBeds));
  if (p.pool !== null && p.pool !== undefined) qs.set('pool', String(p.pool));
  if (p.sortBy) qs.set('sortBy', p.sortBy);
  if (p.sortOrder) qs.set('sortOrder', p.sortOrder);
  return qs.toString();
};

const getBaseUrl = () => {
  const site = process.env.NEXT_PUBLIC_API_URL;
  if (site) return site.replace(/\/$/, '');
  return 'http://localhost:3000';
};

export async function fetchPropertiesViaApi(params: PropertySearchParams): Promise<PropertySearchResult> {
  const url = `${getBaseUrl()}/api/public/properties${(() => {
    const q = buildQuery(params);
    return q ? `?${q}` : '';
  })()}`;

  const res = await fetch(url
  //  ,{
  //  cache: 'force-cache',                 // hagyjuk érvényesülni az Edge/CDN cache-t
  //  next: { revalidate: 1800, tags: ['properties'] },
  //}
);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
