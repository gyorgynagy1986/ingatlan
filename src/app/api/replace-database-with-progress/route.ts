import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import Property from "../../../models/Property";
import { withAdminAuth, AuthenticatedRequest } from "../../../lib/auth-helper";

interface StreamData {
  type: 'info' | 'progress' | 'error' | 'complete';
  message?: string;
  processed?: number;
  total?: number;
  action?: string;
  id?: string;
  fields?: number;
  stats?: {
    processed: number;
    inserted: number;
    updated: number;
    errors: number;
    errorDetails: Array<{ id?: string; error: string; data?: unknown }>;
  };
  success?: boolean;
  fatal?: boolean;
}

async function handlePOST(request: AuthenticatedRequest): Promise<Response> {
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
    console.log(`🚀 Streaming adatbázis frissítés kezdése (${adminUser}): ${properties.length} ingatlan`);

    // Streaming response létrehozása
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendData = (data: StreamData) => {
          const chunk = encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
          controller.enqueue(chunk);
        };

        try {
          await dbConnect();
          sendData({ 
            type: 'info', 
            message: `Adatbázis kapcsolat létrehozva (${adminUser})` 
          });

          // Statisztikák
          const stats = {
            processed: 0,
            inserted: 0,
            updated: 0,
            errors: 0,
            errorDetails: [] as Array<{ id?: string; error: string; data?: unknown }>
          };

          sendData({ 
            type: 'progress', 
            processed: 0, 
            total: properties.length,
            action: 'Kezdés',
            stats
          });

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
                
                sendData({
                  type: 'error',
                  id: 'N/A',
                  message: 'Hiányzó ID',
                  processed: stats.processed,
                  total: properties.length
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
                  updateData.lastStreamingUpdate = {
                    updatedBy: adminUser,
                    updatedAt: new Date(),
                    fieldsChanged: Object.keys(updateData).filter(key => 
                      !['updatedBy', 'updatedAt', 'lastStreamingUpdate'].includes(key)
                    )
                  };

                  await Property.updateOne(
                    { id: propertyData.id },
                    { $set: updateData }
                  );
                  stats.updated++;
                  
                  sendData({
                    type: 'progress',
                    processed: stats.processed,
                    total: properties.length,
                    action: 'Frissítve',
                    id: propertyData.id,
                    fields: Object.keys(updateData).length - 3, // Audit mezők levonása
                    stats
                  });
                  
                  console.log(`📝 Frissítve (${adminUser}): ${propertyData.id} (${Object.keys(updateData).length - 3} mező)`);
                } else {
                  sendData({
                    type: 'progress',
                    processed: stats.processed,
                    total: properties.length,
                    action: 'Változatlan',
                    id: propertyData.id,
                    stats
                  });
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
                
                sendData({
                  type: 'progress',
                  processed: stats.processed,
                  total: properties.length,
                  action: 'Új beszúrás',
                  id: propertyData.id,
                  stats
                });
                
                console.log(`➕ Új ingatlan (${adminUser}): ${propertyData.id}`);
              }

              // Kis késleltetés a túl gyors stream elkerülésére
              if (stats.processed % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 50));
              }

            } catch (error) {
              stats.errors++;
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              stats.errorDetails.push({
                id: propertyData.id || 'N/A',
                error: errorMessage
              });
              
              sendData({
                type: 'error',
                id: propertyData.id || 'N/A',
                message: errorMessage,
                processed: stats.processed,
                total: properties.length,
                stats
              });
              
              console.error(`❌ Hiba ${propertyData.id} (${adminUser}):`, errorMessage);
            }
          }

          // Befejezési üzenet
          console.log(`✅ Streaming adatbázis frissítés befejezve (${adminUser}): ${stats.inserted} új, ${stats.updated} frissített, ${stats.errors} hiba`);
          
          sendData({
            type: 'complete',
            message: `Adatbázis frissítés befejezve (${adminUser})`,
            stats: stats,
            success: stats.errors === 0
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error("💥 Streaming database update error:", error);
          sendData({
            type: 'error',
            message: `Adatbázis frissítési hiba: ${errorMessage}`,
            fatal: true
          });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        // Admin audit headers
        'X-Processed-By': adminUser,
        'X-Process-Start': new Date().toISOString(),
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("💥 Streaming setup error:", error);
    return NextResponse.json(
      {
        error: "Streaming adatbázis frissítési hiba",
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
STREAMING UPSERT ENDPOINT

Ez az endpoint real-time streaming bulk upsert műveletekhez készült.
Csak adminok használhatják.

Funkcionalitás:
- Real-time progress streaming (Server-Sent Events)
- Új ingatlanok létrehozása
- Meglévő ingatlanok frissítése (csak változott mezők)
- Részletes audit trail minden műveletnél
- Live hibakezelés és statisztikák

Használat:
POST /api/properties/streaming-upsert
{
  "properties": [
    { "id": "123", "price": 100000, ... },
    { "id": "456", "price": 200000, ... }
  ]
}

Response: Server-Sent Events stream
- progress events: minden feldolgozott ingatlan
- error events: hibák real-time
- complete event: végső statisztikák
*/