//// app/properties/page.tsx
//import React from 'react';
//import { searchProperties, PropertySearchParams } from '../../lib/action/getPublicData';
//import ServerSidePropertyLanding from '../../components/ServerSidePropertyLanding';
//
//export const dynamic = 'force-dynamic';
//
//
//interface PageProps {
//  searchParams: { [key: string]: string | string[] | undefined };
//}
//
//// Server Component - ez fut a szerveren és lekéri az adatokat
//const PropertiesPage: React.FC<PageProps> = async ({ searchParams }) => {
//  console.log('🚀 PropertiesPage: Starting with searchParams:', searchParams);
//
//  try {
//    // Convert URL search params to our filter format
//    const filters: PropertySearchParams = {
//      page: searchParams.page ? parseInt(searchParams.page as string) : 1,
//      limit: 12, // 12 properties per page
//      type: searchParams.type as string || undefined,
//      town: searchParams.town as string || undefined,
//      minPrice: searchParams.minPrice ? parseInt(searchParams.minPrice as string) : undefined,
//      maxPrice: searchParams.maxPrice ? parseInt(searchParams.maxPrice as string) : undefined,
//      minBeds: searchParams.minBeds ? parseInt(searchParams.minBeds as string) : undefined,
//      pool: searchParams.pool ? searchParams.pool === 'true' : null,
//      sortBy: (searchParams.sortBy as 'price' | 'date' | 'beds') || 'date',
//      sortOrder: (searchParams.sortOrder as 'asc' | 'desc') || 'desc',
//    };
//
//
//    // Server-side property search
//    const searchResult = await searchProperties(filters);
//
//    // Pass initial data to client component
//    return (
//      <ServerSidePropertyLanding initialResult={searchResult} />
//    );
//
//  } catch (error) {
//    console.error('❌ PropertiesPage: Error during search:', error);
//
//    // Fallback UI for errors
//    return (
//      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//        <div className="text-center max-w-md mx-auto p-6">
//          <div className="text-red-400 text-6xl mb-4">⚠️</div>
//          <h2 className="text-2xl font-bold text-red-800 mb-2">
//            Error de búsqueda
//          </h2>
//          <p className="text-gray-600 mb-6">
//            No se pudieron cargar las propiedades. Inténtalo de nuevo más tarde.
//          </p>
//          <button
//            onClick={() => window.location.reload()}
//            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
//          >
//            Reintentar
//          </button>
//        </div>
//      </div>
//    );
//  }
//};
//
//export default PropertiesPage;
//
//// Optional: Add metadata for SEO
//export async function generateMetadata({ searchParams }: PageProps) {
//  const type = searchParams.type as string;
//  const town = searchParams.town as string;
//  const page = searchParams.page ? parseInt(searchParams.page as string) : 1;
//
//  let title = 'Propiedades en España';
//  let description = 'Encuentra tu propiedad ideal en España';
//
//  if (type && town) {
//    title = `${type} en ${town} - Propiedades en España`;
//    description = `Encuentra ${type.toLowerCase()} en ${town}. Las mejores propiedades en España.`;
//  } else if (type) {
//    title = `${type} en España - Propiedades`;
//    description = `Encuentra ${type.toLowerCase()} en España. Ampllia selección de propiedades.`;
//  } else if (town) {
//    title = `Propiedades en ${town} - España`;
//    description = `Descubre las mejores propiedades en ${town}, España.`;
//  }
//
//  if (page > 1) {
//    title += ` - Página ${page}`;
//  }
//
//  return {
//    title,
//    description,
//    openGraph: {
//      title,
//      description,
//      type: 'website',
//    }
//  };
//}



// app/properties/page.tsx
import React from 'react';
import ServerSidePropertyLanding from '@/components/ServerSidePropertyLanding';
import { fetchPropertiesViaApi, type PropertySearchParams } from '@/lib/action/properties';

// Ha itt olvasod a searchParams-t, az oldal dinamikus lesz:
export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Record<string, string | string[] | undefined> };

export default async function PropertiesPage({ searchParams }: PageProps) {
  const toInt = (v?: string | string[]) => (typeof v === 'string' && !Number.isNaN(parseInt(v, 10)) ? parseInt(v, 10) : undefined);

  const filters: PropertySearchParams = {
    page: toInt(searchParams.page) ?? 1,
    limit: 12,
    type: (searchParams.type as string) || undefined,
    town: (searchParams.town as string) || undefined,
    minPrice: toInt(searchParams.minPrice),
    maxPrice: toInt(searchParams.maxPrice),
    minBeds: toInt(searchParams.minBeds),
    pool: typeof searchParams.pool === 'string' ? searchParams.pool === 'true' : undefined,
    sortBy: ((searchParams.sortBy as string) as 'price'|'date'|'beds') || 'date',
    sortOrder: ((searchParams.sortOrder as string) as 'asc'|'desc') || 'desc',
  };

  const data = await fetchPropertiesViaApi(filters);
  return <ServerSidePropertyLanding initialResult={data} />;
}
