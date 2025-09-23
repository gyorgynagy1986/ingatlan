// lib/azure-translator.ts
/* 
  Azure Translator ultra-konzervatív kliens
  - Nagyon alacsony batch és kérés/perc limitek
  - Exponenciális backoff 429-re
  - Kimeneti naplózás fejlesztéshez

  Szükséges env:
    AZURE_TRANSLATOR_KEY
    AZURE_TRANSLATOR_REGION   (pl. "westeurope", vagy "global")
*/

export default class AzureTranslatorService {
  private apiKey?: string;
  private region: string;
  private endpoint: string;
  private apiVersion: string;

  // ULTRA konzervatív rate limiting
  private lastRequestTime: number;
  private requestCount: number;
  private resetTime: number;
  private failureCount: number;
  private lastFailureTime: number;

  constructor() {
    this.apiKey = process.env.AZURE_TRANSLATOR_KEY;
    this.region = process.env.AZURE_TRANSLATOR_REGION || 'global';
    this.endpoint = 'https://api.cognitive.microsofttranslator.com';
    this.apiVersion = '3.0';

    this.lastRequestTime = 0;
    this.requestCount = 0;
    this.resetTime = Date.now() + 60000;
    this.failureCount = 0;
    this.lastFailureTime = 0;

    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 Azure Translator Service (ULTRA SAFE MODE)');
      console.log('   API Key:', this.apiKey ? `${this.apiKey.substring(0, 4)}...` : 'NOT SET');
      console.log('   Region:', this.region);
    }
  }

  // Ultra-konzervatív rate limiting
  private async enforceUltraSafeRateLimit() {
    const now = Date.now();

    // Ha volt hiba az utóbbi 5 percben, extra várakozás
    if (this.failureCount > 0 && (now - this.lastFailureTime) < 300000) {
      const cooldownTime = Math.min(60000, 10000 * this.failureCount); // 10s–60s
      console.log(`   🧊 Failure cooldown active: ${Math.ceil(cooldownTime / 1000)}s`);
      await new Promise((r) => setTimeout(r, cooldownTime));
    }

    // Reset request counter minden percben
    if (now > this.resetTime) {
      this.requestCount = 0;
      this.resetTime = now + 60000;
      if (this.failureCount > 0) {
        this.failureCount = Math.max(0, this.failureCount - 1); // Fokozatos recovery
      }
    }

    // ULTRA KONZERVATÍV LIMITEK
    const MAX_REQUESTS_PER_MINUTE = 20;
    const MIN_REQUEST_INTERVAL = 2000; // 2s

    // Percenkénti limit ellenőrzés
    if (this.requestCount >= MAX_REQUESTS_PER_MINUTE) {
      const waitTime = this.resetTime - now + 5000; // +5s extra biztonság
      console.log(`   ⏳ Minute limit reached, waiting ${Math.ceil(waitTime / 1000)}s...`);
      await new Promise((r) => setTimeout(r, waitTime));
      this.requestCount = 0;
      this.resetTime = Date.now() + 60000;
    }

    // Kérések közötti várakozás
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`   ⏱️ Request interval protection: ${waitTime}ms`);
      await new Promise((r) => setTimeout(r, waitTime));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;

    console.log(`   📊 Rate limit status: ${this.requestCount}/20 requests this minute`);
  }

  async translateBatch(texts: string[], targetLang = 'en', sourceLang = 'es'): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('Azure Translator API key not configured');
    }
    if (!Array.isArray(texts) || texts.length === 0) {
      return [];
    }

    await this.enforceUltraSafeRateLimit();

    // ULTRA KONZERVATÍV BATCH LIMITEK
    const MAX_BATCH_SIZE = 3; // nagyon kicsi batch
    const MAX_CHAR_PER_ELEMENT = 3000;

    // Szövegek előkészítése
    const processedTexts = texts.slice(0, MAX_BATCH_SIZE).map((text) => {
      const trimmed = (text || '').trim();
      if (!trimmed) return '';
      const cleaned = trimmed.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
      return cleaned.length > MAX_CHAR_PER_ELEMENT
        ? cleaned.substring(0, MAX_CHAR_PER_ELEMENT).trim() + '...'
        : cleaned;
    });

    const nonEmptyTexts = processedTexts.filter((t) => t.length > 0);
    if (nonEmptyTexts.length === 0) {
      return new Array(processedTexts.length).fill('');
    }

    try {
      const url = `${this.endpoint}/translate?api-version=${this.apiVersion}&from=${encodeURIComponent(
        sourceLang
      )}&to=${encodeURIComponent(targetLang)}`;
      const requestBody = nonEmptyTexts.map((text) => ({ text }));

      console.log(
        `   📡 Ultra-safe API call: ${nonEmptyTexts.length} texts, ~${JSON.stringify(requestBody).length} chars`
      );

      // AbortSignal.timeout Node 18+-ban elérhető lehet; fallback:
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      let timeoutId: NodeJS.Timeout | null = null;
      if (controller) {
        timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'Ocp-Apim-Subscription-Region': this.region,
          'Content-Type': 'application/json',
          'User-Agent': 'Ultra-Conservative-Translator/1.0',
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(requestBody),
        signal: controller ? controller.signal : undefined,
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        const errorText = await response.text();
        console.error(`   💥 Azure API Error (${response.status}):`, errorText);

        if (response.status === 429) {
          console.log(`   🚫 Rate limit detected! Failure count: ${this.failureCount}`);
          const cooldown = Math.min(120000, 20000 * Math.pow(1.5, this.failureCount));
          console.log(`   🧊 Enforcing ${Math.ceil(cooldown / 1000)}s cooldown...`);
          await new Promise((r) => setTimeout(r, cooldown));
        }

        throw new Error(`Azure API Error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as Array<{
        translations: Array<{ text: string }>;
      }>;

      // Success - reset failure counter
      if (this.failureCount > 0) {
        console.log(`   🎉 Success after ${this.failureCount} failures - resetting counter`);
        this.failureCount = 0;
      }

      // Eredmények visszamappelése az input helyeire
      const results: string[] = [];
      let dataIndex = 0;

      for (let i = 0; i < processedTexts.length; i++) {
        if (processedTexts[i].length > 0) {
          const translated = data?.[dataIndex]?.translations?.[0]?.text ?? processedTexts[i];
          results.push(translated);
          dataIndex++;
        } else {
          results.push('');
        }
      }

      console.log(`   ✅ Translation successful: ${results.filter((r) => r.length > 0).length} texts`);
      return results;
    } catch (error: unknown) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`   💥 Translation failed (failure #${this.failureCount}):`, errorMessage);

      // Timeout detektálása
      const msg = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : '';
      if (errorName === 'AbortError' || errorName === 'TimeoutError' || /timeout/i.test(msg)) {
        console.log('   ⏰ Request timeout - API might be overloaded');
      }

      throw error;
    }
  }

  // Egyszeres fordítás (fallback)
  async translateText(text: string, targetLang = 'en', sourceLang = 'es') {
    if (!text || !text.trim()) return text;
    const result = await this.translateBatch([text], targetLang, sourceLang);
    return result[0] || text;
  }

  // Statisztikák és becslések
  estimateCharacterCount(
    properties: Array<{ description?: string }>
  ): {
    totalCharacters: number;
    descriptionCount: number;
    avgCharsPerDescription: number;
    estimatedBatches: number;
    estimatedTime: string;
    warningMessage: string | null;
    settings: string;
    estimatedCost: string;
  } {
    let totalChars = 0;
    let descriptionCount = 0;

    properties.forEach((prop) => {
      if (prop.description && prop.description.trim()) {
        totalChars += prop.description.length;
        descriptionCount++;
      }
    });

    const estimatedBatches = Math.ceil(descriptionCount / 3); // 3 per batch
    const estimatedTimeMinutes = Math.ceil((estimatedBatches * 8) / 60); // 8s per batch

    return {
      totalCharacters: totalChars,
      descriptionCount,
      avgCharsPerDescription: descriptionCount > 0 ? Math.round(totalChars / descriptionCount) : 0,
      estimatedBatches,
      estimatedTime: `${estimatedTimeMinutes} minutes`,
      warningMessage: estimatedTimeMinutes > 60 ? '⚠️ This will take over 1 hour!' : null,
      settings: 'ULTRA_CONSERVATIVE (3 per batch, 8s delay)',
      estimatedCost: totalChars > 2000000 ? `$${((totalChars / 1000000) * 10).toFixed(2)}` : 'FREE',
    };
  }

  // Rate limit status
  getRateLimitStatus() {
    return {
      requestCount: this.requestCount,
      maxRequests: 20,
      resetTime: new Date(this.resetTime).toISOString(),
      failureCount: this.failureCount,
      lastFailure: this.lastFailureTime > 0 ? new Date(this.lastFailureTime).toISOString() : null,
      mode: 'ULTRA_CONSERVATIVE',
    };
  }
}
