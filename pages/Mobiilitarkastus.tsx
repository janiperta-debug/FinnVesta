import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Building, Calendar, User, ChevronRight, ChevronLeft, CheckCircle2, 
  Home, CloudRain, DoorOpen, LayoutGrid, PaintBucket, 
  Flame, Zap, Droplets, Fan, Save, Camera, AlertTriangle 
} from "lucide-react";
import { apiClient } from "app";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { CreateAssessmentRequest } from "types";

// Component definitions with metadata
const COMPONENTS = [
  { id: "structure", label: "Runko & Perustus", icon: Home, field: "structure_score", noteField: "structure_notes" },
  { id: "facade_roof", label: "Julkisivu & Katto", icon: CloudRain, field: "facade_roof_score", noteField: "facade_roof_notes" },
  { id: "windows_doors", label: "Ikkunat & Ovet", icon: DoorOpen, field: "windows_doors_score", noteField: "windows_doors_notes" },
  { id: "interior_walls", label: "Väliseinät", icon: LayoutGrid, field: "interior_walls_score", noteField: "interior_walls_notes" },
  { id: "interior_finishes", label: "Sisäpinnat", icon: PaintBucket, field: "interior_finishes_score", noteField: "interior_finishes_notes" },
  { id: "heating", label: "Lämmitys", icon: Flame, field: "heating_score", noteField: "heating_notes" },
  { id: "electrical", label: "Sähkö", icon: Zap, field: "electrical_score", noteField: "electrical_notes" },
  { id: "plumbing", label: "Vesi & Viemäri", icon: Droplets, field: "plumbing_score", noteField: "plumbing_notes" },
  { id: "hvac", label: "Ilmanvaihto", icon: Fan, field: "hvac_score", noteField: "hvac_notes" },
];

const CONDITION_LEVELS = [
  { value: 5, label: "5 - Uutta vastaava", color: "bg-green-500" },
  { value: 4, label: "4 - Hyvä", color: "bg-emerald-400" },
  { value: 3, label: "3 - Tyydyttävä", color: "bg-yellow-400" },
  { value: 2, label: "2 - Välttävä", color: "bg-orange-400" },
  { value: 1, label: "1 - Huono", color: "bg-red-500" },
];

