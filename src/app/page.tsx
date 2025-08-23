"use client"

import React, { useState, useCallback } from 'react';
import { Download, FileText, BarChart3, Play, Copy, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

// TypeScript interfaces
interface PropertyImage {
  id?: string;
  url: string;
  title?: string;
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
  location?: string;
  surface_area?: number;
  url?: string;
  description?: string;
  title_extra?: string;
  images?: PropertyImage[];
  features?: PropertyFeature[];
  latitude?: number;
  longitude?: number;
  _index: number;
  formatted_date?: string;
  formatted_price?: string;
}

interface Statistics {
  total: number;
  typeCount: Record<string, number>;
  locationCount: Record<string, number>;
  totalImages: number;
  avgImagesPerProperty: number;
  priceStats: {
    min: number;
    max: number;
    avg: number;
  } | null;
}

class KyeroAPIExtractor {
  private apiUrl = '/api/kyero-proxy'; // Saját API route használata

  async fetchAndExtractData(): Promise<Property[] | null> {
    try {
      // Saját API route használata CORS problémák elkerülésére
      const response = await fetch(this.apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/xml',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const xmlText = await response.text();
      return this.parseKyeroXML(xmlText);
      
    } catch (error) {
      console.error('Hiba az adatok lekérése során:', error);
      throw error;
    }
  }

  parseKyeroXML(xmlString: string): Property[] | null {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('XML parseolási hiba');
      }
      
      const properties = xmlDoc.querySelectorAll('property');
      const extractedData: Property[] = [];
      
      properties.forEach((property, index) => {
        const propertyData = this.extractPropertyDetails(property);
        propertyData._index = index + 1;
        extractedData.push(propertyData);
      });
      
      return extractedData;
      
    } catch (error) {
      console.error('XML feldolgozási hiba:', error);
      throw error;
    }
  }

  private extractPropertyDetails(propertyElement: Element): Property {
    const data: Partial<Property> = {};
    
    const basicFields = [
      'id', 'date', 'agencia', 'email', 'telefono', 'ref',
      'price', 'currency', 'price_freq', 'new_build',
      'part_ownership', 'leasehold', 'type', 'country',
      'province', 'town', 'location_detail', 'cp',
      'postal_code', 'beds', 'baths', 'estado_propiedad',
      'antiguedad', 'pool', 'energy_rating', 'title_extra'
    ];

    basicFields.forEach(field => {
      const element = propertyElement.querySelector(field);
      if (element) {
        const value = element.textContent?.trim() || '';
        
        if (['price', 'beds', 'baths', 'pool', 'new_build', 'part_ownership', 'leasehold', 'antiguedad', 'estado_propiedad'].includes(field)) {
          const numValue = parseInt(value);
          (data as Record<keyof Property, unknown>)[field as keyof Property] = isNaN(numValue) ? value : numValue;
        } else {
          (data as Record<string, unknown>)[field] = value;
        }
      }
    });

    // Speciális mezők
    const locationElement = propertyElement.querySelector('location');
    if (locationElement) {
      data.location = locationElement.textContent?.trim();
      
      // Koordináták kinyerése ha vannak
      const latElement = locationElement.querySelector('latitude');
      const lngElement = locationElement.querySelector('longitude');
      if (latElement) data.latitude = parseFloat(latElement.textContent?.trim() || '0');
      if (lngElement) data.longitude = parseFloat(lngElement.textContent?.trim() || '0');
    }

    const surfaceAreaElement = propertyElement.querySelector('surface_area');
    if (surfaceAreaElement) {
      const surface = surfaceAreaElement.textContent?.trim();
      const parsedSurface = surface ? parseInt(surface, 10) : undefined;
      data.surface_area = isNaN(parsedSurface as number) ? undefined : parsedSurface;
    }

    const urlElement = propertyElement.querySelector('url');
    if (urlElement) {
      data.url = urlElement.textContent?.trim();
    }

    const descElement = propertyElement.querySelector('desc');
    if (descElement) {
      data.description = descElement.textContent?.trim();
    }

    // Képek kinyerése
    const imagesContainer = propertyElement.querySelector('images');
    if (imagesContainer) {
      const imageElements = imagesContainer.querySelectorAll('image');
      data.images = Array.from(imageElements).map((img, index) => {
        const urlElement = img.querySelector('url');
        const idAttr = img.getAttribute('id');
        const titleElement = img.querySelector('title');
        const floorplanAttr = img.getAttribute('floorplan');
        
        return {
          id: idAttr || (index + 1).toString(),
          url: urlElement?.textContent?.trim() || '',
          title: titleElement?.textContent?.trim(),
          floorplan: floorplanAttr === '1' || floorplanAttr === 'true'
        };
      }).filter(img => img.url); // Csak azokat, amiknek van URL-je
    }

    // Features/jellemzők kinyerése
    const featuresContainer = propertyElement.querySelector('features');
    if (featuresContainer) {
      const featureElements = featuresContainer.querySelectorAll('feature');
      data.features = Array.from(featureElements).map(feature => ({
        name: feature.textContent?.trim() || ''
      })).filter(f => f.name);
    }

    // Formázott mezők
    if (data.date) {
      data.formatted_date = new Date(data.date).toLocaleDateString('hu-HU');
    }

    if (data.price && data.currency) {
      data.formatted_price = `${data.price.toLocaleString('hu-HU')} ${data.currency}`;
    }

    return data as Property;
  }

  processManualXML(xmlString: string): Property[] | null {
    return this.parseKyeroXML(xmlString);
  }
}

