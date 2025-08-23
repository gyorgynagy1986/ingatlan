"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, MapPin, Bed, Bath, Square, ExternalLink } from 'lucide-react';
// Import the JSON data
import propertiesData from '../../lib/kyero_properties.json';

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

// Use real data from JSON
const PROPERTIES_DATA = propertiesData as Property[];

// Helper function to generate slug
const generateSlug = (property: Property) => {
  const cleanText = (text: string) => text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  
  const typeSlug = cleanText(property.type);
  const townSlug = cleanText(property.town);
  const locationSlug = property.location_detail ? cleanText(property.location_detail) : '';
  
  const slugParts = [typeSlug, townSlug];
  if (locationSlug) slugParts.push(locationSlug);
  slugParts.push(property.id);
  
  return slugParts.join('-').replace(/--+/g, '-');
};

// Property Card Component
const PropertyCard: React.FC<{ property: Property; onClick: () => void }> = ({ property, onClick }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = property.images || [];

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
      onClick={onClick}
    >
      {/* Image Carousel */}
      <div className="relative h-64 overflow-hidden">
        {images.length > 0 ? (
          <>
            <img
              src={images[currentImageIndex]?.url}
              alt={`${property.type} in ${property.town}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTAwTDIwMCAyMDBMMzAwIDEwMEwzNTAgMTUwVjI1MEgxMDBWMTAwWiIgZmlsbD0iI0QxRDVEQiIvPgo8Y2lyY2xlIGN4PSIxNDAiIGN5PSIxMzAiIHI9IjIwIiBmaWxsPSIjRDFENURCIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUM5Qzk2IiBmb250LXNpemU9IjE2Ij5ObyBJbWFnZTwvdGV4dD4KPHN2Zz4K';
              }}
            />
            
            {/* Image Navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                
                {/* Image Dots */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                  {images.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
            
            {/* Property Type Badge */}
            <div className="absolute top-3 left-3 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
              {property.type}
            </div>
            
            {/* New Build Badge */}
            {property.new_build === 1 && (
              <div className="absolute top-3 right-3 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                Nueva construcción
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500">Sin imagen</span>
          </div>
        )}
      </div>

      {/* Property Info */}
      <div className="p-6">
        {/* Price */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-2xl font-bold text-blue-600">
            {property.formatted_price || `${property.price?.toLocaleString()} ${property.currency}`}
          </div>
          <div className="text-sm text-gray-500">
            Ref: {property.ref}
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center text-gray-600 mb-3">
          <MapPin className="w-4 h-4 mr-2" />
          <span className="text-sm">
            {property.location_detail && `${property.location_detail}, `}
            {property.town}, {property.province}
          </span>
        </div>

        {/* Property Details */}
        <div className="flex items-center justify-between mb-4 text-gray-600">
          <div className="flex items-center">
            <Bed className="w-4 h-4 mr-1" />
            <span className="text-sm">{property.beds} hab.</span>
          </div>
          <div className="flex items-center">
            <Bath className="w-4 h-4 mr-1" />
            <span className="text-sm">{property.baths} baños</span>
          </div>
          {property.surface_area && (
            <div className="flex items-center">
              <Square className="w-4 h-4 mr-1" />
              <span className="text-sm">{property.surface_area}m²</span>
            </div>
          )}
        </div>

        {/* Description Preview */}
        {property.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {property.description
              .replace(/[🌊🏖️📍🛏️🛠️💰🏡🚶‍♂️✨~]/g, '')
              .replace(/~/g, ' ')
              .substring(0, 120)}...
          </p>
        )}

        {/* Features */}
        {property.features && property.features.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {property.features.slice(0, 3).map((feature, index) => (
              <span
                key={index}
                className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
              >
                {feature.name}
              </span>
            ))}
            {property.features.length > 3 && (
              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                +{property.features.length - 3} más
              </span>
            )}
          </div>
        )}

        {/* Agency Info */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="text-sm text-gray-600">
            {property.agencia}
          </div>
          <div className="flex items-center space-x-3">
            {property.pool === 1 && (
              <span className="text-blue-500 text-lg" title="Piscina">🏊‍♂️</span>
            )}
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Filter Component
const PropertyFilters: React.FC<{
  properties: Property[];
  onFilterChange: (filtered: Property[]) => void;
}> = ({ properties, onFilterChange }) => {
  const [filters, setFilters] = useState({
    type: '',
    town: '',
    minPrice: '',
    maxPrice: '',
    minBeds: '',
    pool: ''
  });

  const propertyTypes = [...new Set(properties.map(p => p.type))].sort();
  const towns = [...new Set(properties.map(p => p.town))].sort();

  useEffect(() => {
    let filtered = properties;

    if (filters.type) {
      filtered = filtered.filter(p => p.type === filters.type);
    }
    if (filters.town) {
      filtered = filtered.filter(p => p.town === filters.town);
    }
    if (filters.minPrice) {
      filtered = filtered.filter(p => p.price >= parseInt(filters.minPrice));
    }
    if (filters.maxPrice) {
      filtered = filtered.filter(p => p.price <= parseInt(filters.maxPrice));
    }
    if (filters.minBeds) {
      filtered = filtered.filter(p => p.beds >= parseInt(filters.minBeds));
    }
    if (filters.pool) {
      filtered = filtered.filter(p => filters.pool === 'yes' ? p.pool === 1 : p.pool === 0);
    }

    onFilterChange(filtered);
  }, [filters, properties, onFilterChange]);

  const clearFilters = () => {
    setFilters({
      type: '',
      town: '',
      minPrice: '',
      maxPrice: '',
      minBeds: '',
      pool: ''
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Filtros</h2>
        <button
          onClick={clearFilters}
          className="text-blue-600 hover:text-blue-700 text-sm"
        >
          Limpiar filtros
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <select
          value={filters.type}
          onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Todos los tipos</option>
          {propertyTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <select
          value={filters.town}
          onChange={(e) => setFilters(prev => ({ ...prev, town: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Todas las ciudades</option>
          {towns.map(town => (
            <option key={town} value={town}>{town}</option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Precio mín."
          value={filters.minPrice}
          onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />

        <input
          type="number"
          placeholder="Precio máx."
          value={filters.maxPrice}
          onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />

        <select
          value={filters.minBeds}
          onChange={(e) => setFilters(prev => ({ ...prev, minBeds: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Habitaciones</option>
          <option value="1">1+ hab.</option>
          <option value="2">2+ hab.</option>
          <option value="3">3+ hab.</option>
          <option value="4">4+ hab.</option>
        </select>

        <select
          value={filters.pool}
          onChange={(e) => setFilters(prev => ({ ...prev, pool: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Piscina</option>
          <option value="yes">Con piscina</option>
          <option value="no">Sin piscina</option>
        </select>
      </div>
    </div>
  );
};

// Pagination Component
const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  return (
    <div className="flex items-center justify-center space-x-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      
      {getPageNumbers().map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-4 py-2 rounded-lg ${
            page === currentPage
              ? 'bg-blue-600 text-white'
              : 'border hover:bg-gray-50'
          }`}
        >
          {page}
        </button>
      ))}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

// Main Landing Page Component
const PropertyLandingPage: React.FC = () => {
  const router = useRouter();
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  
  const PROPERTIES_PER_PAGE = 10;

  useEffect(() => {
    // Load properties from imported JSON data
    const loadProperties = async () => {
      try {
        setLoading(true);
        
        // Use the imported JSON data directly
        setAllProperties(PROPERTIES_DATA);
        setFilteredProperties(PROPERTIES_DATA);
        setLoading(false);
      } catch (error) {
        console.error('Error loading properties:', error);
        setLoading(false);
      }
    };

    loadProperties();
  }, []);

  const handleFilterChange = useCallback((filtered: Property[]) => {
    setFilteredProperties(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const totalPages = Math.ceil(filteredProperties.length / PROPERTIES_PER_PAGE);
  const startIndex = (currentPage - 1) * PROPERTIES_PER_PAGE;
  const currentProperties = filteredProperties.slice(startIndex, startIndex + PROPERTIES_PER_PAGE);

  const handlePropertyClick = (property: Property) => {
    const slug = generateSlug(property);
    // Navigate to dynamic route using Next.js router
    router.push(`/properties/${slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando propiedades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Propiedades en España
          </h1>
          <p className="text-gray-600 mt-2">
            Descubre {PROPERTIES_DATA.length} propiedades exclusivas en las mejores ubicaciones de España
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <PropertyFilters 
          properties={allProperties} 
          onFilterChange={handleFilterChange}
        />

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-gray-600">
            Mostrando {startIndex + 1}-{Math.min(startIndex + PROPERTIES_PER_PAGE, filteredProperties.length)} de {filteredProperties.length} propiedades
            {filteredProperties.length !== allProperties.length && (
              <span className="text-blue-600 ml-1">(filtrado de {allProperties.length} total)</span>
            )}
          </p>
        </div>

        {/* Property Grid */}
        {currentProperties.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {currentProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onClick={() => handlePropertyClick(property)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🏠</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No se encontraron propiedades
            </h3>
            <p className="text-gray-500 mb-4">
              Intenta ajustar los filtros para ver más resultados
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyLandingPage;