"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  Search,
  X,
  Building2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Filter,
  RotateCcw,
} from "lucide-react";

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface SearchFilters {
  type: string;
  town: string;
  province: string;
  country: string;
  minPrice: string;
  maxPrice: string;
  minBeds: string;
  maxBeds: string;
  minBaths: string;
  maxBaths: string;
  minSurface: string;
  maxSurface: string;
  pool: string;
  newBuild: string;
  partOwnership: string;
  leasehold: string;
  energyRating: string;
  agencia: string;
}

interface PropertySearchProps {
  onSearch: (searchId: string, filters: SearchFilters) => void;
  loading?: boolean;
  resultCount?: number;
}

// API-ból érkező opciók
interface SearchOptions {
  types: string[];
  towns: string[];
  provinces: string[];
  countries: string[];
  agencies?: string[];
}

const defaultFilters: SearchFilters = {
  type: "",
  town: "",
  province: "",
  country: "",
  minPrice: "",
  maxPrice: "",
  minBeds: "",
  maxBeds: "",
  minBaths: "",
  maxBaths: "",
  minSurface: "",
  maxSurface: "",
  pool: "",
  newBuild: "",
  partOwnership: "",
  leasehold: "",
  energyRating: "",
  agencia: "",
};

// Konstansok kiemelése a komponensen kívülre
const ANY = "__any";
const ENERGY_RATINGS = ["A", "B", "C", "D", "E", "F", "G"] as const;

// Gyors szűrő konfigurációk
const QUICK_FILTERS = [
  { label: "Villák", filters: { type: "Villa" } },
  { label: "Lakások", filters: { type: "Lakás" } },
  { label: "Medencés", filters: { pool: "1" } },
  { label: "Új építésű", filters: { newBuild: "1" } },
  { label: "Luxus (500k+ EUR)", filters: { minPrice: "500000" } },
  { label: "Prémium (1M+ EUR)", filters: { minPrice: "1000000" } },
  { label: "Nagy családi (4+ szoba)", filters: { minBeds: "4" } },
] as const;

// Helper függvények
const mapIn = (v: string) => (v === ANY ? "" : v);
const mapOut = (v: string) => (v === "" ? ANY : v);
const uniq = (arr: string[] = []) =>
  Array.from(new Set(arr))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

/** --------- BELSŐ KOMPONENSEK (memo + displayName) --------- */

const BooleanSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  label: string;
  yesText: string;
  noText: string;
}> = React.memo(({ value, onChange, label, yesText, noText }) => (
  <div className="space-y-2">
    <label className="text-sm font-medium">{label}</label>
    <Select value={mapOut(value)} onValueChange={(v) => onChange(mapIn(v))}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Mindegy" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>Mindegy</SelectItem>
        <SelectItem value="1">{yesText}</SelectItem>
        <SelectItem value="0">{noText}</SelectItem>
      </SelectContent>
    </Select>
  </div>
));
BooleanSelect.displayName = "BooleanSelect";

const OptionsSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder: string;
  options?: string[];
  disabled?: boolean;
}> = React.memo(
  ({
    value,
    onChange,
    label,
    placeholder,
    options = [],
    disabled = false,
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Select
        value={mapOut(value)}
        onValueChange={(v) => onChange(mapIn(v))}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={disabled ? "Betöltés..." : placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Mindegy</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
);
OptionsSelect.displayName = "OptionsSelect";

/** -------------------- FŐ KOMPONENS -------------------- */

const PropertySearch: React.FC<PropertySearchProps> = ({
  onSearch,
  loading = false,
  resultCount,
}) => {
  const [searchId, setSearchId] = useState("");
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [options, setOptions] = useState<SearchOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Aktív szűrők száma (memo)
  const activeFiltersCount = useMemo(
    () =>
      Object.values(filters).filter((value) => value && value.toString().trim())
        .length,
    [filters]
  );

  // Opciók betöltése
  const loadOptions = useCallback(async () => {
    if (options || optionsLoading) return;
    setOptionsLoading(true);
    try {
      const response = await fetch("/api/admin/properties/options");
      const data = await response.json();
      if (data?.success) {
        const raw: SearchOptions = data.data;
        setOptions({
          types: uniq(raw?.types ?? []),
          towns: uniq(raw?.towns ?? []),
          provinces: uniq(raw?.provinces ?? []),
          countries: uniq(raw?.countries ?? []),
          agencies: uniq(raw?.agencies ?? []),
        });
      } else {
        console.error("Options API error:", data?.error);
      }
    } catch (error) {
      console.error("Opciók betöltési hiba:", error);
    } finally {
      setOptionsLoading(false);
    }
  }, [options, optionsLoading]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  // Részletes keresés toggle
  const handleAdvancedToggle = useCallback(() => {
    setShowAdvanced((prev) => {
      const next = !prev;
      if (next && !options && !optionsLoading) loadOptions();
      return next;
    });
  }, [options, optionsLoading, loadOptions]);

  // Szűrő frissítése
  const updateFilter = useCallback(
    (key: keyof SearchFilters, value: string) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  // Keresés indítása
  const handleSearch = useCallback(() => {
    onSearch(searchId, filters);
  }, [searchId, filters, onSearch]);

  // Teljes törlés
  const clearAll = useCallback(() => {
    setSearchId("");
    setFilters(defaultFilters);
    onSearch("", defaultFilters);
    inputRef.current?.focus();
  }, [onSearch]);

  // Csak szűrők törlése
  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
    onSearch(searchId, defaultFilters);
  }, [searchId, onSearch]);

  // Gyors szűrők alkalmazása
  const applyQuickFilter = useCallback(
    (filterUpdates: Partial<SearchFilters>) => {
      const newFilters = { ...filters, ...filterUpdates };
      setFilters(newFilters);
      onSearch(searchId, newFilters);
    },
    [filters, searchId, onSearch]
  );

  // Billentyűparancsok
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && document.activeElement === inputRef.current) {
        handleSearch();
      }
      if (e.key === "Escape") {
        clearAll();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSearch, clearAll]);

  return (
    <Card className="shadow-sm border border-slate-200/70">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Sparkles className="h-4 w-4 text-blue-600" />
            Keresés és szűrés
            {resultCount !== undefined && (
              <Badge variant="secondary" className="ml-2">
                {resultCount} találat
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Badge variant="outline" className="text-xs">
                <Filter className="h-3 w-3 mr-1" />
                {activeFiltersCount} szűrő
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAdvancedToggle}
              className="text-blue-600 hover:text-blue-700"
            >
              {showAdvanced ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Egyszerű
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Részletes
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* ID alapú keresés */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Keresés ID alapján (pl: 149574128875)"
              className="pl-9 pr-10"
            />
            {searchId && (
              <button
                onClick={() => setSearchId("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 hover:bg-muted"
                aria-label="ID törlése"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? "Keresés..." : "Keresés"}
            </Button>
            {(searchId || activeFiltersCount > 0) && (
              <Button variant="secondary" onClick={clearAll}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Törlés
              </Button>
            )}
          </div>
        </div>

        {/* Részletes szűrés */}
        {showAdvanced && (
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Részletes szűrők
              </h4>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Szűrők törlése
                </Button>
              )}
            </div>

            {/* Alapvető szűrők */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <OptionsSelect
                value={filters.type}
                onChange={(v) => updateFilter("type", v)}
                label="Típus"
                placeholder="Válassz típust"
                options={options?.types}
                disabled={optionsLoading || !options}
              />

              <OptionsSelect
                value={filters.town}
                onChange={(v) => updateFilter("town", v)}
                label="Város"
                placeholder="Válassz várost"
                options={options?.towns}
                disabled={optionsLoading || !options}
              />

              <OptionsSelect
                value={filters.province}
                onChange={(v) => updateFilter("province", v)}
                label="Megye/Tartomány"
                placeholder="Válassz megyét"
                options={options?.provinces}
                disabled={optionsLoading || !options}
              />

              <OptionsSelect
                value={filters.country}
                onChange={(v) => updateFilter("country", v)}
                label="Ország"
                placeholder="Válassz országot"
                options={options?.countries}
                disabled={optionsLoading || !options}
              />

              <OptionsSelect
                value={filters.agencia}
                onChange={(v) => updateFilter("agencia", v)}
                label="Ügynökség"
                placeholder="Válassz ügynökséget"
                options={options?.agencies}
                disabled={optionsLoading || !options}
              />

              <OptionsSelect
                value={filters.energyRating}
                onChange={(v) => updateFilter("energyRating", v)}
                label="Energetikai besorolás"
                placeholder="Mindegy"
                options={[...ENERGY_RATINGS]}
              />
            </div>

            {/* Ár tartomány */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Ár tartomány (EUR)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => updateFilter("minPrice", e.target.value)}
                  placeholder="Min. ár (pl: 100000)"
                />
                <Input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => updateFilter("maxPrice", e.target.value)}
                  placeholder="Max. ár (pl: 500000)"
                />
              </div>
            </div>

            {/* Szobák és fürdők */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Szobaszám</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    value={filters.minBeds}
                    onChange={(e) => updateFilter("minBeds", e.target.value)}
                    placeholder="Min."
                  />
                  <Input
                    type="number"
                    value={filters.maxBeds}
                    onChange={(e) => updateFilter("maxBeds", e.target.value)}
                    placeholder="Max."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Fürdőszobák</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    value={filters.minBaths}
                    onChange={(e) => updateFilter("minBaths", e.target.value)}
                    placeholder="Min."
                  />
                  <Input
                    type="number"
                    value={filters.maxBaths}
                    onChange={(e) => updateFilter("maxBaths", e.target.value)}
                    placeholder="Max."
                  />
                </div>
              </div>
            </div>

            {/* Alapterület */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Alapterület (m²)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="number"
                  value={filters.minSurface}
                  onChange={(e) => updateFilter("minSurface", e.target.value)}
                  placeholder="Min. terület (pl: 100)"
                />
                <Input
                  type="number"
                  value={filters.maxSurface}
                  onChange={(e) => updateFilter("maxSurface", e.target.value)}
                  placeholder="Max. terület (pl: 500)"
                />
              </div>
            </div>

            {/* Boolean szűrők */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <BooleanSelect
                value={filters.pool}
                onChange={(v) => updateFilter("pool", v)}
                label="Medence"
                yesText="Van medence"
                noText="Nincs medence"
              />

              <BooleanSelect
                value={filters.newBuild}
                onChange={(v) => updateFilter("newBuild", v)}
                label="Új építésű"
                yesText="Új építésű"
                noText="Nem új építésű"
              />

              <BooleanSelect
                value={filters.partOwnership}
                onChange={(v) => updateFilter("partOwnership", v)}
                label="Résztulajdon"
                yesText="Résztulajdon"
                noText="Teljes tulajdon"
              />

              <BooleanSelect
                value={filters.leasehold}
                onChange={(v) => updateFilter("leasehold", v)}
                label="Haszonbérlet"
                yesText="Haszonbérlet"
                noText="Nem haszonbérlet"
              />
            </div>

            {/* Gyors szűrő gombok */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Gyors szűrők:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_FILTERS.map(({ label, filters }) => (
                  <Button
                    key={label}
                    variant="outline"
                    size="sm"
                    onClick={() => applyQuickFilter(filters)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PropertySearch;
