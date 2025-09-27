// app/api/public/properties/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import PropertyModel from '@/models/Property';

import type { FilterQuery, Model } from 'mongoose';

// A LEAN dokumentum forma – csak azok a mezők, amiket ténylegesen használsz
interface DbProperty {
  _id?: string;
  id?: string;
  date?: string | Date;

  agencia?: string;
  email?: string;
  telefono?: string;
  ref?: string;

  price?: number;
  currency?: string;
  price_freq?: string;

  new_build?: number;
  part_ownership?: number;
  leasehold?: number;

  type?: string;
  country?: string;
  province?: string;
  town?: string;
  location_detail?: string;
  cp?: string;
  postal_code?: string;

  beds?: number;
  baths?: number;
  estado_propiedad?: number;
  antiguedad?: number;
  pool?: number;

  energy_rating?: string;
  title_extra?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  surface_area?: number;
  url?: string;
  description?: string;

  images?: Array<{ id?: string; url?: string; floorplan?: boolean }>;
  features?: Array<{ name?: string }>;

  createdAt?: string | Date;
}

// Aggregáció kimenet
interface PriceStats {
  _id: null;
  minPrice: number | null;
  maxPrice: number | null;
}

const toInt = (v: string | null): number | undefined => {
  if (!v) return undefined;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
};

const toBool = (v: string | null): boolean | undefined => {
  if (v == null) return undefined;
  return v === 'true';
};

const toNumber = (x: unknown, fb = 0): number => {
  const n = Number(x);
  return Number.isNaN(n) ? fb : n;
};

const toString = (x: unknown, fb = ''): string => {
  return x == null ? fb : String(x);
};

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;

  const page = toInt(sp.get('page')) ?? 1;
  const limit = toInt(sp.get('limit')) ?? 12;
  const type = sp.get('type') || undefined;
  const town = sp.get('town') || undefined;
  const minPrice = toInt(sp.get('minPrice'));
  const maxPrice = toInt(sp.get('maxPrice'));
  const minBeds = toInt(sp.get('minBeds'));
  const pool = toBool(sp.get('pool'));
  const sortBy = (sp.get('sortBy') as 'price' | 'date' | 'beds') ?? 'date';
  const sortOrder = (sp.get('sortOrder') as 'asc' | 'desc') ?? 'desc';

  await dbConnect();

  // Típusos query
  const query: FilterQuery<DbProperty> = {};
  if (type) query.type = type;
  if (town) query.town = town;
  if (minPrice != null || maxPrice != null) {
    query.price = {};
    if (minPrice != null) query.price.$gte = minPrice;
    if (maxPrice != null) query.price.$lte = maxPrice;
  }
  if (minBeds != null) query.beds = { $gte: minBeds };
  if (pool !== undefined) query.pool = pool ? 1 : 0;

  // Típussal ellátott modell (ha a modelled már tipizált, ezt töröld)
  const PropertyModelTyped = PropertyModel as unknown as Model<DbProperty>;

  const [totalItems, docs, types, towns, priceStats] = await Promise.all([
    PropertyModelTyped.countDocuments(query),
    PropertyModelTyped
      .find(query)
      .sort({ [sortBy === 'date' ? 'createdAt' : sortBy]: sortOrder === 'desc' ? -1 : 1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<DbProperty[]>() // <- fontos: lean típus
      .exec(),
    PropertyModelTyped.distinct('type'),
    PropertyModelTyped.distinct('town'),
    PropertyModelTyped.aggregate<PriceStats>([
      { $group: { _id: null, minPrice: { $min: '$price' }, maxPrice: { $max: '$price' } } },
    ]),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const startIndex = (page - 1) * limit;

  const properties = (docs ?? []).map((doc, i) => {
    const date = doc.date ? new Date(String(doc.date)) : new Date();
    return {
      id: toString(doc._id ?? doc.id ?? `prop-${startIndex + i}`),
      date: date.toISOString(),
      agencia: toString(doc.agencia),
      email: toString(doc.email),
      telefono: toString(doc.telefono),
      ref: toString(doc.ref, `REF-${startIndex + i}`),
      price: toNumber(doc.price, 0),
      currency: toString(doc.currency, 'EUR'),
      price_freq: toString(doc.price_freq),
      new_build: toNumber(doc.new_build),
      part_ownership: toNumber(doc.part_ownership),
      leasehold: toNumber(doc.leasehold),
      type: toString(doc.type, 'Apartamento'),
      country: toString(doc.country, 'España'),
      province: toString(doc.province),
      town: toString(doc.town),
      location_detail: toString(doc.location_detail),
      cp: toString(doc.cp),
      postal_code: toString(doc.postal_code),
      beds: toNumber(doc.beds),
      baths: toNumber(doc.baths),
      estado_propiedad: toNumber(doc.estado_propiedad),
      antiguedad: toNumber(doc.antiguedad),
      pool: toNumber(doc.pool),
      energy_rating: doc.energy_rating ? toString(doc.energy_rating) : undefined,
      title_extra: doc.title_extra ? toString(doc.title_extra) : undefined,
      location: doc.location ? toString(doc.location) : undefined,
      latitude: doc.latitude != null ? toNumber(doc.latitude) : undefined,
      longitude: doc.longitude != null ? toNumber(doc.longitude) : undefined,
      surface_area: doc.surface_area != null ? toNumber(doc.surface_area) : undefined,
      url: doc.url ? toString(doc.url) : undefined,
      description: doc.description ? toString(doc.description) : undefined,
      images: Array.isArray(doc.images) ? doc.images : [],
      features: Array.isArray(doc.features) ? doc.features : [],
      formatted_date: date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }),
      formatted_price:
        toNumber(doc.price, 0) > 0 ? `${toNumber(doc.price).toLocaleString('es-ES')} EUR` : 'Precio a consultar',
      _index: startIndex + i,
    };
  });

  const stats = priceStats?.[0];
  const body = {
    properties,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      limit,
    },
    filters: {
      availableTypes: (types as string[]).filter(Boolean).sort(),
      availableTowns: (towns as string[]).filter(Boolean).sort(),
      priceRange: {
        min: stats?.minPrice ?? 0,
        max: stats?.maxPrice ?? 1_000_000,
      },
    },
  };

  return NextResponse.json(body);
}
