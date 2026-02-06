import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Calendar, Building2, Settings, Download, FileText, Upload } from 'lucide-react';
import { apiClient } from 'app';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import type { PTSPlanResponse, AnnualSummary } from 'types';
import { exportPTSToExcel } from 'utils/ptsExport';
import { exportPTSToPDF } from 'utils/ptsPdfExport';
import { BuildingImportDialog } from 'components/BuildingImportDialog';

export default function Investointisuunnitelma() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ptsPlan, setPtsPlan] = useState<PTSPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Planning parameters
  const [triggerThreshold, setTriggerThreshold] = useState(50); // 0-100%
  const [targetPercentage, setTargetPercentage] = useState(100); // 50-150%
  const [planningHorizon, setPlanningHorizon] = useState(15); // 5-30 years

  const fetchPTSPlan = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.generate_portfolio_pts_plan({
        trigger_threshold: triggerThreshold / 100,
        target_percentage: targetPercentage / 100,
        planning_horizon_years: planningHorizon
      });

      const data = await response.json();
      setPtsPlan(data);
    } catch (err) {
      console.error('Error fetching PTS plan:', err);
      setError('Virhe investointisuunnitelman lataamisessa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPTSPlan();
  }, []);

  const handleRecalculate = () => {
    fetchPTSPlan();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fi-FI', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(0)}%`;
  };

  if (loading && !ptsPlan) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate('/portfolio')} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Takaisin
            </Button>
          </div>
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Ladataan investointisuunnitelmaa...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !ptsPlan) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate('/portfolio')} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Takaisin
            </Button>
          </div>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800">{error || 'Virhe suunnitelman lataamisessa'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/portfolio')} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Takaisin
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Investointisuunnitelma (PTS)</h1>
              <p className="text-sm text-muted-foreground">
                {ptsPlan.start_year}–{ptsPlan.end_year} ({planningHorizon} vuotta)
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <BuildingImportDialog 
              onImportComplete={fetchPTSPlan} 
              defaultTab="pts"
              trigger={
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Tuo PTS
                </Button>
              }
            />
            <Button onClick={() => exportPTSToPDF(ptsPlan)} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Vie PDF:nä
            </Button>
            <Button onClick={() => exportPTSToExcel(ptsPlan)} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Vie Exceliin
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Kokonaisinvestointi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(ptsPlan.total_investment)}</p>
              <p className="text-xs text-muted-foreground mt-1">{ptsPlan.start_year}–{ptsPlan.end_year}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Keskimääräinen vuositaso</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(ptsPlan.average_annual_investment)}</p>
              <p className="text-xs text-muted-foreground mt-1">per vuosi</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Peruskorjauksia</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{ptsPlan.buildings_needing_renovation}</p>
              <p className="text-xs text-muted-foreground mt-1">/ {ptsPlan.total_buildings} rakennusta</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Laskentaparametrit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">Raja: {formatPercentage(ptsPlan.parameters.trigger_threshold)}</p>
              <p className="text-sm text-foreground">Tavoite: {formatPercentage(ptsPlan.parameters.target_percentage)}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="schedule" className="space-y-6">
          <TabsList>
            <TabsTrigger value="schedule">
              <Calendar className="h-4 w-4 mr-2" />
              Aikataulutus
            </TabsTrigger>
            <TabsTrigger value="buildings">
              <Building2 className="h-4 w-4 mr-2" />
              Rakennukset
            </TabsTrigger>
            <TabsTrigger value="parameters">
              <Settings className="h-4 w-4 mr-2" />
              Parametrit
            </TabsTrigger>
          </TabsList>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6">
            {/* Investment Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Vuosittaiset investoinnit</CardTitle>
                <CardDescription>Investointitarve ja kumulatiivinen summa vuosittain</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={ptsPlan.annual_summary}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="year" 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M€`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M€`}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--card-foreground))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      cursor={{fill: 'hsl(var(--muted)/0.2)'}}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="total_investment" 
                      name="Vuotuinen investointi"
                      fill="hsl(var(--chart-1))" 
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="cumulative_investment" 
                      name="Kumulatiivinen summa"
                      stroke="hsl(var(--chart-3))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--chart-3))', r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Annual Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle>Vuosittainen yhteenveto</CardTitle>
                <CardDescription>Investoinnit ja rakennusmäärät vuosittain</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Vuosi</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Investointi</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Rakennukset</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Kumulatiivinen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ptsPlan.annual_summary.map((item: AnnualSummary) => (
                        <tr key={item.year} className="border-b border-border hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">{item.year}</td>
                          <td className="py-3 px-4 text-right">
                            {item.total_investment > 0 ? formatCurrency(item.total_investment) : '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {item.buildings_count > 0 ? item.buildings_count : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-medium">
                            {formatCurrency(item.cumulative_investment)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Buildings Tab */}
          <TabsContent value="buildings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Peruskorjausohjelma</CardTitle>
                <CardDescription>Rakennukset ja niiden peruskorjausvuodet</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Vuosi</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Rakennus</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Investointi</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Kunto ennen</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Kunto jälkeen</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Huomiot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(ptsPlan.yearly_schedule)
                        .filter(([_, investments]) => investments.length > 0)
                        .flatMap(([year, investments]) => 
                          investments.map((inv, idx) => (
                            <tr key={`${year}-${inv.building_id}-${idx}`} className="border-b border-border hover:bg-muted/50">
                              <td className="py-3 px-4 font-medium">{year}</td>
                              <td className="py-3 px-4">{inv.building_name}</td>
                              <td className="py-3 px-4 text-right">{formatCurrency(inv.investment_amount)}</td>
                              <td className="py-3 px-4 text-center">
                                {inv.condition_before !== null && inv.condition_before !== undefined
                                  ? formatPercentage(inv.condition_before)
                                  : '—'}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {inv.condition_after !== null && inv.condition_after !== undefined
                                  ? formatPercentage(inv.condition_after)
                                  : '—'}
                              </td>
                              <td className="py-3 px-4 text-xs text-muted-foreground">
                                {inv.is_split_project && inv.split_year_index
                                  ? `Monivuotinen projekti (${inv.split_year_index}/2 tai 3)`
                                  : '—'}
                              </td>
                            </tr>
                          ))
                        )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Parameters Tab */}
          <TabsContent value="parameters" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Laskentaparametrit</CardTitle>
                <CardDescription>Säädä suunnitelman parametreja ja laske uudelleen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Trigger Threshold */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="trigger-threshold">Peruskorjauksen raja-arvo</Label>
                    <span className="text-sm font-medium">{triggerThreshold}%</span>
                  </div>
                  <Slider
                    id="trigger-threshold"
                    min={30}
                    max={70}
                    step={5}
                    value={[triggerThreshold]}
                    onValueChange={(value) => setTriggerThreshold(value[0])}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Kuntoluokka, jonka alittuessa rakennus merkitään peruskorjattavaksi
                  </p>
                </div>

                {/* Target Percentage */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="target-percentage">Tavoitekunto peruskorjauksen jälkeen</Label>
                    <span className="text-sm font-medium">{targetPercentage}%</span>
                  </div>
                  <Slider
                    id="target-percentage"
                    min={80}
                    max={130}
                    step={10}
                    value={[targetPercentage]}
                    onValueChange={(value) => setTargetPercentage(value[0])}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    100% = pelkkä peruskorjaus, 120% = peruskorjaus + parantaminen
                  </p>
                </div>

                {/* Planning Horizon */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="planning-horizon">Suunnittelujakso</Label>
                    <span className="text-sm font-medium">{planningHorizon} vuotta</span>
                  </div>
                  <Slider
                    id="planning-horizon"
                    min={5}
                    max={30}
                    step={5}
                    value={[planningHorizon]}
                    onValueChange={(value) => setPlanningHorizon(value[0])}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Kuinka pitkälle tulevaisuuteen suunnitelma lasketaan
                  </p>
                </div>

                <div className="pt-4">
                  <Button onClick={handleRecalculate} disabled={loading} className="w-full">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    {loading ? 'Lasketaan...' : 'Laske suunnitelma uudelleen'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Methodology Info */}
            <Card>
              <CardHeader>
                <CardTitle>Laskentamenetelmä</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">Poistomenetelmä:</p>
                  <p className="text-muted-foreground">Rakennukset poistuvat 1,75% jälleenhankinta-arvosta (JHA) vuodessa</p>
                </div>
                <div>
                  <p className="font-medium">Peruskorjausvuosi:</p>
                  <p className="text-muted-foreground">Määräytyy kun tekninen arvo (TeknA) laskee alle raja-arvon</p>
                </div>
                <div>
                  <p className="font-medium">Investointitarve:</p>
                  <p className="text-muted-foreground">JHA × tavoite% - TeknA peruskorjausvuonna</p>
                </div>
                <div>
                  <p className="font-medium">Monivuotiset projektit:</p>
                  <p className="text-muted-foreground">
                    Rakennukset &gt;4000 m²: 2 vuotta<br />
                    Rakennukset &gt;8000 m²: 3 vuotta
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
