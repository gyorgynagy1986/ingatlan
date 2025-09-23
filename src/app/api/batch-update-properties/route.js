import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import Property from "../../../models/Property";
import { withAdminAuth } from "../../../lib/auth-helper";

async function handlePATCH(request) {
  try {
    const { changes } = await request.json();

    if (!changes || !Array.isArray(changes) || changes.length === 0) {
      return NextResponse.json(
        { error: "changes tömb szükséges" },
        { status: 400 }
      );
    }

    await dbConnect();

    const results = {
      successful: [],
      failed: [],
      totalCount: changes.length,
      successCount: 0,
      errorCount: 0
    };

    // Admin audit info
    const adminUser = request.session.user.email;
    console.log(`🚀 Batch update kezdése (${adminUser}): ${changes.length} változás`);

    // Minden változás feldolgozása
    for (const change of changes) {
      const { propertyId, fieldName, newValue, oldValue } = change;

      try {
        // Validáció
        if (!propertyId || !fieldName) {
          throw new Error("propertyId és fieldName szükséges");
        }

        // Ingatlan keresése
        const property = await Property.findOne({ id: propertyId });
        if (!property) {
          throw new Error(`Ingatlan nem található: ${propertyId}`);
        }

        // Frissítés audit trail-lel
        const updateData = {
          [fieldName]: newValue,
          // Batch update audit info
          lastBatchUpdate: {
            updatedBy: adminUser,
            updatedAt: new Date(),
            field: fieldName,
            oldValue: oldValue,
            newValue: newValue
          }
        };

        const result = await Property.updateOne(
          { id: propertyId },
          { $set: updateData }
        );

        if (result.modifiedCount > 0) {
          results.successful.push({
            propertyId,
            fieldName,
            newValue,
            oldValue,
            updatedBy: adminUser
          });
          results.successCount++;
        } else {
          throw new Error("Frissítés nem sikerült");
        }

      } catch (error) {
        results.failed.push({
          propertyId,
          fieldName,
          error: error.message
        });
        results.errorCount++;
        console.error(`❌ Batch update hiba (${adminUser}) - ${propertyId}.${fieldName}:`, error.message);
      }
    }

    console.log(`✅ Batch update befejezve (${adminUser}): ${results.successCount}/${results.totalCount} siker`);

    const success = results.errorCount === 0;

    return NextResponse.json({
      success,
      message: success 
        ? `Mind a ${results.successCount} változás sikeresen frissítve`
        : `${results.successCount}/${results.totalCount} változás frissítve. ${results.errorCount} hiba történt.`,
      results,
      // Admin audit info
      batchExecutedBy: adminUser,
      batchExecutedAt: new Date(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("💥 Batch update error:", error);
    return NextResponse.json(
      { 
        error: "Batch frissítési hiba", 
        details: error.message,
        executedBy: request.session?.user?.email 
      },
      { status: 500 }
    );
  }
}

// Védett export
export const PATCH = withAdminAuth(handlePATCH);