import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "../lib/mongodb";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { NextAuthOptions, User, Session, DefaultSession } from "next-auth";

/**
 * Module augmentation for next-auth types
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface User {
    id?: string;
    role?: string;
    userName?: string; // Új mező
  }

  interface Session extends DefaultSession {
    user: {
      id?: string;
      role?: string;
      userName?: string; // Új mező
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    userName?: string; // Új mező
  }
}

// Define the extended user type for our internal use
interface ExtendedUser extends User {
  id: string;
  email: string;
  name?: string;
  userName?: string; // Új mező
  role?: string;
}

// Define the extended session user type
interface ExtendedSessionUser {
  id: string;
  email: string;
  name?: string;
  userName?: string; // Új mező
  role?: string;
}

// Define our session type
interface ExtendedSession extends Session {
  user: ExtendedSessionUser;
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Credentials provider for our custom email+code flow
    CredentialsProvider({
      id: "credentials",
      name: "Email Verification Code",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Verification Code", type: "text" }, // Kód mező hozzáadása
      },
      async authorize(credentials) {
        // Mindkét mezőt ellenőrizzük
        if (!credentials?.email || !credentials?.code) {
          throw new Error("Email és ellenőrző kód megadása kötelező");
        }

        try {
          // ELSŐ: Kód validáció
          const isValidCode = await validateVerificationCode(
            credentials.email,
            credentials.code
          );

          if (!isValidCode) {
            throw new Error("Érvénytelen vagy lejárt ellenőrző kód");
          }

          // MÁSODIK: User keresés (csak ha a kód érvényes)
          const client = await clientPromise;
          const db = client.db();

          const user = await db.collection("users").findOne({
            email: credentials.email,
          });

          if (!user) {
            throw new Error("Az email cím nincs regisztrálva a rendszerben");
          }

          // Return user object that will be saved in the JWT token
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            userName: user.userName,
            role: user.role,
          } as ExtendedUser;
        } catch (error) {
          console.error("Error in authorize callback:", error);
          // A throw-olt hibát továbbítjuk
          throw error;
        }
      },
    }),
  ],

  adapter: MongoDBAdapter(clientPromise),
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Add properties to token when user first signs in
      if (user) {
        token.id = user.id;
        // Cast user to our extended type to access role property if it exists
        if ("role" in user) {
          token.role = user.role;
        }
        // Add userName if it exists
        if ("userName" in user) {
          token.userName = user.userName;
        }
      }

      // Session frissítése esetén (trigger === "update")
      if (trigger === "update" && session) {
        console.log("Session update triggered with data:", session);

        // Frissítjük a token adatait a session-ből kapott értékekkel
        if (session.name) {
          token.name = session.name;
        }

        if (session.userName) {
          token.userName = session.userName;
        }
      }

      return token;
    },
    async session({ session, token, trigger, newSession }) {
      // Send properties from the token to the client
      if (token && session.user) {
        session.user.id = token.id as string;
        // Only add role if it exists in token
        if ("role" in token) {
          session.user.role = token.role as string;
        }
        // Add userName if it exists in token
        if ("userName" in token) {
          session.user.userName = token.userName as string;
        }
      }

      // Session frissítés esetén
      if (trigger === "update" && newSession) {
        console.log("Session callback update with new data:", newSession);

        // Frissítjük a session adatait
        if (newSession.name) {
          session.user.name = newSession.name;
        }

        if (newSession.userName) {
          session.user.userName = newSession.userName;
        }
      }

      return session as ExtendedSession;
    },
  },
};

/**
 * Get the current session from NextAuth
 * @returns {Promise<ExtendedSession|null>} The session object or null if not authenticated
 */
export async function getSession(): Promise<ExtendedSession | null> {
  return (await getServerSession(authOptions)) as ExtendedSession | null;
}

/**
 * Get the current authenticated user
 * @returns {Promise<ExtendedSessionUser|null>} The user object or null if not authenticated
 */
export async function getCurrentUser(): Promise<ExtendedSessionUser | null> {
  const session = await getSession();
  return session?.user || null;
}

/**
 * Middleware to check if the user is authenticated
 * If not, redirects to the login page
 * @returns {Promise<ExtendedSessionUser>} The authenticated user
 */
export async function requireAuth(): Promise<ExtendedSessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  return user;
}

/**
 * Middleware to check if the user has the required role
 * @param {string[]} allowedRoles - Array of roles that are allowed to access the route
 * @returns {Promise<ExtendedSessionUser>} The authenticated user with the required role
 */
export async function requireRole(
  allowedRoles: string[]
): Promise<ExtendedSessionUser> {
  const user = await requireAuth();

  if (!user.role || !allowedRoles.includes(user.role)) {
    // User doesn't have the required role
    redirect("/unauthorized");
  }

  return user;
}

/**
 * Generate a random 6-digit code
 * @returns {string} 6-digit code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create a verification code for the given email
 * @param {string} email Email address
 * @returns {Promise<{email: string, code: string, expires: Date}>} Verification code info
 */
export async function createVerificationCode(email: string): Promise<{
  email: string;
  code: string;
  expires: Date;
  createdAt: Date;
}> {
  const client = await clientPromise;
  const db = client.db();

  // Generate a 6-digit code
  const code = generateVerificationCode();

  // Set expiration to 2 days from now
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + 3);
  // Create a verification record
  const verificationCode = {
    email,
    code,
    expires,
    createdAt: new Date(),
  };

  // Collection name for our custom verification codes
  const VERIFICATION_CODE_COLLECTION = "custom_verification_codes";

  // Save to database
  await db.collection(VERIFICATION_CODE_COLLECTION).insertOne(verificationCode);

  return verificationCode;
}

/**
 * Validate a verification code
 * @param {string} email Email address
 * @param {string} code 6-digit verification code
 * @returns {Promise<boolean>} Whether the code is valid
 */
export async function validateVerificationCode(
  email: string,
  code: string
): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db();

  // Collection name for our custom verification codes
  const VERIFICATION_CODE_COLLECTION = "custom_verification_codes";

  // Find the verification code
  const verificationCode = await db
    .collection(VERIFICATION_CODE_COLLECTION)
    .findOne({
      email,
      code,
      expires: { $gt: new Date() },
    });

  // If a valid code was found, delete it so it can't be used again
  if (verificationCode) {
    await db
      .collection(VERIFICATION_CODE_COLLECTION)
      .deleteOne({ _id: verificationCode._id });
    return true;
  }

  return false;
}

/**
 * Delete expired verification codes
 */
export async function cleanupExpiredCodes(): Promise<void> {
  const client = await clientPromise;
  const db = client.db();

  // Collection name for our custom verification codes
  const VERIFICATION_CODE_COLLECTION = "custom_verification_codes";

  await db.collection(VERIFICATION_CODE_COLLECTION).deleteMany({
    expires: { $lte: new Date() },
  });
}