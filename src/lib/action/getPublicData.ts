'use server';

import dbConnect from '@/lib/db';
import PropertyModel from '../../models/Property';

// Client-side Property interface
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

// Search parameters
export interface PropertySearchParams {
  page?: number;
  limit?: number;
  type?: string;
  town?: string;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  pool?: boolean | null;
  sortBy?: 'price' | 'date' | 'beds';
  sortOrder?: 'asc' | 'desc';
}

// Search result interface
export interface PropertySearchResult {
  properties: Property[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
    limit: number;
  };
  filters: {
    availableTypes: string[];
    availableTowns: string[];
    priceRange: { min: number; max: number };
  };
}

// Convert DB document to Property interface
function formatProperty(doc: Record<string, unknown>, index: number = 0): Property {
  try {
    // Safe string conversion for ID
    const id = String(doc._id || doc.id || `prop-${index}`);
    
    // Safe number conversion with fallback
    const toNumber = (val: unknown, fallback = 0): number => {
      const num = Number(val);
      return isNaN(num) ? fallback : num;
    };
    
    // Safe string conversion with fallback
    const toString = (val: unknown, fallback = ''): string => {
      return val ? String(val) : fallback;
    };
    
    // Format date
    const date = doc.date ? new Date(String(doc.date)) : new Date();
    const formatted_date = date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Format price
    const price = toNumber(doc.price, 0);
    const currency = toString(doc.currency, 'EUR');
    const formatted_price = price > 0 
      ? `${price.toLocaleString('es-ES')} ${currency}`
      : 'Precio a consultar';
    
    return {
      id,
      date: date.toISOString(),
      agencia: toString(doc.agencia),
      email: toString(doc.email),
      telefono: toString(doc.telefono),
      ref: toString(doc.ref, `REF-${index}`),
      price,
      currency,
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
      latitude: doc.latitude ? toNumber(doc.latitude) : undefined,
      longitude: doc.longitude ? toNumber(doc.longitude) : undefined,
      surface_area: doc.surface_area ? toNumber(doc.surface_area) : undefined,
      url: doc.url ? toString(doc.url) : undefined,
      description: doc.description ? toString(doc.description) : undefined,
      images: Array.isArray(doc.images) ? doc.images : [],
      features: Array.isArray(doc.features) ? doc.features : [],
      formatted_date,
      formatted_price,
      _index: index
    };
  } catch (error) {
    console.error('Error formatting property:', error);
    // Return minimal valid property on error
    return {
      id: `error-${index}`,
      date: new Date().toISOString(),
      agencia: '',
      email: '',
      telefono: '',
      ref: `ERROR-${index}`,
      price: 0,
      currency: 'EUR',
      price_freq: '',
      new_build: 0,
      part_ownership: 0,
      leasehold: 0,
      type: 'Error',
      country: 'España',
      province: '',
      town: '',
      location_detail: '',
      cp: '',
      postal_code: '',
      beds: 0,
      baths: 0,
      estado_propiedad: 0,
      antiguedad: 0,
      pool: 0,
      images: [],
      features: [],
      formatted_date: new Date().toLocaleDateString('es-ES'),
      formatted_price: 'Error',
      _index: index
    };
  }
}

/**
 * Main search function with pagination
 */
export async function searchProperties(params: PropertySearchParams = {}): Promise<PropertySearchResult> {
  try {
    const {
      page = 1,
      limit = 12,
      type,
      town,
      minPrice,
      maxPrice,
      minBeds,
      pool,
      sortBy = 'date',
      sortOrder = 'desc'
    } = params;

    await dbConnect();
    
    // Build query
    const query: Record<string, unknown> = {};
    
    if (type) query.type = type;
    if (town) query.town = town;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) (query.price as Record<string, number>).$gte = minPrice;
      if (maxPrice) (query.price as Record<string, number>).$lte = maxPrice;
    }
    if (minBeds) query.beds = { $gte: minBeds };
    if (pool !== null && pool !== undefined) {
      query.pool = pool ? 1 : 0;
    }
    
    // Execute queries in parallel
    const [totalItems, docs, types, towns, priceStats] = await Promise.all([
      PropertyModel.countDocuments(query),
      PropertyModel
        .find(query)
        .sort({ 
          [sortBy === 'date' ? 'createdAt' : sortBy]: sortOrder === 'desc' ? -1 : 1,
          _id: -1
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      PropertyModel.distinct('type'),
      PropertyModel.distinct('town'),
      PropertyModel.aggregate([
        { $group: { 
          _id: null, 
          minPrice: { $min: '$price' }, 
          maxPrice: { $max: '$price' } 
        }}
      ])
    ]);
    
    // Calculate pagination
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    
    // Format properties - treat docs as array of plain objects
    const properties = (docs as Record<string, unknown>[]).map((doc, index) => 
      formatProperty(doc, startIndex + index)
    );
    
    return {
      properties,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        limit
      },
      filters: {
        availableTypes: (types as string[]).filter(Boolean).sort(),
        availableTowns: (towns as string[]).filter(Boolean).sort(),
        priceRange: priceStats[0] ? {
          min: (priceStats[0] as Record<string, number>).minPrice || 0,
          max: (priceStats[0] as Record<string, number>).maxPrice || 1000000
        } : { min: 0, max: 1000000 }
      }
    };
    
  } catch (error) {
    console.error('Search error:', error);
    return {
      properties: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        hasNext: false,
        hasPrev: false,
        limit: params.limit || 12
      },
      filters: {
        availableTypes: [],
        availableTowns: [],
        priceRange: { min: 0, max: 1000000 }
      }
    };
  }
}

/**
 * Get single property by slug
 */
export async function getPropertyBySlug(slug: string): Promise<Property | null> {
  try {
    await dbConnect();
    
    // Extract ID from slug (last part after dash)
    const parts = slug.split('-');
    const propertyId = parts[parts.length - 1];
    
    const doc = await PropertyModel
      .findOne({
        $or: [
          { _id: propertyId },
          { ref: propertyId },
          { id: propertyId }
        ]
      })
      .lean()
      .exec();
    
    if (!doc) {
      return null;
    }
    
    return formatProperty(doc as Record<string, unknown>, 0);
    
  } catch (error) {
    console.error('Error fetching property:', error);
    return null;
  }
}

/**
 * Get filter options only
 */
export async function getFilterOptions() {
  try {
    await dbConnect();
    
    const [types, towns, priceStats] = await Promise.all([
      PropertyModel.distinct('type'),
      PropertyModel.distinct('town'),
      PropertyModel.aggregate([
        { $group: { 
          _id: null, 
          minPrice: { $min: '$price' }, 
          maxPrice: { $max: '$price' },
          count: { $sum: 1 }
        }}
      ])
    ]);
    
    return {
      types: (types as string[]).filter(Boolean).sort(),
      towns: (towns as string[]).filter(Boolean).sort(),
      priceRange: priceStats[0] ? {
        min: (priceStats[0] as Record<string, number>).minPrice || 0,
        max: (priceStats[0] as Record<string, number>).maxPrice || 1000000
      } : { min: 0, max: 1000000 },
      totalCount: priceStats[0] ? (priceStats[0] as Record<string, number>).count || 0 : 0
    };
    
  } catch (error) {
    console.error('Error getting filters:', error);
    return {
      types: [],
      towns: [],
      priceRange: { min: 0, max: 1000000 },
      totalCount: 0
    };
  }
}