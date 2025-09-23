import NextAuth from "next-auth";
import { authOptions } from "../../../../lib/auth";

// Export NextAuth handler for API routes
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };