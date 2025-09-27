"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, MapPin, Bed, Bath, Square, Phone, Mail, ExternalLink, Share2, Heart, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Property } from '../lib/action/getPublicData'; // Updated import

// Image Gallery Component
const ImageGallery: React.FC<{ images: Property['images'] }> = ({ images }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);

  const nextImage = () => {
    if (images && images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (images && images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
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
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTAwTDIwMCAyMDBMMzAwIDEwMEwzNTAgMTUwVjI1MEgxMDBWMTAwWiIgZmlsbD0iI0QxRDVEQiIvPgo8Y2lyY2xlIGN4PSIxNDAiIGN5PSIxMzAiIHI9IjIwIiBmaWxsPSIjRDFENURCIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUM5Qzk2IiBmb250LXNpemU9IjE2Ij5ObyBJbWFnZTwvdGV4dD4KPHN2Zz4K';
            }}
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
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTAwIDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNSAyNUw1MCA1MEw3NSAyNUw4NSAzNVY2NUgyNVYyNVoiIGZpbGw9IiNEMUQ1REIiLz4KPGNpcmNsZSBjeD0iMzUiIGN5PSIzNSIgcj0iNSIgZmlsbD0iI0QxRDVEQiIvPgo8L3N2Zz4K';
                  }}
                />
                {index === 5 && images.length > 6 && (
                  <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center text-white font-semibold text-xs">
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
            className="absolute top-4 right-4 text-white text-lg p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors z-10"
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Here you would typically send the form data to your backend
      console.log('Form submitted:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Mensaje enviado correctamente. Nos pondremos en contacto contigo pronto.');
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        message: `Estoy interesado en la propiedad Ref: ${property.ref} - ${property.type} en ${property.town}`
      });
    } catch (error) {
      alert('Error al enviar el mensaje. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nombre completo *
        </label>
        <input
          type="text"
          required
          disabled={isSubmitting}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email *
        </label>
        <input
          type="email"
          required
          disabled={isSubmitting}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
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
          disabled={isSubmitting}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
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
          disabled={isSubmitting}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        />
      </div>
      
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors font-medium flex items-center justify-center"
      >
        {isSubmitting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Enviando...
          </>
        ) : (
          'Enviar mensaje'
        )}
      </button>
    </form>
  );
};

// Main Property Detail Client Component
const PropertyDetailClient: React.FC<{ property: Property }> = ({ property }) => {
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${property.type} en ${property.town}`,
          text: `Mira esta propiedad: ${property.type} con ${property.beds} habitaciones en ${property.town}`,
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback - copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Enlace copiado al portapapeles');
      } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = window.location.href;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Enlace copiado');
      }
    }
  };

  const handleCallNow = () => {
    if (property.telefono) {
      window.location.href = `tel:${property.telefono}`;
    }
  };

  const handleWhatsApp = () => {
    if (property.telefono) {
      const message = encodeURIComponent(
        `Hola, estoy interesado en la propiedad Ref: ${property.ref} - ${property.type} en ${property.town}. ¿Podrían darme más información?`
      );
      const whatsappNumber = property.telefono.replace(/\D/g, ''); // Remove non-digits
      window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
    }
  };

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
            <Link 
              href={`/properties?town=${encodeURIComponent(property.town)}`} 
              className="text-gray-500 hover:text-gray-700"
            >
              {property.town}
            </Link>
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
            <ImageGallery images={property.images} />

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
                    title={saved ? 'Eliminar de favoritos' : 'Agregar a favoritos'}
                  >
                    <Heart className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                    title="Compartir propiedad"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Price */}
              <div className="text-3xl font-bold text-blue-600 mb-6">
                {property.formatted_price}
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
                    Energía: {property.energy_rating.split('\n')[0]}
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

            {/* Location */}
            <div className="mt-6 bg-white rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Ubicación</h2>
              <div className="bg-gray-100 h-64 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium">
                    {property.town}, {property.province}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {property.postal_code && `CP: ${property.postal_code}`}
                  </p>
                  {property.latitude && property.longitude && (
                    <p className="text-xs text-gray-400 mt-1">
                      Coordenadas: {property.latitude.toFixed(4)}, {property.longitude.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              {/* Contact Card */}
              <div className="bg-white rounded-lg p-6 shadow-lg">
                <h3 className="text-lg font-semibold mb-4">Contactar</h3>
                
                {/* Agency Info */}
                <div className="mb-6 pb-6 border-b">
                  <div className="font-semibold text-gray-800 mb-3">{property.agencia}</div>
                  <div className="space-y-2">
                    {property.telefono && (
                      <a
                        href={`tel:${property.telefono}`}
                        className="flex items-center text-blue-600 hover:text-blue-700"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        {property.telefono}
                      </a>
                    )}
                    {property.email && (
                      <a
                        href={`mailto:${property.email}?subject=Consulta sobre ${property.type} en ${property.town} - Ref: ${property.ref}`}
                        className="flex items-center text-blue-600 hover:text-blue-700"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Enviar email
                      </a>
                    )}
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
                  {property.telefono && (
                    <>
                      <button 
                        onClick={handleCallNow}
                        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center"
                      >
                        <Phone className="w-5 h-5 mr-2" />
                        Llamar ahora
                      </button>
                      <button 
                        onClick={handleWhatsApp}
                        className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium"
                      >
                        WhatsApp
                      </button>
                    </>
                  )}
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
      </div>
    </div>
  );
};

export default PropertyDetailClient;