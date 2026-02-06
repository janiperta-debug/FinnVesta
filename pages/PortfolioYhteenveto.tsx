import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "app";
import type { PortfolioDashboard, BuildingSummary, CreateBuildingRequest, PortfolioFinancialOverview } from "types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, TrendingDown, Euro, AlertTriangle, ArrowLeft, PiggyBank, TrendingUp, Download, FileText, File, BarChart as BarChartIcon, LayoutDashboard, MapPin, Calendar, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPDFHeader, addPDFFooter, addSectionHeader, formatCurrency as pdfFormatCurrency } from 'utils/pdfExport';
import { generateExecutiveSummary, generateComprehensiveReport } from 'utils/portfolioReports';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PortfolioYhteenveto() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<PortfolioDashboard | null>(null);
  const [financials, setFinancials] = useState<PortfolioFinancialOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadDashboard();
    loadFinancials();
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

  const loadFinancials = async () => {
    try {
      const response = await apiClient.get_portfolio_financial_overview();
      const data = await response.json();
      setFinancials(data);
    } catch (error) {
      console.error('Failed to load financials:', error);
    }
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

  const formatMillions = (value: number | null | undefined) => {
    if (!value) return '0';
    return (value / 1000000).toFixed(1);
  };

  const exportPortfolioPDF = () => {
    if (!dashboard || !financials) return;

    const doc = new jsPDF();
    
    // Header
    addPDFHeader(doc, 'Portfolio-yhteenveto', 'Taloudellinen ja tekninen raportti');
    
    let yPos = 50;
    
    // Portfolio Overview
    yPos = addSectionHeader(doc, 'Portfolio-yleiskatsaus', yPos);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Mittari', 'Arvo']],
      body: [
        ['Rakennuksia yhteensä', `${dashboard.overview.total_buildings} kpl`],
        ['Kokonaispinta-ala', `${financials.total_area_m2.toLocaleString('fi-FI')} m²`],
        ['Keskimääräinen kunto', dashboard.overview.average_condition_pct ? `${dashboard.overview.average_condition_pct.toFixed(0)}%` : '–'],
        ['Rakennuksia tarkistettavana', `${dashboard.overview.buildings_needing_assessment} kpl`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Financial Metrics
    yPos = addSectionHeader(doc, 'Taloudelliset tunnusluvut', yPos);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Pääoma', 'Arvo']],
      body: [
        ['Markkina-arvo', pdfFormatCurrency(financials.total_market_value)],
        ['Velka', pdfFormatCurrency(financials.total_debt)],
        ['Oma pääoma', pdfFormatCurrency(financials.total_equity)],
        ['Velkaantumisaste (LTV)', financials.debt_to_value_ratio ? `${financials.debt_to_value_ratio.toFixed(1)}%` : '–'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Käyttö (vuositaso)', 'Arvo']],
      body: [
        ['Käyttökustannukset', pdfFormatCurrency(financials.total_operating_costs)],
        ['Vuokratulot', pdfFormatCurrency(financials.total_rental_income)],
        ['Nettotulos (NOI)', pdfFormatCurrency(financials.total_noi)],
        ['Kustannus per m²', financials.operating_cost_per_m2 ? `${financials.operating_cost_per_m2.toFixed(2)} €/m²` : '–'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Technical Valuation
    yPos = addSectionHeader(doc, 'Tekninen arvostus', yPos);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Arvo', 'Summa']],
      body: [
        ['Jälleenhankinta-arvo (JHA)', pdfFormatCurrency(dashboard.overview.total_replacement_value)],
        ['Tekninen arvo (TeknA)', pdfFormatCurrency(dashboard.overview.total_technical_value)],
        ['Korjausvelka', pdfFormatCurrency(dashboard.overview.total_repair_debt)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] },
    });
    
    // Repair Debt Analysis (if available)
    if (financials.total_repair_debt && financials.repair_debt_to_market_value) {
      yPos = (doc as any).lastAutoTable.finalY + 15;
      yPos = addSectionHeader(doc, 'Korjausvelka-analyysi', yPos);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Mittari', 'Arvo', 'Status']],
        body: [
          [
            'Korjausvelka yhteensä',
            pdfFormatCurrency(financials.total_repair_debt),
            ''
          ],
          [
            'Korjausvelka / Markkina-arvo',
            `${financials.repair_debt_to_market_value.toFixed(1)}%`,
            financials.repair_debt_to_market_value > 20 ? 'Korkea' :
            financials.repair_debt_to_market_value > 10 ? 'Kohtalainen' : 'Hallinnassa'
          ],
        ],
        theme: 'striped',
        headStyles: { fillColor: [66, 66, 66] },
      });
    }
    
    // Add new page for building distribution
    doc.addPage();
    yPos = 20;
    
    yPos = addSectionHeader(doc, 'Kuntoluokkajakauma', yPos);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Kuntoluokka', 'Rakennuksia', 'Raja-arvo']],
      body: [
        ['Kriittinen kunto', `${dashboard.overview.buildings_critical} kpl`, '< 60%'],
        ['Välttävä kunto', `${dashboard.overview.buildings_adequate} kpl`, '60-75%'],
        ['Hyvä kunto', `${dashboard.overview.buildings_good} kpl`, '> 75%'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    yPos = addSectionHeader(doc, 'Portfolion kokoluokitus', yPos);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Kokoluokka', 'Rakennuksia']],
      body: [
        ['Pienet (< 1000 m²)', `${financials.small_buildings_count} kpl`],
        ['Keskikokoiset (1000-5000 m²)', `${financials.medium_buildings_count} kpl`],
        ['Suuret (> 5000 m²)', `${financials.large_buildings_count} kpl`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] },
    });
    
    // Footer
    addPDFFooter(doc);
    
    // Save
    doc.save(`Portfolio-yhteenveto-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const getAnalysisData = () => {
    if (!dashboard) return null;

    // 1. Condition by Type
    const typeGroups = dashboard.buildings.reduce((acc, b) => {
      const type = b.building_type || "Muu";
      if (!acc[type]) acc[type] = { count: 0, sumScore: 0, scores: [] };
      acc[type].count++;
      if (b.condition_score) {
        acc[type].sumScore += b.condition_score;
        acc[type].scores.push(b.condition_score);
      }
      return acc;
    }, {} as Record<string, any>);

    const typeData = Object.entries(typeGroups).map(([name, data]) => ({
      name,
      avgCondition: data.scores.length > 0 ? data.sumScore / data.scores.length : 0,
      count: data.count,
    })).sort((a, b) => b.avgCondition - a.avgCondition);

    // 2. Condition by Decade
    const decadeGroups = dashboard.buildings.reduce((acc, b) => {
      const decade = Math.floor(b.construction_year / 10) * 10;
      if (!acc[decade]) acc[decade] = { count: 0, sumScore: 0, scores: [] };
      acc[decade].count++;
      if (b.condition_score) {
        acc[decade].sumScore += b.condition_score;
        acc[decade].scores.push(b.condition_score);
      }
      return acc;
    }, {} as Record<number, any>);

    const decadeData = Object.entries(decadeGroups).map(([decade, data]) => ({
      name: `${decade}-luku`,
      year: parseInt(decade),
      avgCondition: data.scores.length > 0 ? data.sumScore / data.scores.length : 0,
      count: data.count,
    })).sort((a, b) => a.year - b.year);

    // 3. Condition by Municipality
    const muniGroups = dashboard.buildings.reduce((acc, b) => {
      const muni = b.municipality || "Ei määritelty";
      if (!acc[muni]) acc[muni] = { count: 0, sumScore: 0, scores: [] };
      acc[muni].count++;
      if (b.condition_score) {
        acc[muni].sumScore += b.condition_score;
        acc[muni].scores.push(b.condition_score);
      }
      return acc;
    }, {} as Record<string, any>);

    const muniData = Object.entries(muniGroups).map(([name, data]) => ({
      name,
      avgCondition: data.scores.length > 0 ? data.sumScore / data.scores.length : 0,
      count: data.count,
    })).sort((a, b) => b.count - a.count);

    // 4. Scatter Data (Age vs Condition)
    const scatterData = dashboard.buildings
      .filter(b => b.condition_score !== null)
      .map(b => ({
        x: b.construction_year,
        y: b.condition_score,
        z: b.area_m2, // bubble size
        name: b.name,
        type: b.building_type
      }));

    return { typeData, decadeData, muniData, scatterData };
  };

  const analysis = getAnalysisData();

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

  // Prepare chart data for overview
  const conditionData = [
    { name: 'Kriittinen (<60%)', value: dashboard.overview.buildings_critical, color: 'hsl(var(--chart-5))' }, // Red-ish
    { name: 'Välttävä (60-75%)', value: dashboard.overview.buildings_adequate, color: 'hsl(var(--chart-2))' }, // Amber
    { name: 'Hyvä (>75%)', value: dashboard.overview.buildings_good, color: 'hsl(var(--chart-3))' }, // Sage Green
  ];

  const valueData = [
    { 
      name: 'JHA', 
      fullName: 'Jälleenhankinta-arvo (JHA)',
      value: dashboard.overview.total_replacement_value || 0 
    },
    { 
      name: 'TeknA', 
      fullName: 'Tekninen arvo (TeknA)',
      value: dashboard.overview.total_technical_value || 0 
    },
    { 
      name: 'Korjausvelka', 
      fullName: 'Korjausvelka',
      value: dashboard.overview.total_repair_debt || 0 
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border p-2 rounded-lg shadow-sm">
          <p className="font-medium text-foreground">{data.fullName}</p>
          <p className="text-primary">
            {formatCurrency(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/portfolio')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-foreground" />
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Portfolio-yhteenveto</h1>
                  <p className="text-sm text-muted-foreground">
                    Katsaus koko kiinteistöportfolioon
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => dashboard && financials && generateExecutiveSummary(dashboard, financials)} 
                variant="default"
                disabled={!dashboard || !financials}
                className="whitespace-nowrap"
              >
                <FileText className="h-4 w-4 mr-2" />
                Johdon yhteenveto
              </Button>
              <Button 
                onClick={() => dashboard && financials && generateComprehensiveReport(dashboard, financials)} 
                variant="default"
                disabled={!dashboard || !financials}
                className="whitespace-nowrap"
              >
                <File className="h-4 w-4 mr-2" />
                Kattava raportti
              </Button>
              <Button 
                onClick={exportPortfolioPDF} 
                variant="outline" 
                disabled={!dashboard || !financials}
                className="whitespace-nowrap"
              >
                <Download className="h-4 w-4 mr-2" />
                Perustiedot PDF
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6 space-y-6">
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex justify-between items-center">
             <TabsList>
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Yleiskatsaus
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex items-center gap-2">
                <BarChartIcon className="h-4 w-4" />
                Analyysi
              </TabsTrigger>
            </TabsList>
            
            {activeTab === "analysis" && (
              <p className="text-sm text-muted-foreground">
                Tarkempaa dataa suodattamalla rakennuslistaa
              </p>
            )}
          </div>

          <TabsContent value="overview" className="space-y-6">
            {/* Basic Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Rakennuksia yhteensä</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{dashboard.overview.total_buildings}</span>
                    <span className="text-sm text-muted-foreground">kpl</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Keskimääräinen kunto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">
                      {dashboard.overview.average_condition_pct ? dashboard.overview.average_condition_pct.toFixed(0) : '–'}
                    </span>
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Rakennuksia tarkistettavana</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{dashboard.overview.buildings_needing_assessment}</span>
                    <span className="text-sm text-muted-foreground">kpl</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Korjausvelka yhteensä</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">
                      {formatMillions(dashboard.overview.total_repair_debt)}
                    </span>
                    <span className="text-sm text-muted-foreground">M€</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Valuation Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5" />
                  Arvostuslaskelma (portfolio)
                </CardTitle>
                <CardDescription>Reaaliaikaiset arvostusmetriikat koko portfoliolle</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="border rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-1">Jälleenhankinta-arvo (JHA)</p>
                    <p className="text-2xl font-bold">{formatCurrency(dashboard.overview.total_replacement_value)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Rakennuskustannukset uusina</p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-1">Tekninen arvo (TeknA)</p>
                    <p className="text-2xl font-bold">{formatCurrency(dashboard.overview.total_technical_value)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {dashboard.overview.total_technical_value && dashboard.overview.total_replacement_value
                        ? `${((dashboard.overview.total_technical_value / dashboard.overview.total_replacement_value) * 100).toFixed(0)}% JHA:sta`
                        : '–'}
                    </p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-1">Keskimääräinen kunto (kla)</p>
                    <p className="text-2xl font-bold">
                      {dashboard.overview.average_condition_pct ? `${dashboard.overview.average_condition_pct.toFixed(0)}%` : '–'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">TeknA / JHA keskiarvo</p>
                  </div>
                </div>

                {/* Value Breakdown Chart */}
                <div className="mt-6">
                  <h3 className="font-semibold text-lg mb-4 text-foreground">Arvojen jakautuminen</h3>
                  <div className="w-full h-[300px] overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={valueData} margin={{ bottom: 20, right: 10, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="name" 
                          stroke="hsl(var(--muted-foreground))" 
                          tick={{fill: 'hsl(var(--muted-foreground))'}} 
                          interval={0}
                        />
                        <YAxis 
                          tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M€`} 
                          stroke="hsl(var(--muted-foreground))" 
                          tick={{fill: 'hsl(var(--muted-foreground))'}} 
                          width={50}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Condition Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Kuntoluokkajakauma
                </CardTitle>
                <CardDescription>Rakennusten jakautuminen kuntoluokkiin</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:grid md:grid-cols-2 gap-6">
                  {/* Pie Chart */}
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={conditionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {conditionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`${value} kpl`, 'Määrä']}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--card-foreground))' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Summary Table */}
                  <div className="space-y-3 flex flex-col justify-center">
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-destructive/10 border-destructive/20">
                      <div>
                        <p className="font-medium text-foreground">Kriittinen kunto</p>
                        <p className="text-sm text-muted-foreground">&lt;60%</p>
                      </div>
                      <Badge variant="destructive">{dashboard.overview.buildings_critical} kpl</Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg bg-yellow-500/10 border-yellow-500/20">
                      <div>
                        <p className="font-medium text-foreground">Välttävä kunto</p>
                        <p className="text-sm text-muted-foreground">60-75%</p>
                      </div>
                      <Badge className="bg-yellow-600 dark:bg-yellow-700 text-white hover:bg-yellow-600/90">{dashboard.overview.buildings_adequate} kpl</Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg bg-green-500/10 border-green-500/20">
                      <div>
                        <p className="font-medium text-foreground">Hyvä kunto</p>
                        <p className="text-sm text-muted-foreground">&gt;75%</p>
                      </div>
                      <Badge className="bg-green-600 dark:bg-green-700 text-white hover:bg-green-600/90">{dashboard.overview.buildings_good} kpl</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Pikalinkit</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-start gap-2"
                  onClick={() => navigate('/Rakennukset')}
                >
                  <Building2 className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold">Selaa rakennuksia</div>
                    <div className="text-sm text-muted-foreground">Näytä kaikki rakennukset listana</div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-start gap-2"
                  onClick={() => navigate('/Rakennukset?condition=critical')}
                >
                  <TrendingDown className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold">Kriittiset kohteet</div>
                    <div className="text-sm text-muted-foreground">Kunto &lt; 60%: {dashboard.overview.buildings_critical} kpl</div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-start gap-2"
                  onClick={() => navigate('/Rakennukset?condition=no-assessment')}
                >
                  <AlertTriangle className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold">Arviointia odottavat</div>
                    <div className="text-sm text-muted-foreground">{dashboard.overview.buildings_needing_assessment} kohdetta</div>
                  </div>
                </Button>
              </CardContent>
            </Card>

            {/* Financial Overview */}
            {financials && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="h-5 w-5" />
                    Taloudellinen yhteenveto
                  </CardTitle>
                  <CardDescription>
                    Portfolio-tason taloudelliset mittarit
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Capital Metrics */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Pääoma</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="border rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">Markkina-arvo</p>
                        <p className="text-2xl font-bold">{formatCurrency(financials.total_market_value)}</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">Velka</p>
                        <p className="text-2xl font-bold">{formatCurrency(financials.total_debt)}</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">Oma pääoma</p>
                        <p className="text-2xl font-bold">{formatCurrency(financials.total_equity)}</p>
                      </div>
                    </div>
                    {financials.debt_to_value_ratio !== null && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Velkaantumisaste (LTV)</p>
                        <p className="text-lg font-semibold">{financials.debt_to_value_ratio.toFixed(1)}%</p>
                      </div>
                    )}
                  </div>

                  {/* Operating Metrics */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Vuositaso (käyttö)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="border rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">Käyttökustannukset</p>
                        <p className="text-2xl font-bold">{formatCurrency(financials.total_operating_costs)}</p>
                        {financials.operating_cost_per_m2 && (
                          <p className="text-xs text-muted-foreground mt-1">{financials.operating_cost_per_m2.toFixed(2)} €/m²</p>
                        )}
                      </div>
                      <div className="border rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">Vuokratuotot</p>
                        <p className="text-2xl font-bold">{formatCurrency(financials.total_rental_income)}</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">Nettovuokratuotto (NOI)</p>
                        <p className="text-2xl font-bold">{formatCurrency(financials.net_operating_income)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Repair Debt Analysis */}
                  {financials.total_repair_debt !== null && financials.total_repair_debt !== undefined && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">Korjausvelka vs. markkina-arvo</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border rounded-lg p-4">
                          <p className="text-sm text-muted-foreground">Korjausvelka yhteensä</p>
                          <p className="text-2xl font-bold">{formatCurrency(financials.total_repair_debt)}</p>
                          <p className="text-xs text-muted-foreground mt-1">Teknisestä arvioinnista</p>
                        </div>
                        {financials.repair_debt_to_market_value !== null && (
                          <div className="border rounded-lg p-4">
                            <p className="text-sm text-muted-foreground">Korjausvelka / Markkina-arvo</p>
                            <div className="flex items-baseline gap-2">
                              <p className="text-2xl font-bold">{financials.repair_debt_to_market_value.toFixed(1)}%</p>
                              {financials.repair_debt_to_market_value > 20 && (
                                <Badge className="bg-red-600">Korkea</Badge>
                              )}
                              {financials.repair_debt_to_market_value > 10 && financials.repair_debt_to_market_value <= 20 && (
                                <Badge className="bg-yellow-600">Kohtalainen</Badge>
                              )}
                              {financials.repair_debt_to_market_value <= 10 && (
                                <Badge className="bg-green-600">Hallinnassa</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {financials.repair_debt_to_market_value > 20 && 'Merkittävää korjaustarvetta'}
                              {financials.repair_debt_to_market_value > 10 && financials.repair_debt_to_market_value <= 20 && 'Normaali ylläpitotarve'}
                              {financials.repair_debt_to_market_value <= 10 && 'Hyvä kunnossapitotaso'}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Key Insight */}
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex gap-3">
                          <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-blue-900 dark:text-blue-100">Taloudellinen analyysi</p>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                              Korjausvelka on {financials.repair_debt_to_market_value !== null ? financials.repair_debt_to_market_value.toFixed(1) : '–'}% 
                              portfolion markkina-arvosta. Tämä kertoo teknisen kunnon ja taloudellisen arvon suhteesta.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Portfolio Size Distribution */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Jakautuminen koon mukaan</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Pienet</p>
                        <p className="text-2xl font-bold">{financials.small_buildings_count}</p>
                        <p className="text-xs text-muted-foreground mt-1">&lt;1000 m²</p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Keskikokoiset</p>
                        <p className="text-2xl font-bold">{financials.medium_buildings_count}</p>
                        <p className="text-xs text-muted-foreground mt-1">1000-5000 m²</p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Suuret</p>
                        <p className="text-2xl font-bold">{financials.large_buildings_count}</p>
                        <p className="text-xs text-muted-foreground mt-1">&gt;5000 m²</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            {analysis && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   {/* Scatter: Age vs Condition */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Kunto vs. Rakennusvuosi
                      </CardTitle>
                      <CardDescription>
                        Jokainen pallo on rakennus. Koko kertoo pinta-alan.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              type="number" 
                              dataKey="x" 
                              name="Rakennusvuosi" 
                              domain={['auto', 'auto']}
                              tickFormatter={(val) => String(val)}
                            />
                            <YAxis 
                              type="number" 
                              dataKey="y" 
                              name="Kuntopisteet (%)" 
                              domain={[0, 100]}
                            />
                            <ZAxis type="number" dataKey="z" range={[50, 400]} name="Pinta-ala" unit="m²" />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-card border p-2 rounded shadow-md">
                                    <p className="font-semibold">{data.name}</p>
                                    <p className="text-sm text-muted-foreground">{data.type}</p>
                                    <p className="text-sm">Vuosi: {data.x}</p>
                                    <p className="text-sm">Kunto: {data.y}%</p>
                                    <p className="text-sm">Ala: {data.z} m²</p>
                                  </div>
                                );
                              }
                              return null;
                            }} />
                            <Scatter name="Rakennukset" data={analysis.scatterData} fill="hsl(var(--primary))" />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bar: Condition by Type */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                         <Building2 className="h-5 w-5" />
                         Kunto rakennustyypeittäin
                      </CardTitle>
                       <CardDescription>
                        Keskimääräinen kuntoluokka tyypeittäin
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analysis.typeData} layout="vertical" margin={{ left: 40, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis dataKey="name" type="category" width={100} />
                            <Tooltip 
                              cursor={{fill: 'transparent'}}
                              contentStyle={{ backgroundColor: 'hsl(var(--card))' }}
                              formatter={(val: number) => [`${val.toFixed(1)}%`, 'Keskim. kunto']}
                            />
                            <Bar dataKey="avgCondition" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]}>
                              {analysis.typeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.avgCondition < 60 ? 'hsl(var(--destructive))' : entry.avgCondition < 75 ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-3))'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bar: Count by Municipality */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Sijaintijakauma (Kunta)
                      </CardTitle>
                      <CardDescription>Rakennusten lukumäärä kunnittain</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analysis.muniData} margin={{ bottom: 20 }}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} />
                             <XAxis dataKey="name" />
                             <YAxis allowDecimals={false} />
                             <Tooltip 
                                cursor={{fill: 'transparent'}}
                                contentStyle={{ backgroundColor: 'hsl(var(--card))' }}
                              />
                             <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Rakennuksia" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bar: Count by Decade */}
                  <Card>
                    <CardHeader>
                       <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Ikäjakauma
                      </CardTitle>
                      <CardDescription>Rakennuskannan jakautuminen vuosikymmenittäin</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analysis.decadeData} margin={{ bottom: 20 }}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} />
                             <XAxis dataKey="name" />
                             <YAxis allowDecimals={false} />
                             <Tooltip 
                                cursor={{fill: 'transparent'}}
                                contentStyle={{ backgroundColor: 'hsl(var(--card))' }}
                              />
                             <Bar dataKey="count" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} name="Rakennuksia" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
