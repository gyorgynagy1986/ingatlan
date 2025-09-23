"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  Minus,
  Edit3,
  Loader2,
  Download,
  Save,
  RefreshCw,
} from "lucide-react";

/* Database upload hook */
const useDatabaseUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const uploadProperties = async (properties) => {
    setUploading(true);
    setUploadResult(null);

    try {
      const response = await fetch("/api/upload-properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: properties,
        }),
      });

      const result = await response.json();

      const finalResult = {
        success: response.ok,
        data: result,
        message: response.ok
          ? `Sikeresen feltöltve ${result.insertedCount || properties.length} ingatlan`
          : result.error || "Feltöltési hiba történt",
      };

      setUploadResult(finalResult);
      return finalResult;
    } catch (error) {
      const errorResult = {
        success: false,
        error: error.message,
        message: `Feltöltési hiba: ${error.message}`,
      };
      setUploadResult(errorResult);
      return errorResult;
    } finally {
      setUploading(false);
    }
  };

  // Egyedi módosítások feltöltése
  const uploadIndividualChange = async (propertyId, fieldName, newValue) => {
    setUploading(true);
    try {
      const response = await fetch("/api/update-property-field", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId: propertyId,
          fieldName: fieldName,
          newValue: newValue,
        }),
      });

      const result = await response.json();
      setUploading(false);
      return {
        success: response.ok,
        data: result,
        message: response.ok
          ? `Sikeresen frissítve: ${fieldName}`
          : result.error || "Frissítési hiba",
      };
    } catch (error) {
      setUploading(false);
      return {
        success: false,
        error: error.message,
        message: `Frissítési hiba: ${error.message}`,
      };
    }
  };

  // Több módosítás együttes feltöltése
  const uploadBatchChanges = async (changes) => {
    setUploading(true);
    try {
      const response = await fetch("/api/batch-update-properties", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          changes: changes,
        }),
      });

      const result = await response.json();
      setUploading(false);
      return {
        success: response.ok,
        data: result,
        message: response.ok
          ? `Sikeresen frissítve ${changes.length} módosítás`
          : result.error || "Batch frissítési hiba",
      };
    } catch (error) {
      setUploading(false);
      return {
        success: false,
        error: error.message,
        message: `Batch frissítési hiba: ${error.message}`,
      };
    }
  };

  const resetUpload = () => {
    setUploading(false);
    setUploadResult(null);
  };

  return {
    uploading,
    uploadResult,
    uploadProperties,
    uploadIndividualChange,
    uploadBatchChanges,
    resetUpload,
  };
};

