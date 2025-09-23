"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  MapPin,
  Calendar,
  Home,
  Phone,
  Mail,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  Image as ImageIcon,
} from "lucide-react";

// shadcn/ui
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const MapOSM = dynamic(() => import("@/components/MapOSM"), { ssr: false });

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// Segédfüggvények
const hasVal = (v) =>
  v !== undefined && v !== null && String(v).trim?.() !== "";

const Row = ({ label, children }) => (
  <div className="grid grid-cols-5 gap-2 py-2 border-b last:border-b-0">
    <div className="col-span-2 text-sm text-muted-foreground">{label}</div>
    <div className="col-span-3 text-sm">{children}</div>
  </div>
);

const BoolBadge = ({ on, yes = "Igen", no = "Nem" }) => (
  <Badge variant={on ? "default" : "secondary"} className="rounded-full">
    {on ? yes : no}
  </Badge>
);

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = Array.isArray(params?.slug)
    ? params.slug[0]
    : params?.slug ?? "";

  const [property, setProperty] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  // Move useMemo BEFORE the early returns to ensure hooks are always called in the same order
  // Gyors státusz-badge-ek a jobb hasáb tetejére (új építés, rész/tulajdon, bérleti jog, medence, energia)
  const StatusBadges = useMemo(() => {
    // If property is null/undefined, return empty array
    if (!property) return [];

    const items = [];
    if (hasVal(property.new_build))
      items.push(
        <Badge
          key="new_build"
          variant={property.new_build ? "default" : "secondary"}
        >
          Új építés: {property.new_build ? "Igen" : "Nem"}
        </Badge>
      );
    if (hasVal(property.part_ownership))
      items.push(
        <Badge
          key="part_ownership"
          variant={property.part_ownership ? "default" : "secondary"}
        >
          Rész-tulajdon: {property.part_ownership ? "Igen" : "Nem"}
        </Badge>
      );
    if (hasVal(property.leasehold))
      items.push(
        <Badge
          key="leasehold"
          variant={property.leasehold ? "default" : "secondary"}
        >
          Bérleti jog: {property.leasehold ? "Igen" : "Nem"}
        </Badge>
      );
    if (hasVal(property.pool))
      items.push(
        <Badge key="pool" variant={property.pool ? "default" : "secondary"}>
          Medence: {property.pool ? "Igen" : "Nem"}
        </Badge>
      );
    if (hasVal(property.energy_rating))
      items.push(
        <Badge key="energy_rating" variant="outline" className="font-mono">
          Energia: {String(property.energy_rating).toUpperCase()}
        </Badge>
      );
    return items;
  }, [property]);

  // Adatok betöltése
  useEffect(() => {
    if (!slug) return;
    const fetchPropertyDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/dashboard/property/${slug}`);
        const data = await response.json();
        if (data.success) {
          setProperty(data.data);
          setSimilar(data.similar || []);
          setCurrentImageIndex(0);
        } else {
          setError(data.error || "Ismeretlen hiba történt");
        }
      } catch (err) {
        setError("Hiba az ingatlan adatok betöltésénél");
      } finally {
        setLoading(false);
      }
    };
    fetchPropertyDetails();
  }, [slug]);

  // Kép navigáció
  const nextImage = () => {
    if (property?.images?.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
    }
  };
  const prevImage = () => {
    if (property?.images?.length > 0) {
      setCurrentImageIndex(
        (prev) => (prev - 1 + property.images.length) % property.images.length
      );
    }
  };
  const openImageModal = (index) => {
    setCurrentImageIndex(index);
    setImageModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-muted/30">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Ingatlan adatok betöltése…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-muted/30 p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Hiba történt</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Badge variant="secondary" className="font-mono">
              ID: {String(slug)}
            </Badge>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen grid place-items-center bg-muted/30 p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Ingatlan nem található</CardTitle>
            <CardDescription>A keresett ingatlan nem létezik.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Badge variant="outline" className="font-mono">
              ID: {String(slug)}
            </Badge>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="sticky top-0 z-30 -mx-6 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-slate-900/50 border-b">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="-ml-2"
            >
              <ChevronLeft className="h-4 w-4 mr-2" /> Vissza
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {property.type} – {property.town}
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                ID: {property.id}
              </p>
            </div>
          </div>
        </div>

        {/* Fő tartalom */}
        <div className="grid lg:grid-cols-3 gap-6 mt-6">
          {/* Bal oldal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Képek */}
            {property.images && property.images.length > 0 && (
              <Card className="overflow-hidden">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={property.images[currentImageIndex]?.url}
                    alt={`${property.type} - ${currentImageIndex + 1}`}
                    className="w-full h-96 object-cover cursor-pointer"
                    onClick={() => openImageModal(currentImageIndex)}
                    onError={(e) => {
                      e.currentTarget.src =
                        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMzIwJyBoZWlnaHQ9JzI0MCcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48cmVjdCB3aWR0aD0nMzIwJyBoZWlnaHQ9JzI0MCcgZmlsbD0nI0VCRUJFQicvPjxwYXRoIGQ9J00xNDAgMTQwbDI1LTI1IDM1IDQ1SDEwMCcgZmlsbD0nI0NERURFRicvPjwvc3ZnPg==";
                    }}
                  />

                  {property.images.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
                        aria-label="Előző kép"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
                        aria-label="Következő kép"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </>
                  )}

                  <div className="absolute bottom-3 right-3 rounded bg-black/60 text-white text-xs px-2 py-1">
                    {currentImageIndex + 1} / {property.images.length}
                  </div>
                </div>

                <CardContent className="p-4">
                  <ScrollArea>
                    <div className="grid grid-cols-6 md:grid-cols-8 gap-2 pr-2">
                      {property.images.slice(0, 16).map((image, index) => (
                        <button
                          key={index}
                          className={cn(
                            "relative rounded overflow-hidden border h-16 group",
                            index === currentImageIndex && "ring-2 ring-primary"
                          )}
                          onClick={() => setCurrentImageIndex(index)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image.url}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover group-hover:opacity-80"
                          />
                          {image.floorplan && (
                            <span className="absolute top-1 right-1 text-[10px] px-1 rounded bg-blue-600 text-white">
                              Alaprajz
                            </span>
                          )}
                        </button>
                      ))}
                      {property.images.length > 16 && (
                        <div className="flex items-center justify-center bg-muted rounded h-16 text-xs text-muted-foreground">
                          +{property.images.length - 16}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Leírás */}
            {property.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Leírás</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-line">
                    {(property.description || "").replace(/~/g, "\n")}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Jellemzők */}
            {property.features && property.features.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Jellemzők</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {property.features.map((feature, i) => (
                      <Badge key={i} variant="outline" className="rounded-full">
                        {feature.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Jobb oldal */}
          <div className="space-y-6">
            {/* Ár és alapadatok */}
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-3xl text-emerald-600">
                  {property.formatted_price}
                </CardTitle>
                <CardDescription className="capitalize">
                  {property.price_freq}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{property.town}</p>
                    <p className="text-sm text-muted-foreground">
                      {property.province}, {property.country}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Home className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {property.beds} szoba, {property.baths} fürdőszoba
                    </p>
                    {property.surface_area && (
                      <p className="text-sm text-muted-foreground">
                        {property.surface_area} m²
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Listázva</p>
                    <p className="text-sm text-muted-foreground">
                      {property.formatted_date}
                    </p>
                  </div>
                </div>
                {property.pool === 1 && (
                  <div className="rounded-md border bg-blue-50/60 border-blue-200 p-3 text-center text-blue-900">
                    🏊‍♂️ Medencés
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gyors státusz badge-ek */}
            {(StatusBadges?.length ?? 0) > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Státusz</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {StatusBadges}
                </CardContent>
              </Card>
            )}

            {/* Részletes adatok (minden a sémából) */}
            <Card>
              <CardHeader>
                <CardTitle>Részletes adatok</CardTitle>
                <CardDescription>
                  Összes mező megjelenítve, ha van értéke
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border divide-y">
                  {hasVal(property.id) && <Row label="ID">{property.id}</Row>}
                  {hasVal(property.ref) && (
                    <Row label="Referencia">{property.ref}</Row>
                  )}
                  {hasVal(property.date) && (
                    <Row label="Dátum (nyers)">{property.date}</Row>
                  )}
                  {hasVal(property.formatted_date) && (
                    <Row label="Dátum (formázott)">
                      {property.formatted_date}
                    </Row>
                  )}
                  {hasVal(property.type) && (
                    <Row label="Típus">{property.type}</Row>
                  )}
                  {hasVal(property.title_extra) && (
                    <Row label="Cím kiegészítő">{property.title_extra}</Row>
                  )}
                  {hasVal(property.price) && (
                    <Row label="Ár (nyers)">
                      {property.price} {property.currency || "EUR"}
                    </Row>
                  )}
                  {hasVal(property.formatted_price) && (
                    <Row label="Ár (formázott)">{property.formatted_price}</Row>
                  )}
                  {hasVal(property.currency) && (
                    <Row label="Pénznem">{property.currency}</Row>
                  )}
                  {hasVal(property.price_freq) && (
                    <Row label="Ár gyakoriság">{property.price_freq}</Row>
                  )}
                  {hasVal(property.country) && (
                    <Row label="Ország">{property.country}</Row>
                  )}
                  {hasVal(property.province) && (
                    <Row label="Megye/Provincia">{property.province}</Row>
                  )}
                  {hasVal(property.town) && (
                    <Row label="Város/Község">{property.town}</Row>
                  )}
                  {hasVal(property.location_detail) && (
                    <Row label="Hely részletei">{property.location_detail}</Row>
                  )}
                  {hasVal(property.location) && (
                    <Row label="Lokáció string">{property.location}</Row>
                  )}
                  {hasVal(property.cp) && <Row label="CP">{property.cp}</Row>}
                  {hasVal(property.postal_code) && (
                    <Row label="Irányítószám">{property.postal_code}</Row>
                  )}
                  {hasVal(property.beds) && (
                    <Row label="Hálók">{property.beds}</Row>
                  )}
                  {hasVal(property.baths) && (
                    <Row label="Fürdők">{property.baths}</Row>
                  )}
                  {hasVal(property.surface_area) && (
                    <Row label="Alapterület">{property.surface_area} m²</Row>
                  )}
                  {hasVal(property.estado_propiedad) && (
                    <Row label="Ingatlan állapota (kód)">
                      {property.estado_propiedad}
                    </Row>
                  )}
                  {hasVal(property.antiguedad) && (
                    <Row label="Életkor / Kor (kód)">{property.antiguedad}</Row>
                  )}
                  {hasVal(property.energy_rating) && (
                    <Row label="Energia besorolás">
                      <Badge variant="outline" className="font-mono">
                        {String(property.energy_rating).toUpperCase()}
                      </Badge>
                    </Row>
                  )}
                  {hasVal(property.new_build) && (
                    <Row label="Új építés">
                      <BoolBadge on={!!property.new_build} />
                    </Row>
                  )}
                  {hasVal(property.part_ownership) && (
                    <Row label="Rész-tulajdon">
                      <BoolBadge on={!!property.part_ownership} />
                    </Row>
                  )}
                  {hasVal(property.leasehold) && (
                    <Row label="Bérleti jog">
                      <BoolBadge on={!!property.leasehold} />
                    </Row>
                  )}
                  {hasVal(property.pool) && (
                    <Row label="Medence">
                      <BoolBadge on={!!property.pool} />
                    </Row>
                  )}
                  {hasVal(property.latitude) && (
                    <Row label="Szélesség (lat)">{property.latitude}</Row>
                  )}
                  {hasVal(property.longitude) && (
                    <Row label="Hosszúság (lng)">{property.longitude}</Row>
                  )}
                  {hasVal(property.agencia) && (
                    <Row label="Ügynökség">{property.agencia}</Row>
                  )}
                  {hasVal(property.telefono) && (
                    <Row label="Telefon">
                      <a
                        href={`tel:${property.telefono}`}
                        className="text-primary hover:underline"
                      >
                        {property.telefono}
                      </a>
                    </Row>
                  )}
                  {hasVal(property.email) && (
                    <Row label="Email">
                      <a
                        href={`mailto:${property.email}`}
                        className="text-primary hover:underline break-all"
                      >
                        {property.email}
                      </a>
                    </Row>
                  )}
                  {hasVal(property.url) && (
                    <Row label="Eredeti hirdetés">
                      <a
                        href={property.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline break-all"
                      >
                        {property.url}
                      </a>
                    </Row>
                  )}
                  {hasVal(property._index) && (
                    <Row label="_index">{property._index}</Row>
                  )}
                  {hasVal(property.createdAt) && (
                    <Row label="Létrehozva">
                      {new Date(property.createdAt).toLocaleString()}
                    </Row>
                  )}
                  {hasVal(property.updatedAt) && (
                    <Row label="Módosítva">
                      {new Date(property.updatedAt).toLocaleString()}
                    </Row>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Térkép (ingyenes OSM) */}
            {typeof property.latitude === "number" &&
            typeof property.longitude === "number" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Térkép</CardTitle>
                  <CardDescription>OpenStreetMap (ingyenes)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <MapOSM
                    lat={property.latitude}
                    lng={property.longitude}
                    label={`${property.type} — ${property.town}${
                      property.province ? `, ${property.province}` : ""
                    }`}
                    height={260}
                    zoom={15}
                  />
                  <Button asChild variant="secondary" className="w-full">
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${property.latitude}&mlon=${property.longitude}#map=16/${property.latitude}/${property.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Útvonal / nagyobb térkép megnyitása
                    </a>
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Térkép: &copy; OpenStreetMap közreműködők — attribúció
                    szükséges.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Térkép</CardTitle>
                  <CardDescription>Nincs megadva koordináta</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Ehhez az ingatlanhoz nem található <code>latitude</code>/
                    <code>longitude</code>.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Kapcsolat (marad) */}
            <Card>
              <CardHeader>
                <CardTitle>Kapcsolat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{property.agencia}</p>
                  <p className="text-sm text-muted-foreground">
                    Ingatlanügynökség
                  </p>
                </div>
                {property.telefono && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${property.telefono}`}
                      className="text-primary hover:underline"
                    >
                      {property.telefono}
                    </a>
                  </div>
                )}
                {property.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${property.email}`}
                      className="text-primary hover:underline break-all text-sm"
                    >
                      {property.email}
                    </a>
                  </div>
                )}
                {property.url && (
                  <div className="pt-3">
                    <Button asChild className="w-full">
                      <a
                        href={property.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" /> Eredeti
                        hirdetés megtekintése
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hasonló ingatlanok */}
            {similar.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Hasonló ingatlanok {property.town}-ban</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {similar.map((item) => (
                    <Link
                      key={item.id}
                      href={`/dashboard/${item.id}`}
                      className="block"
                    >
                      <div className="flex gap-3 rounded-md border p-3 hover:bg-muted/50 transition-colors">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {item.images && item.images.length > 0 ? (
                          <img
                            src={item.images[0].url}
                            alt={item.type}
                            className="h-16 w-16 rounded object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded grid place-items-center bg-muted text-muted-foreground">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.town}
                          </p>
                          <p className="text-sm font-semibold text-emerald-600">
                            {item.formatted_price}
                          </p>
                        </div>
                        <Button variant="secondary" size="sm">
                          Megnézem
                        </Button>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Kép modal */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-5xl p-0 bg-black/95 border-none">
          <div className="relative">
            <button
              onClick={() => setImageModalOpen(false)}
              className="absolute top-4 right-4 z-10 text-white/90 hover:text-white"
              aria-label="Bezárás"
            >
              <X className="h-6 w-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={property.images?.[currentImageIndex]?.url}
              alt={`${property.type} - ${currentImageIndex + 1}`}
              className="max-h-[80vh] w-full object-contain"
            />
            {property.images?.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 text-white hover:bg-white/30"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 text-white hover:bg-white/30"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/80 text-xs">
              {currentImageIndex + 1} / {property.images?.length || 0}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
