"use client";

import React, { useState, useCallback } from "react";
import {
  Download,
  FileText,
  Play,
  Copy,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  totalImages: number;
  avgImagesPerProperty: number;
  priceStats: {
    min: number;
    max: number;
    avg: number;
  } | null;
}

class KyeroAPIExtractor {
  private apiUrl = "/api/kyero-proxy";

  async fetchAndExtractData(): Promise<Property[] | null> {
    try {
      const response = await fetch(this.apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/xml",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();
      return this.parseKyeroXML(xmlText);
    } catch (error) {
      console.error("Hiba az adatok lekérése során:", error);
      throw error;
    }
  }

  parseKyeroXML(xmlString: string): Property[] | null {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");

      const parserError = xmlDoc.querySelector("parsererror");
      if (parserError) {
        throw new Error("XML parseolási hiba");
      }

      const properties = xmlDoc.querySelectorAll("property");
      const extractedData: Property[] = [];

      properties.forEach((property, index) => {
        const propertyData = this.extractPropertyDetails(property);
        propertyData._index = index + 1;
        extractedData.push(propertyData);
      });

      return extractedData;
    } catch (error) {
      console.error("XML feldolgozási hiba:", error);
      throw error;
    }
  }

  private extractPropertyDetails(propertyElement: Element): Property {
    const data: Partial<Property> = {};

    const basicFields = [
      "id",
      "date",
      "agencia",
      "email",
      "telefono",
      "ref",
      "price",
      "currency",
      "price_freq",
      "new_build",
      "part_ownership",
      "leasehold",
      "type",
      "country",
      "province",
      "town",
      "location_detail",
      "cp",
      "postal_code",
      "beds",
      "baths",
      "estado_propiedad",
      "antiguedad",
      "pool",
      "energy_rating",
      "title_extra",
    ];

    basicFields.forEach((field) => {
      const element = propertyElement.querySelector(field);
      if (element) {
        const value = element.textContent?.trim() || "";

        if (
          [
            "price",
            "beds",
            "baths",
            "pool",
            "new_build",
            "part_ownership",
            "leasehold",
            "antiguedad",
            "estado_propiedad",
          ].includes(field)
        ) {
          const numValue = parseInt(value);
          (data as Record<keyof Property, unknown>)[field as keyof Property] =
            isNaN(numValue) ? value : numValue;
        } else {
          (data as Record<string, unknown>)[field] = value;
        }
      }
    });

    // Speciális mezők
    const locationElement = propertyElement.querySelector("location");
    if (locationElement) {
      data.location = locationElement.textContent?.trim();

      const latElement = locationElement.querySelector("latitude");
      const lngElement = locationElement.querySelector("longitude");
      if (latElement)
        data.latitude = parseFloat(latElement.textContent?.trim() || "0");
      if (lngElement)
        data.longitude = parseFloat(lngElement.textContent?.trim() || "0");
    }

    const surfaceAreaElement = propertyElement.querySelector("surface_area");
    if (surfaceAreaElement) {
      const surface = surfaceAreaElement.textContent?.trim();
      const parsedSurface = surface ? parseInt(surface, 10) : undefined;
      data.surface_area = isNaN(parsedSurface as number)
        ? undefined
        : parsedSurface;
    }

    const urlElement = propertyElement.querySelector("url");
    if (urlElement) {
      data.url = urlElement.textContent?.trim();
    }

    const descElement = propertyElement.querySelector("desc");
    if (descElement) {
      data.description = descElement.textContent?.trim();
    }

    // Képek kinyerése
    const imagesContainer = propertyElement.querySelector("images");
    if (imagesContainer) {
      const imageElements = imagesContainer.querySelectorAll("image");
      data.images = Array.from(imageElements)
        .map((img, index) => {
          const urlElement = img.querySelector("url");
          const idAttr = img.getAttribute("id");
          const titleElement = img.querySelector("title");
          const floorplanAttr = img.getAttribute("floorplan");

          return {
            id: idAttr || (index + 1).toString(),
            url: urlElement?.textContent?.trim() || "",
            title: titleElement?.textContent?.trim(),
            floorplan: floorplanAttr === "1" || floorplanAttr === "true",
          };
        })
        .filter((img) => img.url);
    }

    // Features/jellemzők kinyerése
    const featuresContainer = propertyElement.querySelector("features");
    if (featuresContainer) {
      const featureElements = featuresContainer.querySelectorAll("feature");
      data.features = Array.from(featureElements)
        .map((feature) => ({
          name: feature.textContent?.trim() || "",
        }))
        .filter((f) => f.name);
    }

    // Formázott mezők
    if (data.date) {
      data.formatted_date = new Date(data.date).toLocaleDateString("hu-HU");
    }

    if (data.price && data.currency) {
      data.formatted_price = `${data.price.toLocaleString("hu-HU")} ${
        data.currency
      }`;
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
  const [manualXml, setManualXml] = useState("");
  const [statistics, setStatistics] = useState<Statistics | null>(null);

  const extractor = new KyeroAPIExtractor();

  const calculateStatistics = useCallback((data: Property[]): Statistics => {
    const prices: number[] = [];
    let totalImages = 0;

    data.forEach((item) => {
      if (item.price && item.price > 0) {
        prices.push(item.price);
      }

      if (item.images && item.images.length > 0) {
        totalImages += item.images.length;
      }
    });

    const priceStats =
      prices.length > 0
        ? {
            min: Math.min(...prices),
            max: Math.max(...prices),
            avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
          }
        : null;

    return {
      total: data.length,
      totalImages,
      avgImagesPerProperty:
        totalImages > 0 ? Math.round((totalImages / data.length) * 10) / 10 : 0,
      priceStats,
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
        setSuccess(`${data.length} ingatlan sikeresen betöltve`);
      } else {
        setError("Nem találhatók adatok az API-ban");
      }
    } catch (err) {
      setError(
        "Hiba a szerver API hívásnál. Próbálkozz manuális módszerrel."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManualProcess = () => {
    if (!manualXml.trim()) {
      setError("Kérlek, illeszd be az XML tartalmat");
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
        setSuccess(`${data.length} ingatlan sikeresen feldolgozva`);
      } else {
        setError("Nem sikerült feldolgozni az XML adatokat");
      }
    } catch (err) {
      setError("Hiba az XML feldolgozása során");
    } finally {
      setLoading(false);
    }
  };

  const exportToJSON = () => {
    if (properties.length === 0) return;

    const jsonString = JSON.stringify(properties, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const dateString = now.toISOString().slice(0, 10);
    const timeString = now.toTimeString().slice(0, 5).replace(":", "-");

    const a = document.createElement("a");
    a.href = url;
    a.download = `kyero_properties_${dateString}_${timeString}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSuccess("JSON fájl letöltve");
  };

  const exportToCSV = () => {
    if (properties.length === 0) return;

    const headers = Object.keys(properties[0]);
    const csvContent = [
      headers.join(","),
      ...properties.map((row) =>
        headers
          .map((field) => {
            const value = (row[field as keyof Property] || "").toString();
            return value.includes(",") || value.includes('"')
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const dateString = now.toISOString().slice(0, 10);
    const timeString = now.toTimeString().slice(0, 5).replace(":", "-");

    const a = document.createElement("a");
    a.href = url;
    a.download = `kyero_properties_${dateString}_${timeString}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSuccess("CSV fájl letöltve");
  };

  const copyApiUrl = () => {
    navigator.clipboard.writeText(
      "https://procesos.apinmo.com/portal/kyeroagencias3/8875-kyero-jrYwggM0-Colaborador.xml"
    );
    setSuccess("API URL másolva");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Kyero API Data Extractor
          </h1>
          <p className="text-slate-600 mt-2">
            Adatok kinyerése és exportálása
          </p>
        </div>

        {/* Messages */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-4 flex items-center gap-3">
              <AlertCircle className="text-red-500 w-5 h-5" />
              <span className="text-red-700">{error}</span>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-4 flex items-center gap-3">
              <CheckCircle className="text-green-500 w-5 h-5" />
              <span className="text-green-700">{success}</span>
            </CardContent>
          </Card>
        )}

        {/* Auto Fetch */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Automatikus lekérés</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              Adatok lekérése a Kyero API-ból proxy szerveren keresztül
            </p>
            <Button onClick={handleAutoFetch} disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {loading ? "Betöltés..." : "Adatok lekérése"}
            </Button>
          </CardContent>
        </Card>

        {/* Manual XML */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Manuális XML feldolgozás</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-slate-600 text-sm">
                1. Nyisd meg az API URL-t egy új lapon
              </p>
              <div className="flex items-center gap-2">
                <code className="bg-slate-100 px-3 py-2 rounded text-sm flex-1 font-mono">
                  https://procesos.apinmo.com/portal/kyeroagencias3/8875-kyero-jrYwggM0-Colaborador.xml
                </code>
                <Button variant="outline" size="sm" onClick={copyApiUrl}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-slate-600 text-sm">
                2. Másold ki a teljes XML tartalmat és illeszd be ide
              </p>
            </div>

            <textarea
              value={manualXml}
              onChange={(e) => setManualXml(e.target.value)}
              placeholder="XML tartalom..."
              className="w-full h-32 p-3 border border-slate-300 rounded-md resize-y font-mono text-sm"
            />

            <Button
              onClick={handleManualProcess}
              disabled={loading || !manualXml.trim()}
              variant="secondary"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              XML feldolgozása
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {properties.length > 0 && (
          <>
            {/* Statistics */}
            {statistics && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Statisztikák</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-2xl font-bold text-slate-900">
                        {statistics.total}
                      </div>
                      <div className="text-sm text-slate-600">ingatlan</div>
                    </div>

                    <div>
                      <div className="text-2xl font-bold text-slate-900">
                        {statistics.totalImages}
                      </div>
                      <div className="text-sm text-slate-600">összes kép</div>
                    </div>

                    {statistics.priceStats && (
                      <>
                        <div>
                          <div className="text-2xl font-bold text-slate-900">
                            {statistics.priceStats.min.toLocaleString("hu-HU")}
                          </div>
                          <div className="text-sm text-slate-600">min. ár EUR</div>
                        </div>

                        <div>
                          <div className="text-2xl font-bold text-slate-900">
                            {statistics.priceStats.avg.toLocaleString("hu-HU")}
                          </div>
                          <div className="text-sm text-slate-600">átlag ár EUR</div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Export */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Exportálás</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button onClick={exportToJSON}>
                    <Download className="w-4 h-4 mr-2" />
                    JSON
                  </Button>
                  <Button onClick={exportToCSV} variant="secondary">
                    <Download className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">
                  Előnézet ({Math.min(5, properties.length)} ingatlan)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {properties.slice(0, 5).map((property) => (
                    <div
                      key={property.id}
                      className="border border-slate-200 rounded-md p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-slate-900">
                            {property.type}
                          </h3>
                          <p className="text-sm text-slate-600">
                            ID: {property.id}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-slate-900">
                            {property.formatted_price}
                          </div>
                        </div>
                      </div>

                      <div className="text-sm text-slate-600 space-y-1">
                        <div>
                          {property.town}, {property.province}
                        </div>
                        {property.beds && property.baths && (
                          <div>
                            {property.beds} szoba, {property.baths} fürdő
                          </div>
                        )}
                        {property.surface_area && (
                          <div>{property.surface_area} m²</div>
                        )}
                      </div>

                      {property.images && property.images.length > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <Badge variant="secondary">
                            {property.images.length} kép
                          </Badge>
                          <img
                            src={property.images[0].url}
                            alt="Előnézet"
                            className="w-16 h-12 object-cover rounded border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {properties.length > 5 && (
                  <p className="mt-4 text-sm text-slate-600 text-center">
                    És még {properties.length - 5} ingatlan...
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default KyeroExtractorApp;