// src/app/api/translate/properties/route.ts
import { NextRequest, NextResponse } from 'next/server';
import AzureTranslatorService from '@/lib/azure-translator';

// Opcionális: alapértelmezett limit környezeti változóból (teszt módhoz)
const DEFAULT_LIMIT = Number(process.env.TRANSLATE_LIMIT_DEFAULT || '0') || 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      properties,
      targetLang = 'en',
      sourceLang = 'es',
      translateMode = 'limit', // "all" | "limit"
      translateLimit: rawLimit, // szám vagy undefined
    } = body || {};

    if (!properties || !Array.isArray(properties)) {
      return NextResponse.json(
        { success: false, error: 'Properties array is required' },
        { status: 400 }
      );
    }

    // --- Limit kezelés ---
    const parsedLimit = Number(rawLimit ?? DEFAULT_LIMIT);
    const isLimited = translateMode === 'limit' && Number.isFinite(parsedLimit) && parsedLimit > 0;
    const processingLength = isLimited ? Math.min(parsedLimit, properties.length) : properties.length;

    const translator = new AzureTranslatorService();
    const startTime = Date.now();

    // 🛡️ ULTRA KONZERVATÍV BEÁLLÍTÁSOK
    const BATCH_SIZE = 3; // nagyon kicsi batch
    const DELAY_BETWEEN_BATCHES = 8000; // 8 másodperc
    const INITIAL_COOLDOWN = 10000; // 10s első kérés előtt
    const MAX_RETRIES = 5;

    const translatedProperties = [...properties];
    let totalTranslated = 0;
    let totalSkipped = 0;

    console.log(
      `📊 Starting ULTRA-CONSERVATIVE translation of ${processingLength}/${properties.length} properties`
    );
    if (isLimited) console.log(`🔎 TEST MODE: translating only first ${processingLength} items`);
    console.log(`🎯 Target: ${targetLang}, Source: ${sourceLang}`);
    console.log(`⚙️ Settings: Batch=${BATCH_SIZE}, Delay=${DELAY_BETWEEN_BATCHES / 1000}s`);
    console.log(
      `⏱️ Estimated time: ~${Math.ceil(
        (processingLength / BATCH_SIZE) * (DELAY_BETWEEN_BATCHES / 1000) / 60
      )} minutes`
    );

    // Kezdeti várakozás
    console.log(`🧘 Initial cooldown: ${INITIAL_COOLDOWN / 1000}s to ensure clean start...`);
    await new Promise((resolve) => setTimeout(resolve, INITIAL_COOLDOWN));

    for (let batchStart = 0; batchStart < processingLength; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, processingLength);
      const batchProperties = properties.slice(batchStart, batchEnd);

      const batchNumber = Math.floor(batchStart / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(processingLength / BATCH_SIZE);

      console.log(`\n📦 Batch ${batchNumber}/${totalBatches} - Properties ${batchStart + 1}-${batchEnd}`);

      // FONTOS: itt deklaráljuk, hogy a ciklus végén is látszódjon
      let batchSuccess = false;

      // Fordítandó szövegek összegyűjtése
      const textsToTranslate: string[] = [];
      const textIndices: number[] = [];

      interface Property {
        description?: string;
        [key: string]: string | number | boolean | undefined;
      }

      batchProperties.forEach((property: Property, localIndex: number) => {
        const globalIndex = batchStart + localIndex;
        if (property?.description && String(property.description).trim()) {
          textsToTranslate.push(String(property.description));
          textIndices.push(globalIndex);
        }
      });

      if (textsToTranslate.length > 0) {
        let retryCount = 0;

        // Retry loop exponenciális backoff-fal
        while (retryCount < MAX_RETRIES && !batchSuccess) {
          try {
            const attemptLog = retryCount > 0 ? ` (Retry ${retryCount})` : '';
            console.log(`   🌐 Translating ${textsToTranslate.length} descriptions${attemptLog}...`);

            const translatedTexts = await translator.translateBatch(
              textsToTranslate,
              targetLang,
              sourceLang
            );

            // Sikeres fordítás
            translatedTexts.forEach((translatedText, i) => {
              const globalIndex = textIndices[i];
              translatedProperties[globalIndex] = {
                ...translatedProperties[globalIndex],
                description: translatedText,
                isTranslated: true,
                translatedAt: new Date().toISOString(),
                targetLang,
              };
              totalTranslated++;
            });

            console.log(`   ✅ SUCCESS: ${translatedTexts.length} descriptions translated`);
            batchSuccess = true;
          } catch (error: unknown) {
            retryCount++;
            const errorMessage =
              typeof error === 'object' && error !== null && 'message' in error
                ? String((error as { message?: unknown }).message)
                : String(error);
            console.error(`   ❌ FAILED (Attempt ${retryCount}):`, errorMessage);

            if (errorMessage.includes('429')) {
              // Exponenciális backoff: 15s, 30s, 60s, 120s, 240s
              const baseWait = 15000;
              const waitTime = Math.min(240000, baseWait * Math.pow(2, retryCount - 1));
              console.log(`   🚫 RATE LIMIT - Cooling down for ${waitTime / 1000}s...`);
              await new Promise((r) => setTimeout(r, waitTime));
            } else {
              const waitTime = 5000 * retryCount;
              console.log(`   ⏱️ Error cooldown: ${waitTime / 1000}s...`);
              await new Promise((r) => setTimeout(r, waitTime));
            }

            if (retryCount >= MAX_RETRIES) {
              console.log(`   🚫 MAX RETRIES REACHED - Skipping batch ${batchNumber}`);
              totalSkipped += textsToTranslate.length;
              // Extra hosszú várakozás a következő batch előtt
              console.log(`   🧘 Extended cooldown after failure: 30s...`);
              await new Promise((r) => setTimeout(r, 30000));
            }
          }
        }
      } else {
        console.log(`   ⏭️ No descriptions to translate`);
      }

      // Várakozás a következő batch előtt CSAK sikeres fordítás után
      if (batchEnd < processingLength && batchSuccess) {
        const remainingBatches = totalBatches - batchNumber;
        const eta = Math.ceil((remainingBatches * DELAY_BETWEEN_BATCHES) / 1000 / 60);
        console.log(
          `   ⏱️ Waiting ${DELAY_BETWEEN_BATCHES / 1000}s... (ETA: ~${eta} min remaining)`
        );
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    const duration = Date.now() - startTime;
    const successRate = processingLength > 0 ? ((totalTranslated / processingLength) * 100).toFixed(1) : '0.0';

    console.log(`\n🎉 ULTRA-CONSERVATIVE TRANSLATION COMPLETE!`);
    console.log(`📊 Results:
   ✅ Translated: ${totalTranslated}
   ❌ Skipped: ${totalSkipped}
   ⏭️ No description: ${processingLength - totalTranslated - totalSkipped}
   📈 Success rate: ${successRate}%
   ⏱️ Total time: ${Math.ceil(duration / 60000)} minutes`);

    return NextResponse.json({
      success: true,
      data: {
        // Mindig az ÖSSZES property-t visszaküldjük, akkor is, ha csak egy részét dolgoztuk fel
        properties: translatedProperties,
        stats: {
          total: properties.length, // eredeti elemszám
          processed: processingLength, // ténylegesen feldolgozott elemszám
          translated: totalTranslated,
          skipped: totalSkipped,
          noDescription: processingLength - totalTranslated - totalSkipped,
          successRate: `${successRate}%`,
          duration: `${Math.ceil(duration / 60000)} minutes`,
          avgTimePerProcessed: processingLength
            ? `${(duration / processingLength / 1000).toFixed(1)}s`
            : '0s',
          targetLang,
          sourceLang,
          batchSize: BATCH_SIZE,
          delayBetweenBatches: `${DELAY_BETWEEN_BATCHES / 1000}s`,
          mode: 'ULTRA_CONSERVATIVE',
          translateMode,
          translateLimit: isLimited ? processingLength : null,
        },
      },
    });
  } catch (error: unknown) {
    let errorMessage = '';
    let errorStack: string | undefined = undefined;
    if (typeof error === 'object' && error !== null) {
      if ('message' in error) errorMessage = String((error as { message?: unknown }).message);
      if ('stack' in error) errorStack = String((error as { stack?: unknown }).stack);
    } else {
      errorMessage = String(error);
    }
    console.error('❌ Properties Translation API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Properties translation failed',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}
