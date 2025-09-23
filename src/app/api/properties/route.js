import { NextResponse } from "next/server";
import dbConnect from "../../../lib/db";
import Property from "../../../models/Property";
import { withAdminAuth } from "../../../lib/auth-helper";

// Eredeti handler függvények
async function handleGET(request) {
  try {
    await dbConnect();

    const properties = await Property.find({}).sort({ createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      data: properties,
      count: properties.length,
      user: request.session.user.email // A session elérhető a request-ből
    });
  } catch (error) {
    console.error("Properties GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Adatlekérési hiba",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

async function handlePOST(request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    
    const property = new Property({
      ...body,
      createdBy: request.session.user.id || request.session.user.email
    });
    
    await property.save();

    return NextResponse.json({
      success: true,
      data: property,
      message: "Ingatlan sikeresen létrehozva"
    }, { status: 201 });
  } catch (error) {
    console.error("Property POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Létrehozási hiba",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Védett exportok
export const GET = withAdminAuth(handleGET);
export const POST = withAdminAuth(handlePOST);

// Vagy közvetlenül:
// export async function GET(request) {
//   return withAdminAuth(handleGET)(request);
// }