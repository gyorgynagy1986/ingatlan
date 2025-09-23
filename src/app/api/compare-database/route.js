import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/db';
import Property from '../../../models/Property';
import { withAdminAuth } from '../../../lib/auth-helper';

async function handlePOST(request) {
  try {
    const { jsonData } = await request.json();

    if (!jsonData || !Array.isArray(jsonData)) {
      return NextResponse.json(
        { error: 'jsonData tömb szükséges' },
        { status: 400 }
      );
    }

    // Adatbázis kapcsolat
    await dbConnect();

    // JSON-ból kinyerjük az ID-kat
    const jsonIds = jsonData.map(item => item.id).filter(Boolean);
    
    if (jsonIds.length === 0) {
      return NextResponse.json(
        { error: 'A JSON adatok nem tartalmaznak érvényes ID-kat' },
        { status: 400 }
      );
    }

    const adminUser = request.session.user.email;
    console.log(`🔍 Adatbázis összehasonlítás (${adminUser}): ${jsonIds.length} ingatlan a JSON-ban`);

    // Adatbázisból lekérjük a megfelelő ingatlanokat
    const databaseProperties = await Property.find({
      id: { $in: jsonIds }
    }).lean(); // .lean() a performance-ért

    console.log(`📊 Adatbázisban találva (${adminUser}): ${databaseProperties.length} ingatlan`);

    // Konvertáljuk a database objektumokat plain objektummá (Mongoose-tól mentesítve)
    const cleanDbData = databaseProperties.map(prop => {
      const cleanProp = { ...prop };
      // MongoDB specifikus mezők eltávolítása
      delete cleanProp._id;
      delete cleanProp.__v;
      delete cleanProp.createdAt;
      delete cleanProp.updatedAt;
      // Audit mezők eltávolítása az összehasonlításból
      delete cleanProp.updatedBy;
      delete cleanProp.lastBatchUpdate;
      return cleanProp;
    });

    // Összehasonlítás a comparePropertyData függvénnyel
    const comparison = comparePropertyData(cleanDbData, jsonData);

    // Extra info hozzáadása
    comparison.metadata = {
      databaseCount: cleanDbData.length,
      jsonCount: jsonData.length,
      searchedIds: jsonIds.length,
      comparisonType: 'database-vs-json',
      timestamp: new Date().toISOString(),
      // Admin audit info
      comparedBy: adminUser,
      comparedAt: new Date()
    };

    console.log(`✅ Összehasonlítás kész (${adminUser}): ${comparison.summary.totalModified} módosított, ${comparison.summary.totalAdded} új, ${comparison.summary.totalDeleted} törölt`);

    return NextResponse.json({
      success: true,
      ...comparison
    });

  } catch (error) {
    console.error('💥 Database comparison error:', error);
    return NextResponse.json(
      { 
        error: 'Hiba történt az adatbázis összehasonlítás során', 
        details: error.message,
        comparedBy: request.session?.user?.email 
      },
      { status: 500 }
    );
  }
}

// Újrahasznosítjuk az eredeti összehasonlító logikát
function comparePropertyData(oldData, newData) {
  // ID alapján csoportosítás
  const oldMap = new Map();
  const newMap = new Map();
  
  oldData.forEach(item => oldMap.set(item.id, item));
  newData.forEach(item => newMap.set(item.id, item));
  
  const result = {
    modified: [],
    deleted: [],
    added: [],
    summary: {
      totalModified: 0,
      totalDeleted: 0,
      totalAdded: 0
    }
  };

  // Módosított és törölt elemek keresése
  oldMap.forEach((oldItem, id) => {
    if (newMap.has(id)) {
      const newItem = newMap.get(id);
      const changes = findChanges(oldItem, newItem);
      if (changes.length > 0) {
        result.modified.push({
          id: id,
          changes: changes,
          oldData: oldItem,
          newData: newItem
        });
      }
    } else {
      result.deleted.push({
        id: id,
        data: oldItem
      });
    }
  });

  // Új elemek keresése
  newMap.forEach((newItem, id) => {
    if (!oldMap.has(id)) {
      result.added.push({
        id: id,
        data: newItem
      });
    }
  });

  // Összesítő számok
  result.summary.totalModified = result.modified.length;
  result.summary.totalDeleted = result.deleted.length;
  result.summary.totalAdded = result.added.length;

  return result;
}

