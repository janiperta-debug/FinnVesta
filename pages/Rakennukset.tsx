import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "app";
import type { PortfolioDashboard, BuildingSummary, CreateBuildingRequest } from "types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowLeft, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BuildingImportDialog } from "components/BuildingImportDialog";

export default function Rakennukset() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [dashboard, setDashboard] = useState<PortfolioDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'condition' | 'age' | 'debt'>('name');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [buildingTypeFilter, setBuildingTypeFilter] = useState<string>('all');
  const [usageCategoryFilter, setUsageCategoryFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');

  useEffect(() => {
    const conditionParam = searchParams.get('condition');
    if (conditionParam && ['good', 'fair', 'poor', 'critical', 'no-assessment'].includes(conditionParam)) {
      setConditionFilter(conditionParam);
    } else {
      setConditionFilter('all');
    }
  }, [searchParams]);
  
  const [formData, setFormData] = useState<CreateBuildingRequest>({
    name: "",
    construction_year: new Date().getFullYear(),
    area_m2: 0,
    building_type: "school",
    status: "active",
    is_sub_building: false
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await apiClient.get_portfolio_dashboard({ org_id: 1 });
      const data = await response.json();
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const response = await apiClient.create_building({ org_id: 2 }, formData);
      const result = await response.json();
      
      toast.success(result.message || "Rakennus lisätty onnistuneesti");
      setDialogOpen(false);
      
      // Reset form
      setFormData({
        name: "",
        construction_year: new Date().getFullYear(),
        area_m2: 0,
        building_type: "school",
        status: "active",
        is_sub_building: false
      });
      
      // Reload dashboard
      loadDashboard();
    } catch (error) {
      console.error('Failed to create building:', error);
      toast.error("Virhe rakennuksen lisäämisessä");
    } finally {
      setSubmitting(false);
    }
  };

  const getConditionBadge = (score: number | null | undefined) => {
    if (!score) return <Badge variant="outline">Ei arvioitu</Badge>;
    
    // Short labels for mobile
    const label = score >= 75 ? 'Hyvä' : score >= 60 ? 'Tyydyttävä' : score >= 50 ? 'Välttävä' : 'Kriittinen';
    const percent = `(${score.toFixed(0)}%)`;
    
    if (score >= 75) return (
      <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 border-0 whitespace-nowrap">
        <span className="hidden sm:inline">{label} </span>{percent}
      </Badge>
    );
    if (score >= 60) return (
      <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20 border-0 whitespace-nowrap">
        <span className="hidden sm:inline">{label} </span>{percent}
      </Badge>
    );
    if (score >= 50) return (
      <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 border-0 whitespace-nowrap">
        <span className="hidden sm:inline">{label} </span>{percent}
      </Badge>
    );
    return (
      <Badge className="bg-destructive/10 text-destructive dark:text-red-400 hover:bg-destructive/20 border-0 whitespace-nowrap">
        <span className="hidden sm:inline">{label} </span>{percent}
      </Badge>
    );
  };

  const sortBuildings = (buildings: BuildingSummary[]) => {
    const sorted = [...buildings];
    switch (sortBy) {
      case 'condition':
        return sorted.sort((a, b) => (a.condition_score ?? 100) - (b.condition_score ?? 100));
      case 'age':
        return sorted.sort((a, b) => b.building_age - a.building_age);
      case 'debt':
        return sorted.sort((a, b) => (b.repair_debt ?? 0) - (a.repair_debt ?? 0));
      default:
        return sorted.sort((a, b) => a.name.localeCompare(b.name, 'fi'));
    }
  };

  const filterAndSortBuildings = (buildings: BuildingSummary[]) => {
    let filtered = [...buildings];
    
    // Apply search filter (name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b => 
        b.name.toLowerCase().includes(query)
      );
    }
    
    // Apply building type filter
    if (buildingTypeFilter !== 'all') {
      filtered = filtered.filter(b => b.building_type === buildingTypeFilter);
    }

    // Apply usage category filter
    if (usageCategoryFilter !== 'all') {
      filtered = filtered.filter(b => b.usage_category === usageCategoryFilter);
    }
    
    // Apply condition score filter
    if (conditionFilter !== 'all') {
      filtered = filtered.filter(b => {
        if (!b.condition_score) return conditionFilter === 'no-assessment';
        if (conditionFilter === 'critical') return b.condition_score < 50;
        if (conditionFilter === 'poor') return b.condition_score >= 50 && b.condition_score < 60;
        if (conditionFilter === 'fair') return b.condition_score >= 60 && b.condition_score < 75;
        if (conditionFilter === 'good') return b.condition_score >= 75;
        return true;
      });
    }
    
    return sortBuildings(filtered);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setBuildingTypeFilter('all');
    setUsageCategoryFilter('all');
    setConditionFilter('all');
  };

  const hasActiveFilters = searchQuery || buildingTypeFilter !== 'all' || usageCategoryFilter !== 'all' || conditionFilter !== 'all';

  // Get unique building types and usage categories for filters
  const buildingTypes = dashboard?.buildings 
    ? Array.from(new Set(dashboard.buildings.map(b => b.building_type).filter(Boolean)))
    : [];
  
  const usageCategories = dashboard?.buildings
    ? Array.from(new Set(dashboard.buildings.map(b => b.usage_category).filter(Boolean)))
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Ladataan...</p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Virhe datan latauksessa</p>
      </div>
    );
  }

  const filteredBuildings = filterAndSortBuildings(dashboard.buildings);

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
                <Building2 className="w-6 h-6 text-foreground" />
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Rakennukset</h1>
                  <p className="text-sm text-muted-foreground">
                    {filteredBuildings.length} / {dashboard.buildings.length} rakennusta
                  </p>
                </div>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Lisää rakennus
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Lisää uusi rakennus</DialogTitle>
                  <DialogDescription>
                    Täytä rakennuksen perustiedot
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="name">Nimi *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="esim. Koulutie 1"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="building_type">Rakennustyyppi *</Label>
                      <Select
                        value={formData.building_type}
                        onValueChange={(value) => setFormData({ ...formData, building_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="school">Koulu</SelectItem>
                          <SelectItem value="daycare">Päiväkoti</SelectItem>
                          <SelectItem value="office">Toimisto</SelectItem>
                          <SelectItem value="residential">Asuinrakennus</SelectItem>
                          <SelectItem value="sports_facility">Liikuntahalli</SelectItem>
                          <SelectItem value="other">Muu</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="construction_year">Rakennusvuosi *</Label>
                        <Input
                          id="construction_year"
                          type="number"
                          value={formData.construction_year}
                          onChange={(e) => setFormData({ ...formData, construction_year: parseInt(e.target.value) })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="area_m2">Pinta-ala (m²) *</Label>
                        <Input
                          id="area_m2"
                          type="number"
                          value={formData.area_m2}
                          onChange={(e) => setFormData({ ...formData, area_m2: parseFloat(e.target.value) })}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox 
                        id="is_sub_building" 
                        checked={formData.is_sub_building || false}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_sub_building: checked as boolean })}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor="is_sub_building"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Tämä on piharakennus / sivurakennus
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Esim. varasto, autotalli tai sauna. Laskutetaan eri hinnalla.
                        </p>
                      </div>
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
            <BuildingImportDialog onImportComplete={loadDashboard} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Suodattimet</CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Tyhjennä suodattimet
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Hae nimellä..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={buildingTypeFilter} onValueChange={setBuildingTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Rakennustyyppi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Kaikki tyypit</SelectItem>
                  {buildingTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={usageCategoryFilter} onValueChange={setUsageCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Käyttökategoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Kaikki kategoriat</SelectItem>
                  {usageCategories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={conditionFilter} onValueChange={setConditionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Kuntoluokka" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Kaikki kunnot</SelectItem>
                  <SelectItem value="good">Hyvä (≥75%)</SelectItem>
                  <SelectItem value="fair">Tyydyttävä (60-74%)</SelectItem>
                  <SelectItem value="poor">Välttävä (50-59%)</SelectItem>
                  <SelectItem value="critical">Kriittinen (&lt;50%)</SelectItem>
                  <SelectItem value="no-assessment">Ei arvioitu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Buildings Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Rakennusluettelo</CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground hidden sm:block">Järjestä:</Label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[140px] sm:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nimi</SelectItem>
                  <SelectItem value="condition">Kunto</SelectItem>
                  <SelectItem value="age">Ikä</SelectItem>
                  <SelectItem value="debt">Korjausvelka</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredBuildings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Ei rakennuksia näytettävänä</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Tyhjennä suodattimet
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nimi</TableHead>
                      <TableHead className="hidden md:table-cell">Tyyppi</TableHead>
                      <TableHead className="hidden lg:table-cell">Käyttökategoria</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Ikä</TableHead>
                      <TableHead className="text-right hidden lg:table-cell">Pinta-ala</TableHead>
                      <TableHead>Kunto</TableHead>
                      <TableHead className="text-right">Korjausvelka</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBuildings.map((building) => (
                      <TableRow 
                        key={building.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/RakennuksenTiedot?id=${building.id}`)}
                      >
                        <TableCell className="font-medium whitespace-nowrap">{building.name}</TableCell>
                        <TableCell className="text-muted-foreground hidden md:table-cell whitespace-nowrap">{building.building_type || '–'}</TableCell>
                        <TableCell className="text-muted-foreground hidden lg:table-cell whitespace-nowrap">{building.usage_category || '–'}</TableCell>
                        <TableCell className="text-right hidden sm:table-cell whitespace-nowrap">{building.building_age} v</TableCell>
                        <TableCell className="text-right hidden lg:table-cell whitespace-nowrap">
                          {building.area_m2?.toLocaleString('fi-FI')} m²
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{getConditionBadge(building.condition_score)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {building.repair_debt 
                            ? `${(building.repair_debt / 1000).toFixed(0)} k€`
                            : '–'
                          }
                        </TableCell>
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
