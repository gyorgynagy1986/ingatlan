import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { JWT } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // If the path starts with /admin
  if (pathname.startsWith('/dashboard')) {
    const token: JWT | null = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token) {
      // If user is not logged in, redirect to login page
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }
  }

  // Continue to the protected route if authorized
  return NextResponse.next();
}

// Configure which routes to protect with the middleware
export const config = {
  matcher: ['/dashboard/:path*'],
};