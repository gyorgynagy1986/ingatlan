"use client";

import React, { useEffect, useState, useCallback, memo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft, Trash2, Plus, X, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";

// shadcn/ui
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type Image = {
  id: string;
  url: string;
  title?: string;
  cover?: boolean;
  floorplan?: boolean;
};

type Feature = {
  name: string;
};

type Property = {
  id?: string;
  date?: string;
  agencia?: string;
  email?: string;
  telefono?: string;
  ref?: string;
  price?: number;
  currency?: string;
  price_freq?: string;
  new_build?: number;
  part_ownership?: number;
  leasehold?: number;
  type?: string;
  country?: string;
  province?: string;
  town?: string;
  location_detail?: string;
  cp?: string;
  postal_code?: string;
  beds?: number;
  baths?: number;
  estado_propiedad?: number;
  antiguedad?: number;
  pool?: number;
  energy_rating?: string;
  title_extra?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  surface_area?: number;
  url?: string;
  description?: string;
  images?: Image[];
  features?: Feature[];
  formatted_date?: string;
  formatted_price?: string;
  _index?: number;
};
// natív típusok
type InputProps = React.ComponentProps<"input">;
type TextareaProps = React.ComponentProps<"textarea">;
type SelectProps = React.ComponentProps<"select">;

// Memoized Input Component
const MemoizedInput = memo(({ value, onChange, ...props }: InputProps) => (
  <Input value={value} onChange={onChange} {...props} />
));
MemoizedInput.displayName = "MemoizedInput";

// Memoized Textarea Component
const MemoizedTextarea = memo(
  ({ value, onChange, ...props }: TextareaProps) => (
    <Textarea value={value} onChange={onChange} {...props} />
  )
);
MemoizedTextarea.displayName = "MemoizedTextarea";

// Memoized Select Component
const MemoizedSelect = memo(
  ({ value, onChange, children, ...props }: SelectProps) => (
    <select value={value} onChange={onChange} {...props}>
      {children}
    </select>
  )
);
MemoizedSelect.displayName = "MemoizedSelect";

// Memoized Image Card Component
const ImageCard = memo(
  ({
    image,
    index,
    onUpdateImage,
    onRemoveImage,
    onMoveUp,
    onMoveDown,
    isFirst,
    isLast,
  }: {
    image: Image;
    index: number;
    onUpdateImage: (
      index: number,
      field: keyof Image,
      value: string | boolean
    ) => void;
    onRemoveImage: (index: number) => void;
    onMoveUp: (index: number) => void;
    onMoveDown: (index: number) => void;
    isFirst: boolean;
    isLast: boolean;
  }) => (
    <Card
      className={cn(
        "overflow-hidden transition-all",
        image.cover && "ring-2 ring-blue-500 ring-offset-2"
      )}
    >
      <CardContent className="p-0 relative">
        {image.cover && (
          <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-md z-10">
            Borítókép
          </div>
        )}

        {/* Sorrend gombok */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
          <Button
            variant="secondary"
            className="h-6 w-6 p-0"
            onClick={() => onMoveUp(index)}
            disabled={isFirst}
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button
            variant="secondary"
            className="h-6 w-6 p-0"
            onClick={() => onMoveDown(index)}
            disabled={isLast}
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
        </div>

        <img
          src={image.url}
          alt={`Property image ${index + 1}`}
          className="h-40 w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMjQwJyBoZWlnaHQ9JzE2MCcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48cmVjdCB3aWR0aD0nMjQwJyBoZWlnaHQ9JzE2MCcgZmlsbD0nI0VCRUJFQicvPjxwYXRoIGQ9J00xMDAgOTBsMjAtMjAgMzAgNDBIMTAnIGZpbGw9JyNDREVERUYnLz48L3N2Zz4=";
          }}
        />
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        <MemoizedInput
          value={image.url}
          onChange={(e) => onUpdateImage(index, "url", e.target.value)}
          placeholder="Kép URL"
        />
        <MemoizedInput
          value={image.title || ""}
          onChange={(e) => onUpdateImage(index, "title", e.target.value)}
          placeholder="Kép címe (opcionális)"
        />
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={Boolean(image.cover)}
                onCheckedChange={(v) => onUpdateImage(index, "cover", v)}
                id={`cover-${index}`}
              />
              <Label htmlFor={`cover-${index}`} className="text-sm">
                Borítókép
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={Boolean(image.floorplan)}
                onCheckedChange={(v) => onUpdateImage(index, "floorplan", v)}
                id={`fp-${index}`}
              />
              <Label htmlFor={`fp-${index}`} className="text-sm">
                Alaprajz
              </Label>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={() => onRemoveImage(index)}
            >
              <X className="h-4 w-4 mr-1" /> Eltávolít
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
);

ImageCard.displayName = "ImageCard";

export default function PropertyEditPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = Array.isArray(params?.id)
    ? params.id[0]
    : (params?.id as string | undefined);

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Property>({});
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newFeatureName, setNewFeatureName] = useState("");

  // Memoized update functions
  const updateField = useCallback((field: string, value: unknown) => {
    setFormData((prev: Property) => ({ ...prev, [field]: value }));
  }, []);

  const addImage = useCallback(() => {
    if (!newImageUrl.trim()) return;
    setFormData((prev) => {
      const next: Image[] = [
        ...(prev.images || []),
        {
          id: String((prev.images?.length ?? 0) + 1),
          url: newImageUrl.trim(),
          title: "",
          cover: false,
          floorplan: false,
        },
      ];
      return { ...prev, images: next };
    });
    setNewImageUrl("");
  }, [newImageUrl]);

  const removeImage = useCallback((index: number) => {
    setFormData((prev) => {
      const updated = (prev.images || []).filter((_, i) => i !== index);
      return { ...prev, images: updated };
    });
  }, []);

  const updateImage = useCallback(
    (
      index: number,
      field: keyof Image,
      value: string | boolean | undefined
    ) => {
      setFormData((prev) => {
        const images = prev.images || [];

        // Ha cover-re állítunk egy képet, a többi cover értékét állítsuk false-ra
        if (field === "cover" && value === true) {
          const allImagesNonCover = images.map((image, i) => ({
            ...image,
            cover: i === index ? true : false,
          }));
          return { ...prev, images: allImagesNonCover };
        }

        // Normál update minden más esetben
        const updated = images.map((img, i) => {
          if (i === index) {
            return { ...img, [field]: value };
          }
          return img;
        });

        return { ...prev, images: updated };
      });
    },
    []
  );

  // Kép mozgatása felfelé
  const moveImageUp = useCallback((index: number) => {
    if (index === 0) return;

    setFormData((prev) => {
      const images = [...(prev.images || [])];
      [images[index - 1], images[index]] = [images[index], images[index - 1]];
      return { ...prev, images };
    });
  }, []);

  // Kép mozgatása lefelé
  const moveImageDown = useCallback((index: number) => {
    setFormData((prev) => {
      const images = prev.images || [];
      if (index >= images.length - 1) return prev;

      const newImages = [...images];
      [newImages[index], newImages[index + 1]] = [
        newImages[index + 1],
        newImages[index],
      ];
      return { ...prev, images: newImages };
    });
  }, []);

  const addFeature = useCallback(() => {
    if (!newFeatureName.trim()) return;
    setFormData((prev) => ({
      ...prev,
      features: [...(prev.features || []), { name: newFeatureName.trim() }],
    }));
    setNewFeatureName("");
  }, [newFeatureName]);

  const removeFeature = useCallback((index: number) => {
    setFormData((prev) => {
      const updated = (prev.features || []).filter((_, i) => i !== index);
      return { ...prev, features: updated };
    });
  }, []);

  const updateFeature = useCallback((index: number, name: string) => {
    setFormData((prev) => {
      const updated = (prev.features || []).map((f, i) =>
        i === index ? { name: name } : f
      );
      return { ...prev, features: updated };
    });
  }, []);

  // Input change handlers
  const handleInputChange = useCallback(
    (field: string) => {
      const inputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value =
          e.target.type === "number"
            ? Number(e.target.value) || 0
            : e.target.value;
        updateField(field, value);
      };
      inputHandler.displayName = `InputHandler_${field}`;
      return inputHandler;
    },
    [updateField]
  );

  const handleTextareaChange = useCallback(
    (field: string) => {
      const textareaHandler = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateField(field, e.target.value);
      };
      textareaHandler.displayName = `TextareaHandler_${field}`;
      return textareaHandler;
    },
    [updateField]
  );

  const handleSelectChange = useCallback(
    (field: string) => {
      const selectHandler = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateField(field, e.target.value);
      };
      selectHandler.displayName = `SelectHandler_${field}`;
      return selectHandler;
    },
    [updateField]
  );

  const handleSwitchChange = useCallback(
    (field: string) => {
      const switchHandler = (checked: boolean) => {
        updateField(field, checked ? 1 : 0);
      };
      switchHandler.displayName = `SwitchHandler_${field}`;
      return switchHandler;
    },
    [updateField]
  );

  useEffect(() => {
    const fetchProperty = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/properties/${propertyId}`);
        const data = await res.json();
        if (data.success) {
          setProperty(data.data);
          setFormData(data.data);
        } else {
          setError(data.error || "Hiba a property betöltésénél");
        }
      } catch (e) {
        setError("Hiba a property betöltésénél");
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [propertyId]);

  // Mentés
  const saveProperty = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/properties/${propertyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Property sikeresen frissítve!");
        setProperty(data.data);
        setTimeout(() => setSuccess(null), 2500);
      } else {
        setError(data.error || "Hiba a mentés során");
      }
    } catch (e) {
      setError("Hiba a mentés során");
    } finally {
      setSaving(false);
    }
  }, [formData, propertyId]);

  // Törlés
  const deleteProperty = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/properties/${propertyId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        router.push("/dashboard");
      } else {
        setError(data.error || "Hiba a törlés során");
      }
    } catch (e) {
      setError("Hiba a törlés során");
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  }, [propertyId, router]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-muted/30">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Property betöltése…</p>
        </div>
      </div>
    );
  }

  if (error && !property) {
    return (
      <div className="min-h-screen grid place-items-center bg-muted/30">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Hiba történt</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="sticky top-0 z-30 -mx-6 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-slate-900/50 border-b">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="-ml-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Vissza
              </Button>
              <div>
                <h1 className="text-xl font-semibold leading-none tracking-tight">
                  Property Szerkesztése
                </h1>
                <p className="text-xs text-muted-foreground font-mono">
                  ID: {propertyId}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveProperty} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />{" "}
                {saving ? "Mentés…" : "Mentés"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Törlés
              </Button>
            </div>
          </div>
        </div>

        {/* Üzenetek */}
        {error && (
          <Card className="mt-4 border-red-200 bg-red-50/60">
            <CardContent className="py-3 text-red-800">{error}</CardContent>
          </Card>
        )}
        {success && (
          <Card className="mt-4 border-emerald-200 bg-emerald-50/70">
            <CardContent className="py-3 text-emerald-800">
              {success}
            </CardContent>
          </Card>
        )}

        {/* Alapadatok */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Alapadatok</CardTitle>
            <CardDescription>Alap információk az ingatlanról</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Property ID</Label>
                <MemoizedInput
                  value={formData.id || ""}
                  onChange={handleInputChange("id")}
                  placeholder="Egyedi azonosító"
                />
              </div>
              <div className="space-y-2">
                <Label>Dátum</Label>
                <MemoizedInput
                  type="date"
                  value={formData.date || ""}
                  onChange={handleInputChange("date")}
                />
              </div>
              <div className="space-y-2">
                <Label>Referencia szám</Label>
                <MemoizedInput
                  value={formData.ref || ""}
                  onChange={handleInputChange("ref")}
                  placeholder="REF001234"
                />
              </div>
              <div className="space-y-2">
                <Label>Típus *</Label>
                <MemoizedInput
                  value={formData.type || ""}
                  onChange={handleInputChange("type")}
                  placeholder="Ház, Lakás, Villa..."
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Ár * (szám)</Label>
                <MemoizedInput
                  type="number"
                  value={formData.price ?? ""}
                  onChange={handleInputChange("price")}
                />
              </div>
              <div className="space-y-2">
                <Label>Valuta</Label>
                <MemoizedSelect
                  value={formData.currency || "EUR"}
                  onChange={handleSelectChange("currency")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="HUF">HUF</option>
                </MemoizedSelect>
              </div>
              <div className="space-y-2">
                <Label>Ár gyakorisága</Label>
                <MemoizedSelect
                  value={formData.price_freq || ""}
                  onChange={handleSelectChange("price_freq")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Egyszeri</option>
                  <option value="monthly">Havi</option>
                  <option value="weekly">Heti</option>
                  <option value="daily">Napi</option>
                </MemoizedSelect>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Ország</Label>
                <MemoizedInput
                  value={formData.country || ""}
                  onChange={handleInputChange("country")}
                  placeholder="Spanyolország"
                />
              </div>
              <div className="space-y-2">
                <Label>Megye/Tartomány</Label>
                <MemoizedInput
                  value={formData.province || ""}
                  onChange={handleInputChange("province")}
                  placeholder="Andalúzia"
                />
              </div>
              <div className="space-y-2">
                <Label>Város</Label>
                <MemoizedInput
                  value={formData.town || ""}
                  onChange={handleInputChange("town")}
                  placeholder="Marbella"
                />
              </div>
              <div className="space-y-2">
                <Label>Helyszín részletek</Label>
                <MemoizedInput
                  value={formData.location_detail || ""}
                  onChange={handleInputChange("location_detail")}
                  placeholder="Központ, strand közelében"
                />
              </div>
              <div className="space-y-2">
                <Label>CP/Irányítószám</Label>
                <MemoizedInput
                  value={formData.cp || ""}
                  onChange={handleInputChange("cp")}
                  placeholder="29600"
                />
              </div>
              <div className="space-y-2">
                <Label>Postai kód</Label>
                <MemoizedInput
                  value={formData.postal_code || ""}
                  onChange={handleInputChange("postal_code")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Helyszín (szöveges)</Label>
              <MemoizedInput
                value={formData.location || ""}
                onChange={handleInputChange("location")}
                placeholder="Teljes cím vagy leírás"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Szélesség (latitude)</Label>
                <MemoizedInput
                  type="number"
                  step="any"
                  value={formData.latitude ?? ""}
                  onChange={handleInputChange("latitude")}
                  placeholder="36.5108"
                />
              </div>
              <div className="space-y-2">
                <Label>Hosszúság (longitude)</Label>
                <MemoizedInput
                  type="number"
                  step="any"
                  value={formData.longitude ?? ""}
                  onChange={handleInputChange("longitude")}
                  placeholder="-4.8844"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label>Szobák</Label>
                <MemoizedInput
                  type="number"
                  value={formData.beds ?? ""}
                  onChange={handleInputChange("beds")}
                />
              </div>
              <div className="space-y-2">
                <Label>Fürdőszobák</Label>
                <MemoizedInput
                  type="number"
                  value={formData.baths ?? ""}
                  onChange={handleInputChange("baths")}
                />
              </div>
              <div className="space-y-2">
                <Label>Terület (m²)</Label>
                <MemoizedInput
                  type="number"
                  value={formData.surface_area ?? ""}
                  onChange={handleInputChange("surface_area")}
                />
              </div>
              <div className="space-y-2">
                <Label>Ingatlan állapota</Label>
                <MemoizedInput
                  type="number"
                  value={formData.estado_propiedad ?? ""}
                  onChange={handleInputChange("estado_propiedad")}
                  placeholder="1-5 skála"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Ingatlan kora (év)</Label>
                <MemoizedInput
                  type="number"
                  value={formData.antiguedad ?? ""}
                  onChange={handleInputChange("antiguedad")}
                  placeholder="Építés óta eltelt évek"
                />
              </div>
              <div className="space-y-2">
                <Label>Energetikai besorolás</Label>
                <MemoizedSelect
                  value={formData.energy_rating || ""}
                  onChange={handleSelectChange("energy_rating")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Nincs megadva</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                  <option value="F">F</option>
                  <option value="G">G</option>
                </MemoizedSelect>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Extra cím</Label>
              <MemoizedInput
                value={formData.title_extra || ""}
                onChange={handleInputChange("title_extra")}
                placeholder="Kiegészítő információ a címhez"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Medence</Label>
                <div className="flex items-center gap-3 rounded-md border p-3">
                  <Switch
                    checked={Boolean(formData.pool)}
                    onCheckedChange={handleSwitchChange("pool")}
                    id="pool"
                  />
                  <Label htmlFor="pool" className="cursor-pointer">
                    {formData.pool ? "Van" : "Nincs"}
                  </Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Új építésű</Label>
                <div className="flex items-center gap-3 rounded-md border p-3">
                  <Switch
                    checked={Boolean(formData.new_build)}
                    onCheckedChange={handleSwitchChange("new_build")}
                    id="new_build"
                  />
                  <Label htmlFor="new_build" className="cursor-pointer">
                    {formData.new_build ? "Igen" : "Nem"}
                  </Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Résztulajdon</Label>
                <div className="flex items-center gap-3 rounded-md border p-3">
                  <Switch
                    checked={Boolean(formData.part_ownership)}
                    onCheckedChange={handleSwitchChange("part_ownership")}
                    id="part_ownership"
                  />
                  <Label htmlFor="part_ownership" className="cursor-pointer">
                    {formData.part_ownership ? "Igen" : "Nem"}
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Haszonbérlet</Label>
              <div className="flex items-center gap-3 rounded-md border p-3 max-w-xs">
                <Switch
                  checked={Boolean(formData.leasehold)}
                  onCheckedChange={handleSwitchChange("leasehold")}
                  id="leasehold"
                />
                <Label htmlFor="leasehold" className="cursor-pointer">
                  {formData.leasehold ? "Igen" : "Nem"}
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Leírás</Label>
              <MemoizedTextarea
                rows={6}
                value={formData.description || ""}
                onChange={handleTextareaChange("description")}
                placeholder="Részletes leírás az ingatlanról..."
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Ügynökség</Label>
                <MemoizedInput
                  value={formData.agencia || ""}
                  onChange={handleInputChange("agencia")}
                  placeholder="Ingatlaniroda neve"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <MemoizedInput
                  value={formData.telefono || ""}
                  onChange={handleInputChange("telefono")}
                  placeholder="+34 123 456 789"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <MemoizedInput
                  type="email"
                  value={formData.email || ""}
                  onChange={handleInputChange("email")}
                  placeholder="info@agency.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Eredeti URL</Label>
                <MemoizedInput
                  type="url"
                  value={formData.url || ""}
                  onChange={handleInputChange("url")}
                  placeholder="https://..."
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Formázott dátum</Label>
                <MemoizedInput
                  value={formData.formatted_date || ""}
                  onChange={handleInputChange("formatted_date")}
                  placeholder="2024. március 15."
                />
              </div>
              <div className="space-y-2">
                <Label>Formázott ár</Label>
                <MemoizedInput
                  value={formData.formatted_price || ""}
                  onChange={handleInputChange("formatted_price")}
                  placeholder="450.000 €"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Index</Label>
              <MemoizedInput
                type="number"
                value={formData._index ?? ""}
                onChange={handleInputChange("_index")}
                placeholder="Sorrendszám"
              />
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="secondary" onClick={() => router.back()}>
              Mégse
            </Button>
            <Button onClick={saveProperty} disabled={saving}>
              <Save className="h-4 w-4 mr-2" /> {saving ? "Mentés…" : "Mentés"}
            </Button>
          </CardFooter>
        </Card>

        {/* Képek */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Képek ({formData.images?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Kép URL-je…"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
              />
              <Button onClick={addImage}>
                <Plus className="h-4 w-4 mr-2" /> Hozzáad
              </Button>
            </div>

            {!formData.images || formData.images.length === 0 ? (
              <div className="rounded-md border p-6 text-center text-muted-foreground">
                Nincs kép hozzáadva.
              </div>
            ) : (
              <ScrollArea className="w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-2">
                  {formData.images?.map((image, index: number) => (
                    <ImageCard
                      key={`${image.id}-${index}`}
                      image={image}
                      index={index}
                      onUpdateImage={updateImage}
                      onRemoveImage={removeImage}
                      onMoveUp={moveImageUp}
                      onMoveDown={moveImageDown}
                      isFirst={index === 0}
                      isLast={index === (formData.images?.length || 0) - 1}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Jellemzők */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Jellemzők ({formData.features?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Új jellemző neve…"
                value={newFeatureName}
                onChange={(e) => setNewFeatureName(e.target.value)}
              />
              <Button onClick={addFeature}>
                <Plus className="h-4 w-4 mr-2" /> Hozzáad
              </Button>
            </div>
            {!formData.features || formData.features.length === 0 ? (
              <div className="rounded-md border p-6 text-center text-muted-foreground">
                Nincs jellemző hozzáadva.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {formData.features?.map((feature, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <MemoizedInput
                      value={feature.name}
                      onChange={(e) => updateFeature(index, e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => removeFeature(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" /> Property
                törlése
              </DialogTitle>
              <DialogDescription>
                Biztosan törölni szeretnéd ezt a property-t? Ez a művelet nem
                vonható vissza.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Mégse
              </Button>
              <Button
                variant="destructive"
                onClick={deleteProperty}
                disabled={saving}
              >
                {saving ? "Törlés…" : "Törlés"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}