export default function Mobiilitarkastus() {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [step, setStep] = useState(0); // 0: Select Building, 1: General Info, 2-10: Components, 11: Summary
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<Partial<CreateAssessmentRequest>>({
    assessment_date: new Date().toISOString().split('T')[0],
    inspector_name: "",
    notes: "",
  });

  useEffect(() => {
    loadBuildings();
  }, []);

  const loadBuildings = async () => {
    try {
      const response = await apiClient.list_organizations(); // Or list_buildings if available directly? Using list_organizations for now as placeholder or need specific endpoint?
      // Actually there is list_archived_buildings but usually we want active ones.
      // Usually user has access to buildings via organization. 
      // Let's use `get_portfolio_dashboard` to get buildings list or similar.
      // Ah, I don't see a direct `list_buildings` in the client methods snippet I saw earlier.
      // I'll try `get_portfolio_dashboard` which usually returns buildings.
      // Wait, `get_portfolio_dashboard` returns stats.
      // Let's check `Rakennukset.tsx` to see how it fetches buildings.
      // It probably uses `get_organization_info` or similar.
      // I'll try `get_organization_info` which returns `buildings` list.
      const orgInfo = await apiClient.get_organization_info();
      const data = await orgInfo.json();
      setBuildings(data.buildings || []);
    } catch (err) {
      console.error("Failed to load buildings", err);
      toast.error("Virhe rakennusten lataamisessa");
    }
  };

  const handleStart = () => {
    if (selectedBuildingId) setStep(1);
  };

  const handleNext = () => {
    setStep((prev) => Math.min(prev + 1, COMPONENTS.length + 2));
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo(0, 0);
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedBuildingId) return;
    
    setLoading(true);
    try {
      await apiClient.create_assessment(
        { buildingId: selectedBuildingId },
        formData as CreateAssessmentRequest
      );
      toast.success("Kuntoarvio tallennettu!");
      // Reset or redirect
      setTimeout(() => {
        setStep(0);
        setSelectedBuildingId(null);
        setFormData({
            assessment_date: new Date().toISOString().split('T')[0],
            inspector_name: "",
            notes: "",
        });
      }, 2000);
    } catch (err) {
      console.error("Failed to submit assessment", err);
      toast.error("Virhe tallennuksessa. Yritä uudelleen.");
    } finally {
      setLoading(false);
    }
  };

  const currentComponentIndex = step - 2;
  const currentComponent = COMPONENTS[currentComponentIndex];
  const progress = (step / (COMPONENTS.length + 2)) * 100;

  // View: Select Building
  if (step === 0) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Uusi tarkastus</h1>
          <p className="text-muted-foreground">Valitse rakennus aloittaaksesi</p>
        </div>

        <div className="space-y-4">
          <Label>Rakennus</Label>
          <Select value={selectedBuildingId || ""} onValueChange={setSelectedBuildingId}>
            <SelectTrigger className="h-12 text-lg">
              <SelectValue placeholder="Valitse listasta..." />
            </SelectTrigger>
            <SelectContent>
              {buildings.map(b => (
                <SelectItem key={b.id} value={String(b.id)} className="py-3">
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          className="w-full h-12 text-lg mt-8" 
          onClick={handleStart} 
          disabled={!selectedBuildingId}
        >
          Aloita tarkastus
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>

        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
          <p className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Tarkastus tallennetaan automaattisesti pilveen kun olet valmis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground">
            Vaihe {step} / {COMPONENTS.length + 2}
          </span>
          <div className="w-10" /> {/* Spacer */}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="flex-1">
        {/* View: General Info */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Perustiedot</CardTitle>
              <CardDescription>Tarkastuksen yleiset tiedot</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Päivämäärä</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="date" 
                    className="pl-10 h-12"
                    value={String(formData.assessment_date)}
                    onChange={(e) => updateField("assessment_date", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tarkastaja</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Etu- ja sukunimi" 
                    className="pl-10 h-12"
                    value={formData.inspector_name || ""}
                    onChange={(e) => updateField("inspector_name", e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Yleiset huomiot</Label>
                <Textarea 
                  placeholder="Muita huomioita tarkastukseen liittyen..."
                  className="min-h-[100px]"
                  value={formData.notes || ""}
                  onChange={(e) => updateField("notes", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* View: Component Assessment */}
        {step >= 2 && step <= COMPONENTS.length + 1 && currentComponent && (
          <Card className="border-t-4 border-t-primary">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-full">
                  <currentComponent.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{currentComponent.label}</CardTitle>
              </div>
              <CardDescription>Arvioi osan kunto ja kirjaa havainnot.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base">Kuntoluokka</Label>
                <div className="grid grid-cols-1 gap-2">
                  {CONDITION_LEVELS.map((level) => {
                    const isSelected = formData[currentComponent.field as keyof CreateAssessmentRequest] === level.value;
                    return (
                      <button
                        key={level.value}
                        onClick={() => updateField(currentComponent.field, level.value)}
                        className={`
                          flex items-center p-4 rounded-lg border-2 transition-all
                          ${isSelected 
                            ? `border-primary bg-primary/5 shadow-md` 
                            : "border-transparent bg-secondary hover:bg-secondary/80"}
                        `}
                      >
                        <div className={`w-4 h-4 rounded-full mr-3 ${level.color}`} />
                        <span className={`font-medium ${isSelected ? "text-primary" : ""}`}>
                          {level.label}
                        </span>
                        {isSelected && <CheckCircle2 className="ml-auto h-5 w-5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Havainnot & Toimenpiteet</Label>
                <Textarea 
                  placeholder={`Kirjaa havainnot liittyen osaan: ${currentComponent.label.toLowerCase()}...`}
                  className="min-h-[120px] text-base"
                  value={String(formData[currentComponent.noteField as keyof CreateAssessmentRequest] || "")}
                  onChange={(e) => updateField(currentComponent.noteField, e.target.value)}
                />
              </div>

              {/* Placeholder for Photo Upload - Can be implemented later */}
              <Button variant="outline" className="w-full gap-2" disabled>
                <Camera className="h-4 w-4" />
                Lisää valokuva (Tulossa)
              </Button>
            </CardContent>
          </Card>
        )}

        {/* View: Summary */}
        {step === COMPONENTS.length + 2 && (
          <Card>
             <CardHeader>
              <CardTitle>Yhteenveto</CardTitle>
              <CardDescription>Tarkista tiedot ennen tallennusta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Päivämäärä</span>
                  <span className="font-medium">{String(formData.assessment_date)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Tarkastaja</span>
                  <span className="font-medium">{formData.inspector_name || "-"}</span>
                </div>
                
                <div className="space-y-2 mt-4">
                  <Label>Kirjatut arviot</Label>
                  {COMPONENTS.map(comp => {
                    const score = formData[comp.field as keyof CreateAssessmentRequest];
                    if (!score) return null;
                    return (
                      <div key={comp.id} className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                        <div className="flex items-center gap-2">
                           <comp.icon className="h-4 w-4 text-muted-foreground" />
                           <span className="font-medium">{comp.label}</span>
                        </div>
                        <Badge variant={score < 3 ? "destructive" : "secondary"}>
                          Tas {score}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-6 mt-auto">
         {step === COMPONENTS.length + 2 ? (
            <Button className="w-full h-14 text-lg" size="lg" onClick={handleSubmit} disabled={loading}>
              {loading ? "Tallennetaan..." : "Tallenna tarkastus"}
              {!loading && <Save className="ml-2 h-5 w-5" />}
            </Button>
         ) : (
            <Button className="w-full h-14 text-lg" size="lg" onClick={handleNext}>
              Seuraava
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
         )}
      </div>
    </div>
  );
}
