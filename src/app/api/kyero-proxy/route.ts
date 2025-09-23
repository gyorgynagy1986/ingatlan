import { NextResponse } from 'next/server';
import { withAdminAuth, AuthenticatedRequest } from '../../../lib/auth-helper';

async function handleGET(request: AuthenticatedRequest): Promise<NextResponse> {
  try {
    const apiUrl = 'https://procesos.apinmo.com/portal/kyeroagencias3/8875-kyero-jrYwggM0-Colaborador.xml';
    
    const adminUser = request.session.user.email;
    console.log(`🔗 Kyero XML proxy request by ${adminUser}`);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      console.error(`Kyero API error (${adminUser}): HTTP ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xmlData = await response.text();
    
    // XML hosszának logolása (debug info)
    const xmlLength = xmlData.length;
    console.log(`✅ Kyero XML fetched successfully by ${adminUser}: ${xmlLength} characters`);

    return new NextResponse(xmlData, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        // Admin audit headers (opcionális, debug célokra)
        'X-Requested-By': adminUser,
        'X-Request-Time': new Date().toISOString(),
        'X-Data-Length': xmlLength.toString()
      },
    });

  } catch (error) {
    const adminUser = request.session?.user?.email || 'unknown';
    console.error(`Error fetching Kyero data (${adminUser}):`, error);
    
    return NextResponse.json(
      { 
        success: false,
        message: 'Error fetching data from Kyero API',
        error: error instanceof Error ? error.message : 'Unknown error',
        requestedBy: adminUser,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Védett export
export const GET = withAdminAuth(handleGET);

/* 
KYERO XML PROXY ENDPOINT

Ez az endpoint Kyero ingatlan XML feed-et proxyzza át a CORS problémák elkerülésére.
Most már csak adminok férhetnek hozzá.

Használat:
GET /api/kyero-proxy

Response: XML adatok vagy hibaüzenet
Headers tartalmazzák ki és mikor kérte le az adatokat.
*/