const KyeroExtractorApp: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [manualXml, setManualXml] = useState('');
  const [statistics, setStatistics] = useState<Statistics | null>(null);

  const extractor = new KyeroAPIExtractor();

  const calculateStatistics = useCallback((data: Property[]): Statistics => {
    const typeCount: Record<string, number> = {};
    const locationCount: Record<string, number> = {};
    const prices: number[] = [];
    let totalImages = 0;

    data.forEach(item => {
      const type = item.type || 'Ismeretlen';
      typeCount[type] = (typeCount[type] || 0) + 1;

      const location = item.town || item.province || 'Ismeretlen';
      locationCount[location] = (locationCount[location] || 0) + 1;

      if (item.price && item.price > 0) {
        prices.push(item.price);
      }

      if (item.images && item.images.length > 0) {
        totalImages += item.images.length;
      }
    });

    const priceStats = prices.length > 0 ? {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    } : null;

    return {
      total: data.length,
      typeCount,
      locationCount,
      totalImages,
      avgImagesPerProperty: totalImages > 0 ? Math.round((totalImages / data.length) * 10) / 10 : 0,
      priceStats
    };
  }, []);

  const handleAutoFetch = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await extractor.fetchAndExtractData();
      if (data && data.length > 0) {
        setProperties(data);
        setStatistics(calculateStatistics(data));
        setSuccess(`${data.length} ingatlan sikeresen betöltve!`);
      } else {
        setError('Nem találhatók adatok az API-ban');
      }
    } catch (err) {
      setError('Hiba a szerver API hívásnál. Ellenőrizd, hogy a Next.js API route megfelelően van beállítva, vagy próbálkozz manuális módszerrel.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualProcess = () => {
    if (!manualXml.trim()) {
      setError('Kérlek, illeszd be az XML tartalmat!');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = extractor.processManualXML(manualXml);
      if (data && data.length > 0) {
        setProperties(data);
        setStatistics(calculateStatistics(data));
        setSuccess(`${data.length} ingatlan sikeresen feldolgozva!`);
      } else {
        setError('Nem sikerült feldolgozni az XML adatokat');
      }
    } catch (err) {
      setError('Hiba az XML feldolgozása során');
    } finally {
      setLoading(false);
    }
  };

  const exportToJSON = () => {
    if (properties.length === 0) return;
    
    const jsonString = JSON.stringify(properties, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kyero_properties.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setSuccess('JSON fájl letöltve!');
  };

  const exportToCSV = () => {
    if (properties.length === 0) return;

    const headers = Object.keys(properties[0]);
    const csvContent = [
      headers.join(','),
      ...properties.map(row => 
        headers.map(field => {
          const value = (row[field as keyof Property] || '').toString();
          return value.includes(',') || value.includes('"') ? `"${value.replace(/"/g, '""')}"` : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kyero_properties.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setSuccess('CSV fájl letöltve!');
  };

  const copyApiUrl = () => {
    navigator.clipboard.writeText('https://procesos.apinmo.com/portal/kyeroagencias3/8875-kyero-jrYwggM0-Colaborador.xml');
    setSuccess('API URL másolva a vágólapra!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-4xl font-bold text-gray-800 text-center mb-8">
            🏠 Kyero API Data Extractor
          </h1>

          {/* Alert Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="text-red-500 w-5 h-5" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle className="text-green-500 w-5 h-5" />
              <span className="text-green-700">{success}</span>
            </div>
          )}

          {/* Auto Fetch Section */}
          <div className="mb-8 p-6 bg-blue-50 rounded-xl">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">🚀 Automatikus lekérés</h2>
            <p className="text-gray-600 mb-4">
              Automatikus adatlekérés a Kyero API-ból saját proxy szerveren keresztül (nincs CORS probléma).
            </p>
            <button
              onClick={handleAutoFetch}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              {loading ? 'Adatok lekérése...' : 'Adatok lekérése'}
            </button>
          </div>

          {/* Manual XML Section */}
          <div className="mb-8 p-6 bg-yellow-50 rounded-xl">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">📝 Manuális XML feldolgozás</h2>
            <div className="mb-4">
              <p className="text-gray-600 mb-2">1. Nyisd meg az API URL-t egy új lapon:</p>
              <div className="flex items-center gap-2 mb-4">
                <code className="bg-gray-100 px-3 py-2 rounded text-sm flex-1">
                  https://procesos.apinmo.com/portal/kyeroagencias3/8875-kyero-jrYwggM0-Colaborador.xml
                </code>
                <button
                  onClick={copyApiUrl}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Másolás
                </button>
              </div>
              <p className="text-gray-600 mb-4">2. Másold ki a teljes XML tartalmat és illeszd be ide:</p>
            </div>
            
            <textarea
              value={manualXml}
              onChange={(e) => setManualXml(e.target.value)}
              placeholder="Illeszd be ide az XML tartalmat..."
              className="w-full h-40 p-4 border border-gray-300 rounded-lg resize-vertical font-mono text-sm"
            />
            
            <button
              onClick={handleManualProcess}
              disabled={loading || !manualXml.trim()}
              className="mt-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
              XML feldolgozása
            </button>
          </div>

          {/* Results Section */}
          {properties.length > 0 && (
            <>
              {/* Statistics */}
              {statistics && (
                <div className="mb-8 p-6 bg-green-50 rounded-xl">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-6 h-6" />
                    Statisztikák
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-700 mb-2">Összesen</h3>
                      <p className="text-3xl font-bold text-blue-600">{statistics.total}</p>
                      <p className="text-gray-500">ingatlan</p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-700 mb-2">Képek</h3>
                      <p className="text-2xl font-bold text-purple-600">{statistics.totalImages}</p>
                      <p className="text-gray-500">összes kép</p>
                      <p className="text-sm text-gray-600">Átlag: {statistics.avgImagesPerProperty}/ingatlan</p>
                    </div>
                    
                    {statistics.priceStats && (
                      <div className="bg-white p-4 rounded-lg">
                        <h3 className="font-semibold text-gray-700 mb-2">Árak</h3>
                        <p className="text-sm text-gray-600">Min: {statistics.priceStats.min.toLocaleString('hu-HU')} EUR</p>
                        <p className="text-sm text-gray-600">Max: {statistics.priceStats.max.toLocaleString('hu-HU')} EUR</p>
                        <p className="text-lg font-bold text-green-600">Átlag: {statistics.priceStats.avg.toLocaleString('hu-HU')} EUR</p>
                      </div>
                    )}
                    
                    <div className="bg-white p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-700 mb-2">Legnépszerűbb típus</h3>
                      {Object.entries(statistics.typeCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([type, count]) => (
                        <p key={type} className="text-sm text-gray-600">{type}: {count} db</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Export Section */}
              <div className="mb-8 p-6 bg-purple-50 rounded-xl">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">💾 Exportálás</h2>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={exportToJSON}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    JSON letöltése
                  </button>
                  
                  <button
                    onClick={exportToCSV}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    CSV letöltése
                  </button>
                </div>
              </div>

              {/* Properties Preview */}
              <div className="p-6 bg-gray-50 rounded-xl">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">📋 Első 5 ingatlan előnézet</h2>
                <div className="overflow-x-auto">
                  <table className="w-full bg-white rounded-lg overflow-hidden shadow">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-3 text-left">ID</th>
                        <th className="p-3 text-left">Típus</th>
                        <th className="p-3 text-left">Ár</th>
                        <th className="p-3 text-left">Lokáció</th>
                        <th className="p-3 text-left">Szobák</th>
                        <th className="p-3 text-left">Terület</th>
                        <th className="p-3 text-left">Képek</th>
                      </tr>
                    </thead>
                    <tbody>
                      {properties.slice(0, 5).map((property) => (
                        <tr key={property.id} className="border-t">
                          <td className="p-3 font-mono text-sm">{property.id}</td>
                          <td className="p-3">{property.type}</td>
                          <td className="p-3 font-semibold text-green-600">{property.formatted_price}</td>
                          <td className="p-3">{property.town}, {property.province}</td>
                          <td className="p-3">{property.beds}🛏️ {property.baths}🚿</td>
                          <td className="p-3">{property.surface_area ? `${property.surface_area}m²` : '-'}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                                {property.images?.length || 0} kép
                              </span>
                              {property.images && property.images.length > 0 && (
                                <img 
                                  src={property.images[0].url} 
                                  alt="Property preview"
                                  className="w-12 h-12 object-cover rounded border"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {properties.length > 5 && (
                  <p className="mt-4 text-gray-600 text-center">
                    ... és még {properties.length - 5} ingatlan
                  </p>
                )}
                
                {/* Image Gallery Preview */}
                {properties.length > 0 && properties[0].images && properties[0].images.length > 0 && (
                  <div className="mt-6 p-4 bg-white rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      🖼️ Képek előnézet - {properties[0].type} (ID: {properties[0].id})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {properties[0].images.slice(0, 12).map((image, index) => (
                        <div key={image.id || index} className="relative group">
                          <img
                            src={image.url}
                            alt={image.title || `Property image ${index + 1}`}
                            className="w-full h-20 object-cover rounded border hover:shadow-lg transition-shadow cursor-pointer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNSA0NUw1MCA2MEw2NSA0NUw3NSA1NVY3NUgzNVY0NVoiIGZpbGw9IiNEMUQ1REIiLz4KPGNpcmNsZSBjeD0iNDAiIGN5PSIzNSIgcj0iNSIgZmlsbD0iI0QxRDVEQiIvPgo8L3N2Zz4K';
                            }}
                            onClick={() => window.open(image.url, '_blank')}
                          />
                          {image.floorplan && (
                            <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-1 rounded">
                              📐
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                            <span className="text-white text-xs text-center px-2">
                              {image.title || 'Kattints a nagyításhoz'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {properties[0].images.length > 12 && (
                      <p className="mt-2 text-sm text-gray-600 text-center">
                        ... és még {properties[0].images.length - 12} kép
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default KyeroExtractorApp;