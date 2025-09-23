import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import Property from '../../../../models/Property';
import { withAdminAuth } from '../../../../lib/auth-helper';

async function handleGET(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    
    // Paginálás paraméterek
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = 10; // Fix 10-es paginálás
    const skip = (page - 1) * limit;
    
    // Filter objektum építése
    const filter = {};
    
    // ID alapú keresés (eredeti funkció)
    const searchId = searchParams.get('id');
    if (searchId) {
      filter.id = new RegExp(searchId, 'i');
    }

    // Szöveges szűrők - részleges egyezés, case insensitive
    const type = searchParams.get('type');
    if (type) {
      filter.type = new RegExp(type, 'i');
    }

    const town = searchParams.get('town');
    if (town) {
      filter.town = new RegExp(town, 'i');
    }

    const province = searchParams.get('province');
    if (province) {
      filter.province = new RegExp(province, 'i');
    }

    const country = searchParams.get('country');
    if (country) {
      filter.country = new RegExp(country, 'i');
    }

    const agencia = searchParams.get('agencia');
    if (agencia) {
      filter.agencia = new RegExp(agencia, 'i');
    }

    // Ár tartomány szűrés
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseInt(minPrice);
      if (maxPrice) filter.price.$lte = parseInt(maxPrice);
    }

    // Szobaszám tartomány
    const minBeds = searchParams.get('minBeds');
    const maxBeds = searchParams.get('maxBeds');
    if (minBeds || maxBeds) {
      filter.beds = {};
      if (minBeds) filter.beds.$gte = parseInt(minBeds);
      if (maxBeds) filter.beds.$lte = parseInt(maxBeds);
    }

    // Fürdőszobák tartomány
    const minBaths = searchParams.get('minBaths');
    const maxBaths = searchParams.get('maxBaths');
    if (minBaths || maxBaths) {
      filter.baths = {};
      if (minBaths) filter.baths.$gte = parseInt(minBaths);
      if (maxBaths) filter.baths.$lte = parseInt(maxBaths);
    }

    // Alapterület tartomány
    const minSurface = searchParams.get('min_surface_area');
    const maxSurface = searchParams.get('max_surface_area');
    if (minSurface || maxSurface) {
      filter.surface_area = {};
      if (minSurface) filter.surface_area.$gte = parseInt(minSurface);
      if (maxSurface) filter.surface_area.$lte = parseInt(maxSurface);
    }

    // Boolean szűrők - pontos egyezés
    const pool = searchParams.get('pool');
    if (pool !== null && pool !== '' && pool !== undefined) {
      filter.pool = parseInt(pool);
    }

    const newBuild = searchParams.get('new_build');
    if (newBuild !== null && newBuild !== '' && newBuild !== undefined) {
      filter.new_build = parseInt(newBuild);
    }

    const partOwnership = searchParams.get('part_ownership');
    if (partOwnership !== null && partOwnership !== '' && partOwnership !== undefined) {
      filter.part_ownership = parseInt(partOwnership);
    }

    const leasehold = searchParams.get('leasehold');
    if (leasehold !== null && leasehold !== '' && leasehold !== undefined) {
      filter.leasehold = parseInt(leasehold);
    }

    // Energetikai besorolás
    const energyRating = searchParams.get('energy_rating');
    if (energyRating) {
      filter.energy_rating = energyRating;
    }

    // Debug log - csak development környezetben
    if (process.env.NODE_ENV === 'development') {
      console.log('Applied filters:', filter);
      console.log('Requested by admin:', request.session.user.email);
    }

    // Párhuzamos lekérdezések
    const [properties, totalCount] = await Promise.all([
      Property.find(filter)
        .sort({ createdAt: -1 }) // Legújabbak először
        .skip(skip)
        .limit(limit)
        .lean(),
      Property.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    // Aktív szűrők számolása (debug célokra)
    const activeFilters = Object.keys(filter).length;

    return NextResponse.json({
      success: true,
      data: properties,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      search: {
        id: searchId || null,
        activeFilters,
        appliedFilters: process.env.NODE_ENV === 'development' ? filter : undefined
      },
      // Admin audit info
      requestedBy: request.session.user.email,
      requestedAt: new Date(),
      message: `Found ${totalCount} properties with ${activeFilters} filters applied`
    });

  } catch (error) {
    console.error('Admin properties GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'Admin adatlekérési hiba',
      details: error.message
    }, { status: 500 });
  }
}

// Védett export
export const GET = withAdminAuth(handleGET)