function findChanges(oldItem, newItem, path = '') {
  const changes = [];
  const allKeys = new Set([...Object.keys(oldItem), ...Object.keys(newItem)]);

  allKeys.forEach(key => {
    const currentPath = path ? `${path}.${key}` : key;
    const oldValue = oldItem[key];
    const newValue = newItem[key];

    // Speciális kezelés képekhez
    if (key === 'images') {
      const imageChanges = compareImages(oldValue, newValue);
      if (imageChanges.length > 0) {
        changes.push({
          field: currentPath,
          type: 'images_modified',
          details: imageChanges,
          oldCount: oldValue?.length || 0,
          newCount: newValue?.length || 0,
          oldUrls: oldValue?.map(img => img.url) || [],
          newUrls: newValue?.map(img => img.url) || []
        });
      }
      return;
    }

    // Speciális kezelés features-höz
    if (key === 'features') {
      const featureChanges = compareFeatures(oldValue, newValue);
      if (featureChanges.length > 0) {
        changes.push({
          field: currentPath,
          type: 'features_modified',
          details: featureChanges
        });
      }
      return;
    }

    // Tömbök összehasonlítása
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: currentPath,
          type: 'array_modified',
          oldValue: oldValue,
          newValue: newValue,
          oldLength: oldValue.length,
          newLength: newValue.length
        });
      }
      return;
    }

    // Objektumok összehasonlítása
    if (typeof oldValue === 'object' && typeof newValue === 'object' && 
        oldValue !== null && newValue !== null) {
      const nestedChanges = findChanges(oldValue, newValue, currentPath);
      changes.push(...nestedChanges);
      return;
    }

    // Primitív értékek összehasonlítása
    if (oldValue !== newValue) {
      let changeType = 'modified';
      if (oldValue === undefined) changeType = 'added';
      if (newValue === undefined) changeType = 'removed';

      changes.push({
        field: currentPath,
        type: changeType,
        oldValue: oldValue,
        newValue: newValue
      });
    }
  });

  return changes;
}

function compareImages(oldImages = [], newImages = []) {
  const changes = [];
  const oldUrls = new Set(oldImages.map(img => img.url));
  const newUrls = new Set(newImages.map(img => img.url));

  // Törölt képek
  const deletedImages = oldImages.filter(img => !newUrls.has(img.url));
  if (deletedImages.length > 0) {
    changes.push({
      type: 'deleted',
      count: deletedImages.length,
      images: deletedImages,
      urls: deletedImages.map(img => img.url)
    });
  }

  // Új képek
  const addedImages = newImages.filter(img => !oldUrls.has(img.url));
  if (addedImages.length > 0) {
    changes.push({
      type: 'added',
      count: addedImages.length,
      images: addedImages,
      urls: addedImages.map(img => img.url)
    });
  }

  // Módosított képek (ugyanaz az URL, de más adatok)
  // FONTOS: cover mező kizárása az összehasonlításból
  oldImages.forEach(oldImg => {
    const newImg = newImages.find(img => img.url === oldImg.url);
    if (newImg) {
      // Cover mező nélküli összehasonlítás
      const oldImgFiltered = { ...oldImg };
      const newImgFiltered = { ...newImg };
      delete oldImgFiltered.cover;
      delete newImgFiltered.cover;
      
      if (JSON.stringify(oldImgFiltered) !== JSON.stringify(newImgFiltered)) {
        changes.push({
          type: 'modified',
          url: oldImg.url,
          oldData: oldImg,
          newData: newImg
        });
      }
    }
  });

  return changes;
}

function compareFeatures(oldFeatures = [], newFeatures = []) {
  const changes = [];
  const oldNames = new Set(oldFeatures.map(f => f.name));
  const newNames = new Set(newFeatures.map(f => f.name));

  // Törölt tulajdonságok
  const removedFeatures = oldFeatures.filter(f => !newNames.has(f.name));
  if (removedFeatures.length > 0) {
    changes.push({
      type: 'removed',
      features: removedFeatures
    });
  }

  // Új tulajdonságok
  const addedFeatures = newFeatures.filter(f => !oldNames.has(f.name));
  if (addedFeatures.length > 0) {
    changes.push({
      type: 'added',
      features: addedFeatures
    });
  }

  return changes;
}

// Védett export
export const POST = withAdminAuth(handlePOST);