const PropertyCompareApp = () => {
  const [oldData, setOldData] = useState("");
  const [newData, setNewData] = useState("");
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Összehasonlítás módja
  const [comparisonMode, setComparisonMode] = useState("json-vs-json"); // "json-vs-json" | "database-vs-json"
  const [jsonForDbComparison, setJsonForDbComparison] = useState("");
  
  // Egyedi változások kezelése
  const [uploadedChanges, setUploadedChanges] = useState(new Set());
  const [individualResults, setIndividualResults] = useState({});

  const {
    uploading: uploadingToDb,
    uploadResult,
    uploadProperties,
    uploadIndividualChange,
    uploadBatchChanges,
    resetUpload,
  } = useDatabaseUpload();

  const handleFileUpload = (file, setter) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(String(e.target?.result));
        setter(JSON.stringify(jsonData, null, 2));
        setError(null);
      } catch (err) {
        setError("Hibás JSON fájl formátum");
      }
    };
    reader.readAsText(file);
  };

  const downloadArray = (arrayData, filename) => {
    const jsonString = JSON.stringify(arrayData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const compareData = async () => {
    if (comparisonMode === "json-vs-json") {
      // Eredeti JSON vs JSON logika
      if (!oldData || !newData) {
        setError("Mindkét JSON adat szükséges");
        return;
      }
    } else if (comparisonMode === "database-vs-json") {
      // Adatbázis vs JSON logika
      if (!jsonForDbComparison) {
        setError("JSON adat szükséges az adatbázissal való összehasonlításhoz");
        return;
      }
    }

    setLoading(true);
    setError(null);
    setComparison(null);
    setUploadedChanges(new Set());
    setIndividualResults({});

    try {
      let response;
      
      if (comparisonMode === "json-vs-json") {
        const oldJson = JSON.parse(oldData);
        const newJson = JSON.parse(newData);

        response = await fetch("/api/compare", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            oldData: oldJson,
            newData: newJson,
          }),
        });
      } else {
        // Adatbázis vs JSON összehasonlítás
        const jsonData = JSON.parse(jsonForDbComparison);

        response = await fetch("/api/compare-database", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonData: jsonData,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "API hiba");
      }

      const result = await response.json();
      setComparison(result);
      resetUpload();
    } catch (err) {
      setError(err.message || "Összehasonlítási hiba történt");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadToDatabase = async (properties) => {
    if (!properties || properties.length === 0) {
      setError("Nincsenek feltöltendő adatok");
      return;
    }

    const result = await uploadProperties(properties);

    if (!result.success) {
      setError(result.message);
    }
  };

  // Egyedi változás feltöltése
  const handleIndividualChangeUpload = async (propertyId, change) => {
    const changeKey = `${propertyId}-${change.field}`;
    
    try {
      const result = await uploadIndividualChange(
        propertyId,
        change.field,
        change.newValue
      );

      setIndividualResults(prev => ({
        ...prev,
        [changeKey]: result
      }));

      if (result.success) {
        setUploadedChanges(prev => new Set([...prev, changeKey]));
      }

      return result;
    } catch (error) {
      setIndividualResults(prev => ({
        ...prev,
        [changeKey]: {
          success: false,
          message: error.message
        }
      }));
    }
  };

  // Összes változás feltöltése egyben
  const handleUploadAllChanges = async () => {
    if (!comparison || !comparison.modified) {
      setError("Nincsenek feltöltendő változások");
      return;
    }

    // Összegyűjtjük az összes változást
    const allChanges = [];
    comparison.modified.forEach(item => {
      item.changes.forEach(change => {
        if (change.type !== 'array_modified' && change.type !== 'images_modified' && change.type !== 'features_modified') {
          allChanges.push({
            propertyId: item.id,
            fieldName: change.field,
            newValue: change.newValue,
            oldValue: change.oldValue
          });
        }
      });
    });

    if (allChanges.length === 0) {
      setError("Nincsenek feltölthető egyszerű változások");
      return;
    }

    try {
      const result = await uploadBatchChanges(allChanges);
      
      if (result.success) {
        // Megjelöljük az összes változást feltöltöttként
        const changeKeys = allChanges.map(c => `${c.propertyId}-${c.fieldName}`);
        setUploadedChanges(prev => new Set([...prev, ...changeKeys]));
        
        // Egyedi eredmények frissítése
        const newResults = {};
        changeKeys.forEach(key => {
          newResults[key] = { success: true, message: "Batch feltöltés sikeres" };
        });
        setIndividualResults(prev => ({ ...prev, ...newResults }));
      }

      return result;
    } catch (error) {
      setError(`Batch feltöltési hiba: ${error.message}`);
    }
  };

  const isChangeUploaded = (propertyId, change) => {
    return uploadedChanges.has(`${propertyId}-${change.field}`);
  };

  const getChangeResult = (propertyId, change) => {
    return individualResults[`${propertyId}-${change.field}`];
  };

  const renderChangeDetails = (change, propertyId) => {
    const changeKey = `${propertyId}-${change.field}`;
    const isUploaded = isChangeUploaded(propertyId, change);
    const result = getChangeResult(propertyId, change);

    switch (change.type) {
      case "array_modified":
        return (
          <div className="ml-4 mt-2">
            <div className="text-sm text-slate-600">
              Tömb módosítva: {change.oldLength} → {change.newLength} elem
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadArray(change.oldValue, `old_${change.field}`)}
              >
                Régi letöltése
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadArray(change.newValue, `new_${change.field}`)}
              >
                Új letöltése
              </Button>
            </div>
          </div>
        );

      case "images_modified":
        return (
          <div className="ml-4 mt-2 space-y-2">
            {change.details.map((detail, idx) => (
              <div key={idx} className="text-sm border-l-2 border-slate-200 pl-3">
                {detail.type === "added" && (
                  <div className="text-green-600 space-y-1">
                    <div>
                      <Plus className="w-4 h-4 inline mr-1" />
                      {detail.count} új kép hozzáadva
                    </div>
                    {detail.urls && detail.urls.length > 0 && (
                      <div className="ml-5 space-y-1">
                        <div className="text-xs text-slate-600 font-medium">
                          Új képek URL-jei:
                        </div>
                        {detail.urls.map((url, urlIdx) => (
                          <div key={urlIdx} className="text-xs text-green-700 break-all">
                            • {url}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {detail.type === "deleted" && (
                  <div className="text-red-600 space-y-1">
                    <div>
                      <Minus className="w-4 h-4 inline mr-1" />
                      {detail.count} kép törölve
                    </div>
                    {detail.urls && detail.urls.length > 0 && (
                      <div className="ml-5 space-y-1">
                        <div className="text-xs text-slate-600 font-medium">
                          Törölt képek URL-jei:
                        </div>
                        {detail.urls.map((url, urlIdx) => (
                          <div key={urlIdx} className="text-xs text-red-700 break-all">
                            • {url}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {detail.type === "modified" && (
                  <div className="text-blue-600">
                    <Edit3 className="w-4 h-4 inline mr-1" />
                    Kép módosítva: {detail.url}
                  </div>
                )}
              </div>
            ))}
            <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200">
              <div className="flex justify-between">
                <span>Képek száma: {change.oldCount} → {change.newCount}</span>
                <div className="flex gap-4">
                  {change.oldUrls && change.oldUrls.length > 0 && (
                    <button
                      className="text-blue-600 hover:text-blue-800 underline"
                      onClick={() => {
                        navigator.clipboard.writeText(change.oldUrls.join('\n'));
                        alert('Régi URL-ek másolva!');
                      }}
                    >
                      Régi URL-ek másolása
                    </button>
                  )}
                  {change.newUrls && change.newUrls.length > 0 && (
                    <button
                      className="text-blue-600 hover:text-blue-800 underline"
                      onClick={() => {
                        navigator.clipboard.writeText(change.newUrls.join('\n'));
                        alert('Új URL-ek másolva!');
                      }}
                    >
                      Új URL-ek másolása
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case "features_modified":
        return (
          <div className="ml-4 mt-2 space-y-1">
            {change.details.map((detail, idx) => (
              <div key={idx} className="text-sm">
                {detail.type === "added" && (
                  <div className="text-green-600">
                    <Plus className="w-4 h-4 inline mr-1" />
                    Új: {detail.features.map((f) => f.name).join(", ")}
                  </div>
                )}
                {detail.type === "removed" && (
                  <div className="text-red-600">
                    <Minus className="w-4 h-4 inline mr-1" />
                    Törölt: {detail.features.map((f) => f.name).join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      default:
        return (
          <div className="ml-4 text-sm text-slate-600 mt-1">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-red-600">
                  {change.oldValue ?? "üres"}
                </span>
                <span className="mx-2">→</span>
                <span className="font-medium text-green-600">
                  {change.newValue ?? "üres"}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {result && (
                  <div className="text-xs">
                    {result.success ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Feltöltve
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        Hiba
                      </Badge>
                    )}
                  </div>
                )}
                
                <Button
                  size="sm"
                  variant={isUploaded ? "secondary" : "outline"}
                  disabled={uploadingToDb || isUploaded}
                  onClick={() => handleIndividualChangeUpload(propertyId, change)}
                >
                  {uploadingToDb ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isUploaded ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <Save className="w-3 h-3" />
                  )}
                  {isUploaded ? "Feltöltve" : "Feltöltés"}
                </Button>
              </div>
            </div>
            
            {result && !result.success && (
              <div className="text-xs text-red-600 mt-1">
                {result.message}
              </div>
            )}
          </div>
        );
    }
  };

  // Számoljuk ki hány egyszerű változás van
  const getSimpleChangesCount = () => {
    if (!comparison || !comparison.modified) return 0;
    
    let count = 0;
    comparison.modified.forEach(item => {
      item.changes.forEach(change => {
        if (change.type !== 'array_modified' && 
            change.type !== 'images_modified' && 
            change.type !== 'features_modified') {
          count++;
        }
      });
    });
    return count;
  };

  const simpleChangesCount = getSimpleChangesCount();
  const uploadedChangesCount = [...uploadedChanges].filter(key => {
    // Ellenőrizzük hogy a kulcs egy egyszerű változáshoz tartozik-e
    const [propertyId, field] = key.split('-');
    const property = comparison?.modified.find(p => p.id === propertyId);
    if (!property) return false;
    
    const change = property.changes.find(c => c.field === field);
    return change && change.type !== 'array_modified' && 
           change.type !== 'images_modified' && 
           change.type !== 'features_modified';
  }).length;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with mode selector */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Adatbázis Összehasonlítás
          </h1>
          <p className="text-slate-600">
            JSON fájlok összehasonlítása és változások egyedi kezelése
          </p>
          
          {/* Mode Selector */}
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <h3 className="font-medium text-slate-900">Összehasonlítás módja:</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="comparison-mode"
                      value="json-vs-json"
                      checked={comparisonMode === "json-vs-json"}
                      onChange={(e) => setComparisonMode(e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">JSON vs JSON (eredeti)</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="comparison-mode"
                      value="database-vs-json"
                      checked={comparisonMode === "database-vs-json"}
                      onChange={(e) => setComparisonMode(e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">Adatbázis vs JSON</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* File Upload */}
        {comparisonMode === "json-vs-json" ? (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Régi adatok</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                  <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleFileUpload(e.target.files?.[0], setOldData)}
                    className="hidden"
                    id="old-file"
                  />
                  <label
                    htmlFor="old-file"
                    className="cursor-pointer text-blue-600 hover:text-blue-800"
                  >
                    JSON fájl kiválasztása
                  </label>
                </div>
                <textarea
                  value={oldData}
                  onChange={(e) => setOldData(e.target.value)}
                  placeholder="JSON adatok beillesztése..."
                  className="w-full h-32 p-3 border border-slate-300 rounded-md font-mono text-sm resize-y"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Új adatok</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                  <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleFileUpload(e.target.files?.[0], setNewData)}
                    className="hidden"
                    id="new-file"
                  />
                  <label
                    htmlFor="new-file"
                    className="cursor-pointer text-blue-600 hover:text-blue-800"
                  >
                    JSON fájl kiválasztása
                  </label>
                </div>
                <textarea
                  value={newData}
                  onChange={(e) => setNewData(e.target.value)}
                  placeholder="JSON adatok beillesztése..."
                  className="w-full h-32 p-3 border border-slate-300 rounded-md font-mono text-sm resize-y"
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Database vs JSON mode */
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  JSON adatok (összehasonlítás az adatbázissal)
                </CardTitle>
                <p className="text-sm text-slate-600">
                  A feltöltött JSON adatok automatikusan összehasonlításra kerülnek a jelenlegi adatbázis állapottal. Nem szükséges a régi adatok feltöltése.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                  <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleFileUpload(e.target.files?.[0], setJsonForDbComparison)}
                    className="hidden"
                    id="db-json-file"
                  />
                  <label
                    htmlFor="db-json-file"
                    className="cursor-pointer text-blue-600 hover:text-blue-800"
                  >
                    JSON fájl kiválasztása
                  </label>
                </div>
                <textarea
                  value={jsonForDbComparison}
                  onChange={(e) => setJsonForDbComparison(e.target.value)}
                  placeholder="JSON adatok beillesztése (ezek lesznek összehasonlítva az adatbázissal)..."
                  className="w-full h-40 p-3 border border-slate-300 rounded-md font-mono text-sm resize-y"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Compare Button */}
        <div className="text-center">
          <Button
            onClick={compareData}
            disabled={loading || 
              (comparisonMode === "json-vs-json" && (!oldData || !newData)) ||
              (comparisonMode === "database-vs-json" && !jsonForDbComparison)
            }
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Összehasonlítás...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                {comparisonMode === "database-vs-json" 
                  ? "Adatbázis összehasonlítása JSON-nal"
                  : "JSON összehasonlítás indítása"
                }
              </>
            )}
          </Button>
        </div>

        {/* Error Message */}
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

        {/* Results */}
        {comparison && (
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Összesítő</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Edit3 className="w-6 h-6 mx-auto text-blue-600 mb-2" />
                    <div className="text-2xl font-bold text-blue-800">
                      {comparison.summary.totalModified}
                    </div>
                    <div className="text-sm text-blue-600">Módosított</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Plus className="w-6 h-6 mx-auto text-green-600 mb-2" />
                    <div className="text-2xl font-bold text-green-800">
                      {comparison.summary.totalAdded}
                    </div>
                    <div className="text-sm text-green-600">Új</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <Minus className="w-6 h-6 mx-auto text-red-600 mb-2" />
                    <div className="text-2xl font-bold text-red-800">
                      {comparison.summary.totalDeleted}
                    </div>
                    <div className="text-sm text-red-600">Törölt</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Modified Properties */}
            {comparison.modified.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                      <Edit3 className="w-5 h-5 text-blue-600" />
                      Módosított ingatlanok ({comparison.modified.length})
                    </CardTitle>
                    
                    {simpleChangesCount > 0 && (
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-slate-600">
                          {uploadedChangesCount}/{simpleChangesCount} változás feltöltve
                        </div>
                        <Button
                          onClick={handleUploadAllChanges}
                          disabled={uploadingToDb || uploadedChangesCount === simpleChangesCount}
                          size="sm"
                        >
                          {uploadingToDb ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          )}
                          Összes változás feltöltése ({simpleChangesCount - uploadedChangesCount})
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {comparison.modified.map((item) => (
                    <div key={item.id} className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50/30">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium text-slate-900">ID: {item.id}</div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadArray(item.oldData, `property_old_${item.id}`)}
                          >
                            Régi adat
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadArray(item.newData, `property_new_${item.id}`)}
                          >
                            Új adat
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {item.changes.map((change, idx) => (
                          <div key={idx}>
                            <div className="font-medium text-slate-700 text-sm">
                              {change.field}:
                            </div>
                            {renderChangeDetails(change, item.id)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* New Properties */}
            {comparison.added.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Új ingatlanok ({comparison.added.length})
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleUploadToDatabase(comparison.added.map((item) => item.data))}
                        disabled={uploadingToDb}
                      >
                        {uploadingToDb ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        Feltöltés adatbázisba
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => downloadArray(comparison.added.map((item) => item.data), "all_new_properties")}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        JSON letöltése
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Upload Result */}
                  {uploadResult && (
                    <Card className={
                      uploadResult.success && uploadResult.data?.insertedCount > 0
                        ? "border-green-200 bg-green-50"
                        : uploadResult.success
                        ? "border-orange-200 bg-orange-50"
                        : "border-red-200 bg-red-50"
                    }>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {uploadResult.success ? (
                              uploadResult.data?.insertedCount > 0 ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-orange-600" />
                              )
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                            <span className={
                              uploadResult.success
                                ? uploadResult.data?.insertedCount > 0
                                  ? "text-green-800"
                                  : "text-orange-800"
                                : "text-red-800"
                            }>
                              {uploadResult.success
                                ? uploadResult.data?.insertedCount > 0
                                  ? `Sikeresen feltöltve ${uploadResult.data.insertedCount} ingatlan`
                                  : "Nem került új ingatlan feltöltésre"
                                : uploadResult.message}
                            </span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={resetUpload}>
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>

                        {uploadResult.data?.duplicateCount > 0 && (
                          <div className="text-sm text-orange-700 mt-2">
                            {uploadResult.data.duplicateCount} ingatlan már létezett
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {comparison.added.map((item) => (
                    <div key={item.id} className="border-l-4 border-green-500 pl-4 py-3 bg-green-50/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-slate-900">ID: {item.id}</div>
                          <div className="text-sm text-slate-600">
                            {item.data.title_extra || item.data.town || "Új ingatlan"}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadArray(item.data, `new_property_${item.id}`)}
                        >
                          JSON letöltése
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Deleted Properties */}
            {comparison.deleted.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    Törölt ingatlanok ({comparison.deleted.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {comparison.deleted.map((item) => (
                    <div key={item.id} className="border-l-4 border-red-500 pl-4 py-2 bg-red-50/30">
                      <div className="font-medium text-slate-900">ID: {item.id}</div>
                      <div className="text-sm text-slate-600">
                        {item.data.title_extra || item.data.town || "Törölt ingatlan"}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* No Changes */}
            {comparison.summary.totalModified === 0 &&
              comparison.summary.totalAdded === 0 &&
              comparison.summary.totalDeleted === 0 && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="py-8 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-4" />
                    <h3 className="text-lg font-medium text-green-800 mb-2">
                      Nincs változás
                    </h3>
                    <p className="text-green-700">
                      A két adatset teljesen megegyezik
                    </p>
                  </CardContent>
                </Card>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyCompareApp;