// models/Property.d.ts
import type { Model } from 'mongoose';

// A lean dokumentum shape-je – a sémádból másolva
export interface PropertyDoc {
  id: string;
  date: string;
  agencia?: string;
  email?: string;
  telefono?: string;
  ref?: string;
  price: number;
  currency?: string;
  price_freq?: string;
  new_build?: number;
  part_ownership?: number;
  leasehold?: number;
  type: string;
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
  images?: Array<{ id?: string; url: string; title?: string; cover?: boolean; floorplan?: boolean }>;
  features?: Array<{ name: string }>;
  formatted_date?: string;
  formatted_price?: string;
  _index?: number;

  // timestamps
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// Ezzel a default export típusos lesz a TS-ben
declare const Property: Model<PropertyDoc>;
export default Property;
