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
