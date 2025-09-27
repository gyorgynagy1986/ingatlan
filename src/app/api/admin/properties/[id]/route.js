import { NextResponse } from "next/server";
import dbConnect from "../../../../../lib/db";
import Property from "../../../../../models/Property";
import { withAdminAuth } from "../../../../../lib/auth-helper";
import { revalidatePath } from "next/cache";

// GET - Egyedi property lekérés szerkesztéshez
async function handleGET(request, { params }) {
  try {
    await dbConnect();

    const property = await Property.findOne({ id: params.id }).lean();

    if (!property) {
      return NextResponse.json(
        {
          success: false,
          error: "Property not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: property,
      requestedBy: request.session.user.email,
    });
  } catch (error) {
    console.error("Property GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Database error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT - Property frissítés
async function handlePUT(request, { params }) {
  try {
    await dbConnect();

    const updateData = await request.json();

    // Validation - kötelező mezők ellenőrzése
    if (!updateData.price || !updateData.type) {
      return NextResponse.json(
        {
          success: false,
          error: "Price and type are required",
        },
        { status: 400 }
      );
    }

    // Frissített adatok előkészítése
    const processedData = {
      ...updateData,
      // Audit trail - ki módosította
      updatedBy: request.session.user.id || request.session.user.email,
      updatedAt: new Date(),
      // Automatikus formázott mezők újragenerálása
      formatted_price: `${updateData.price.toLocaleString("hu-HU")} ${
        updateData.currency || "EUR"
      }`,
      formatted_date: updateData.date
        ? new Date(updateData.date).toLocaleDateString("hu-HU")
        : undefined,
    };

    const updatedProperty = await Property.findOneAndUpdate(
      { id: params.id },
      { $set: processedData },
      { new: true, lean: true }
    );

    revalidatePath("/api/public/properties");

    if (!updatedProperty) {
      return NextResponse.json(
        {
          success: false,
          error: "Property not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedProperty,
      message: "Property updated successfully",
      updatedBy: request.session.user.email,
    });
  } catch (error) {
    console.error("Property UPDATE error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Update failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE - Property törlés
async function handleDELETE(request, { params }) {
  try {
    await dbConnect();

    const deletedProperty = await Property.findOneAndDelete({ id: params.id });

    if (!deletedProperty) {
      return NextResponse.json(
        {
          success: false,
          error: "Property not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Property deleted successfully",
      deletedId: params.id,
      deletedBy: request.session.user.email,
      deletedAt: new Date(),
    });
  } catch (error) {
    console.error("Property DELETE error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Delete failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Védett exportok
export const GET = withAdminAuth(handleGET);
export const PUT = withAdminAuth(handlePUT);
export const DELETE = withAdminAuth(handleDELETE);
