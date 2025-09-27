// models/Property.js
import mongoose from 'mongoose';


const PropertyImageSchema = new mongoose.Schema({
  id: String,
  url: { type: String, required: true },
  title: String,
  cover: { type: Boolean, default: false },
  floorplan: { type: Boolean, default: false }
}, { _id: false });

const PropertyFeatureSchema = new mongoose.Schema({
  name: { type: String, required: true }
}, { _id: false });

const PropertySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  date: { type: String, required: true },
  agencia: String,
  email: String,
  telefono: String,
  ref: String,
  price: { type: Number, required: true },
  currency: { type: String, default: 'EUR' },
  price_freq: String,
  new_build: { type: Number, default: 0 },
  part_ownership: { type: Number, default: 0 },
  leasehold: { type: Number, default: 0 },
  type: { type: String, required: true },
  country: String,
  province: String,
  town: String,
  location_detail: String,
  cp: String,
  postal_code: String,
  beds: Number,
  baths: Number,
  estado_propiedad: Number,
  antiguedad: Number,
  pool: { type: Number, default: 0 },
  energy_rating: String,
  title_extra: String,
  location: String,
  latitude: Number,
  longitude: Number,
  surface_area: Number,
  url: String,
  description: String,
  images: [PropertyImageSchema],
  features: [PropertyFeatureSchema],
  formatted_date: String,
  formatted_price: String,
  _index: Number
}, {
  timestamps: true,
  collection: 'Property'
});

// Indexek a gyorsabb lekérdezésért
PropertySchema.index({ price: 1 });
PropertySchema.index({ type: 1 });
PropertySchema.index({ town: 1, province: 1 });
PropertySchema.index({ createdAt: -1 });

export default mongoose.models.Property || mongoose.model('Property', PropertySchema);