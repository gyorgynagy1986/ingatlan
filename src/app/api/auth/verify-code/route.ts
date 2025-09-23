// app/api/auth/verify-code/route.ts

import { NextRequest, NextResponse } from "next/server";
import { validateVerificationCode } from "../../../../lib/auth";
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

// Type for the verification request body
interface VerificationRequest {
  email: string;
  code: string;
}

// Type for user data
interface UserData {
  _id?: ObjectId;
  email: string;
  password: string;
  name: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

// Type for the response user
interface ResponseUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerificationRequest = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { success: false, message: "Email and code are required" },
        { status: 400 }
      );
    }

    // ELSŐ LÉPÉS: Ellenőrizzük, hogy a felhasználó létezik-e
    const client = await clientPromise;
    const db = client.db();
    
    const user: UserData | null = (await db
      .collection("users")
      .findOne({ email })) as UserData | null;

    // Ha a felhasználó nem létezik, egyből hibát adunk vissza
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Az email cím nincs regisztrálva a rendszerben",
          code: "NOT_REGISTERED",
        },
        { status: 404 }
      );
    }

    // MÁSODIK LÉPÉS: Ellenőrizzük a kód érvényességét 
    // (csak akkor, ha a felhasználó létezik)
    const isValid = await validateVerificationCode(email, code);

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: "Érvénytelen vagy lejárt verifikációs kód" },
        { status: 400 }
      );
    }

    // Return success with the user info
    const responseUser: ResponseUser = {
      id: user._id ? user._id.toString() : "",
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return NextResponse.json({
      success: true,
      message: "Sikeres verifikáció",
      user: responseUser,
    });
  } catch (error) {
    console.error("Error verifying code:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, message: "Szerver hiba: " + errorMessage },
      { status: 500 }
    );
  }
}