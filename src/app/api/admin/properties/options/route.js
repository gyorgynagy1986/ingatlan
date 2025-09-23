import { NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/db';
import Property from '../../../../../models/Property';
import { withAdminAuth } from '../../../../../lib/auth-helper';

async function handleGET(request) {
  try {
    await dbConnect();

    // Párhuzamos lekérdezések a distinct értékekhez
    const [
      types,
      towns,
      provinces,
      countries,
      agencies,
      energyRatings
    ] = await Promise.all([
      Property.distinct('type').then(values => values.filter(v => v)),
      Property.distinct('town').then(values => values.filter(v => v)),
      Property.distinct('province').then(values => values.filter(v => v)),
      Property.distinct('country').then(values => values.filter(v => v)),
      Property.distinct('agencia').then(values => values.filter(v => v)),
      Property.distinct('energy_rating').then(values => values.filter(v => v))
    ]);

    // Ár statisztikák
    const priceStats = await Property.aggregate([
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          avgPrice: { $avg: '$price' }
        }
      }
    ]);

    // Szoba/fürdő statisztikák
    const roomStats = await Property.aggregate([
      {
        $group: {
          _id: null,
          minBeds: { $min: '$beds' },
          maxBeds: { $max: '$beds' },
          minBaths: { $min: '$baths' },
          maxBaths: { $max: '$baths' },
          minSurface: { $min: '$surface_area' },
          maxSurface: { $max: '$surface_area' }
        }
      }
    ]);

    // Összes property szám lekérdezések párhuzamosan
    const [totalProperties, poolProperties, newBuildProperties] = await Promise.all([
      Property.countDocuments(),
      Property.countDocuments({ pool: 1 }),
      Property.countDocuments({ new_build: 1 })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        // Dropdown opciók
        types: types.sort(),
        towns: towns.sort(),
        provinces: provinces.sort(),
        countries: countries.sort(),
        agencies: agencies.sort(),
        energyRatings: energyRatings.sort(),
        
        // Statisztikák a range slider-ekhez
        priceRange: priceStats[0] || { minPrice: 0, maxPrice: 10000000, avgPrice: 0 },
        roomRange: roomStats[0] || { 
          minBeds: 1, maxBeds: 10, 
          minBaths: 1, maxBaths: 10,
          minSurface: 50, maxSurface: 1000 
        },

        // Számok
        totalProperties,
        poolProperties,
        newBuildProperties
      },
      // Admin audit info
      requestedBy: request.session.user.email,
      requestedAt: new Date(),
      message: 'Property options loaded successfully'
    });

  } catch (error) {
    console.error('Property options GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'Opciók lekérési hiba',
      details: error.message
    }, { status: 500 });
  }
}

// Védett export
export const GET = withAdminAuth(handleGET);