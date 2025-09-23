import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import Property from "../../../models/Property";

export async function PATCH(request) {
  try {
    const { propertyId, fieldName, newValue } = await request.json();

    if (!propertyId || !fieldName) {
      return NextResponse.json(
        { error: "propertyId és fieldName szükséges" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Ingatlan keresése
    const property = await Property.findOne({ id: propertyId });
    if (!property) {
      return NextResponse.json(
        { error: `Ingatlan nem található: ${propertyId}` },
        { status: 404 }
      );
    }

    // Mező frissítése
    const updateData = {};
    updateData[fieldName] = newValue;

    const result = await Property.updateOne(
      { id: propertyId },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Frissítés nem sikerült" },
        { status: 400 }
      );
    }

    console.log(`✅ Property ${propertyId} - ${fieldName} frissítve: ${newValue}`);

    return NextResponse.json({
      success: true,
      message: `${fieldName} sikeresen frissítve`,
      propertyId,
      fieldName,
      newValue,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error("💥 Property field update error:", error);
    return NextResponse.json(
      { error: "Frissítési hiba", details: error.message },
      { status: 500 }
    );
  }
}