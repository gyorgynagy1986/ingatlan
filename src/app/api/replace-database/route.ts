import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import Property from "../../../models/Property";
import { withAdminAuth, AuthenticatedRequest } from "../../../lib/auth-helper";

async function handlePOST(request: AuthenticatedRequest): Promise<NextResponse> {
  try {
    const { properties } = await request.json();

    // Validáció
    if (!properties || !Array.isArray(properties) || properties.length === 0) {
      return NextResponse.json(
        { error: "Érvényes ingatlan adatok szükségesek (properties tömb)" },
        { status: 400 }
      );
    }

    const adminUser = request.session.user.email;
    console.log(`🚀 Adatbázis frissítés kezdése (${adminUser}): ${properties.length} ingatlan`);

    await dbConnect();

    // Statisztikák
    const stats = {
      processed: 0,
      inserted: 0,
      updated: 0,
      errors: 0,
      errorDetails: [] as Array<{ id?: string; error: string; data?: unknown }>
    };

    // Minden ingatlan feldolgozása egyenként
    for (const propertyData of properties) {
      try {
        stats.processed++;

        if (!propertyData.id) {
          stats.errors++;
          stats.errorDetails.push({
            error: "Hiányzó ID",
            data: propertyData
          });
          continue;
        }

        // Ellenőrizzük, hogy létezik-e már ez az ID
        const existingProperty = await Property.findOne({ id: propertyData.id });

        if (existingProperty) {
          // FRISSÍTÉS - csak a változott mezők
          const updateData: Record<string, unknown> = {};
          let hasChanges = false;

          // Végigmegyünk az új adatok minden mezőjén
          for (const [key, value] of Object.entries(propertyData)) {
            if (key === 'id') continue; // ID-t nem frissítjük

            // Összehasonlítjuk a régi és új értéket
            const oldValue = existingProperty[key];
            
            // Deep comparison objektumokhoz és tömbökhöz
            if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
              updateData[key] = value;
              hasChanges = true;
            }
          }

          if (hasChanges) {
            // Audit trail hozzáadása
            updateData.updatedBy = adminUser;
            updateData.updatedAt = new Date();
            updateData.lastBulkUpdate = {
              updatedBy: adminUser,
              updatedAt: new Date(),
              fieldsChanged: Object.keys(updateData).filter(key => 
                !['updatedBy', 'updatedAt', 'lastBulkUpdate'].includes(key)
              )
            };

            await Property.updateOne(
              { id: propertyData.id },
              { $set: updateData }
            );
            stats.updated++;
            console.log(`📝 Frissítve (${adminUser}): ${propertyData.id} (${Object.keys(updateData).length - 3} mező)`);
          }

        } else {
          // BESZÚRÁS - új ingatlan audit trail-lel
          const newPropertyData = {
            ...propertyData,
            createdBy: adminUser,
            createdAt: new Date(),
            updatedBy: adminUser,
            updatedAt: new Date()
          };

          await Property.create(newPropertyData);
          stats.inserted++;
          console.log(`➕ Új ingatlan (${adminUser}): ${propertyData.id}`);
        }

      } catch (error) {
        stats.errors++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        stats.errorDetails.push({
          id: propertyData.id || 'N/A',
          error: errorMessage
        });
        console.error(`❌ Hiba ${propertyData.id} (${adminUser}):`, errorMessage);
      }
    }

    console.log(`✅ Adatbázis frissítés befejezve (${adminUser}): ${stats.inserted} új, ${stats.updated} frissített, ${stats.errors} hiba`);

    const success = stats.errors === 0;

    return NextResponse.json({
      success,
      message: success 
        ? `Sikeresen feldolgozva mind a ${stats.processed} ingatlan`
        : `${stats.processed - stats.errors}/${stats.processed} ingatlan sikeresen feldolgozva`,
      stats: {
        totalProcessed: stats.processed,
        newProperties: stats.inserted,
        updatedProperties: stats.updated,
        errorCount: stats.errors
      },
      errors: stats.errors > 0 ? stats.errorDetails.slice(0, 10) : [],
      // Admin audit info
      processedBy: adminUser,
      processedAt: new Date(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("💥 Database update error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      {
        error: "Adatbázis frissítési hiba",
        details: errorMessage,
        processedBy: request.session?.user?.email,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Védett export
export const POST = withAdminAuth(handlePOST);

/* 
BULK UPSERT ENDPOINT

Ez az endpoint tömeges ingatlan import/update műveletekhez készült.
Csak adminok használhatják.

Funkcionalitás:
- Új ingatlanok létrehozása
- Meglévő ingatlanok frissítése (csak változott mezők)
- Részletes audit trail
- Hibakezelés és statisztikák

Használat:
POST /api/properties/bulk-upsert
{
  "properties": [
    { "id": "123", "price": 100000, ... },
    { "id": "456", "price": 200000, ... }
  ]
}

Response: Statisztikák és eredmények
*/