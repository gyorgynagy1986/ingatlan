import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import Property from "../../../models/Property";
import { withAdminAuth } from "../../../lib/auth-helper";

async function handleGET(request) {
  try {
    await dbConnect();

    const adminUser = request.session.user.email;
    console.log(`🔍 Adatbázis export kezdése (${adminUser})...`);

    // Összes ingatlan lekérése az adatbázisból
    const properties = await Property.find({}).lean();

    // MongoDB specifikus mezők eltávolítása
    const cleanProperties = properties.map((prop) => {
      const cleanProp = { ...prop };
      delete cleanProp._id;
      delete cleanProp.__v;
      delete cleanProp.createdAt;
      delete cleanProp.updatedAt;
      // Audit mezők eltávolítása az export-ból (opcionális)
      delete cleanProp.updatedBy;
      delete cleanProp.lastBatchUpdate;
      return cleanProp;
    });

    console.log(
      `✅ Export sikeres (${adminUser}): ${cleanProperties.length} ingatlan exportálva`
    );

    return NextResponse.json({
      success: true,
      count: cleanProperties.length,
      properties: cleanProperties,
      exportDate: new Date().toISOString(),
      message: `Sikeresen exportálva ${cleanProperties.length} ingatlan`,
      // Admin audit info
      exportedBy: adminUser,
      exportedAt: new Date(),
      exportType: "full_database_export",
    });
  } catch (error) {
    console.error("💥 Database export error:", error);
    return NextResponse.json(
      {
        error: "Adatbázis export hiba",
        details: error.message,
        timestamp: new Date().toISOString(),
        exportedBy: request.session?.user?.email,
      },
      { status: 500 }
    );
  }
}

// Védett export
export const GET = withAdminAuth(handleGET);
