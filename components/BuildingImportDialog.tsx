import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { apiClient } from "app";
import type {
  ParseFileResponse,
  ExecuteImportRequest,
  ExecuteImportResponse,
  PTSColumnMapping,
  AssessmentColumnMapping,
  MaintenanceColumnMapping,
} from "types";

interface Props {
  onImportComplete: () => void;
  defaultTab?: ImportType;
  trigger?: React.ReactNode;
}

type ImportType = "buildings" | "pts" | "assessments" | "maintenance";

export const BuildingImportDialog = ({ onImportComplete, defaultTab = "buildings", trigger }: Props) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "importing" | "complete">("upload");
  const [importType, setImportType] = useState<ImportType>(defaultTab);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseFileResponse | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<ExecuteImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // New state for selection and options
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [detectSubBuildings, setDetectSubBuildings] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setStep("importing");
    setError(null);

    try {
      let response;
      switch (importType) {
        case "pts":
          response = await apiClient.parse_pts_file({ file: selectedFile });
          break;
        case "assessments":
          response = await apiClient.parse_assessment_file({ file: selectedFile });
          break;
        case "maintenance":
          response = await apiClient.parse_maintenance_file({ file: selectedFile });
          break;
        case "buildings":
        default:
          response = await apiClient.parse_import_file({ file: selectedFile });
          break;
      }
      
      const result = await response.json();
      setParseResult(result);

      // Initialize column mapping
      const initialMapping: Record<string, string> = {};
      Object.entries(result.suggested_mapping).forEach(([field, detectedColumn]) => {
        if (detectedColumn) {
          initialMapping[field] = detectedColumn;
        }
      });
      setColumnMapping(initialMapping);

      // Select all rows by default
      const allIndices = new Set(result.preview_rows.map((_, idx) => idx));
      setSelectedRows(allIndices);

      setStep("mapping");
    } catch (err) {
      console.error("Error parsing file:", err);
      setError("Virhe tiedoston lukemisessa. Tarkista tiedostomuoto.");
      setStep("upload");
    }
  };

  const toggleRowSelection = (idx: number) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(idx)) {
      newSelection.delete(idx);
    } else {
      newSelection.add(idx);
    }
    setSelectedRows(newSelection);
  };

  const toggleAllSelection = () => {
    if (parseResult && selectedRows.size === parseResult.preview_rows.length) {
      setSelectedRows(new Set());
    } else if (parseResult) {
      const allIndices = new Set(parseResult.preview_rows.map((_, idx) => idx));
      setSelectedRows(allIndices);
    }
  };

  const handleExecuteImport = async () => {
    if (!parseResult) return;

    setStep("importing");
    setError(null);

    try {
      let response;
      const fileId = parseResult.file_id;
      const skipInvalid = true;

      // Filter mapping to remove empty values
      const cleanMapping: any = {};
      Object.entries(columnMapping).forEach(([key, value]) => {
        if (value && value !== "_none") cleanMapping[key] = value;
      });

      switch (importType) {
        case "pts":
          response = await apiClient.execute_pts_import({
            file_id: fileId,
            column_mapping: cleanMapping as PTSColumnMapping,
            skip_invalid: skipInvalid,
          });
          break;
        case "assessments":
          response = await apiClient.execute_assessment_import({
            file_id: fileId,
            column_mapping: cleanMapping as AssessmentColumnMapping,
            skip_invalid: skipInvalid,
          });
          break;
        case "maintenance":
          response = await apiClient.execute_maintenance_import({
            file_id: fileId,
            column_mapping: cleanMapping as MaintenanceColumnMapping,
            skip_invalid: skipInvalid,
          });
          break;
        case "buildings":
        default:
          response = await apiClient.execute_import({
            file_id: fileId,
            column_mapping: cleanMapping,
            skip_invalid: skipInvalid,
            selected_rows: Array.from(selectedRows),
            detect_sub_buildings: detectSubBuildings,
          });
          break;
      }

      const result = await response.json();
      setImportResult(result);
      setStep("complete");

      // Refresh data
      setTimeout(() => {
        onImportComplete();
        // Don't auto-close if there are errors, user might want to see them
        if (result.errors.length === 0) {
          handleClose();
        }
      }, 2000);
    } catch (err) {
      console.error("Error executing import:", err);
      setError("Virhe tuonnissa. Yritä uudelleen.");
      setStep("mapping");
    }
  };

  const handleClose = () => {
    setOpen(false);
    setStep("upload");
    setSelectedFile(null);
    setParseResult(null);
    setColumnMapping({});
    setImportResult(null);
    setError(null);
    setSelectedRows(new Set());
    setDetectSubBuildings(false);
    // Reset to default tab when closing
    setImportType(defaultTab);
  };

  const getFieldsForType = () => {
    switch (importType) {
      case "pts":
        return [
          { key: "building_name", label: "Rakennus *" },
          { key: "component", label: "Komponentti/Aihe" },
          { key: "year", label: "Vuosi" },
          { key: "cost", label: "Kustannusarvio" },
          { key: "priority", label: "Kiireellisyys" },
        ];
      case "assessments":
        return [
          { key: "building_name", label: "Rakennus *" },
          { key: "component", label: "Komponentti *" },
          { key: "score", label: "Kunto (1-5) *" },
          { key: "date", label: "Pvm" },
        ];
      case "maintenance":
        return [
          { key: "building_name", label: "Rakennus *" },
          { key: "description", label: "Kuvaus *" },
          { key: "date", label: "Pvm" },
          { key: "cost", label: "Hinta" },
          { key: "component", label: "Komponentti" },
        ];
      case "buildings":
      default:
        return [
          { key: "name", label: "Nimi *" },
          { key: "address", label: "Osoite" },
          { key: "construction_year", label: "Valmistumisvuosi *" },
          { key: "area_m2", label: "Pinta-ala (m²) *" },
          { key: "building_type", label: "Käyttötarkoitus" },
          { key: "municipality", label: "Kunta" },
        ];
    }
  };

  const currentFields = getFieldsForType();

  return (
    <Dialog open={open} onOpenChange={(openState) => {
      setOpen(openState);
      if (!openState) handleClose();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Tuo rakennuksia
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tuo aineistoa Excelistä/CSV:stä</DialogTitle>
          <DialogDescription>
            Tuo rakennuksia, PTS-suunnitelmia tai huoltohistoriaa massana.
          </DialogDescription>
        </DialogHeader>

        {/* Move Tabs here but disable if not in upload step */}
        <Tabs value={importType} onValueChange={(v) => setImportType(v as ImportType)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="buildings" disabled={step !== 'upload'}>Rakennukset</TabsTrigger>
            <TabsTrigger value="pts" disabled={step !== 'upload'}>PTS-suunnitelma</TabsTrigger>
            <TabsTrigger value="assessments" disabled={step !== 'upload'}>Kuntoarviot</TabsTrigger>
            <TabsTrigger value="maintenance" disabled={step !== 'upload'}>Huoltohistoria</TabsTrigger>
          </TabsList>
        </Tabs>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Upload Step */}
        {step === "upload" && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-12 text-center">
              <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Button variant="outline" size="lg" asChild>
                  <span>Valitse tiedosto</span>
                </Button>
              </label>
              {selectedFile && (
                <p className="mt-4 text-sm font-medium text-primary">
                  Valittu: {selectedFile.name}
                </p>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Peruuta
              </Button>
              <Button onClick={handleUpload} disabled={!selectedFile}>
                Jatka
              </Button>
            </div>
          </div>
        )}

        {/* Column Mapping Step */}
        {step === "mapping" && parseResult && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">1. Kohdista sarakkeet</h3>
                <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                  {currentFields.map((field) => (
                    <div key={field.key} className="flex items-center gap-4">
                      <div className="w-1/3 text-sm font-medium">{field.label}</div>
                      <div className="w-2/3">
                        <Select
                          value={columnMapping[field.key] || ""}
                          onValueChange={(value) =>
                            setColumnMapping((prev) => ({ ...prev, [field.key]: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Valitse sarake..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">-- Ei käytössä --</SelectItem>
                            {parseResult.headers.map((header) => (
                              <SelectItem key={header} value={header}>
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">2. Asetukset</h3>
                <div className="space-y-4 bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Löydetty:</span>
                    <span className="text-sm">{parseResult.total_rows} riviä</span>
                  </div>
                  
                  {importType === "buildings" && (
                     <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="sub-buildings" 
                        checked={detectSubBuildings}
                        onCheckedChange={(checked) => setDetectSubBuildings(checked as boolean)}
                      />
                      <label
                        htmlFor="sub-buildings"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Tunnista piharakennukset automaattisesti
                        <p className="text-xs text-muted-foreground font-normal mt-1">
                          Merkitsee rakennukset, joiden nimessä on esim. "varasto", "sauna" tai "lato".
                        </p>
                      </label>
                    </div>
                  )}
                  
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded text-sm text-blue-800 dark:text-blue-200">
                    <p>Valitse tuotavat rivit alla olevasta taulukosta.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview & Selection */}
            {parseResult.preview_rows.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                   <h3 className="font-semibold text-lg">3. Valitse rivit ({selectedRows.size} valittu)</h3>
                   <div className="space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedRows(new Set())}>Poista valinnat</Button>
                      <Button variant="outline" size="sm" onClick={toggleAllSelection}>Valitse kaikki</Button>
                   </div>
                </div>
                
                <div className="border rounded-lg overflow-auto max-h-[400px]">
                  <table className="w-full text-sm relative">
                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 w-[40px]">
                          <Checkbox 
                            checked={selectedRows.size === parseResult.preview_rows.length && parseResult.preview_rows.length > 0}
                            onCheckedChange={toggleAllSelection}
                          />
                        </th>
                        {currentFields.map((field) => (
                          <th key={field.key} className="px-3 py-2 text-left font-medium min-w-[150px]">
                            {field.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {parseResult.preview_rows.map((row, idx) => (
                        <tr key={idx} className={selectedRows.has(idx) ? "bg-blue-50/50 dark:bg-blue-900/20" : ""}>
                          <td className="px-3 py-2 text-center">
                            <Checkbox 
                              checked={selectedRows.has(idx)}
                              onCheckedChange={() => toggleRowSelection(idx)}
                            />
                          </td>
                          {currentFields.map((field) => (
                            <td key={field.key} className="px-3 py-2 truncate max-w-[200px]" title={String(row[columnMapping[field.key]] || "")}>
                              {columnMapping[field.key] ? String(row[columnMapping[field.key]] || "-") : "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Takaisin
              </Button>
              <Button onClick={handleExecuteImport} disabled={!columnMapping[currentFields[0].key] || selectedRows.size === 0}>
                Tuo {selectedRows.size} riviä
              </Button>
            </div>
          </div>
        )}

        {/* Importing Step */}
        {step === "importing" && (
          <div className="text-center py-8">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Tuodaan rakennuksia...</p>
          </div>
        )}

        {/* Complete Step */}
        {step === "complete" && importResult && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">{importResult.message}</p>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p>Tuotu: {importResult.success_count} rakennusta</p>
                {importResult.skipped_count > 0 && (
                  <p>Ohitettu: {importResult.skipped_count} riviä</p>
                )}
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="max-h-60 overflow-y-auto bg-destructive/10 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2 text-destructive">Virheet ({importResult.errors.length}):</h4>
                <div className="space-y-2">
                  {importResult.errors.map((error, idx) => (
                    <div key={idx} className="text-sm bg-white dark:bg-black p-2 rounded border border-destructive/20">
                      <span className="font-semibold">Rivi {error.row_number}:</span> {error.errors.join(", ")}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleClose}>Sulje</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
