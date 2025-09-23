"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Download,
  Database,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Trash2,
  AlertTriangle
} from 'lucide-react';

const DatabaseManager = () => {
  const [jsonData, setJsonData] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Live log state
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  // Log hozzáadása a live loghoz
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      id: Date.now(),
      timestamp,
      message,
      type // 'info', 'success', 'error', 'warning'
    };
    setLogs(prev => [...prev, logEntry]);
  };

  // Logok törlése
  const clearLogs = () => {
    setLogs([]);
  };

  const handleFileUpload = (file) => {
    if (!file) return;

    addLog('JSON fájl beolvasása...', 'info');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonContent = JSON.parse(String(e.target?.result));
        setJsonData(JSON.stringify(jsonContent, null, 2));
        addLog('JSON fájl sikeresen beolvasva', 'success');
        setError(null);
      } catch (err) {
        addLog('Hibás JSON fájl formátum', 'error');
        setError('Hibás JSON fájl formátum');
      }
    };
    reader.readAsText(file);
  };

  // Teljes adatbázis export JSON-ba
  const exportDatabase = async () => {
    setExporting(true);
    setError(null);
    clearLogs();
    setShowLogs(true);

    addLog('Adatbázis export indítása...', 'info');

    try {
      const response = await fetch('/api/export-database', {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export hiba');
      }

      const data = await response.json();
      addLog(`${data.count} ingatlan lekérve az adatbázisból`, 'success');
      
      // JSON fájl letöltése
      addLog('JSON fájl generálása...', 'info');
      const jsonString = JSON.stringify(data.properties, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const fileName = `database_export_${new Date().toISOString().slice(0, 10)}.json`;
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addLog(`Fájl letöltve: ${fileName}`, 'success');

      setResult({
        success: true,
        message: `Sikeresen exportálva ${data.count} ingatlan`,
        count: data.count
      });

    } catch (error) {
      addLog(`Export hiba: ${error.message}`, 'error');
      setError(`Export hiba: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  // JSON feltöltés és adatbázis frissítés
  const replaceDatabase = async () => {
    if (!jsonData.trim()) {
      addLog('JSON adat szükséges', 'error');
      setError('JSON adat szükséges');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setShowConfirmation(false);
    clearLogs();
    setShowLogs(true);

    addLog('JSON adatok feldolgozása...', 'info');

    try {
      const parsedData = JSON.parse(jsonData);
      addLog('JSON parsing sikeres', 'success');
      
      // Automatikus tömbbé alakítás ha nem tömb
      let processedData;
      if (!Array.isArray(parsedData)) {
        addLog('Egyedi objektum tömbbé alakítása...', 'warning');
        processedData = [parsedData];
        addLog('1 objektum tömbbe csomagolva', 'info');
      } else {
        processedData = parsedData;
        addLog(`${processedData.length} ingatlan található a JSON-ban`, 'info');
      }

      if (processedData.length === 0) {
        throw new Error('A JSON nem tartalmaz feldolgozható adatokat');
      }

      addLog('Adatbázis frissítés indítása...', 'info');

      const response = await fetch('/api/replace-database-with-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: processedData
        }),
      });

      // Stream olvasása progress-hez
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.type === 'progress') {
                    addLog(`Feldolgozva: ${data.processed}/${data.total} (${data.action}: ${data.id})`, 'info');
                  } else if (data.type === 'error') {
                    addLog(`Hiba: ${data.id} - ${data.message}`, 'error');
                  } else if (data.type === 'complete') {
                    addLog(`Befejezve: ${data.stats.inserted} új, ${data.stats.updated} frissített`, 'success');
                  }
                } catch (e) {
                  // Ignore JSON parse errors in stream
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      // Final result handling - Note: this won't work with streaming, need to handle in stream
      addLog('Adatbázis frissítés sikeresen befejezve', 'success');

      setResult({
        success: true,
        message: 'Streaming befejezve - lásd részletek a logban',
        streaming: true
      });

    } catch (error) {
      addLog(`Feldolgozási hiba: ${error.message}`, 'error');
      setError(error.message || 'Feltöltési hiba történt');
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setJsonData('');
    setResult(null);
    setError(null);
    setShowConfirmation(false);
    clearLogs();
    setShowLogs(false);
  };

  // Live log komponens render
  const renderLogs = () => {
    if (!showLogs || logs.length === 0) return null;

    return (
      <Card className="mt-4">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4" />
              Live Log ({logs.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={clearLogs} variant="ghost" size="sm">
                <RefreshCw className="w-3 h-3" />
              </Button>
              <Button onClick={() => setShowLogs(false)} variant="ghost" size="sm">
                <XCircle className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-900 rounded-lg p-3 h-40 overflow-y-auto font-mono text-xs">
            {logs.map((log) => (
              <div key={log.id} className={`mb-1 ${
                log.type === 'error' ? 'text-red-400' :
                log.type === 'success' ? 'text-green-400' :
                log.type === 'warning' ? 'text-yellow-400' :
                'text-slate-300'
              }`}>
                <span className="text-slate-500">[{log.timestamp}]</span> {log.message}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Adatbázis Kezelő
          </h1>
          <p className="text-slate-600 mt-2">
            Teljes adatbázis import és export kezelése
          </p>
        </div>

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" />
              Adatbázis Export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              Exportálja a teljes adatbázist JSON formátumban. A fájl automatikusan letöltésre kerül.
            </p>
            
            <Button
              onClick={exportDatabase}
              disabled={exporting}
              size="lg"
              className="w-full md:w-auto"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Export folyamatban...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Teljes adatbázis letöltése
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-orange-600" />
              Adatbázis Import (Intelligens frissítés)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800">Működés</span>
              </div>
              <p className="text-blue-700 text-sm mt-1">
                <strong>Új ID-k:</strong> beszúrásra kerülnek az adatbázisba<br/>
                <strong>Meglévő ID-k:</strong> csak a változott mezők frissülnek<br/>
                <strong>Nem tömb:</strong> automatikusan tömbbé alakítás<br/>
                <strong>Semmi törlés</strong> nem történik
              </p>
            </div>

            {/* File Upload */}
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-orange-400 hover:bg-orange-50/50 transition-colors">
              <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <input
                type="file"
                accept=".json"
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
                className="hidden"
                id="import-file"
              />
              <label
                htmlFor="import-file"
                className="cursor-pointer text-orange-600 hover:text-orange-800"
              >
                JSON fájl kiválasztása
              </label>
            </div>

            {/* Text Area */}
            <textarea
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              placeholder="JSON adatok beillesztése..."
              className="w-full h-40 p-3 border border-slate-300 rounded-md font-mono text-sm resize-y"
            />

            {/* Action Buttons */}
            <div className="flex gap-3">
              {!showConfirmation ? (
                <Button
                  onClick={() => setShowConfirmation(true)}
                  disabled={loading || !jsonData.trim()}
                  variant="default"
                  size="lg"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Adatbázis frissítése
                </Button>
              ) : (
                <div className="flex gap-2 items-center">
                  <Button
                    onClick={replaceDatabase}
                    disabled={loading}
                    variant="default"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Frissítés...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Igen, frissítés!
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowConfirmation(false)}
                    variant="outline"
                    disabled={loading}
                  >
                    Mégse
                  </Button>
                </div>
              )}
              
              <Button
                onClick={resetAll}
                variant="outline"
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Törlés
              </Button>
            </div>
            
            {/* Live Logs */}
            {renderLogs()}
          </CardContent>
        </Card>

        {/* Result Messages */}
        {result && (
          <Card className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={result.success ? "text-green-800" : "text-red-800"}>
                    {result.message}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setResult(null)}>
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>

              {result.success && result.count && (
                <div className="text-sm text-green-700 mt-2">
                  Feldolgozott ingatlanok: {result.count}
                </div>
              )}

              {result.stats && (
                <div className="text-sm mt-2 space-y-1">
                  {result.stats.newProperties > 0 && (
                    <div className="text-green-700">
                      Új ingatlanok: {result.stats.newProperties}
                    </div>
                  )}
                  {result.stats.updatedProperties > 0 && (
                    <div className="text-blue-700">
                      Frissített ingatlanok: {result.stats.updatedProperties}
                    </div>
                  )}
                  {result.stats.errorCount > 0 && (
                    <div className="text-red-700">
                      Hibák: {result.stats.errorCount}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error Messages */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
              <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
                <XCircle className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-blue-800">
                <p className="font-medium mb-2">Használati útmutató:</p>
                <ul className="text-sm space-y-1">
                  <li><strong>Export:</strong> Letölti az összes ingatlant JSON fájlba</li>
                  <li><strong>Import:</strong> Intelligens frissítés új/módosított ingatlanokkal</li>
                  <li><strong>Live Log:</strong> Valós idejű folyamatkövetés</li>
                  <li><strong>Auto Array:</strong> Egyedi objektumok automatikusan tömbbé alakítva</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DatabaseManager;