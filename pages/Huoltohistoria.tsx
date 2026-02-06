import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "app";
import type { 
  MaintenanceListResponse, 
  MaintenanceTaskResponse,
  CreateMaintenanceTaskRequest,
  BuildingSummary
} from "types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Wrench, ArrowLeft, Plus, AlertTriangle, Clock, CheckCircle2, XCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { BuildingImportDialog } from "components/BuildingImportDialog";

export default function Huoltohistoria() {
  const navigate = useNavigate();
  const [data, setData] = useState<MaintenanceListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [buildings, setBuildings] = useState<BuildingSummary[]>([]);
  
  // Filters
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const [formData, setFormData] = useState<CreateMaintenanceTaskRequest>({
    building_id: 0,
    title: "",
    description: "",
    category: "repair",
    priority: "medium",
    component_type: undefined,
    estimated_cost: undefined,
    scheduled_date: undefined,
    contractor_vendor: "",
    improves_condition: false,
    condition_impact_notes: ""
  });

  useEffect(() => {
    loadMaintenanceTasks();
    loadBuildings();
  }, [statusFilter, priorityFilter, categoryFilter, buildingFilter]);

  const loadBuildings = async () => {
    try {
      const response = await apiClient.get_portfolio_dashboard({ org_id: 1 });
      const result = await response.json();
      setBuildings(result.buildings || []);
    } catch (error) {
      console.error('Failed to load buildings:', error);
    }
  };

  const loadMaintenanceTasks = async () => {
    try {
      const params: any = { org_id: 1 };
      
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (buildingFilter !== 'all') params.building_id = parseInt(buildingFilter);
      
      const response = await apiClient.list_maintenance_tasks(params);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to load maintenance tasks:', error);
      toast.error("Virhe huoltotöiden latauksessa");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const response = await apiClient.create_maintenance_task(
        { org_id: 1 },
        formData
      );
      const result = await response.json();
      
      toast.success("Huoltotyö lisätty onnistuneesti");
      setDialogOpen(false);
      
      // Reset form
      setFormData({
        building_id: 0,
        title: "",
        description: "",
        category: "repair",
        priority: "medium",
        component_type: undefined,
        estimated_cost: undefined,
        scheduled_date: undefined,
        contractor_vendor: "",
        improves_condition: false,
        condition_impact_notes: ""
      });
      
      loadMaintenanceTasks();
    } catch (error) {
      console.error('Failed to create maintenance task:', error);
      toast.error("Virhe huoltotyön lisäämisessä");
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge className="bg-red-700 hover:bg-red-800"><span className="hidden sm:inline">Kriittinen</span><span className="sm:hidden">!!!</span></Badge>;
      case 'urgent':
        return <Badge className="bg-red-600 hover:bg-red-700"><span className="hidden sm:inline">Kiireellinen</span><span className="sm:hidden">!!</span></Badge>;
      case 'high':
        return <Badge className="bg-orange-600 hover:bg-orange-700"><span className="hidden sm:inline">Korkea</span><span className="sm:hidden">!</span></Badge>;
      case 'medium':
        return <Badge className="bg-yellow-600 hover:bg-yellow-700"><span className="hidden sm:inline">Keskitaso</span><span className="sm:hidden">Keski</span></Badge>;
      case 'low':
        return <Badge variant="outline"><span className="hidden sm:inline">Matala</span><span className="sm:hidden">Alh.</span></Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planned':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            <span className="hidden sm:inline">Suunniteltu</span>
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700 gap-1">
            <Wrench className="h-3 w-3" />
            <span className="hidden sm:inline">Käynnissä</span>
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-green-600 hover:bg-green-700 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span className="hidden sm:inline">Valmis</span>
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="gap-1">
            <XCircle className="h-3 w-3" />
            <span className="hidden sm:inline">Peruttu</span>
          </Badge>
        );
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

  const getComponentLabel = (component: string | null | undefined) => {
    if (!component) return '–';
    const labels: Record<string, string> = {
      foundation: 'Perustukset',
      structure: 'Rakenteet',
      roof: 'Vesikatto',
      facade: 'Julkisivu',
      windows: 'Ikkunat',
      hvac: 'LVI',
      electrical: 'Sähkö',
      plumbing: 'Putket',
      interior: 'Sisätilat',
      exterior: 'Ulkotilat',
      other: 'Muu'
    };
    return labels[component] || component;
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '–';
    return new Date(date).toLocaleDateString('fi-FI');
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '–';
    return new Intl.NumberFormat('fi-FI', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0 
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Ladataan...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Virhe datan latauksessa</p>
      </div>
    );
  }

  const stats = data.stats || {};
  const byStatus = stats.by_status || {};

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/portfolio')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <Wrench className="w-6 h-6 text-foreground" />
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Huoltohistoria</h1>
                  <p className="text-sm text-muted-foreground">
                    {data.total_count} huoltotyötä
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <BuildingImportDialog 
                onImportComplete={loadMaintenanceTasks} 
                defaultTab="maintenance"
                trigger={
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Tuo historiaa
                  </Button>
                }
              />
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Lisää huoltotyö
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Lisää uusi huoltotyö</DialogTitle>
                    <DialogDescription>
                      Suunnittele tai kirjaa huolto-, korjaus- tai peruskorjaustyö
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="title">Otsikko *</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="esim. Katon korjaus"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="description">Kuvaus</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Tarkempi kuvaus työstä"
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="building_id">Rakennus *</Label>
                          <Select
                            value={formData.building_id ? formData.building_id.toString() : ''}
                            onValueChange={(value) => setFormData({ ...formData, building_id: parseInt(value) })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Valitse rakennus" />
                            </SelectTrigger>
                            <SelectContent>
                              {buildings.map((building) => (
                                <SelectItem key={building.id} value={building.id.toString()}>
                                  {building.name} - {building.address}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="component_type">Komponentti</Label>
                          <Select
                            value={formData.component_type}
                            onValueChange={(value) => setFormData({ ...formData, component_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Valitse komponentti" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="foundation">Perustukset</SelectItem>
                              <SelectItem value="structure">Rakenteet</SelectItem>
                              <SelectItem value="roof">Vesikatto</SelectItem>
                              <SelectItem value="facade">Julkisivu</SelectItem>
                              <SelectItem value="windows">Ikkunat</SelectItem>
                              <SelectItem value="hvac">LVI</SelectItem>
                              <SelectItem value="electrical">Sähkö</SelectItem>
                              <SelectItem value="plumbing">Putket</SelectItem>
                              <SelectItem value="interior">Sisätilat</SelectItem>
                              <SelectItem value="exterior">Ulkotilat</SelectItem>
                              <SelectItem value="other">Muu</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="category">Kategoria *</Label>
                          <Select
                            value={formData.category}
                            onValueChange={(value) => setFormData({ ...formData, category: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="routine_maintenance">Huolto</SelectItem>
                              <SelectItem value="repair">Korjaus</SelectItem>
                              <SelectItem value="renovation">Peruskorjaus</SelectItem>
                              <SelectItem value="emergency">Hätäkorjaus</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="priority">Prioriteetti *</Label>
                          <Select
                            value={formData.priority}
                            onValueChange={(value) => setFormData({ ...formData, priority: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="critical">Kriittinen</SelectItem>
                              <SelectItem value="urgent">Kiireellinen</SelectItem>
                              <SelectItem value="high">Korkea</SelectItem>
                              <SelectItem value="medium">Keskitaso</SelectItem>
                              <SelectItem value="low">Matala</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="estimated_cost">Arvioitu hinta (€)</Label>
                          <Input
                            id="estimated_cost"
                            type="number"
                            value={formData.estimated_cost || ''}
                            onChange={(e) => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) })}
                            placeholder="0"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="scheduled_date">Suunniteltu päivä</Label>
                          <Input
                            id="scheduled_date"
                            type="date"
                            value={formData.scheduled_date || ''}
                            onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="contractor_vendor">Urakoitsija / Toimittaja</Label>
                        <Input
                          id="contractor_vendor"
                          value={formData.contractor_vendor}
                          onChange={(e) => setFormData({ ...formData, contractor_vendor: e.target.value })}
                          placeholder="Yrityksen nimi"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Peruuta
                      </Button>
                      <Button type="submit" disabled={submitting}>
                        {submitting ? 'Tallennetaan...' : 'Tallenna'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Suunniteltu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{byStatus.planned || 0}</span>
                <span className="text-sm text-muted-foreground">kpl</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Käynnissä</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{byStatus.in_progress || 0}</span>
                <span className="text-sm text-muted-foreground">kpl</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valmis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{byStatus.completed || 0}</span>
                <span className="text-sm text-muted-foreground">kpl</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Myöhässä</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-red-600">{stats.overdue_count || 0}</span>
                <span className="text-sm text-muted-foreground">kpl</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Suodattimet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tila" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Kaikki tilat</SelectItem>
                  <SelectItem value="planned">Suunniteltu</SelectItem>
                  <SelectItem value="in_progress">Käynnissä</SelectItem>
                  <SelectItem value="completed">Valmis</SelectItem>
                  <SelectItem value="cancelled">Peruttu</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Prioriteetti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Kaikki prioriteetit</SelectItem>
                  <SelectItem value="critical">Kriittinen</SelectItem>
                  <SelectItem value="urgent">Kiireellinen</SelectItem>
                  <SelectItem value="high">Korkea</SelectItem>
                  <SelectItem value="medium">Keskitaso</SelectItem>
                  <SelectItem value="low">Matala</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Kategoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Kaikki kategoriat</SelectItem>
                  <SelectItem value="routine_maintenance">Huolto</SelectItem>
                  <SelectItem value="repair">Korjaus</SelectItem>
                  <SelectItem value="renovation">Peruskorjaus</SelectItem>
                  <SelectItem value="emergency">Hätäkorjaus</SelectItem>
                </SelectContent>
              </Select>

              <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Rakennus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Kaikki rakennukset</SelectItem>
                  {buildings.map((building) => (
                    <SelectItem key={building.id} value={building.id.toString()}>
                      {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Table */}
        <Card>
          <CardHeader>
            <CardTitle>Huoltotyöt</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {data.tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Ei huoltotöitä näytettävänä</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px] sm:w-[100px]">Prioriteetti</TableHead>
                      <TableHead>Otsikko</TableHead>
                      <TableHead className="hidden sm:table-cell">Rakennus</TableHead>
                      <TableHead className="hidden xl:table-cell">Komponentti</TableHead>
                      <TableHead className="hidden lg:table-cell">Kategoria</TableHead>
                      <TableHead className="w-[40px] sm:w-auto">Tila</TableHead>
                      <TableHead className="text-right hidden md:table-cell">Arvioitu hinta</TableHead>
                      <TableHead className="text-right hidden md:table-cell">Suunniteltu pvm</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.tasks.map((task) => (
                      <TableRow 
                        key={task.id}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell className="py-2 sm:py-4 whitespace-nowrap">{getPriorityBadge(task.priority)}</TableCell>
                        <TableCell className="font-medium py-2 sm:py-4 whitespace-nowrap">
                          <span className="line-clamp-2">{task.title}</span>
                          <div className="block sm:hidden text-xs text-muted-foreground mt-1 line-clamp-1">
                            {task.building_name}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden sm:table-cell whitespace-nowrap">{task.building_name || `#${task.building_id}`}</TableCell>
                        <TableCell className="text-muted-foreground hidden xl:table-cell whitespace-nowrap">{getComponentLabel(task.component_type)}</TableCell>
                        <TableCell className="text-muted-foreground hidden lg:table-cell whitespace-nowrap">{getCategoryLabel(task.category)}</TableCell>
                        <TableCell className="py-2 sm:py-4 whitespace-nowrap">{getStatusBadge(task.status)}</TableCell>
                        <TableCell className="text-right hidden md:table-cell whitespace-nowrap">{formatCurrency(task.estimated_cost)}</TableCell>
                        <TableCell className="text-right hidden md:table-cell whitespace-nowrap">{formatDate(task.scheduled_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
