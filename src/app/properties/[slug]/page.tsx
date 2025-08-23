"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, MapPin, Bed, Bath, Square, Phone, Mail, ExternalLink, Share2, Heart, Calendar } from 'lucide-react';
import propertiesData from '../../../lib/kyero_properties.json';
import Link from 'next/link';

// TypeScript interfaces
interface PropertyImage {
  id: string;
  url: string;
  floorplan?: boolean;
}

interface PropertyFeature {
  name: string;
}

interface Property {
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
  images?: PropertyImage[];
  features?: PropertyFeature[];
  formatted_date?: string;
  formatted_price?: string;
  _index: number;
}

const PROPERTIES_DATA = propertiesData as Property[];

// Image Gallery Component
const ImageGallery: React.FC<{ images: PropertyImage[] }> = ({ images }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-200 flex items-center justify-center rounded-lg">
        <span className="text-gray-500">Sin imágenes disponibles</span>
      </div>
    );
  }

  return (
    <>
      {/* Main Image Display */}
      <div className="relative">
        <div className="relative h-[500px] rounded-lg overflow-hidden">
          <img
            src={images[currentImageIndex]?.url}
            alt={`Property image ${currentImageIndex + 1}`}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => setShowFullscreen(true)}
          />
          
          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 text-gray-800 p-3 rounded-full hover:bg-opacity-100 transition-all shadow-lg"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 text-gray-800 p-3 rounded-full hover:bg-opacity-100 transition-all shadow-lg"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Image Counter */}
          <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm">
            {currentImageIndex + 1} / {images.length}
          </div>
        </div>

        {/* Thumbnail Gallery */}
        {images.length > 1 && (
          <div className="mt-4 grid grid-cols-6 gap-2">
            {images.slice(0, 6).map((image, index) => (
              <div
                key={image.id}
                onClick={() => setCurrentImageIndex(index)}
                className={`relative cursor-pointer rounded-lg overflow-hidden ${
                  index === currentImageIndex ? 'ring-2 ring-blue-600' : ''
                }`}
              >
                <img
                  src={image.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-20 object-cover hover:opacity-80 transition-opacity"
                />
                {index === 5 && images.length > 6 && (
                  <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center text-white font-semibold">
                    +{images.length - 6}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {showFullscreen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center">
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute top-4 right-4 text-white text-lg p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            ✕
          </button>
          
          <img
            src={images[currentImageIndex]?.url}
            alt={`Fullscreen ${currentImageIndex + 1}`}
            className="max-w-full max-h-full object-contain"
          />
          
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 text-white p-3 rounded-full hover:bg-opacity-30 transition-all"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 text-white p-3 rounded-full hover:bg-opacity-30 transition-all"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
};

// Contact Form Component
const ContactForm: React.FC<{ property: Property }> = ({ property }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: `Estoy interesado en la propiedad Ref: ${property.ref} - ${property.type} en ${property.town}`
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Here you would typically send the form data to your backend
    alert('Mensaje enviado correctamente. Nos pondremos en contacto contigo pronto.');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nombre completo
        </label>
        <input
          type="text"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Teléfono
        </label>
        <input
          type="tel"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mensaje
        </label>
        <textarea
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        />
      </div>
      
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Enviar mensaje
      </button>
    </form>
  );
};

// Main Property Detail Page Component
const PropertyDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (params?.slug) {
      const slug = params.slug as string;
      // Extract ID from slug (last part after the last hyphen)
      const parts = slug.split('-');
      const propertyId = parts[parts.length - 1];
      
      // Find property by ID
      const foundProperty = PROPERTIES_DATA.find(p => p.id === propertyId);
      
      if (foundProperty) {
        setProperty(foundProperty);
      }
      setLoading(false);
    }
  }, [params?.slug]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${property?.type} en ${property?.town}`,
        text: `Mira esta propiedad: ${property?.type} con ${property?.beds} habitaciones en ${property?.town}`,
        url: window.location.href,
      });
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Enlace copiado al portapapeles');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando propiedad...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Propiedad no encontrada</h2>
          <button
            onClick={() => router.push('/properties')}
            className="text-blue-600 hover:text-blue-700 flex items-center mx-auto"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Volver a propiedades
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/properties" className="text-gray-500 hover:text-gray-700">
              Propiedades
            </Link>
            <span className="text-gray-400">/</span>
            <a href={`/properties?town=${property.town}`} className="text-gray-500 hover:text-gray-700">
              {property.town}
            </a>
            <span className="text-gray-400">/</span>
            <span className="text-gray-700">{property.type}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <ImageGallery images={property.images || []} />

            {/* Property Header */}
            <div className="mt-8 bg-white rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    {property.type} en {property.town}
                  </h1>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-5 h-5 mr-2" />
                    <span>
                      {property.location_detail && `${property.location_detail}, `}
                      {property.town}, {property.province}
                    </span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSaved(!saved)}
                    className={`p-2 rounded-lg border ${
                      saved ? 'bg-red-50 border-red-200 text-red-600' : 'border-gray-300 text-gray-600'
                    } hover:bg-gray-50 transition-colors`}
                  >
                    <Heart className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Price */}
              <div className="text-3xl font-bold text-blue-600 mb-6">
                {property.formatted_price || `${property.price?.toLocaleString()} ${property.currency}`}
                {property.price_freq === 'month' && <span className="text-lg font-normal"> /mes</span>}
              </div>

              {/* Property Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <Bed className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="font-semibold">{property.beds}</div>
                    <div className="text-xs text-gray-500">Habitaciones</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <Bath className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="font-semibold">{property.baths}</div>
                    <div className="text-xs text-gray-500">Baños</div>
                  </div>
                </div>
                {property.surface_area && (
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <Square className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="font-semibold">{property.surface_area}m²</div>
                      <div className="text-xs text-gray-500">Superficie</div>
                    </div>
                  </div>
                )}
                {property.pool === 1 && (
                  <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                    <span className="text-xl">🏊‍♂️</span>
                    <div>
                      <div className="font-semibold text-blue-600">Sí</div>
                      <div className="text-xs text-gray-500">Piscina</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                {property.new_build === 1 && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    Nueva construcción
                  </span>
                )}
                {property.energy_rating && (
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                    Calificación energética: {property.energy_rating}
                  </span>
                )}
                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                  Ref: {property.ref}
                </span>
              </div>
            </div>

            {/* Description */}
            {property.description && (
              <div className="mt-6 bg-white rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Descripción</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-600 whitespace-pre-line leading-relaxed">
                    {property.description
                      .replace(/~/g, '\n')
                      .replace(/([🌊🏖️📍🛏️🛠️💰🏡🚶‍♂️✨])/g, '$1 ')
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Features */}
            {property.features && property.features.length > 0 && (
              <div className="mt-6 bg-white rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Características</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {property.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-gray-700">{feature.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location Map Placeholder */}
            <div className="mt-6 bg-white rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Ubicación</h2>
              <div className="bg-gray-100 h-64 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">
                    {property.town}, {property.province}
                  </p>
                  {property.latitude && property.longitude && (
                    <p className="text-xs text-gray-400 mt-1">
                      Lat: {property.latitude.toFixed(4)}, Lng: {property.longitude.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Contact Card */}
            <div className="sticky top-4">
              <div className="bg-white rounded-lg p-6 shadow-lg">
                <h3 className="text-lg font-semibold mb-4">Contacta con el anunciante</h3>
                
                {/* Agency Info */}
                <div className="mb-6 pb-6 border-b">
                  <div className="font-semibold text-gray-800 mb-3">{property.agencia}</div>
                  <div className="space-y-2">
                    <a
                      href={`tel:${property.telefono}`}
                      className="flex items-center text-blue-600 hover:text-blue-700"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      {property.telefono}
                    </a>
                    <a
                      href={`mailto:${property.email}`}
                      className="flex items-center text-blue-600 hover:text-blue-700"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Enviar email
                    </a>
                    {property.url && (
                      <a
                        href={property.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ver en web de la agencia
                      </a>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3 mb-6">
                  <button className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center">
                    <Phone className="w-5 h-5 mr-2" />
                    Llamar ahora
                  </button>
                  <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    Enviar WhatsApp
                  </button>
                </div>

                {/* Contact Form */}
                <ContactForm property={property} />
              </div>

              {/* Additional Info Card */}
              <div className="bg-blue-50 rounded-lg p-6 mt-6">
                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <div className="font-medium text-gray-800">Publicado</div>
                    <div className="text-sm text-gray-600">
                      {property.formatted_date || new Date(property.date).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Properties Section (Optional) */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Propiedades similares</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* You can add similar properties here */}
            <div className="bg-white rounded-lg p-4 text-center text-gray-500">
              <p>Cargando propiedades similares...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailPage;