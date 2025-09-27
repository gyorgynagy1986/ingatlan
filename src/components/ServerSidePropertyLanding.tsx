"use client";

import React, { useState, useCallback, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, MapPin, Bed, Bath, Square, ExternalLink, Search } from 'lucide-react';
import Image from 'next/image';
import { searchProperties, PropertySearchParams, PropertySearchResult, Property } from '../lib/action/getPublicData';

// Generate slug function
const generateSlug = (property: Property) => {
  const cleanText = (text: string) => text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
            <Image
              src={images[currentImageIndex]?.url}
              placeholder='blur'
              blurDataURL='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAIElEQVQYV2NkYGD4z8DAwMgABYwMjIwMDAx+HwQAkgcGSWv8x4AAAAASUVORK5CYII='
              priority
              width={500}
              height={500}
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

// Search Filters Component
const SearchFilters: React.FC<{
  filters: PropertySearchParams;
  availableTypes: string[];
  availableTowns: string[];
  onFiltersChange: (filters: PropertySearchParams) => void;
  isLoading: boolean;
}> = ({ filters, availableTypes, availableTowns, onFiltersChange, isLoading }) => {
  const handleFilterChange = (key: keyof PropertySearchParams, value: string | number | boolean | null | undefined) => {
    const newFilters: PropertySearchParams = { ...filters, page: 1 }; // Reset to page 1 on filter change
    
    if (key === 'type' || key === 'town') {
      newFilters[key] = value as string | undefined;
    } else if (key === 'minPrice' || key === 'maxPrice' || key === 'minBeds' || key === 'page' || key === 'limit') {
      newFilters[key] = value as number | undefined;
    } else if (key === 'pool') {
      newFilters[key] = value as boolean | null;
    } else if (key === 'sortBy') {
      newFilters[key] = value as 'price' | 'date' | 'beds' | undefined;
    } else if (key === 'sortOrder') {
      newFilters[key] = value as 'asc' | 'desc' | undefined;
    }
    
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    onFiltersChange({ page: 1, limit: filters.limit });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center">
          <Search className="w-5 h-5 mr-2" />
          Filtros de búsqueda
        </h2>
        <button
          onClick={clearFilters}
          className="text-blue-600 hover:text-blue-700 text-sm"
          disabled={isLoading}
        >
          Limpiar filtros
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <select
          value={filters.type || ''}
          onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          disabled={isLoading}
        >
          <option value="">Todos los tipos</option>
          {availableTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <select
          value={filters.town || ''}
          onChange={(e) => handleFilterChange('town', e.target.value || undefined)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          disabled={isLoading}
        >
          <option value="">Todas las ciudades</option>
          {availableTowns.map(town => (
            <option key={town} value={town}>{town}</option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Precio mín."
          value={filters.minPrice || ''}
          onChange={(e) => handleFilterChange('minPrice', e.target.value ? parseInt(e.target.value) : undefined)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          disabled={isLoading}
        />

        <input
          type="number"
          placeholder="Precio máx."
          value={filters.maxPrice || ''}
          onChange={(e) => handleFilterChange('maxPrice', e.target.value ? parseInt(e.target.value) : undefined)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          disabled={isLoading}
        />

        <select
          value={filters.minBeds || ''}
          onChange={(e) => handleFilterChange('minBeds', e.target.value ? parseInt(e.target.value) : undefined)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          disabled={isLoading}
        >
          <option value="">Habitaciones</option>
          <option value="1">1+ hab.</option>
          <option value="2">2+ hab.</option>
          <option value="3">3+ hab.</option>
          <option value="4">4+ hab.</option>
        </select>

        <select
          value={filters.pool === null || filters.pool === undefined ? '' : filters.pool ? 'yes' : 'no'}
          onChange={(e) => {
            const value = e.target.value;
            handleFilterChange('pool', value === '' ? null : value === 'yes');
          }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          disabled={isLoading}
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
  isLoading: boolean;
}> = ({ currentPage, totalPages, onPageChange, isLoading }) => {
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
        disabled={currentPage === 1 || isLoading}
        className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      
      {getPageNumbers().map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg ${
            page === currentPage
              ? 'bg-blue-600 text-white'
              : 'border hover:bg-gray-50 disabled:opacity-50'
          }`}
        >
          {page}
        </button>
      ))}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || isLoading}
        className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

// Main Component with Server-side search
const ServerSidePropertyLanding: React.FC<{ initialResult: PropertySearchResult }> = ({ 
  initialResult 
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  const [searchResult, setSearchResult] = useState<PropertySearchResult>(initialResult);
  const [filters, setFilters] = useState<PropertySearchParams>({
    page: parseInt(searchParams.get('page') || '1'),
    limit: 12,
    type: searchParams.get('type') || undefined,
    town: searchParams.get('town') || undefined,
    minPrice: searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : undefined,
    maxPrice: searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : undefined,
    minBeds: searchParams.get('minBeds') ? parseInt(searchParams.get('minBeds')!) : undefined,
    pool: searchParams.get('pool') ? searchParams.get('pool') === 'true' : null,
  });

  // Perform server search when filters change
  const performSearch = useCallback(async (newFilters: PropertySearchParams) => {
    console.log('🔍 Performing server search with filters:', newFilters);
    
    startTransition(async () => {
      try {
        const result = await searchProperties(newFilters);
        setSearchResult(result);
        
        // Update URL with search params
        const params = new URLSearchParams();
        Object.entries(newFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.set(key, value.toString());
          }
        });
        
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', newUrl);
        
        // Scroll to top after search
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
      } catch (error) {
        console.error('Search error:', error);
      }
    });
  }, []);

  const handleFiltersChange = useCallback((newFilters: PropertySearchParams) => {
    console.log('🔄 Filters changed:', newFilters);
    setFilters(newFilters);
    performSearch(newFilters);
  }, [performSearch]);

  const handlePageChange = useCallback((page: number) => {
    const newFilters = { ...filters, page };
    handleFiltersChange(newFilters);
  }, [filters, handleFiltersChange]);

  const handlePropertyClick = (property: Property) => {
    const slug = generateSlug(property);
    router.push(`/properties/${slug}`);
  };

  const { properties, pagination } = searchResult;
  const { availableTypes, availableTowns } = searchResult.filters;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Propiedades en España
          </h1>
          <p className="text-gray-600 mt-2">
            Encuentra tu propiedad ideal - {pagination.totalItems} propiedades disponibles
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Filters */}
        <SearchFilters
          filters={filters}
          availableTypes={availableTypes}
          availableTowns={availableTowns}
          onFiltersChange={handleFiltersChange}
          isLoading={isPending}
        />

        {/* Loading State */}
        {isPending && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-600">Buscando propiedades...</span>
          </div>
        )}

        {/* Results Summary */}
        {!isPending && (
          <div className="mb-6 flex justify-between items-center">
            <p className="text-gray-600">
              Mostrando {((pagination.currentPage - 1) * pagination.limit) + 1}-{Math.min(pagination.currentPage * pagination.limit, pagination.totalItems)} de {pagination.totalItems} propiedades
            </p>
            <div className="text-sm text-gray-500">
              Página {pagination.currentPage} de {pagination.totalPages}
            </div>
          </div>
        )}

        {/* Properties Grid */}
        {properties.length > 0 ? (
          <>
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${isPending ? 'opacity-50' : ''}`}>
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onClick={() => handlePropertyClick(property)}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                isLoading={isPending}
              />
            )}
          </>
        ) : !isPending ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🏠</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No se encontraron propiedades
            </h3>
            <p className="text-gray-500 mb-4">
              Intenta ajustar los filtros para ver más resultados
            </p>
            <button
              onClick={() => handleFiltersChange({ page: 1, limit: 12 })}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ver todas las propiedades
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ServerSidePropertyLanding;