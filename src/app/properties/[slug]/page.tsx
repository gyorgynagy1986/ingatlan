// app/properties/[slug]/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { getPropertyBySlug } from '../../../lib/action/getPublicData';
import PropertyDetailClient from '../../../components/PropertyDetailClient';

interface PageProps {
  params: { slug: string };
}

// Server Component - gets property data from MongoDB
const PropertyDetailPage = async ({ params }: PageProps) => {
  // Next.js 15+ requires await for params
  const { slug } = params;
  
  console.log(`🔍 PropertyDetailPage: Loading property with slug: ${slug}`);
  
  try {
    // Get property from MongoDB via server action
    const property = await getPropertyBySlug(slug);
    
    if (!property) {
      console.log(`❌ PropertyDetailPage: Property not found for slug: ${slug}`);
      notFound(); // This will show Next.js 404 page
    }
    
    console.log(`✅ PropertyDetailPage: Found property: ${property.ref} - ${property.type} in ${property.town}`);
    
    // Pass property data to client component
    return <PropertyDetailClient property={property} />;
    
  } catch (error) {
    console.error(`❌ PropertyDetailPage: Error loading property:`, error);
    notFound();
  }
};

export default PropertyDetailPage;

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  const { slug } =  params;
  
  try {
    const property = await getPropertyBySlug(slug);
    
    if (!property) {
      return {
        title: 'Propiedad no encontrada',
        description: 'La propiedad que buscas no existe o ha sido eliminada.'
      };
    }
    
    const title = `${property.type} en ${property.town} - ${property.formatted_price}`;
    const description = property.description 
      ? property.description.replace(/[🌊🏖️📍🛏️🛠️💰🏡🚶‍♂️✨~]/g, '').substring(0, 160) + '...'
      : `${property.type} con ${property.beds} habitaciones y ${property.baths} baños en ${property.town}, ${property.province}. ${property.formatted_price}.`;
    
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        images: property.images && property.images.length > 0 
          ? [{ url: property.images[0].url }]
          : [],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: property.images && property.images.length > 0 
          ? [property.images[0].url]
          : [],
      }
    };
  } catch (error) {
    return {
      title: 'Error al cargar propiedad',
      description: `Ha ocurrido un ${error}  al cargar la información de la propiedad.`
    };
  }
}