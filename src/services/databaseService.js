// services/databaseService.js

/**
 * Adatbázis feltöltési szolgáltatás
 * Ez a szolgáltatás bárhol használható az alkalmazásban
 */

class DatabaseService {
  constructor() {
    this.baseUrl = '/api';
  }

  /**
   * Ingatlanok feltöltése az adatbázisba
   * @param {Array} properties - Feltöltendő ingatlanok tömbje
   * @returns {Promise<Object>} Feltöltés eredménye
   */
  async uploadProperties(properties) {
    if (!Array.isArray(properties) || properties.length === 0) {
      throw new Error('Érvényes ingatlan adatok szükségesek');
    }

    try {
      const response = await fetch(`${this.baseUrl}/upload-properties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: properties
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        success: true,
        data: result,
        message: `Sikeresen feltöltve ${result.insertedCount || properties.length} ingatlan`
      };

    } catch (error) {
      console.error('Database upload error:', error);
      
      return {
        success: false,
        error: error.message,
        message: `Feltöltési hiba: ${error.message}`
      };
    }
  }

  /**
   * Egyes ingatlan feltöltése
   * @param {Object} property - Feltöltendő ingatlan
   * @returns {Promise<Object>} Feltöltés eredménye
   */
  async uploadProperty(property) {
    return this.uploadProperties([property]);
  }

  /**
   * Batch feltöltés nagyobb adatmennyiséghez
   * @param {Array} properties - Ingatlanok tömbje
   * @param {number} batchSize - Batch mérete (alapértelmezett: 50)
   * @param {Function} progressCallback - Progress callback függvény
   * @returns {Promise<Object>} Feltöltés eredménye
   */
  async uploadPropertiesBatch(properties, batchSize = 50, progressCallback = null) {
    if (!Array.isArray(properties) || properties.length === 0) {
      throw new Error('Érvényes ingatlan adatok szükségesek');
    }

    const results = {
      success: true,
      totalCount: properties.length,
      successCount: 0,
      errorCount: 0,
      errors: [],
      message: ''
    };

    try {
      // Batch-ekre bontás
      const batches = [];
      for (let i = 0; i < properties.length; i += batchSize) {
        batches.push(properties.slice(i, i + batchSize));
      }

      console.log(`Feltöltés ${batches.length} batch-ben, összesen ${properties.length} ingatlan`);

      // Batch-ek feldolgozása
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        try {
          const batchResult = await this.uploadProperties(batch);
          
          if (batchResult.success) {
            results.successCount += batch.length;
          } else {
            results.errorCount += batch.length;
            results.errors.push({
              batch: i + 1,
              error: batchResult.error,
              properties: batch.length
            });
          }

          // Progress callback hívása
          if (progressCallback) {
            progressCallback({
              currentBatch: i + 1,
              totalBatches: batches.length,
              processedCount: (i + 1) * batchSize,
              totalCount: properties.length,
              successCount: results.successCount,
              errorCount: results.errorCount
            });
          }

          // Kis szünet a szervert terhelés csökkentésére
          if (i < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

        } catch (error) {
          results.errorCount += batch.length;
          results.errors.push({
            batch: i + 1,
            error: error.message,
            properties: batch.length
          });
        }
      }

      // Eredmény összesítése
      if (results.errorCount > 0) {
        results.success = false;
        results.message = `Részben sikeres: ${results.successCount}/${results.totalCount} feltöltve. ${results.errorCount} hiba történt.`;
      } else {
        results.message = `Sikeresen feltöltve mind a ${results.successCount} ingatlan`;
      }

      return results;

    } catch (error) {
      console.error('Batch upload error:', error);
      return {
        success: false,
        error: error.message,
        message: `Batch feltöltési hiba: ${error.message}`,
        totalCount: properties.length,
        successCount: 0,
        errorCount: properties.length
      };
    }
  }

  /**
   * Feltöltés státusz ellenőrzése
   * @param {string} uploadId - Feltöltés azonosító
   * @returns {Promise<Object>} Státusz információ
   */
  async checkUploadStatus(uploadId) {
    try {
      const response = await fetch(`${this.baseUrl}/upload-status/${uploadId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Státusz lekérési hiba');
      }

      return result;
    } catch (error) {
      console.error('Status check error:', error);
      throw error;
    }
  }
}

// Singleton instance
const databaseService = new DatabaseService();

export default databaseService;

// Hook React komponensekhez
export function useDatabaseUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  const uploadProperties = async (properties, options = {}) => {
    const { batchSize = 50, useBatch = false } = options;
    
    setUploading(true);
    setUploadProgress(null);
    setUploadResult(null);

    try {
      let result;
      
      if (useBatch && properties.length > batchSize) {
        result = await databaseService.uploadPropertiesBatch(
          properties, 
          batchSize, 
          setUploadProgress
        );
      } else {
        result = await databaseService.uploadProperties(properties);
      }

      setUploadResult(result);
      return result;

    } catch (error) {
      const errorResult = {
        success: false,
        error: error.message,
        message: `Feltöltési hiba: ${error.message}`
      };
      setUploadResult(errorResult);
      return errorResult;
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setUploading(false);
    setUploadProgress(null);
    setUploadResult(null);
  };

  return {
    uploading,
    uploadProgress,
    uploadResult,
    uploadProperties,
    resetUpload
  };
}