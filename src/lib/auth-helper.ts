// lib/auth-helper.ts
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth"; // Vagy ahol az authOptions van
import { NextResponse, NextRequest } from "next/server";

// Session típus definíció
export interface AuthenticatedSession {
  user: {
    id?: string;
    email: string;
    role: string;
    name?: string;
  };
  expires: string;
}

// Bővített Request típus session-nel
export interface AuthenticatedRequest extends NextRequest {
  session: AuthenticatedSession;
}

// Auth result típus
interface AuthResult {
  session: AuthenticatedSession | null;
  error: NextResponse | null;
}

/**
 * Session és admin jogosultság ellenőrzése
 */
export async function checkAdminAuth(): Promise<AuthResult> {
  try {
    const session = await getServerSession(authOptions);

    // Session ellenőrzés
    if (!session) {
      return {
        session: null,
        error: NextResponse.json(
          {
            success: false,
            error: "Nincs bejelentkezve",
            message: "A művelet elvégzéséhez bejelentkezés szükséges"
          },
          { status: 401 }
        )
      };
    }

    // Admin jogosultság ellenőrzés
    if (session.user?.role !== "admin") {
      return {
        session: null,
        error: NextResponse.json(
          {
            success: false,
            error: "Nincs jogosultság",
            message: "Admin jogosultság szükséges"
          },
          { status: 403 }
        )
      };
    }

    return {
      session: session as AuthenticatedSession,
      error: null
    };
  } catch (error) {
    console.error("Auth check error:", error);
    return {
      session: null,
      error: NextResponse.json(
        {
          success: false,
          error: "Authentikációs hiba",
          message: "Hiba történt a jogosultság ellenőrzése során"
        },
        { status: 500 }
      )
    };
  }
}

/**
 * Wrapper függvény API route-okhoz admin jogosultsággal
 */
export function withAdminAuth<TArgs extends unknown[]>(
  handler: (request: AuthenticatedRequest, ...args: TArgs) => Promise<NextResponse | Response>
) {
  return async function protectedHandler(
    request: NextRequest, 
    ...args: TArgs
  ): Promise<NextResponse | Response> {
   
    const { session, error } = await checkAdminAuth();
    
    if (error) {
      return error;
    }

    // Session hozzáadása a request-hez, típusos módon
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.session = session!;
    
    return handler(authenticatedRequest, ...args);
  };
}

/**
 * Általános auth ellenőrzés több role-lal
 */
export async function checkAuth(requiredRoles: string[] = []): Promise<AuthResult> {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return {
        session: null,
        error: NextResponse.json(
          {
            success: false,
            error: "Nincs bejelentkezve"
          },
          { status: 401 }
        )
      };
    }

    // Ha vannak megadott role-ok, ellenőrizzük
    if (requiredRoles.length > 0 && !requiredRoles.includes(session.user?.role || '')) {
      return {
        session: null,
        error: NextResponse.json(
          {
            success: false,
            error: "Nincs megfelelő jogosultság",
            message: `Szükséges jogosultság: ${requiredRoles.join(" vagy ")}`
          },
          { status: 403 }
        )
      };
    }

    return {
      session: session as AuthenticatedSession,
      error: null
    };
  } catch (error) {
    console.error("Auth check error:", error);
    return {
      session: null,
      error: NextResponse.json(
        {
          success: false,
          error: "Authentikációs hiba"
        },
        { status: 500 }
      )
    };
  }
}

/**
 * Multi-role wrapper (admin, editor stb.)
 */
export function withAuth<TArgs extends unknown[]>(
  requiredRoles: string[],
  handler: (request: AuthenticatedRequest, ...args: TArgs) => Promise<NextResponse | Response>
) {
  return async function protectedHandler(
    request: NextRequest, 
    ...args: TArgs
  ): Promise<NextResponse | Response> {
    const { session, error } = await checkAuth(requiredRoles);
    
    if (error) {
      return error;
    }

    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.session = session!;
    
    return handler(authenticatedRequest, ...args);
  };
}