"use client";

import React, { useState, useCallback, useTransition, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Bed,
  Bath,
  Square,
  ExternalLink,
  Search,
} from "lucide-react";
import Image from "next/image";
import {
  searchProperties,
  PropertySearchParams,
  PropertySearchResult,
  Property,
} from "../lib/action/getPublicData";

// Generate slug function
const generateSlug = (property: Property) => {
  const cleanText = (text: string) =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

  const typeSlug = cleanText(property.type);
  const townSlug = cleanText(property.town);
  const locationSlug = property.location_detail
    ? cleanText(property.location_detail)
    : "";

  const slugParts = [typeSlug, townSlug];
  if (locationSlug) slugParts.push(locationSlug);
  slugParts.push(property.id);

  return slugParts.join("-").replace(/--+/g, "-");
};

// ======================================
// Next/Image optimalizált preload helper
// ======================================
// Ha nem állítottál egyedit, ez a default deviceSizes
const DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
// fix target css width for cards (px) – egyezzen a <Image sizes>-szel
const CARD_CSS_WIDTH = 400;

const pickWidth = (targetCssPx: number) => {
  const dpr = Math.max(1, Math.min(3, Math.round(window.devicePixelRatio || 1)));
  const wanted = Math.ceil(targetCssPx * dpr);
  return DEVICE_SIZES.find((w) => w >= wanted) || DEVICE_SIZES[DEVICE_SIZES.length - 1];
};

