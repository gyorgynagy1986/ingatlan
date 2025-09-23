// app/api/upload-properties/route.js

import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import Property from "../../../models/Property";

export async function POST(request) {
  try {
    // JSON adat kinyerése a kérésből
    const { properties } = await request.json();

    // Alapvető validáció
    if (!properties || !Array.isArray(properties) || properties.length === 0) {
      return NextResponse.json(
        {
          error: "Érvényes ingatlan adatok szükségesek (properties tömb)",
        },
        { status: 400 }
      );
    }

    console.log(`🚀 Feltöltés kezdése: ${properties.length} ingatlan`);

    // Ingatlanok validálása
    const validationErrors = validateProperties(properties);
    if (validationErrors.length > 0) {
      console.log("❌ Validációs hibák:", validationErrors);
      return NextResponse.json(
        {
          error: "Validációs hibák találhatók",
          details: validationErrors.slice(0, 5), // Csak az első 5 hibát küldjük vissza
        },
        { status: 400 }
      );
    }

    // Adatbázisba mentés
    const result = await savePropertiesToDatabase(properties);

    const responseMessage =
      result.insertedCount > 0
        ? `Sikeresen feltöltve ${result.insertedCount} ingatlan`
        : "Nem került új ingatlan mentésre";

    if (result.duplicates && result.duplicates.length > 0) {
      console.log(`⚠️ Duplikált ingatlanok:`, result.duplicates);
    }

    console.log(
      `✅ Feltöltés befejezve: ${result.insertedCount}/${properties.length} siker`
    );

    return NextResponse.json({
      success: true,
      message: responseMessage,
      insertedCount: result.insertedCount,
      totalCount: properties.length,
      duplicateCount: result.duplicates?.length || 0,
      insertedIds: result.insertedIds || [],
      duplicates: result.duplicates || [],
      errors: result.errors || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("💥 Upload error:", error);

    return NextResponse.json(
      {
        error: "Hiba történt a feltöltés során",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Ingatlanok validálása feltöltés előtt
 */
function validateProperties(properties) {
  const errors = [];
  const seenIds = new Set();

  properties.forEach((property, index) => {
    const propertyErrors = [];

    // Kötelező mezők a Property schemád alapján
    if (!property.id) {
      propertyErrors.push("Hiányzó ID");
    } else if (seenIds.has(property.id)) {
      propertyErrors.push(`Duplikált ID: ${property.id}`);
    } else {
      seenIds.add(property.id);
    }

    if (!property.date) {
      propertyErrors.push("Hiányzó dátum");
    }

    if (!property.price || typeof property.price !== "number") {
      propertyErrors.push("Hiányzó vagy érvénytelen ár");
    }

    if (!property.type) {
      propertyErrors.push("Hiányzó ingatlan típus");
    }

    // Images validáció
    if (property.images) {
      if (!Array.isArray(property.images)) {
        propertyErrors.push("Images mező tömbként kell megadni");
      } else {
        property.images.forEach((img, imgIndex) => {
          if (!img.url) {
            propertyErrors.push(`Images[${imgIndex}]: hiányzó URL`);
          }
        });
      }
    }

    // Features validáció
    if (property.features) {
      if (!Array.isArray(property.features)) {
        propertyErrors.push("Features mező tömbként kell megadni");
      } else {
        property.features.forEach((feature, featureIndex) => {
          if (!feature.name) {
            propertyErrors.push(`Features[${featureIndex}]: hiányzó név`);
          }
        });
      }
    }

    // Ha vannak hibák, adjuk hozzá a listához
    if (propertyErrors.length > 0) {
      errors.push({
        index: index,
        id: property.id || "N/A",
        errors: propertyErrors,
      });
    }
  });

  return errors;
}

/**
 * Adatbázisba mentés MongoDB-vel a meglévő Property modellel
 */
async function savePropertiesToDatabase(properties) {
  try {
    // Kapcsolódás a MongoDB-hez
    await dbConnect();
    console.log("🔗 MongoDB kapcsolat létrehozva");

    // Ellenőrizzük, hogy az ID-k már léteznek-e az adatbázisban
    const propertyIds = properties.map((p) => p.id);
    const existingProperties = await Property.find({
      id: { $in: propertyIds },
    }).select("id");
    const existingIds = new Set(existingProperties.map((p) => p.id));

    console.log(
      `🔍 Ellenőrzés: ${existingIds.size} már létező ID találva ${propertyIds.length}-ból`
    );

    // Szűrjük ki a már létező ID-kat
    const newProperties = properties.filter((p) => !existingIds.has(p.id));
    const duplicateProperties = properties.filter((p) => existingIds.has(p.id));

    // Ha nincs új ingatlan, térjünk vissza a duplikáció infóval
    if (newProperties.length === 0) {
      console.log("⚠️ Minden ingatlan már létezik az adatbázisban");
      return {
        insertedCount: 0,
        insertedIds: [],
        errors: [
          `Mind a ${properties.length} ingatlan már létezik az adatbázisban`,
        ],
        duplicates: duplicateProperties.map((p) => ({
          id: p.id,
          title: p.title_extra || `${p.type} - ${p.town}`,
        })),
      };
    }

    // Batch insert a új ingatlanokkal
    const results = await Property.insertMany(newProperties, {
      ordered: false, // Folytatjuk akkor is, ha egy beszúrás sikertelen
      rawResult: true, // Részletes eredmény visszaadása
    });

    console.log(`✅ ${results.insertedCount} új ingatlan sikeresen mentve`);

    if (duplicateProperties.length > 0) {
      console.log(
        `⚠️ ${duplicateProperties.length} duplikált ingatlan kihagyva`
      );
    }

    return {
      insertedCount: results.insertedCount,
      insertedIds: Object.values(results.insertedIds),
      errors:
        duplicateProperties.length > 0
          ? [
              `${duplicateProperties.length} ingatlan már létezett az adatbázisban`,
            ]
          : [],
      duplicates: duplicateProperties.map((p) => ({
        id: p.id,
        title: p.title_extra || `${p.type} - ${p.town}`,
      })),
    };
  } catch (error) {
    console.error("💥 MongoDB mentési hiba:", error);

    // MongoDB insert hibák kezelése
    if (error.name === "BulkWriteError") {
      const successfulInserts = error.result?.nInserted || 0;
      const writeErrors = error.writeErrors || [];

      console.log(`⚠️ Bulk write hibák: ${writeErrors.length}`);
      console.log(`✅ Sikeresen beszúrva: ${successfulInserts}`);

      // Elemezzük a hibákat
      const duplicateErrors = writeErrors.filter((e) => e.code === 11000);
      const otherErrors = writeErrors.filter((e) => e.code !== 11000);

      const errorMessages = [];
      if (duplicateErrors.length > 0) {
        errorMessages.push(`${duplicateErrors.length} duplikált ingatlan`);
      }
      if (otherErrors.length > 0) {
        errorMessages.push(`${otherErrors.length} egyéb hiba`);
      }

      return {
        insertedCount: successfulInserts,
        insertedIds: [], // MongoDB nem adja vissza az ID-kat hiba esetén
        errors: errorMessages,
        writeErrors: writeErrors.map((e) => ({
          index: e.index,
          code: e.code,
          message: e.errmsg,
        })),
      };
    }

    // Egyéb hibák
    throw new Error(`MongoDB hiba: ${error.message}`);
  }
}
