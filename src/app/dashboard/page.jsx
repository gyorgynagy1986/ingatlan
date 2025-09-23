"use client";

import React, { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  MapPin,
  Calendar,
  Home,
  Image as ImageIcon,
  RefreshCw,
  Phone,
  Mail,
  Globe,
  Star,
  Ruler,
  Bed,
  Bath,
  Waves,
  Zap,
  Hash,
  Clock,
  Flag,
  Key,
  Building,
  Crown,
  Share,
  Sparkles,
} from "lucide-react";

// shadcn/ui
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

// PropertySearch komponens import
import PropertySearch from "../../components/search/PropertySearch";

// Kis util a className összefűzéshez
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// SWR fetcher függvény
const fetcher = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Hiba történt az adatok lekérésekor');
  }
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Ismeretlen hiba történt');
  }
  return data;
};

// URL generáló függvény a keresési paraméterekhez
const buildUrl = (page, searchId, filters) => {
  const params = new URLSearchParams();
  params.append("page", page.toString());
  
  // ID alapú keresés
  if (searchId?.trim()) {
    params.append("id", searchId.trim());
  }
  
  // Szűrők hozzáadása
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value && value.toString().trim()) {
      // Backend kompatibilis kulcs nevek
      let apiKey = key;
      if (key === 'partOwnership') apiKey = 'part_ownership';
      if (key === 'newBuild') apiKey = 'new_build';
      if (key === 'energyRating') apiKey = 'energy_rating';
      if (key === 'minSurface') apiKey = 'min_surface_area';
      if (key === 'maxSurface') apiKey = 'max_surface_area';
      
      params.append(apiKey, value.toString().trim());
    }
  });

  return `/api/admin/properties?${params}`;
};

const AdminPropertiesPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchId, setSearchId] = useState("");
  const [filters, setFilters] = useState({});

  // SWR hook
  const { data, error, isLoading, mutate } = useSWR(
    buildUrl(currentPage, searchId, filters),
    fetcher,
    {
      // SWR opciók
      revalidateOnFocus: false, // Ne töltse újra fókuszváltáskor
      revalidateOnReconnect: false, // Ne töltse újra újracsatlakozáskor
      keepPreviousData: true, // Tartsa meg az előző adatokat új lekérés közben
    }
  );

  const properties = data?.data || [];
  const pagination = data?.pagination || null;

  // Keresés kezelése (PropertySearch komponensből)
  const handleSearch = (newSearchId, newFilters) => {
    setSearchId(newSearchId);
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // Oldal váltás
  const handlePageChange = (newPage) => {
    if (!pagination) return;
    const safe = Math.max(1, Math.min(newPage, pagination.totalPages));
    setCurrentPage(safe);
  };

  // Kézi frissítés
  const handleRefresh = () => {
    mutate();
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Fejléc frissítés gombbal */}
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Ingatlanok kezelése</h1>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Frissítés
            </Button>
          </div>

          {/* PropertySearch komponens */}
          <div className="mb-6">
            <PropertySearch 
              onSearch={handleSearch}
              loading={isLoading}
              resultCount={pagination?.totalCount}
            />
          </div>

          {/* Hiba üzenet */}
          {error && (
            <Card className="mb-6 border-red-200 bg-red-50/60 text-red-800">
              <CardContent className="py-4 flex items-center justify-between">
                <span>{error.message || "Hiba az adatok betöltésénél"}</span>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  className="text-red-700 hover:text-red-800"
                >
                  Újrapróbálás
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Paginálási info */}
          {pagination && (
            <div className="mb-6 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {pagination.totalCount} ingatlan találat
              </span>
              <span>{currentPage}. oldal / {pagination.totalPages}</span>
            </div>
          )}

          {/* Ingatlan lista */}
          <div className="space-y-4">
            {isLoading && !data ? (
              // Skeleton állapot csak az első betöltésnél
              Array.from({ length: 3 }).map((_, idx) => (
                <Card key={idx} className="overflow-hidden shadow-sm">
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="h-6 w-48 rounded bg-muted" />
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Array.from({ length: 4 }).map((__, i) => (
                          <div key={i} className="h-4 rounded bg-muted" />
                        ))}
                      </div>
                      <div className="h-24 rounded bg-muted" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : properties.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Home className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-lg font-medium">Nincs találat</p>
                  <p className="text-muted-foreground">Próbálj meg más keresési feltételeket.</p>
                </CardContent>
              </Card>
            ) : (
              properties.map((property) => (
                <Card 
                  key={property._id} 
                  className={cn(
                    "overflow-hidden shadow-sm border border-slate-200/70 transition-opacity",
                    isLoading && "opacity-60"
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-xl flex items-center gap-2">
                          {property.type} – {property.town}
                          {property.new_build ? <Badge variant="secondary" className="text-xs"><Sparkles className="h-3 w-3 mr-1" />Új</Badge> : null}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span className="font-mono">ID: {property.id}</span>
                          {property.ref && <span className="font-mono">REF: {property.ref}</span>}
                          {property._index && <span className="font-mono">#{property._index}</span>}
                        </div>
                        {property.title_extra && (
                          <p className="text-sm text-slate-600 mt-1">{property.title_extra}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-600">
                          {property.formatted_price || `${property.price} ${property.currency || 'EUR'}`}
                        </p>
                        {property.price_freq && (
                          <p className="text-xs text-muted-foreground">{property.price_freq}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-4">
                    {/* Lokáció információk */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                      {property.country && (
                        <div className="flex items-center gap-2">
                          <Flag className="h-4 w-4 text-muted-foreground" />
                          <span>{property.country}</span>
                        </div>
                      )}
                      {property.province && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{property.province}</span>
                        </div>
                      )}
                      {property.town && (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span>{property.town}</span>
                        </div>
                      )}
                      {property.location_detail && (
                        <div className="flex items-center gap-2 col-span-full">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{property.location_detail}</span>
                        </div>
                      )}
                      {(property.cp || property.postal_code) && (
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <span>{property.cp || property.postal_code}</span>
                        </div>
                      )}
                      {(property.latitude && property.longitude) && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{property.latitude}, {property.longitude}</span>
                        </div>
                      )}
                    </div>

                    {/* Ingatlan alapadatok */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
                      {property.beds && (
                        <div className="flex items-center gap-2">
                          <Bed className="h-4 w-4 text-muted-foreground" />
                          <span>{property.beds} szoba</span>
                        </div>
                      )}
                      {property.baths && (
                        <div className="flex items-center gap-2">
                          <Bath className="h-4 w-4 text-muted-foreground" />
                          <span>{property.baths} fürdő</span>
                        </div>
                      )}
                      {property.surface_area && (
                        <div className="flex items-center gap-2">
                          <Ruler className="h-4 w-4 text-muted-foreground" />
                          <span>{property.surface_area} m²</span>
                        </div>
                      )}
                      {property.pool ? (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Waves className="h-4 w-4" />
                          <span>Medence</span>
                        </div>
                      ) : null}
                      {property.energy_rating && (
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-muted-foreground" />
                          <span>Energia: {property.energy_rating}</span>
                        </div>
                      )}
                      {property.antiguedad && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{property.antiguedad} év</span>
                        </div>
                      )}
                    </div>

                    {/* Státusz információk */}
                    <div className="flex flex-wrap gap-2">
                      {property.new_build ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                          <Sparkles className="h-3 w-3 mr-1" />Új építésű
                        </Badge>
                      ) : null}
                      {property.part_ownership ? (
                        <Badge variant="outline" className="border-orange-200 text-orange-700">
                          <Share className="h-3 w-3 mr-1" />Résztulajdon
                        </Badge>
                      ) : null}
                      {property.leasehold ? (
                        <Badge variant="outline" className="border-purple-200 text-purple-700">
                          <Key className="h-3 w-3 mr-1" />Haszonbérlet
                        </Badge>
                      ) : null}
                      {property.estado_propiedad && (
                        <Badge variant="secondary">
                          <Star className="h-3 w-3 mr-1" />Állapot: {property.estado_propiedad}/5
                        </Badge>
                      )}
                    </div>

                    {/* Dátum információk */}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {property.date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Létrehozva: {property.formatted_date || property.date}</span>
                        </div>
                      )}
                      {property.images?.length > 0 && (
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          <span>{property.images.length} kép</span>
                        </div>
                      )}
                    </div>

                    {/* Jellemzők */}
                    {property.features && property.features.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Jellemzők</p>
                        <div className="flex flex-wrap gap-2">
                          {property.features.slice(0, 8).map((feature, idx) => (
                            <Badge key={idx} variant="outline" className="rounded-full text-xs">
                              {feature.name}
                            </Badge>
                          ))}
                          {property.features.length > 8 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="cursor-help rounded-full text-xs">
                                  +{property.features.length - 8} további
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <div className="text-xs space-y-1">
                                  {property.features.slice(8, 20).map((f, i) => (
                                    <div key={i}>• {f.name}</div>
                                  ))}
                                  {property.features.length > 20 && <div>…</div>}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Leírás */}
                    {property.description && (
                      <div>
                        <p className="text-sm font-medium mb-2">Leírás</p>
                        <p className="prose prose-sm max-w-none dark:prose-invert line-clamp-3 text-slate-700 dark:text-slate-200">
                          {property.description}
                        </p>
                      </div>
                    )}

                    {/* Kapcsolat */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      {property.agencia && (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span>{property.agencia}</span>
                        </div>
                      )}
                      {property.telefono && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{property.telefono}</span>
                        </div>
                      )}
                      {property.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{property.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Képek előnézet: vízszintes görgető */}
                    {property.images && property.images.length > 0 && (
                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">Képek ({property.images.length})</p>
                        </div>
                        <ScrollArea className="w-full whitespace-nowrap">
                          <div className="flex gap-2 pb-2">
                            {property.images.slice(0, 20).map((image, idx) => (
                              <button
                                key={idx}
                                onClick={() => window.open(image.url, "_blank")}
                                className="relative group h-24 w-40 shrink-0 overflow-hidden rounded-lg border hover:shadow-sm"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={image.url}
                                  alt={`Property ${property.id} - ${idx + 1}`}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src =
                                      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTYwJyBoZWlnaHQ9Jzk2JyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPjxyZWN0IHdpZHRoPScxNjAnIGhlaWdodD0nOTYnIGZpbGw9JyNFQkVCRUInLz48cGF0aCBkPSdNNTUgNjBsMjAtMjAgMjUgMzVIMjAnIGZpbGw9JyNDRERFRUYnLz48L3N2Zz4=";
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                {image.cover && (
                                  <div className="absolute top-1 left-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                                    <Crown className="h-2.5 w-2.5 inline mr-0.5" />Borító
                                  </div>
                                )}
                                {image.floorplan && (
                                  <div className="absolute top-1 right-1 bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                                    Alaprajz
                                  </div>
                                )}
                                {image.title && (
                                  <div className="absolute bottom-1 left-1 right-1 bg-black/70 text-white text-[10px] px-1 py-0.5 rounded truncate">
                                    {image.title}
                                  </div>
                                )}
                              </button>
                            ))}
                            {property.images.length > 20 && (
                              <div className="flex h-24 w-24 items-center justify-center rounded-lg border text-xs text-muted-foreground">
                                +{property.images.length - 20}
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {property.location && (
                        <span className="truncate max-w-48">📍 {property.location}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button asChild size="sm">
                        <Link href={`/dashboard/${property.id}`}><Eye className="h-4 w-4 mr-1" /> Megtekint</Link>
                      </Button>
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/dashboard/edit/${property.id}`}>Szerkeszt</Link>
                      </Button>
                      {property.url && (
                        <Button asChild size="sm" variant="outline">
                          <a href={property.url} target="_blank" rel="noopener noreferrer">
                            <Globe className="h-4 w-4 mr-1" />Eredeti
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>

          {/* Paginálás */}
          {pagination && pagination.totalPages > 1 && (
            <Card className="mt-6">
              <CardContent className="py-4">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.hasPrevPage || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Előző
                  </Button>

                  {/* Kompakt, adaptív oldalszámok */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      const active = pageNum === currentPage;
                      return (
                        <Button
                          key={pageNum}
                          variant={active ? "default" : "outline"}
                          onClick={() => handlePageChange(pageNum)}
                          disabled={isLoading}
                          className={cn("min-w-9", active && "shadow")}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.hasNextPage || isLoading}
                  >
                    Következő <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="text-center mt-3 text-sm text-muted-foreground">
                  Összesen {pagination.totalCount} ingatlan
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default AdminPropertiesPage;