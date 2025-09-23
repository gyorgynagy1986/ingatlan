import { NextResponse } from 'next/server';
import { withAdminAuth } from '../../../lib/auth-helper';

async function handlePOST(request) {
  try {
    const { oldData, newData } = await request.json();

    if (!oldData || !newData) {
      return NextResponse.json(
        { error: 'oldData és newData mezők szükségesek' }, 
        { status: 400 }
      );
    }

    const comparison = comparePropertyData(oldData, newData);
    
    return NextResponse.json({
      success: true,
      ...comparison,
      // Admin audit info
      comparedBy: request.session.user.email,
      comparedAt: new Date(),
      dataInfo: {
        oldDataCount: oldData.length,
        newDataCount: newData.length
      }
    });
  } catch (error) {
    console.error('Compare error by', request.session?.user?.email, ':', error);
    return NextResponse.json(
      { 
        error: 'Hiba történt az összehasonlítás során', 
        details: error.message,
        comparedBy: request.session?.user?.email 
      },
      { status: 500 }
    );
  }
}

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
  oldImages.forEach(oldImg => {
    const newImg = newImages.find(img => img.url === oldImg.url);
    if (newImg && JSON.stringify(oldImg) !== JSON.stringify(newImg)) {
      changes.push({
        type: 'modified',
        url: oldImg.url,
        oldData: oldImg,
        newData: newImg
      });
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

/* 
HASZNÁLAT APP ROUTER-BEN:

Fájl helye: app/api/compare/route.js

POST kérés: /api/compare
{
  "oldData": [...],
  "newData": [...]
}

VÁLASZ:
{
  "success": true,
  "modified": [...],
  "deleted": [...],
  "added": [...],
  "summary": {...},
  "comparedBy": "admin@example.com",
  "comparedAt": "2024-01-01T00:00:00.000Z",
  "dataInfo": {
    "oldDataCount": 150,
    "newDataCount": 155
  }
}
*/