// src/app/api/translate/batch/route.js

import { NextRequest, NextResponse } from 'next/server';
import AzureTranslatorService from '../../../../lib/azure-translator';

export async function POST(request = NextRequest) {
  try {
    const body = await request.json();
    const { text, targetLang = 'en', sourceLang = 'es' } = body;

    if (!text) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Text parameter is required' 
        },
        { status: 400 }
      );
    }

    const translator = new AzureTranslatorService();
    const translatedText = await translator.translateText(text, targetLang, sourceLang);

    return NextResponse.json({
      success: true,
      data: {
        originalText: text,
        translatedText,
        sourceLang,
        targetLang,
        service: 'Azure Translator',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Translation API Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Translation failed',
        message: error.message
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Use POST method for translation' },
    { status: 405 }
  );
}
