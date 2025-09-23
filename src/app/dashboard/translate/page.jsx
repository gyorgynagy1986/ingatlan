'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Download, Upload, FileText, Loader2 } from 'lucide-react';

// Database upload hook
const useDatabaseUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const uploadProperties = async (properties) => {
    setUploading(true);
    setUploadResult(null);

    try {
      const response = await fetch('/api/upload-properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: properties
        }),
      });

      const result = await response.json();

      const finalResult = {
        success: response.ok,
        data: result,
        message: response.ok 
          ? `Sikeresen feltöltve ${result.insertedCount || properties.length} ingatlan`
          : result.error || 'Feltöltési hiba történt'
      };

      setUploadResult(finalResult);
      return finalResult;

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
    setUploadResult(null);
  };

  return { uploading, uploadResult, uploadProperties, resetUpload };
};

export default function TranslatePage() {
  const [inputJson, setInputJson] = useState('');
  const [outputJson, setOutputJson] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [status, setStatus] = useState(null);
  const [targetLang, setTargetLang] = useState('en');
  const [stats, setStats] = useState(null);
  const fileInputRef = useRef(null);

  // Database upload hook
  const { uploading: uploadingToDb, uploadResult, uploadProperties, resetUpload } = useDatabaseUpload();

  const showStatus = (message, type) => {
    setStatus({ message, type });
    setTimeout(() => setStatus(null), 5000);
  };

  const handleFileUpload = (file) => {
    if (!file?.name.endsWith('.json')) {
      showStatus('Válassz érvényes JSON fájlt', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        setInputJson(JSON.stringify(jsonData, null, 2));
        showStatus(`Betöltve ${jsonData.length} ingatlan`, 'success');
      } catch (error) {
        showStatus(`Érvénytelen JSON: ${error.message}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  const translateProperties = async () => {
    if (!inputJson.trim()) {
      showStatus('Adj meg JSON adatokat a fordításhoz', 'error');
      return;
    }

    let properties;
    try {
      properties = JSON.parse(inputJson);
    } catch (error) {
      showStatus(`Érvénytelen JSON: ${error.message}`, 'error');
      return;
    }

    if (!Array.isArray(properties)) {
      showStatus('A JSON egy ingatlanok tömbje kell legyen', 'error');
      return;
    }

    setIsTranslating(true);
    setStats(null);
    resetUpload();
    showStatus('Fordítás folyamatban...', 'info');

    try {
      const response = await fetch('/api/translate/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties,
          targetLang,
          sourceLang: 'es'
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Fordítási hiba');
      }

      setOutputJson(JSON.stringify(result.data.properties, null, 2));
      setStats(result.data.stats);
      showStatus(`Sikeresen lefordítva ${result.data.stats.total} ingatlan`, 'success');

    } catch (error) {
      showStatus(`Fordítási hiba: ${error.message}`, 'error');
    } finally {
      setIsTranslating(false);
    }
  };

  const downloadJson = () => {
    if (!outputJson) return;

    const blob = new Blob([outputJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translated_properties_${targetLang}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showStatus('JSON fájl letöltve', 'success');
  };

  const handleUploadToDatabase = async () => {
    if (!outputJson.trim()) {
      showStatus('Nincsenek feltöltendő lefordított adatok', 'error');
      return;
    }

    try {
      const properties = JSON.parse(outputJson);
      const result = await uploadProperties(properties);
      
      if (result.success && result.data.insertedCount > 0) {
        showStatus(`Feltöltve ${result.data.insertedCount} ingatlan`, 'success');
      } else if (result.success && result.data.insertedCount === 0) {
        showStatus('Nem került új ingatlan feltöltésre - mind duplikált', 'warning');
      } else {
        showStatus(`Feltöltési hiba: ${result.message}`, 'error');
      }
    } catch (error) {
      showStatus(`Feltöltési hiba: ${error.message}`, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Azure Property Translator
          </h1>
          <p className="text-slate-600 mt-2">
            Ingatlanok fordítása Azure Cognitive Services-szel
          </p>
        </div>

        {/* Status Messages */}
        {status && (
          <Card className={
            status.type === 'success' ? 'border-green-200 bg-green-50' :
            status.type === 'error' ? 'border-red-200 bg-red-50' :
            status.type === 'warning' ? 'border-orange-200 bg-orange-50' :
            'border-blue-200 bg-blue-50'
          }>
            <CardContent className="py-4 flex items-center gap-3">
              {status.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
               status.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-600" /> :
               status.type === 'warning' ? <AlertCircle className="w-5 h-5 text-orange-600" /> :
               <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
              <span className={
                status.type === 'success' ? 'text-green-800' :
                status.type === 'error' ? 'text-red-800' :
                status.type === 'warning' ? 'text-orange-800' :
                'text-blue-800'
              }>
                {status.message}
              </span>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Bemeneti JSON
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload */}
              <div
                className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-slate-600">
                  JSON fájl húzása vagy kattintás
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
              </div>

              {/* JSON Input */}
              <textarea
                value={inputJson}
                onChange={(e) => setInputJson(e.target.value)}
                placeholder="JSON adatok beillesztése..."
                className="w-full h-48 p-3 border border-slate-300 rounded-md font-mono text-sm resize-y"
              />

              {/* Controls */}
              <div className="flex gap-3 items-center">
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md bg-white"
                >
                  <option value="en">English</option>
                  <option value="hu">Magyar</option>
                  <option value="de">Deutsch</option>
                  <option value="fr">Français</option>
                  <option value="it">Italiano</option>
                </select>

                <Button
                  onClick={translateProperties}
                  disabled={isTranslating}
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Fordítás...
                    </>
                  ) : (
                    'Fordítás indítása'
                  )}
                </Button>
              </div>

              {/* Azure Info */}
              <div className="text-xs text-slate-600 bg-slate-100 p-3 rounded-md">
                <div className="font-medium mb-1">Azure Translator</div>
                <div>2M karakter/hó ingyenes</div>
                <div>~400 ingatlan ≈ 277k karakter</div>
              </div>
            </CardContent>
          </Card>

          {/* Output Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Fordított eredmény
                </CardTitle>
                {outputJson && (
                  <div className="flex gap-2">
                    <Button onClick={downloadJson} size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-1" />
                      Letöltés
                    </Button>
                    <Button
                      onClick={handleUploadToDatabase}
                      disabled={uploadingToDb}
                      size="sm"
                    >
                      {uploadingToDb ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-1" />
                      )}
                      Adatbázisba
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center p-2 bg-slate-100 rounded">
                    <div className="font-bold text-slate-900">{stats.total}</div>
                    <div className="text-xs text-slate-600">Összesen</div>
                  </div>
                  <div className="text-center p-2 bg-slate-100 rounded">
                    <div className="font-bold text-slate-900">{stats.translated}</div>
                    <div className="text-xs text-slate-600">Fordítva</div>
                  </div>
                  <div className="text-center p-2 bg-slate-100 rounded">
                    <div className="font-bold text-slate-900">{stats.duration}</div>
                    <div className="text-xs text-slate-600">Idő</div>
                  </div>
                  <div className="text-center p-2 bg-slate-100 rounded">
                    <div className="font-bold text-slate-900">INGYENES</div>
                    <div className="text-xs text-slate-600">Költség</div>
                  </div>
                </div>
              )}

              {/* Upload Result */}
              {uploadResult && (
                <Card className={
                  uploadResult.success && uploadResult.data.insertedCount > 0
                    ? 'border-green-200 bg-green-50'
                    : uploadResult.success && uploadResult.data.insertedCount === 0
                    ? 'border-orange-200 bg-orange-50'
                    : 'border-red-200 bg-red-50'
                }>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {uploadResult.success && uploadResult.data.insertedCount > 0 ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : uploadResult.success && uploadResult.data.insertedCount === 0 ? (
                          <AlertCircle className="w-4 h-4 text-orange-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`text-sm font-medium ${
                          uploadResult.success && uploadResult.data.insertedCount > 0
                            ? 'text-green-800'
                            : uploadResult.success && uploadResult.data.insertedCount === 0
                            ? 'text-orange-800'
                            : 'text-red-800'
                        }`}>
                          {uploadResult.data?.insertedCount > 0 
                            ? `Feltöltve ${uploadResult.data.insertedCount}/${uploadResult.data.totalCount} ingatlan`
                            : uploadResult.data?.totalCount
                            ? 'Nem került új ingatlan feltöltésre'
                            : uploadResult.message
                          }
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={resetUpload}>
                        ✕
                      </Button>
                    </div>
                    
                    {uploadResult.data?.duplicateCount > 0 && (
                      <div className="text-xs text-orange-700 mt-2">
                        {uploadResult.data.duplicateCount} ingatlan már létezett
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* JSON Output */}
              <textarea
                value={outputJson}
                readOnly
                placeholder="A fordított ingatlanok itt jelennek meg..."
                className="w-full h-64 p-3 border border-slate-300 rounded-md font-mono text-sm bg-slate-50 resize-y"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}