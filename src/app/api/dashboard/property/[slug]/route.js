import { NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/db';
import Property from '../../../../../models/Property';
import { withAdminAuth } from '../../../../../lib/auth-helper';

async function handleGET(request, { params }) {
  try {
    await dbConnect();
    
    const { slug } = params;
    
    console.log(`Fetching property with slug: ${slug} (by ${request.session.user.email})`);

    // A slug az original property ID (nem MongoDB _id)
    const property = await Property.findOne({ id: slug }).lean();
    
    if (!property) {
      return NextResponse.json({
        success: false,
        error: 'Ingatlan nem található',
        id: slug,
        requestedBy: request.session.user.email
      }, { status: 404 });
    }

    // Hasonló ingatlanok keresése (ugyanaz a típus és város)
    const similarProperties = await Property.find({
      id: { $ne: slug }, // Nem ugyanaz az ingatlan
      type: property.type,
      town: property.town
    })
    .select('id type price formatted_price town images')
    .limit(3)
    .lean();

    return NextResponse.json({
      success: true,
      data: property,
      similar: similarProperties,
      // Admin audit info
      requestedBy: request.session.user.email,
      requestedAt: new Date(),
      similarCount: similarProperties.length,
      message: `Property details loaded for ${slug}`
    });

  } catch (error) {
    console.error('Property detail GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'Adatlekérési hiba',
      details: error.message,
      requestedBy: request.session?.user?.email
    }, { status: 500 });
  }
}

// Védett export
export const GET = withAdminAuth(handleGET);