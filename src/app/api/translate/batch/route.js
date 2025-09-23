// src/app/api/translate/batch/route.js

import { NextRequest, NextResponse } from 'next/server';
import AzureTranslatorService from '../../../../lib/azure-translator';

export async function POST(request = NextRequest) {
  try {
    const body = await request.json();
    const { texts, targetLang = 'en', sourceLang = 'es' } = body;

    if (!texts || !Array.isArray(texts)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Texts array is required' 
        },
        { status: 400 }
      );
    }

    const translator = new AzureTranslatorService();
    const translatedTexts = await translator.translateBatch(texts, targetLang, sourceLang);

    return NextResponse.json({
      success: true,
      data: {
        originalTexts: texts,
        translatedTexts,
        sourceLang,
        targetLang,
        count: texts.length,
        service: 'Azure Translator',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Batch Translation API Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Batch translation failed',
        message: error.message
      },
      { status: 500 }
    );
  }
}