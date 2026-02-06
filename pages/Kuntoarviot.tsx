import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText,
  Building2,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { apiClient } from 'app';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import type { AssessmentsDashboardData, CriticalComponent } from 'types';
import { toast } from 'sonner';

export default function Kuntoarviot() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AssessmentsDashboardData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get_assessments_dashboard({ org_id: 1 });
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        toast.error('Virhe kuntoarvioiden latauksessa');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getConditionColor = (score: number) => {
    if (score >= 4) return '#22c55e'; // Green-500
    if (score === 3) return '#eab308'; // Yellow-500
    if (score === 2) return '#f97316'; // Orange-500
    if (score <= 1) return '#ef4444'; // Red-500
    return '#94a3b8'; // Slate-400
  };

  const getConditionBadge = (score: number) => {
    if (score >= 4) return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Hyvä ({score})</Badge>;
    if (score === 3) return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200">Tyydyttävä ({score})</Badge>;
    if (score === 2) return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200">Välttävä ({score})</Badge>;
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">Huono ({score})</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Ladataan kuntoarvioita...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Ei dataa saatavilla</p>
      </div>
    );
  }

  // Calculate stats for top cards
  const criticalCount = data.critical_components.length;
  const inspectedCount = data.assessment_coverage.filter(b => b.status === 'ok').length;
  const totalBuildings = data.assessment_coverage.length;
  const coveragePercent = totalBuildings > 0 ? Math.round((inspectedCount / totalBuildings) * 100) : 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/portfolio')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Takaisin
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Kuntoarviot</h1>
              <p className="text-muted-foreground">Portfolio-tason yhteenveto kiinteistöjen kunnosta</p>
            </div>
          </div>
          <Button onClick={() => navigate('/rakennukset')}>
            <Building2 className="h-4 w-4 mr-2" />
            Selaa rakennuksia
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Keskimääräinen kunto</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.average_portfolio_condition ? data.average_portfolio_condition.toFixed(1) : '–'}
              </div>
              <p className="text-xs text-muted-foreground">Painotettu keskiarvo (1-5)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kriittiset havainnot</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${criticalCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${criticalCount > 0 ? 'text-red-600' : ''}`}>
                {criticalCount}
              </div>
              <p className="text-xs text-muted-foreground">Komponenttia kuntoarvolla 1-2</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Arviointikattavuus</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{coveragePercent}%</div>
              <p className="text-xs text-muted-foreground">{inspectedCount} / {totalBuildings} rakennusta arvioitu &lt;5v</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vanhentuvat</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.assessment_coverage.filter(b => b.status === 'warning' || b.status === 'expired').length}
              </div>
              <p className="text-xs text-muted-foreground">Arviointi yli 5 vuotta vanha</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score Distribution Chart */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Kuntojakauma</CardTitle>
              <CardDescription>Komponenttien jakauma kuntoluokittain (1-5)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.score_distribution} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="score" />
                    <YAxis allowDecimals={false} />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                    />
                    <Bar dataKey="count" name="Lukumäärä" radius={[4, 4, 0, 0]}>
                      {data.score_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getConditionColor(entry.score)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Assessments List */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Viimeisimmät arvioinnit</CardTitle>
              <CardDescription>10 viimeisintä kuntoarviota</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recent_assessments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Ei arviointeja</p>
                ) : (
                  data.recent_assessments.map((assessment) => (
                    <div key={assessment.id} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                      <div>
                        <p className="text-sm font-medium">{assessment.building_name || 'Tuntematon rakennus'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(assessment.assessment_date).toLocaleDateString('fi-FI')} • {assessment.inspector_name || '-'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {assessment.pka_score && (
                          <Badge variant="outline" className={assessment.pka_score < 3 ? "text-red-600 bg-red-50 border-red-200" : ""}>
                            KA {assessment.pka_score.toFixed(2)}
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`/rakennukset?buildingId=${assessment.id}&tab=assessment`)}>
                           <ArrowLeft className="h-4 w-4 rotate-180" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Critical Components Table */}
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Kriittiset komponentit
              </CardTitle>
              <CardDescription>
                Huomioita vaativat rakennusosat (Kunto 1-2)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Rakennus</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Komponentti</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Kunto</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden md:table-cell">Huomiot</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {data.critical_components.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-muted-foreground">
                            Ei kriittisiä havaintoja. Hienoa!
                          </td>
                        </tr>
                      ) : (
                        data.critical_components.map((item, i) => (
                          <tr key={i} className="border-b transition-colors hover:bg-muted/50">
                            <td className="p-4 align-middle font-medium">
                              <span 
                                className="cursor-pointer hover:underline"
                                onClick={() => navigate(`/rakennukset?id=${item.building_id}`)}
                              >
                                {item.building_name}
                              </span>
                            </td>
                            <td className="p-4 align-middle">{item.finnish_name}</td>
                            <td className="p-4 align-middle">{getConditionBadge(item.score)}</td>
                            <td className="p-4 align-middle text-muted-foreground hidden md:table-cell max-w-xs truncate">
                              {item.notes || '–'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Missing Assessments */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Arviointitarpeet</CardTitle>
              <CardDescription>Rakennukset ilman voimassa olevaa arviota</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {data.assessment_coverage
                  .filter(b => b.status !== 'ok')
                  .sort((a, b) => {
                    // Sort by status priority: missing > expired > warning
                    const priority = { missing: 0, expired: 1, warning: 2 };
                    return (priority[a.status as keyof typeof priority] || 99) - (priority[b.status as keyof typeof priority] || 99);
                  })
                  .map((b) => (
                    <div key={b.building_id} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                      <div className="overflow-hidden">
                        <p className="text-sm font-medium truncate" title={b.building_name}>{b.building_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.last_assessment_date 
                            ? `Edellinen: ${new Date(b.last_assessment_date).toLocaleDateString('fi-FI')}` 
                            : 'Ei aiempaa arviota'}
                        </p>
                      </div>
                      <Badge variant={b.status === 'warning' ? 'secondary' : 'destructive'} className="whitespace-nowrap ml-2">
                        {b.status === 'missing' ? 'Puuttuu' : b.status === 'expired' ? 'Vanhentunut' : 'Vanhenee'}
                      </Badge>
                    </div>
                  ))}
                  
                {data.assessment_coverage.filter(b => b.status !== 'ok').length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                    <p className="text-sm font-medium">Kaikki kunnossa!</p>
                    <p className="text-xs text-muted-foreground">Kaikki rakennukset on arvioitu ajallaan.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