const buildNextOptimizedUrl = (src: string, width: number, quality = 75) =>
  `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;

// ===============
// Preload helpers
// ===============
const useUrlPreloadCaches = () => {
  const preloadedUrls = useRef<Set<string>>(new Set());
  const failedUrls = useRef<Set<string>>(new Set());
  const loadingUrls = useRef<Set<string>>(new Set());
  return { preloadedUrls, failedUrls, loadingUrls } as const;
};

const usePreloadUrl = (label: string) => {
  const { preloadedUrls, failedUrls, loadingUrls } = useUrlPreloadCaches();

  const preloadUrl = useCallback(
    (url?: string | null, onOk?: () => void, onErr?: () => void) => {
      if (!url) return;
      if (preloadedUrls.current.has(url)) {
        console.log(`${label} ✅ Cache-hit (ugyanaz az URL):`, url);
        onOk?.();
        return;
      }
      if (failedUrls.current.has(url)) {
        console.warn(`${label} ⛔ Korábbi hiba, nem próbáljuk újra:`, url);
        onErr?.();
        return;
      }
      if (loadingUrls.current.has(url)) {
        console.log(`${label} ⏳ Már töltés alatt:`, url);
        return;
      }

      loadingUrls.current.add(url);
      console.log(`${label} ▶️ Előtöltés indul:`, url);

      const img = new window.Image();
      img.decoding = "async";

      img.onload = () => {
        preloadedUrls.current.add(url);
        loadingUrls.current.delete(url);
        console.log(`${label} ✅ Betöltve:`, url);
        onOk?.();
      };
      img.onerror = (e) => {
        failedUrls.current.add(url);
        loadingUrls.current.delete(url);
        console.error(`${label} ❌ Hiba:`, url, e);
        onErr?.();
      };

      img.src = url;
    },
    [preloadedUrls, failedUrls, loadingUrls, label]
  );

  return { preloadUrl, preloadedUrls, failedUrls, loadingUrls } as const;
};

// ==========================
// Image Preloader Hook (Card)
// ==========================
const useImagePreloader = (
  images: { id: string; url: string }[],
  propertyId: string
) => {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [isHovered, setIsHovered] = useState(false);
  const { preloadUrl, preloadedUrls, failedUrls, loadingUrls } = usePreloadUrl(`[${propertyId}]`);

  const buildUrlForIndex = useCallback((idx: number) => {
    const raw = images[idx]?.url;
    if (!raw) return undefined;
    const w = pickWidth(CARD_CSS_WIDTH);
    return buildNextOptimizedUrl(raw, w);
  }, [images]);

  useEffect(() => {
    console.log(`[${propertyId}] Mount, képek száma:`, images.length);
  }, [propertyId, images.length]);

  // Első kép – Next-optis URL-re preload, hogy lapozásnál cache-hit legyen
  useEffect(() => {
    if (images.length > 0) {
      const url = buildUrlForIndex(0);
      if (url) {
        console.log(`[${propertyId}] ▶️ FIRST preload`, url);
        preloadUrl(url, () => setLoadedImages(new Set([0])));
      }
    }
  }, [images, preloadUrl, propertyId, buildUrlForIndex]);

  // Hover – a következő 3-4 képet ugyanazon Next-optis URL-lel töltjük
  const preloadOnHover = useCallback(() => {
    if (isHovered || images.length <= 1) {
      console.log(`[${propertyId}] Hover ignorálva (isHovered: ${isHovered}, images: ${images.length})`);
      return;
    }
    setIsHovered(true);
    const toPreloadIdx = [1, 2, 3, 4].filter((i) => i < images.length);
    const urls = toPreloadIdx
      .map((i) => buildUrlForIndex(i))
      .filter(Boolean) as string[];
    console.log(`[${propertyId}] 🎯 Hover → NEXT-preload:`, urls);
    urls.forEach((url, k) =>
      preloadUrl(url, () => setLoadedImages((prev) => new Set(prev).add(toPreloadIdx[k])))
    );
  }, [isHovered, images, preloadUrl, propertyId, buildUrlForIndex]);

  // Ígéret: adott index legyen kész
  const ensureLoaded = useCallback(
    (index: number) =>
      new Promise<void>((resolve) => {
        if (loadedImages.has(index)) return resolve();
        const url = buildUrlForIndex(index);
        if (!url) return resolve();
        preloadUrl(
          url,
          () => {
            setLoadedImages((prev) => {
              const s = new Set(prev);
              s.add(index);
              return s;
            });
            resolve();
          },
          () => resolve()
        );
      }),
    [buildUrlForIndex, loadedImages, preloadUrl]
  );

  // Navigáció – a következő kettőt NEXT-optis URL-lel
  const preloadAdjacentImages = useCallback(
    (currentIndex: number) => {
      if (!images.length) return;
      const nextIdx = (currentIndex + 1) % images.length;
      const next2Idx = (currentIndex + 2) % images.length;
      const list = [nextIdx, next2Idx];
      console.log(`[${propertyId}] Navigáció → előtöltendő indexek:`, list);
      list.forEach((i) => {
        void ensureLoaded(i);
      });
    },
    [images, propertyId, ensureLoaded]
  );

  useEffect(() => {
    console.log(
      `[${propertyId}] Állapot | loaded:`, Array.from(loadedImages).sort(),
      ` preloaded:`, preloadedUrls.current.size,
      ` loading:`, loadingUrls.current.size,
      ` failed:`, failedUrls.current.size
    );
  }, [loadedImages, failedUrls, loadingUrls, preloadedUrls, propertyId]);

  return {
    loadedImages,
    preloadOnHover,
    preloadAdjacentImages,
    ensureLoaded,
    isHovered,
    failedUrls,
  } as const;
};

// =============================
// Optimized Property Card (1 <Image>)
// =============================
const PropertyCard: React.FC<{ property: Property; onClick: () => void }> = ({ property, onClick }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set());
  const [loadedIndex, setLoadedIndex] = useState<Set<number>>(new Set([0])); // fade-inhez
  const switchTokenRef = useRef(0); // versenyhelyzet ellen

  const images = property.images || [];
  const { loadedImages, preloadOnHover, preloadAdjacentImages, ensureLoaded } =
    useImagePreloader(images, property.id);

  const goToIndex = useCallback(
    async (index: number) => {
      if (images.length === 0) return;
      if (index === currentImageIndex) return;

      const myToken = ++switchTokenRef.current;
      setPendingIndex(index);
      setIsSwitching(true);

      try {
        if (!loadedImages.has(index)) {
          console.log(`[${property.id}] ⏳ Váltás előtt preload index=${index}`);
          await ensureLoaded(index);
        }
        if (myToken === switchTokenRef.current) {
          setCurrentImageIndex(index);
          setPendingIndex(null);
          // isSwitching-et NEM itt kapcsoljuk ki — majd onLoadingComplete intézi,
          // amikor a tényleges <img> betöltött.
          preloadAdjacentImages(index);
        }
      } catch (e) {
        console.error("goToIndex error:", e);
      }
    },
    [currentImageIndex, ensureLoaded, images.length, loadedImages, preloadAdjacentImages, property.id]
  );

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length === 0) return;
    const nextIndex = (currentImageIndex + 1) % images.length;
    void goToIndex(nextIndex);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length === 0) return;
    const prevIndex = (currentImageIndex - 1 + images.length) % images.length;
    void goToIndex(prevIndex);
  };

  // public/placeholder.svg
  const placeholderImage = "/placeholder.svg";

  const current = images[currentImageIndex];
  const currentUrl = current?.url || "";
  const showPlaceholder = !currentUrl || brokenUrls.has(currentUrl);

  const isCurrentLoaded = loadedIndex.has(currentImageIndex);

  return (
    <div
      className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
      onClick={onClick}
      onMouseEnter={preloadOnHover}
    >
      <div className="relative h-64 overflow-hidden bg-gray-100">
        <Image
          key={`img-${property.id}-${currentImageIndex}-${showPlaceholder ? "ph" : "ok"}`}
          src={showPlaceholder ? placeholderImage : currentUrl}
          alt={`${property.type} in ${property.town}`}
          fill
          sizes="400px"
          className={[
            "object-cover transition-transform duration-300 transition-opacity",
            isSwitching ? "scale-105" : "group-hover:scale-105",
            isCurrentLoaded ? "opacity-100" : "opacity-0"
          ].join(" ")}
          priority={currentImageIndex === 0}
          loading={currentImageIndex === 0 ? "eager" : "lazy"}
          placeholder="blur"
          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAIElEQVQYV2NkYGD4z8DAwMgABYwMjIwMDAx+HwQAkgcGSWv8x4AAAAASUVORK5CYII="
          onError={() => {
            if (currentUrl) {
              setBrokenUrls((prev) => {
                const s = new Set(prev);
                s.add(currentUrl);
                return s;
              });
              console.error(`[${property.id}] next/image onError → placeholder:`, currentUrl);
            }
            // ha hiba van, ne ragadjon a váltási állapot
            setIsSwitching(false);
            setLoadedIndex((prev) => {
              const s = new Set(prev);
              s.add(currentImageIndex);
              return s;
            });
          }}
          onLoadingComplete={() => {
            // A ténylegesen renderelt példány készült el:
            setLoadedIndex((prev) => {
              const s = new Set(prev);
              s.add(currentImageIndex);
              return s;
            });
            // csak a legfrissebb váltásnál szüntessük meg az "átmenet" állapotot
            setIsSwitching(false);
          }}
        />

        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-opacity z-20"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-opacity z-20"
              aria-label="Next image"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        <div className="absolute top-3 left-3 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium z-20">
          {property.type}
        </div>
        {property.new_build === 1 && (
          <div className="absolute top-3 right-3 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium z-20">
            Nueva construcción
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-2xl font-bold text-blue-600">
            {property.formatted_price || `${property.price?.toLocaleString()} ${property.currency}`}
          </div>
          <div className="text-sm text-gray-500">Ref: {property.ref}</div>
        </div>

        <div className="flex items-center text-gray-600 mb-3">
          <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="text-sm truncate">
            {property.location_detail && `${property.location_detail}, `}
            {property.town}, {property.province}
          </span>
        </div>

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

        {property.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {property.description
              .replace(/[🌊🏖️📍🛏️🛠️💰🏡🚶‍♂️✨~]/g, "")
              .replace(/~/g, " ")
              .substring(0, 120)}
            ...
          </p>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="text-sm text-gray-600">{property.agencia}</div>
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

// ========================
// Global Image Preloader – opcionális: itt is NEXT-optis URL
// ========================
const useGlobalImagePreloader = (properties: Property[]) => {
  const { preloadUrl } = usePreloadUrl(`[Global]`);

  useEffect(() => {
    if (!properties?.length) return;
    const firstImages = properties
      .slice(0, 24)
      .map((p, idx) => ({ idx, url: p.images?.[0]?.url }))
      .filter((x) => !!x.url) as { idx: number; url: string }[];

    console.log(`[Global] Első képek előtöltése | darab:`, firstImages.length);

    const chunkSize = 6;
    const chunks: { idx: number; url: string }[][] = [];
    for (let i = 0; i < firstImages.length; i += chunkSize) {
      chunks.push(firstImages.slice(i, i + chunkSize));
    }

    (async () => {
      for (const chunk of chunks) {
        await Promise.all(
          chunk.map(({ url, idx }) =>
            new Promise<void>((resolve) => {
              const w = pickWidth(CARD_CSS_WIDTH);
              const nextUrl = buildNextOptimizedUrl(url, w);
              preloadUrl(
                nextUrl,
                () => {
                  console.log(`[Global] ✅ Property ${idx} első kép kész (w=${w}):`, nextUrl);
                  resolve();
                },
                () => {
                  console.warn(`[Global] ❌ Property ${idx} első kép hiba:`, nextUrl);
                  resolve();
                }
              );
            })
          )
        );
      }
      console.log(`[Global] Előtöltés vége.`);
    })();
  }, [properties, preloadUrl]);
};

// ========================
// Main Component
// ========================
const ServerSidePropertyLanding: React.FC<{ initialResult: PropertySearchResult }> = ({ initialResult }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchResult, setSearchResult] = useState<PropertySearchResult>(initialResult);
  const [filters, setFilters] = useState<PropertySearchParams>({
    page: parseInt(searchParams.get("page") || "1"),
    limit: 12,
    type: searchParams.get("type") || undefined,
    town: searchParams.get("town") || undefined,
    minPrice: searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!) : undefined,
    maxPrice: searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : undefined,
    minBeds: searchParams.get("minBeds") ? parseInt(searchParams.get("minBeds")!) : undefined,
    pool: searchParams.get("pool") ? searchParams.get("pool") === "true" : null,
  });

  const performSearch = useCallback(
    async (newFilters: PropertySearchParams) => {
      console.log("🔍 Server search →", newFilters);

      startTransition(async () => {
        try {
          const result = await searchProperties(newFilters);
          setSearchResult(result);

          const params = new URLSearchParams();
          Object.entries(newFilters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              params.set(key, String(value));
            }
          });
          const newUrl = `${window.location.pathname}?${params.toString()}`;
          window.history.replaceState({}, "", newUrl);

          window.scrollTo({ top: 0, behavior: "smooth" });

          // opcionális: első képek megpiszkálása (NEXT-optis URL)
          result.properties.slice(0, 12).forEach((p) => {
            const raw = p.images?.[0]?.url;
            if (raw) {
              const w = pickWidth(CARD_CSS_WIDTH);
              const u = buildNextOptimizedUrl(raw, w);
              const img = new window.Image();
              img.decoding = "async";
              img.src = u;
            }
          });
        } catch (error) {
          console.error("Search error:", error);
        }
      });
    },
    []
  );

  const handleFiltersChange = useCallback(
    (newFilters: PropertySearchParams) => {
      console.log("🔄 Filters changed:", newFilters);
      setFilters(newFilters);
      performSearch(newFilters);
    },
    [performSearch]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      const newFilters = { ...filters, page };
      handleFiltersChange(newFilters);
    },
    [filters, handleFiltersChange]
  );

  const handlePropertyClick = (property: Property) => {
    const slug = generateSlug(property);
    router.push(`/properties/${slug}`);
  };

  const { properties, pagination } = searchResult;
  const { availableTypes, availableTowns } = searchResult.filters;

  useGlobalImagePreloader(properties);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-800">Propiedades en España</h1>
          <p className="text-gray-600 mt-2">Encuentra tu propiedad ideal - {pagination.totalItems} propiedades disponibles</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <SearchFilters
          filters={filters}
          availableTypes={availableTypes}
          availableTowns={availableTowns}
          onFiltersChange={handleFiltersChange}
          isLoading={isPending}
        />

        {isPending && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-600">Buscando propiedades...</span>
          </div>
        )}

        {!isPending && (
          <div className="mb-6 flex justify-between items-center">
            <p className="text-gray-600">
              Mostrando {(pagination.currentPage - 1) * pagination.limit + 1}-
              {Math.min(pagination.currentPage * pagination.limit, pagination.totalItems)} de {pagination.totalItems} propiedades
            </p>
            <div className="text-sm text-gray-500">Página {pagination.currentPage} de {pagination.totalPages}</div>
          </div>
        )}

        {properties.length > 0 ? (
          <>
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${isPending ? "opacity-50" : ""}`}>
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} onClick={() => handlePropertyClick(property)} />
              ))}
            </div>

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
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No se encontraron propiedades</h3>
            <p className="text-gray-500 mb-4">Intenta ajustar los filtros para ver más resultados</p>
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

