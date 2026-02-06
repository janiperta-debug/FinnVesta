import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from 'app';
import type { BuildingDetail, UpdateBuildingRequest, CreateAssessmentRequest, AssessmentSummary, CreateAssessmentData, MaintenanceTaskResponse, CreateMaintenanceTaskRequest } from 'types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Building2, Calendar, Ruler, Trash2, Plus, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import BuildingFinancialTab from 'components/BuildingFinancialTab';

export default function RakennuksenTiedot() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [building, setBuilding] = useState<BuildingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<UpdateBuildingRequest>({
    name: '',
    address: '',
    construction_year: 0,
    area_m2: 0,
    building_type: '',
    usage_category: '',
    construction_cost_per_m2: 0,
    notes: '',
  });
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [componentMetadata, setComponentMetadata] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [assessmentForm, setAssessmentForm] = useState<CreateAssessmentRequest>({
    assessment_date: new Date().toISOString().split('T')[0],
    inspector_name: '',
    structure_score: undefined,
    facade_roof_score: undefined,
    windows_doors_score: undefined,
    interior_walls_score: undefined,
    interior_finishes_score: undefined,
    heating_score: undefined,
    electrical_score: undefined,
    plumbing_score: undefined,
    hvac_score: undefined,
    notes: ''
  });
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTaskResponse[]>([]);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskForm, setTaskForm] = useState<CreateMaintenanceTaskRequest>({
    building_id: 0,
    title: '',
    description: '',
    category: 'repair',
    priority: 'medium',
    component_type: '',
    estimated_cost: undefined,
    scheduled_date: new Date().toISOString().split('T')[0],
    improves_condition: false
  });

  const id = searchParams.get('id');

  useEffect(() => {
    async function fetchBuilding() {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await apiClient.get_building_detail({ buildingId: Number(id) });
        const data = await response.json();
        setBuilding(data);
        
        // Pre-populate form data when building loads
        setFormData({
          name: data.name || '',
          address: data.address || '',
          construction_year: data.construction_year || undefined,
          area_m2: data.area_m2 || undefined,
          building_type: data.building_type || '',
          usage_category: data.usage_category || '',
          construction_cost_per_m2: data.cost_per_m2 || undefined,
          notes: data.notes || '',
        });
      } catch (error) {
        console.error('Error fetching building:', error);
        toast.error('Virhe ladattaessa rakennuksen tietoja');
      } finally {
        setLoading(false);
      }
    }

    async function fetchAssessments() {
      if (!id) return;
      try {
        const response = await apiClient.get_building_assessments({ buildingId: Number(id) });
        const data = await response.json();
        setAssessments(data);
      } catch (error) {
        console.error('Error fetching assessments:', error);
      }
    }

    async function fetchComponentMetadata() {
      try {
        const response = await apiClient.get_component_metadata_endpoint();
        const data = await response.json();
        setComponentMetadata(data);
      } catch (error) {
        console.error('Error fetching component metadata:', error);
      }
    }

    async function fetchMaintenanceTasks() {
      if (!id) return;
      try {
        const response = await apiClient.list_maintenance_tasks({ 
          org_id: 2,
          building_id: Number(id)
        });
        const data = await response.json();
        setMaintenanceTasks(data.tasks || []);
      } catch (error) {
        console.error('Error fetching maintenance tasks:', error);
      }
    }

    async function fetchValuation() {
      if (!id) return;
      try {
        const response = await apiClient.get_building_valuation({ buildingId: Number(id) });
        const valuation = await response.json();
        // API returns a single ValuationResponse object
        if (valuation) {
          setBuilding((prev) => ({
            ...prev,
            valuation_history: [valuation, ...(prev?.valuation_history || [])]
          }));
        }
      } catch (error) {
        console.error('Error fetching valuation:', error);
      }
    }

    fetchBuilding();
    fetchAssessments();
    fetchComponentMetadata();
    fetchMaintenanceTasks();
    fetchValuation();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) return;
    
    try {
      const response = await apiClient.update_building(
        { buildingId: Number(id) },
        formData
      );
      const result = await response.json();
      
      toast.success(result.message);
      setEditDialogOpen(false);
      
      // Refresh building data
      const refreshResponse = await apiClient.get_building_detail({ buildingId: Number(id) });
      const refreshedData = await refreshResponse.json();
      setBuilding(refreshedData);
      
      // Update form data with refreshed data
      setFormData({
        name: refreshedData.name || '',
        address: refreshedData.address || '',
        construction_year: refreshedData.construction_year || undefined,
        area_m2: refreshedData.area_m2 || undefined,
        building_type: refreshedData.building_type || '',
        usage_category: refreshedData.usage_category || '',
        construction_cost_per_m2: refreshedData.cost_per_m2 || undefined,
        notes: refreshedData.notes || '',
      });
    } catch (error) {
      console.error('Error updating building:', error);
      toast.error('Virhe päivitettäessä rakennuksen tietoja');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      const response = await apiClient.delete_building({ buildingId: Number(id) });
      const result = await response.json();
      
      toast.success(result.message);
      setDeleteDialogOpen(false);
      
      // Navigate back to portfolio
      navigate('/Rakennukset');
    } catch (error) {
      console.error('Error deleting building:', error);
      toast.error('Virhe poistettaessa rakennusta');
    }
  };

  const handleCreateAssessment = async () => {
    if (!id) return;
    
    try {
      await apiClient.create_assessment(
        { buildingId: Number(id) },
        assessmentForm
      );
      setIsAssessmentOpen(false);
      // Reset form
      setAssessmentForm({
        assessment_date: new Date().toISOString().split('T')[0],
        inspector_name: '',
        structure_score: undefined,
        facade_roof_score: undefined,
        windows_doors_score: undefined,
        interior_walls_score: undefined,
        interior_finishes_score: undefined,
        heating_score: undefined,
        electrical_score: undefined,
        plumbing_score: undefined,
        hvac_score: undefined,
        notes: ''
      });
      // Refresh data
      fetchAssessments();
      fetchBuilding();
    } catch (error) {
      console.error('Error creating assessment:', error);
    }
  };

  const openTaskDialog = (componentName: string, componentFinnishName: string) => {
    if (!id) return;
    setTaskForm({
      building_id: Number(id),
      title: `Korjaus: ${componentFinnishName}`,
      description: `Korjaustoimenpide komponentille: ${componentFinnishName}`,
      category: 'repair',
      priority: 'medium',
      component_type: componentName,
      estimated_cost: undefined,
      scheduled_date: new Date().toISOString().split('T')[0],
      improves_condition: true,
      condition_impact_notes: 'Korjaus parantaa komponentin kuntoa.'
    });
    setTaskDialogOpen(true);
  };

  const handleCreateTask = async () => {
    try {
      await apiClient.create_maintenance_task(taskForm);
      setTaskDialogOpen(false);
      toast.success('Huoltotehtävä luotu');
      
      // Refresh maintenance tasks
      const response = await apiClient.list_maintenance_tasks({ 
        org_id: 2,
        building_id: Number(id)
      });
      const data = await response.json();
      setMaintenanceTasks(data.tasks || []);
    } catch (e) {
      console.error(e);
      toast.error('Virhe luotaessa tehtävää');
    }
  };

  const getScoreLabel = (score: number) => {
    const labels: Record<number, string> = {
      5: 'Uutta vastaava',
      4: 'Hyvä',
      3: 'Tyydyttävä',
      2: 'Välttävä',
      1: 'Heikko'
    };
    return labels[score] || '';
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600 dark:text-green-400';
    if (score === 3) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!building) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-muted-foreground">Rakennusta ei löytynyt</p>
          <Button onClick={() => navigate('/Rakennukset')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Takaisin rakennuslistaan
          </Button>
        </div>
      </div>
    );
  }

  const getConditionColor = (score: number | null | undefined) => {
    if (!score) return 'bg-muted text-muted-foreground';
    if (score < 50) return 'bg-destructive/10 text-destructive dark:text-red-400';
    if (score < 60) return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
    if (score < 75) return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
    return 'bg-green-500/10 text-green-600 dark:text-green-400';
  };

  const getConditionText = (score: number | null | undefined) => {
    if (!score) return 'Ei arvioitu';
    if (score < 50) return 'Kriittinen';
    if (score < 60) return 'Heikko';
    if (score < 75) return 'Tyydyttävä';
    return 'Hyvä';
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '–';
    return new Intl.NumberFormat('fi-FI', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '–';
    return new Date(date).toLocaleDateString('fi-FI');
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge className="bg-red-700">Kriittinen</Badge>;
      case 'urgent':
        return <Badge className="bg-red-600">Kiireellinen</Badge>;
      case 'high':
        return <Badge className="bg-orange-600">Korkea</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-600">Keskitaso</Badge>;
      case 'low':
        return <Badge variant="outline">Matala</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planned':
        return <Badge variant="outline">Suunniteltu</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-600">Käynnissä</Badge>;
      case 'completed':
        return <Badge className="bg-green-600">Valmis</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Peruttu</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      routine_maintenance: 'Huolto',
      repair: 'Korjaus',
      renovation: 'Peruskorjaus',
      emergency: 'Hätäkorjaus'
    };
    return labels[category] || category;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/Rakennukset')}
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Takaisin rakennuslistaan
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground mb-2">{building.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  <span>{building.building_type || '–'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{building.construction_year} ({building.building_age} v)</span>
                </div>
                <div className="flex items-center gap-1">
                  <Ruler className="h-4 w-4" />
                  <span>{building.area_m2.toLocaleString('fi-FI')} m²</span>
                </div>
              </div>
              {building.address && (
                <p className="text-sm text-muted-foreground mt-1">{building.address}</p>
              )}
            </div>
            
            <div className="flex gap-2">
              <Dialog open={editDialogOpen} onOpenChange={(open) => {
                setEditDialogOpen(open);
                if (open && building) {
                  setFormData({
                    name: building.name || '',
                    address: building.address || '',
                    construction_year: building.construction_year || undefined,
                    area_m2: building.area_m2 || undefined,
                    building_type: building.building_type || '',
                    usage_category: building.usage_category || '',
                    construction_cost_per_m2: building.cost_per_m2 || undefined,
                    notes: building.notes || '',
                  });
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm">Muokkaa</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Muokkaa rakennuksen tietoja</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Rakennuksen nimi *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="address">Osoite</Label>
                        <Input
                          id="address"
                          value={formData.address || ''}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="construction_year">Rakennusvuosi *</Label>
                        <Input
                          id="construction_year"
                          type="number"
                          value={formData.construction_year || ''}
                          onChange={(e) => setFormData({ ...formData, construction_year: parseInt(e.target.value) })}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="area_m2">Pinta-ala (m²) *</Label>
                        <Input
                          id="area_m2"
                          type="number"
                          step="0.01"
                          value={formData.area_m2 || ''}
                          onChange={(e) => setFormData({ ...formData, area_m2: parseFloat(e.target.value) })}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="building_type">Rakennustyyppi</Label>
                        <Select value={formData.building_type || ''} onValueChange={(value) => setFormData({ ...formData, building_type: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Valitse tyyppi" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="koulu">Koulu</SelectItem>
                            <SelectItem value="päiväkoti">Päiväkoti</SelectItem>
                            <SelectItem value="toimisto">Toimisto</SelectItem>
                            <SelectItem value="terveyskeskus">Terveyskeskus</SelectItem>
                            <SelectItem value="asuinrakennus">Asuinrakennus</SelectItem>
                            <SelectItem value="liikuntahalli">Liikuntahalli</SelectItem>
                            <SelectItem value="kirjasto">Kirjasto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="usage_category">Käyttötarkoitus</Label>
                        <Select value={formData.usage_category || ''} onValueChange={(value) => setFormData({ ...formData, usage_category: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Valitse käyttötarkoitus" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="opetus">Opetus</SelectItem>
                            <SelectItem value="varhaiskasvatus">Varhaiskasvatus</SelectItem>
                            <SelectItem value="hallinto">Hallinto</SelectItem>
                            <SelectItem value="sosiaali- ja terveystoimi">Sosiaali- ja terveystoimi</SelectItem>
                            <SelectItem value="asuminen">Asuminen</SelectItem>
                            <SelectItem value="liikunta ja vapaa-aika">Liikunta ja vapaa-aika</SelectItem>
                            <SelectItem value="kulttuuri">Kulttuuri</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="cost_per_m2">Rakennuskustannus (€/m²)</Label>
                        <Input
                          id="cost_per_m2"
                          type="number"
                          step="0.01"
                          value={formData.construction_cost_per_m2 || ''}
                          onChange={(e) => setFormData({ ...formData, construction_cost_per_m2: parseFloat(e.target.value) })}
                          placeholder="2500"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="notes">Lisätiedot</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes || ''}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                        Peruuta
                      </Button>
                      <Button type="submit">Tallenna</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Poista
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Poista rakennus</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Haluatko varmasti arkistoida rakennuksen <strong>{building.name}</strong>?
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        ⚠️ Rakennus arkistoidaan ja poistetaan näkyvistä. Kaikki historia ja tiedot säilyvät järjestelmässä.
                      </p>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                        Peruuta
                      </Button>
                      <Button variant="destructive" onClick={handleDelete}>
                        Arkistoi rakennus
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Kunto (kla)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-semibold text-foreground">
                  {building.condition_score ? `${building.condition_score.toFixed(0)}%` : '–'}
                </div>
                <Badge className={getConditionColor(building.condition_score)}>
                  {getConditionText(building.condition_score)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Jälleenhankinta-arvo (JHA)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-foreground">{formatCurrency(building.replacement_value)}</div>
              <p className="text-xs text-muted-foreground mt-1">{building.cost_per_m2.toFixed(0)} €/m²</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tekninen arvo (TeknA)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-foreground">{formatCurrency(building.technical_value)}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Korjausvelka</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-foreground">{formatCurrency(building.repair_debt)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Information Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <div className="w-full overflow-x-auto pb-2">
            <TabsList className="w-full justify-start h-auto flex-wrap gap-y-1">
              <TabsTrigger value="overview">Yleiskatsaus</TabsTrigger>
              <TabsTrigger value="assessments">Kuntoarviot ({building.assessment_history.length})</TabsTrigger>
              <TabsTrigger value="maintenance">Huollot ({maintenanceTasks.length})</TabsTrigger>
              <TabsTrigger value="valuation">Arvostus (Reaaliaikainen)</TabsTrigger>
              <TabsTrigger value="valuations">Arvostushistoria ({building.valuation_history.length})</TabsTrigger>
              <TabsTrigger value="financials">Talous</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground">Perustiedot</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rakennustyyppi</p>
                  <p className="text-base text-foreground">{building.building_type || '–'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Käyttökategoria</p>
                  <p className="text-base text-foreground">{building.usage_category || '–'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rakennusvuosi</p>
                  <p className="text-base text-foreground">{building.construction_year}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ikä</p>
                  <p className="text-base text-foreground">{building.building_age} vuotta</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pinta-ala</p>
                  <p className="text-base text-foreground">{building.area_m2.toLocaleString('fi-FI')} m²</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Viimeksi arviointi</p>
                  <p className="text-base text-foreground">{formatDate(building.last_assessment_date)}</p>
                </div>
              </CardContent>
            </Card>

            {building.notes && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Muistiinpanot</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{building.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="assessments">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Kuntoarviohistoria</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Komponenttikohtainen kuntoarvio asteikolla 1-5
                  </p>
                </div>
                <Dialog open={isAssessmentOpen} onOpenChange={setIsAssessmentOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Uusi arvio
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Uusi kuntoarvio</DialogTitle>
                      <DialogDescription>
                        Arvioi rakennuksen kunto komponenteittain asteikolla 1-5
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="assessment_date">Arviointi pvm</Label>
                          <Input
                            id="assessment_date"
                            type="date"
                            value={assessmentForm.assessment_date}
                            onChange={(e) => setAssessmentForm({ ...assessmentForm, assessment_date: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="inspector_name">Arvioija</Label>
                          <Input
                            id="inspector_name"
                            value={assessmentForm.inspector_name || ''}
                            onChange={(e) => setAssessmentForm({ ...assessmentForm, inspector_name: e.target.value })}
                            placeholder="Nimi"
                          />
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground">Komponentit (1-5)</h4>
                        <div className="grid grid-cols-1 gap-4">
                          {componentMetadata.map((component) => {
                            const fieldName = component.name + '_score';
                            const noteFieldName = component.name + '_notes';
                            const currentValue = assessmentForm[fieldName as keyof CreateAssessmentRequest] as number | undefined;
                            const currentNote = assessmentForm[noteFieldName as keyof CreateAssessmentRequest] as string | undefined;
                            
                            return (
                              <div key={component.name} className="space-y-3 border-b pb-4 last:border-0">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <Label className="font-medium text-base">
                                      {component.finnish_name}
                                      <span className="ml-2 text-xs text-muted-foreground">({(component.weight * 100).toFixed(0)}% paino)</span>
                                    </Label>
                                    <p className="text-sm text-muted-foreground mt-0.5">{component.description}</p>
                                  </div>
                                  {currentValue && (
                                    <span className={`text-sm font-medium ${getScoreColor(currentValue)}`}>
                                      {getScoreLabel(currentValue)}
                                    </span>
                                  )}
                                </div>
                                <div className="grid grid-cols-5 gap-2">
                                  {[1, 2, 3, 4, 5].map((score) => (
                                    <button
                                      key={score}
                                      type="button"
                                      onClick={() => setAssessmentForm({ ...assessmentForm, [fieldName]: score })}
                                      className={`py-3 px-1 sm:px-3 border rounded-md text-sm font-medium transition-all ${
                                        currentValue === score
                                          ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/20'
                                          : 'bg-background hover:bg-accent border-input'
                                      }`}
                                    >
                                      {score}
                                    </button>
                                  ))}
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-start">
                                  <Textarea 
                                    placeholder={`Lisätiedot: ${component.finnish_name}`}
                                    value={currentNote || ''}
                                    onChange={(e) => setAssessmentForm({ ...assessmentForm, [noteFieldName]: e.target.value })}
                                    className="h-20 text-sm resize-none"
                                  />
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm"
                                    className="h-20 w-full md:w-auto flex-col gap-1 whitespace-nowrap"
                                    onClick={() => openTaskDialog(component.name, component.finnish_name)}
                                  >
                                    <Wrench className="h-4 w-4" />
                                    <span>Luo toimenpide</span>
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="notes">Yleiset muistiinpanot</Label>
                        <Textarea
                          id="notes"
                          value={assessmentForm.notes || ''}
                          onChange={(e) => setAssessmentForm({ ...assessmentForm, notes: e.target.value })}
                          placeholder="Yleiset huomiot arvioinnista..."
                          rows={3}
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAssessmentOpen(false)}>
                        Peruuta
                      </Button>
                      <Button onClick={handleCreateAssessment}>
                        Tallenna arvio
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {assessments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Ei kuntoarvioita</p>
                    <p className="text-sm mt-1">Aloita luomalla ensimmäinen arvio</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assessments.map((assessment) => (
                      <div key={assessment.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{new Date(assessment.assessment_date).toLocaleDateString('fi-FI')}</p>
                            {assessment.inspector_name && (
                              <p className="text-sm text-muted-foreground">Arvioija: {assessment.inspector_name}</p>
                            )}
                          </div>
                          {assessment.pka_score && (
                            <div className="text-right">
                              <div className="text-2xl font-bold">{assessment.pka_score.toFixed(2)}</div>
                              <div className="text-xs text-muted-foreground">Painotettu ka.</div>
                            </div>
                          )}
                        </div>
                        {assessment.notes && (
                          <p className="text-sm text-muted-foreground border-t pt-2 mt-2">{assessment.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Huollot ja korjaukset
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Komponenttikohtainen kuntoarvio asteikolla 1-5
                  </p>
                </div>
                <Button size="sm" onClick={() => navigate('/Huoltohistoria')}>
                  Näytä kaikki
                </Button>
              </CardHeader>
              <CardContent>
                {maintenanceTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Ei huoltotehtäviä</p>
                    <p className="text-sm mt-1">Luo tehtäviä Huoltohistoria-sivulla</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tehtävä</TableHead>
                          <TableHead>Kategoria</TableHead>
                          <TableHead>Prioriteetti</TableHead>
                          <TableHead>Tila</TableHead>
                          <TableHead>Ajoitus</TableHead>
                          <TableHead className="text-right">Kustannus</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {maintenanceTasks.slice(0, 10).map((task) => (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium whitespace-nowrap">{task.title}</TableCell>
                            <TableCell className="whitespace-nowrap">{getCategoryLabel(task.category)}</TableCell>
                            <TableCell className="whitespace-nowrap">{getPriorityBadge(task.priority)}</TableCell>
                            <TableCell className="whitespace-nowrap">{getStatusBadge(task.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {task.scheduled_date ? formatDate(task.scheduled_date) : '–'}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              {formatCurrency(task.actual_cost || task.estimated_cost)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="valuation">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Arvostuslaskelma (reaaliaikainen)</span>
                  {building.valuation_history[0] && (
                    <span className="text-sm font-normal text-muted-foreground">
                      Laskettu: {new Date(building.valuation_history[0].calculated_at).toLocaleString('fi-FI')}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {building.valuation_history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Ei arvostustietoja</p>
                    <p className="text-sm mt-1">Lasketaan arvoja</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Core Valuation Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="border rounded-lg p-4">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Jälleenhankinta-arvo (JHA)</p>
                        <p className="text-2xl font-bold text-foreground">{formatCurrency(building.valuation_history[0].replacement_value)}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {building.cost_per_m2.toFixed(0)} €/m² × {building.area_m2.toFixed(0)} m²
                        </p>
                      </div>

                      <div className="border rounded-lg p-4">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Tekninen arvo (TeknA)</p>
                        <p className="text-2xl font-bold text-foreground">{formatCurrency(building.valuation_history[0].technical_value)}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          JHA - ({formatCurrency(building.valuation_history[0].annual_depreciation)}/v × {building.valuation_history[0].building_age}v)
                        </p>
                      </div>

                      <div className="border rounded-lg p-4">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Kunto (kla)</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-2xl font-bold text-foreground">{(building.valuation_history[0].condition_score * 100).toFixed(1)}%</p>
                          <Badge className={getConditionColor(building.valuation_history[0].condition_score * 100)}>
                            {getConditionText(building.valuation_history[0].condition_score * 100)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          TeknA / JHA
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Repair Debt Breakdown */}
                    <div>
                      <h3 className="font-semibold text-lg mb-3">Korjausvelka</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="border rounded-lg p-4 bg-red-50">
                          <p className="text-sm font-medium text-muted-foreground mb-1">Perusparannustarve (pptarve)</p>
                          <p className="text-2xl font-bold text-red-700 text-foreground">{formatCurrency(building.valuation_history[0].pptarve)}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {building.valuation_history[0].pptarve > 0 ? 'Kunto <60% - nosta 120% JHA:sta' : 'Ei tarvetta'}
                          </p>
                        </div>

                        <div className="border rounded-lg p-4 bg-yellow-50">
                          <p className="text-sm font-medium text-muted-foreground mb-1">Kunnossapitotarve (kptarve)</p>
                          <p className="text-2xl font-bold text-yellow-700 text-foreground">{formatCurrency(building.valuation_history[0].kptarve)}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {building.valuation_history[0].kptarve > 0 ? 'Kunto 60-75% - nosta 75% JHA:sta' : 'Ei tarvetta'}
                          </p>
                        </div>

                        <div className="border rounded-lg p-4 bg-gray-50">
                          <p className="text-sm font-medium text-muted-foreground mb-1">Yhteensä</p>
                          <p className="text-2xl font-bold text-foreground">{formatCurrency(building.valuation_history[0].repair_debt)}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {((building.valuation_history[0].repair_debt / building.valuation_history[0].replacement_value) * 100).toFixed(1)}% JHA:sta
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Additional Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Rakennuksen ikä</p>
                        <p className="text-lg font-semibold text-foreground">{building.valuation_history[0].building_age} vuotta</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Vuosipoisto</p>
                        <p className="text-lg font-semibold text-foreground">{formatCurrency(building.valuation_history[0].annual_depreciation)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Poistoprosentti</p>
                        <p className="text-lg font-semibold text-foreground">1,75%</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Jäljellä oleva arvo</p>
                        <p className="text-lg font-semibold text-foreground">{(building.valuation_history[0].condition_score * 100).toFixed(0)}%</p>
                      </div>
                    </div>

                    {/* Explanation Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">📊 Arvostusmenetelmä</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• <strong>JHA</strong>: Rakennuksen jälleenhankinta-arvo (uudelleenrakentamiskustannus)</li>
                        <li>• <strong>TeknA</strong>: Tekninen arvo poiston jälkeen (1,75% vuodessa)</li>
                        <li>• <strong>kla</strong>: Kunto-luku, TeknA suhteessa JHA:han</li>
                        <li>• <strong>Korjausvelka</strong>: Tarvittavat investoinnit kunnon nostamiseksi</li>
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="valuations">
            <Card>
              <CardHeader>
                <CardTitle>Arvostushistoria</CardTitle>
              </CardHeader>
              <CardContent>
                {building.valuation_history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ei arvostushistoriaa</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium text-muted-foreground">Päivämäärä</th>
                          <th className="text-right py-2 font-medium text-muted-foreground">JHA</th>
                          <th className="text-right py-2 font-medium text-muted-foreground">TeknA</th>
                          <th className="text-right py-2 font-medium text-muted-foreground">kla</th>
                          <th className="text-right py-2 font-medium text-muted-foreground">Korjausvelka</th>
                        </tr>
                      </thead>
                      <tbody>
                        {building.valuation_history.map((valuation, idx) => (
                          <tr key={idx} className="border-b last:border-b-0">
                            <td className="py-2 text-foreground">{formatDate(valuation.assessment_date)}</td>
                            <td className="text-right text-foreground">{formatCurrency(valuation.replacement_value)}</td>
                            <td className="text-right text-foreground">{formatCurrency(valuation.technical_value)}</td>
                            <td className="text-right text-foreground">
                              {valuation.condition_score ? `${(valuation.condition_score * 100).toFixed(0)}%` : '–'}
                            </td>
                            <td className="text-right text-foreground">{formatCurrency(valuation.repair_debt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financials">
            {building && (
              <BuildingFinancialTab 
                buildingId={building.id} 
                buildingName={building.name}
                areaM2={building.area_m2}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