// ========================
// Filters & Pagination (változatlan)
// ========================
const SearchFilters: React.FC<{
  filters: PropertySearchParams;
  availableTypes: string[];
  availableTowns: string[];
  onFiltersChange: (filters: PropertySearchParams) => void;
  isLoading: boolean;
}> = ({ filters, availableTypes, availableTowns, onFiltersChange, isLoading }) => {
  const handleFilterChange = (
    key: keyof PropertySearchParams,
    value: string | number | boolean | null | undefined
  ) => {
    const newFilters: PropertySearchParams = { ...filters, page: 1 };

    if (key === "type" || key === "town") newFilters[key] = value as string | undefined;
    else if (key === "minPrice" || key === "maxPrice" || key === "minBeds" || key === "page" || key === "limit") newFilters[key] = value as number | undefined;
    else if (key === "pool") newFilters[key] = value as boolean | null;
    else if (key === "sortBy") newFilters[key] = value as "price" | "date" | "beds" | undefined;
    else if (key === "sortOrder") newFilters[key] = value as "asc" | "desc" | undefined;

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
        <button onClick={clearFilters} className="text-blue-600 hover:text-blue-700 text-sm" disabled={isLoading}>
          Limpiar filtros
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <select
          value={filters.type || ""}
          onChange={(e) => handleFilterChange("type", e.target.value || undefined)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          disabled={isLoading}
        >
          <option value="">Todos los tipos</option>
          {availableTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <select
          value={filters.town || ""}
          onChange={(e) => handleFilterChange("town", e.target.value || undefined)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          disabled={isLoading}
        >
          <option value="">Todas las ciudades</option>
          {availableTowns.map((town) => (
            <option key={town} value={town}>{town}</option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Precio mín."
          value={filters.minPrice || ""}
          onChange={(e) => handleFilterChange("minPrice", e.target.value ? parseInt(e.target.value) : undefined)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          disabled={isLoading}
        />

        <input
          type="number"
          placeholder="Precio máx."
          value={filters.maxPrice || ""}
          onChange={(e) => handleFilterChange("maxPrice", e.target.value ? parseInt(e.target.value) : undefined)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          disabled={isLoading}
        />

        <select
          value={filters.minBeds || ""}
          onChange={(e) => handleFilterChange("minBeds", e.target.value ? parseInt(e.target.value) : undefined)}
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
          value={filters.pool === null || filters.pool === undefined ? "" : filters.pool ? "yes" : "no"}
          onChange={(e) => {
            const value = e.target.value;
            handleFilterChange("pool", value === "" ? null : value === "yes");
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

const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}> = ({ currentPage, totalPages, onPageChange, isLoading }) => {
  const getPageNumbers = () => {
    const pages = [] as number[];
    const maxVisible = 5;

    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

    for (let i = start; i <= end; i++) pages.push(i);

    return pages;
  };

  return (
    <div className="flex items-center justify-center space-x-2 mt-8">
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1 || isLoading} className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
        <ChevronLeft className="w-5 h-5" />
      </button>

      {getPageNumbers().map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg ${page === currentPage ? "bg-blue-600 text-white" : "border hover:bg-gray-50 disabled:opacity-50"}`}
        >
          {page}
        </button>
      ))}

      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages || isLoading} className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ServerSidePropertyLanding;
