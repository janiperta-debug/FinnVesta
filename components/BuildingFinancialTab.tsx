import { useState, useEffect } from 'react';
import { apiClient } from 'app';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Plus, TrendingUp, TrendingDown, AlertTriangle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';

interface Props {
  buildingId: number;
  buildingName: string;
  areaM2: number;
}

interface FinancialRecord {
  id: number;
  building_id: number;
  financial_year: number;
  market_value?: number | null;
  purchase_price?: number | null;
  purchase_date?: string | null;
  debt_amount?: number | null;
  equity_amount?: number | null;
  utilities_cost?: number | null;
  maintenance_cost?: number | null;
  management_fees?: number | null;
  insurance_cost?: number | null;
  property_taxes?: number | null;
  other_costs?: number | null;
  operating_costs?: number | null;
  rental_income?: number | null;
  vacancy_rate?: number | null;
  net_operating_income?: number | null;
  insurance_value?: number | null;
  insurance_provider?: string | null;
  insurance_policy_number?: string | null;
  insurance_renewal_date?: string | null;
  capex_amount?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  debt_to_value_ratio?: number | null;
  operating_cost_per_m2?: number | null;
}

interface BuildingFinancialSummary {
  building_id: number;
  building_name: string;
  area_m2: number;
  records: FinancialRecord[];
}

export default function BuildingFinancialTab({ buildingId, buildingName, areaM2 }: Props) {
  const [financialData, setFinancialData] = useState<BuildingFinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    financial_year: new Date().getFullYear(),
    market_value: '',
    purchase_price: '',
    purchase_date: '',
    debt_amount: '',
    utilities_cost: '',
    maintenance_cost: '',
    management_fees: '',
    insurance_cost: '',
    property_taxes: '',
    other_costs: '',
    rental_income: '',
    vacancy_rate: '',
    insurance_value: '',
    insurance_provider: '',
    insurance_policy_number: '',
    insurance_renewal_date: '',
    capex_amount: '',
    notes: ''
  });

  useEffect(() => {
    fetchFinancialData();
  }, [buildingId]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get_building_financials({ buildingId });
      const data = await response.json();
      setFinancialData(data);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Convert empty strings to undefined for optional fields
      const payload = {
        building_id: buildingId,
        financial_year: formData.financial_year,
        market_value: formData.market_value ? parseFloat(formData.market_value) : undefined,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : undefined,
        purchase_date: formData.purchase_date || undefined,
        debt_amount: formData.debt_amount ? parseFloat(formData.debt_amount) : undefined,
        utilities_cost: formData.utilities_cost ? parseFloat(formData.utilities_cost) : undefined,
        maintenance_cost: formData.maintenance_cost ? parseFloat(formData.maintenance_cost) : undefined,
        management_fees: formData.management_fees ? parseFloat(formData.management_fees) : undefined,
        insurance_cost: formData.insurance_cost ? parseFloat(formData.insurance_cost) : undefined,
        property_taxes: formData.property_taxes ? parseFloat(formData.property_taxes) : undefined,
        other_costs: formData.other_costs ? parseFloat(formData.other_costs) : undefined,
        rental_income: formData.rental_income ? parseFloat(formData.rental_income) : undefined,
        vacancy_rate: formData.vacancy_rate ? parseFloat(formData.vacancy_rate) : undefined,
        insurance_value: formData.insurance_value ? parseFloat(formData.insurance_value) : undefined,
        insurance_provider: formData.insurance_provider || undefined,
        insurance_policy_number: formData.insurance_policy_number || undefined,
        insurance_renewal_date: formData.insurance_renewal_date || undefined,
        capex_amount: formData.capex_amount ? parseFloat(formData.capex_amount) : undefined,
        notes: formData.notes || undefined
      };

      await apiClient.create_or_update_financial_record(payload);
      toast.success('Taloustiedot tallennettu');
      setIsDialogOpen(false);
      fetchFinancialData();
      
      // Reset form
      setFormData({
        financial_year: new Date().getFullYear(),
        market_value: '',
        purchase_price: '',
        purchase_date: '',
        debt_amount: '',
        utilities_cost: '',
        maintenance_cost: '',
        management_fees: '',
        insurance_cost: '',
        property_taxes: '',
        other_costs: '',
        rental_income: '',
        vacancy_rate: '',
        insurance_value: '',
        insurance_provider: '',
        insurance_policy_number: '',
        insurance_renewal_date: '',
        capex_amount: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error saving financial data:', error);
      toast.error('Virhe tallennettaessa taloustietoja');
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

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '–';
    return new Date(date).toLocaleDateString('fi-FI');
  };

  const exportBuildingFinancialPDF = () => {
    if (!financialData) return;

    const latestRecord = financialData.records[0];
    if (!latestRecord) return;

    const doc = new jsPDF();
    
    // Header
    addPDFHeader(doc, `Taloustiedot: ${buildingName}`, `${areaM2.toLocaleString('fi-FI')} m²`);
    
    let yPos = 50;
    
    // Latest Year Summary
    yPos = addSectionHeader(doc, `Yhteenveto (${latestRecord.financial_year})`, yPos);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Mittari', 'Arvo']],
      body: [
        ['Markkina-arvo', pdfFormatCurrency(latestRecord.market_value)],
        ['Velka', pdfFormatCurrency(latestRecord.debt_amount)],
        ['Oma pääoma', pdfFormatCurrency(latestRecord.equity_amount)],
        ['Velkaantumisaste', latestRecord.debt_to_value_ratio ? `${(latestRecord.debt_to_value_ratio * 100).toFixed(1)}%` : '–'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Käyttö', 'Arvo']],
      body: [
        ['Käyttökustannukset', pdfFormatCurrency(latestRecord.operating_costs)],
        ['Kustannus per m²', latestRecord.operating_cost_per_m2 ? `${latestRecord.operating_cost_per_m2.toFixed(2)} €/m²` : '–'],
        ['Vuokratulot', pdfFormatCurrency(latestRecord.rental_income)],
        ['Vajaakäyttö', latestRecord.vacancy_rate ? `${latestRecord.vacancy_rate.toFixed(1)}%` : '–'],
        ['Nettotulos (NOI)', pdfFormatCurrency(latestRecord.net_operating_income)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] },
    });
    
    // Repair Debt Analysis (if available)
    if (financialData.latest_repair_debt && financialData.repair_debt_to_market_value && latestRecord.market_value) {
      yPos = (doc as any).lastAutoTable.finalY + 15;
      yPos = addSectionHeader(doc, 'Korjausvelka-analyysi', yPos);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Mittari', 'Arvo', 'Status']],
        body: [
          [
            'Korjausvelka (TeknA)',
            pdfFormatCurrency(financialData.latest_repair_debt),
            ''
          ],
          [
            '% markkina-arvosta',
            `${financialData.repair_debt_to_market_value.toFixed(1)}%`,
            financialData.repair_debt_to_market_value > 20 ? 'Korkea' :
            financialData.repair_debt_to_market_value > 10 ? 'Kohtalainen' : 'Hallinnassa'
          ],
        ],
        theme: 'striped',
        headStyles: { fillColor: [66, 66, 66] },
      });
    }
    
    // Operating Costs Breakdown
    if (latestRecord.utilities_cost || latestRecord.maintenance_cost || latestRecord.management_fees) {
      yPos = (doc as any).lastAutoTable.finalY + 15;
      yPos = addSectionHeader(doc, 'Käyttökustannusten erittely', yPos);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Kustannuslaji', 'Summa']],
        body: [
          ['Energia ja vesi', pdfFormatCurrency(latestRecord.utilities_cost)],
          ['Huolto ja korjaus', pdfFormatCurrency(latestRecord.maintenance_cost)],
          ['Hallintokulut', pdfFormatCurrency(latestRecord.management_fees)],
          ['Vakuutusmaksut', pdfFormatCurrency(latestRecord.insurance_cost)],
          ['Kiinteistövero', pdfFormatCurrency(latestRecord.property_taxes)],
          ['Muut kulut', pdfFormatCurrency(latestRecord.other_costs)],
        ],
        theme: 'striped',
        headStyles: { fillColor: [66, 66, 66] },
      });
    }
    
    // Insurance Details
    if (latestRecord.insurance_value || latestRecord.insurance_provider) {
      yPos = (doc as any).lastAutoTable.finalY + 15;
      yPos = addSectionHeader(doc, 'Vakuutustiedot', yPos);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Tieto', 'Arvo']],
        body: [
          ['Vakuutusarvo', pdfFormatCurrency(latestRecord.insurance_value)],
          ['Vakuutusyhtiö', latestRecord.insurance_provider || '–'],
          ['Vakuutusnumero', latestRecord.insurance_policy_number || '–'],
          ['Uusimispvm', pdfFormatDate(latestRecord.insurance_renewal_date)],
        ],
        theme: 'striped',
        headStyles: { fillColor: [66, 66, 66] },
      });
    }
    
    // Historical Data
    if (financialData.records.length > 1) {
      doc.addPage();
      yPos = 20;
      
      yPos = addSectionHeader(doc, 'Historiallinen data', yPos);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Vuosi', 'Markkina-arvo', 'Käyttökust.', 'Vuokratulot', 'NOI']],
        body: financialData.records.map(r => [
          r.financial_year.toString(),
          pdfFormatCurrency(r.market_value),
          pdfFormatCurrency(r.operating_costs),
          pdfFormatCurrency(r.rental_income),
          pdfFormatCurrency(r.net_operating_income),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [66, 66, 66] },
      });
    }
    
    // Footer
    addPDFFooter(doc);
    
    // Save
    const filename = `Taloustiedot-${buildingName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const latestRecord = financialData?.records[0];
  const chartData = financialData?.records
    .slice()
    .reverse()
    .map(r => ({
      year: r.financial_year.toString(),
      'Käyttökustannukset': r.operating_costs || 0,
      'Vuokratulot': r.rental_income || 0,
      'NOI': r.net_operating_income || 0
    })) || [];

  const capitalChartData = financialData?.records
    .slice()
    .reverse()
    .map(r => ({
      year: r.financial_year.toString(),
      'Markkina-arvo': r.market_value || 0,
      'Velka': r.debt_amount || 0,
      'Oma pääoma': r.equity_amount || 0
    })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Taloustiedot</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {buildingName} • {areaM2.toLocaleString('fi-FI')} m²
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportBuildingFinancialPDF} variant="outline" disabled={!financialData || financialData.records.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Vie PDF
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Lisää taloustiedot
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Lisää/muokkaa taloustietoja</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Year */}
                <div>
                  <Label htmlFor="financial_year">Vuosi *</Label>
                  <Input
                    id="financial_year"
                    type="number"
                    value={formData.financial_year}
                    onChange={(e) => setFormData({ ...formData, financial_year: parseInt(e.target.value) })}
                    required
                    min={2000}
                    max={2100}
                  />
                </div>

                <Separator />

                {/* Capital */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Pääoma</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="market_value">Markkina-arvo (€)</Label>
                      <Input
                        id="market_value"
                        type="number"
                        step="0.01"
                        value={formData.market_value}
                        onChange={(e) => setFormData({ ...formData, market_value: e.target.value })}
                        placeholder="8500000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="debt_amount">Velka (€)</Label>
                      <Input
                        id="debt_amount"
                        type="number"
                        step="0.01"
                        value={formData.debt_amount}
                        onChange={(e) => setFormData({ ...formData, debt_amount: e.target.value })}
                        placeholder="3000000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="purchase_price">Hankintahinta (€)</Label>
                      <Input
                        id="purchase_price"
                        type="number"
                        step="0.01"
                        value={formData.purchase_price}
                        onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="purchase_date">Hankintapäivä</Label>
                      <Input
                        id="purchase_date"
                        type="date"
                        value={formData.purchase_date}
                        onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Operating Costs */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Vuosittaiset käyttökustannukset</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="utilities_cost">Energia ja vesi (€)</Label>
                      <Input
                        id="utilities_cost"
                        type="number"
                        step="0.01"
                        value={formData.utilities_cost}
                        onChange={(e) => setFormData({ ...formData, utilities_cost: e.target.value })}
                        placeholder="80000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maintenance_cost">Huolto ja korjaus (€)</Label>
                      <Input
                        id="maintenance_cost"
                        type="number"
                        step="0.01"
                        value={formData.maintenance_cost}
                        onChange={(e) => setFormData({ ...formData, maintenance_cost: e.target.value })}
                        placeholder="120000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="management_fees">Hallintokulut (€)</Label>
                      <Input
                        id="management_fees"
                        type="number"
                        step="0.01"
                        value={formData.management_fees}
                        onChange={(e) => setFormData({ ...formData, management_fees: e.target.value })}
                        placeholder="25000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="insurance_cost">Vakuutusmaksut (€)</Label>
                      <Input
                        id="insurance_cost"
                        type="number"
                        step="0.01"
                        value={formData.insurance_cost}
                        onChange={(e) => setFormData({ ...formData, insurance_cost: e.target.value })}
                        placeholder="15000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="property_taxes">Kiinteistövero (€)</Label>
                      <Input
                        id="property_taxes"
                        type="number"
                        step="0.01"
                        value={formData.property_taxes}
                        onChange={(e) => setFormData({ ...formData, property_taxes: e.target.value })}
                        placeholder="5000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="other_costs">Muut kulut (€)</Label>
                      <Input
                        id="other_costs"
                        type="number"
                        step="0.01"
                        value={formData.other_costs}
                        onChange={(e) => setFormData({ ...formData, other_costs: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Rental Income */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Vuokratulot</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="rental_income">Vuokratulot (€/v)</Label>
                      <Input
                        id="rental_income"
                        type="number"
                        step="0.01"
                        value={formData.rental_income}
                        onChange={(e) => setFormData({ ...formData, rental_income: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vacancy_rate">Vajaakäyttöaste (%)</Label>
                      <Input
                        id="vacancy_rate"
                        type="number"
                        step="0.01"
                        value={formData.vacancy_rate}
                        onChange={(e) => setFormData({ ...formData, vacancy_rate: e.target.value })}
                        placeholder="5"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Insurance */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Vakuutustiedot</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="insurance_value">Vakuutusarvo (€)</Label>
                      <Input
                        id="insurance_value"
                        type="number"
                        step="0.01"
                        value={formData.insurance_value}
                        onChange={(e) => setFormData({ ...formData, insurance_value: e.target.value })}
                        placeholder="10500000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="insurance_provider">Vakuutusyhtiö</Label>
                      <Input
                        id="insurance_provider"
                        value={formData.insurance_provider}
                        onChange={(e) => setFormData({ ...formData, insurance_provider: e.target.value })}
                        placeholder="If Vahinkovakuutus"
                      />
                    </div>
                    <div>
                      <Label htmlFor="insurance_policy_number">Vakuutusnumero</Label>
                      <Input
                        id="insurance_policy_number"
                        value={formData.insurance_policy_number}
                        onChange={(e) => setFormData({ ...formData, insurance_policy_number: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="insurance_renewal_date">Uusimispäivä</Label>
                      <Input
                        id="insurance_renewal_date"
                        type="date"
                        value={formData.insurance_renewal_date}
                        onChange={(e) => setFormData({ ...formData, insurance_renewal_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Investment */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Investoinnit</h3>
                  <div>
                    <Label htmlFor="capex_amount">Vuoden investoinnit - CapEx (€)</Label>
                    <Input
                      id="capex_amount"
                      type="number"
                      step="0.01"
                      value={formData.capex_amount}
                      onChange={(e) => setFormData({ ...formData, capex_amount: e.target.value })}
                      placeholder="500000"
                    />
                  </div>
                </div>

                <Separator />

                {/* Notes */}
                <div>
                  <Label htmlFor="notes">Muistiinpanot</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    placeholder="Lisätietoja..."
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Peruuta
                  </Button>
                  <Button type="submit">Tallenna</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {financialData?.records.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Ei taloustietoja</p>
            <p className="text-sm text-muted-foreground mt-1">Aloita lisäämällä ensimmäiset taloustiedot</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Latest Year Summary */}
          {latestRecord && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Markkina-arvo ({latestRecord.financial_year})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{formatCurrency(latestRecord.market_value)}</div>
                    {latestRecord.debt_to_value_ratio && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Velkaantumisaste: {(latestRecord.debt_to_value_ratio * 100).toFixed(1)}%
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Käyttökustannukset</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{formatCurrency(latestRecord.operating_costs)}</div>
                    {latestRecord.operating_cost_per_m2 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {latestRecord.operating_cost_per_m2.toFixed(2)} €/m²
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Vuokratulot</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{formatCurrency(latestRecord.rental_income)}</div>
                    {latestRecord.vacancy_rate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Vajaakäyttö: {latestRecord.vacancy_rate.toFixed(1)}%
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Nettotulos (NOI)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-semibold">{formatCurrency(latestRecord.net_operating_income)}</div>
                      {latestRecord.net_operating_income !== null && latestRecord.net_operating_income !== undefined && (
                        latestRecord.net_operating_income >= 0 ? (
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-600" />
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Pääoma ja velka</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Markkina-arvo</span>
                      <span className="font-medium">{formatCurrency(latestRecord.market_value)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Velka</span>
                      <span className="font-medium">{formatCurrency(latestRecord.debt_amount)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-sm font-medium">Oma pääoma</span>
                      <span className="font-semibold">{formatCurrency(latestRecord.equity_amount)}</span>
                    </div>
                    {latestRecord.purchase_price && (
                      <>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Hankintahinta</span>
                          <span className="font-medium">{formatCurrency(latestRecord.purchase_price)}</span>
                        </div>
                        {latestRecord.purchase_date && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Hankintapäivä</span>
                            <span className="font-medium">{formatDate(latestRecord.purchase_date)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Repair Debt Analysis */}
                {(financialData.latest_repair_debt !== null && financialData.latest_repair_debt !== undefined) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Korjausvelka-analyysi</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Korjausvelka (TeknA)</span>
                        <span className="font-medium">{formatCurrency(financialData.latest_repair_debt)}</span>
                      </div>
                      
                      {financialData.repair_debt_to_market_value !== null && latestRecord?.market_value && (
                        <>
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-sm font-medium">% markkina-arvosta</span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{financialData.repair_debt_to_market_value.toFixed(1)}%</span>
                              {financialData.repair_debt_to_market_value > 20 && (
                                <Badge className="bg-red-600">Korkea</Badge>
                              )}
                              {financialData.repair_debt_to_market_value > 10 && financialData.repair_debt_to_market_value <= 20 && (
                                <Badge className="bg-yellow-600">Kohtalainen</Badge>
                              )}
                              {financialData.repair_debt_to_market_value <= 10 && (
                                <Badge className="bg-green-600">Hallinnassa</Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <div className="flex gap-2">
                              <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-blue-700 dark:text-blue-300">
                                {financialData.repair_debt_to_market_value > 20 && 'Merkittävää korjaustarvetta. Korjausvelka on yli 20% markkina-arvosta.'}
                                {financialData.repair_debt_to_market_value > 10 && financialData.repair_debt_to_market_value <= 20 && 'Normaali ylläpitotarve. Korjausvelka on hallittavissa.'}
                                {financialData.repair_debt_to_market_value <= 10 && 'Hyvä kunnossapitotaso. Korjausvelka on alle 10% markkina-arvosta.'}
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Käyttökustannusten erittely</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {latestRecord.utilities_cost !== null && latestRecord.utilities_cost !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Energia ja vesi</span>
                        <span className="font-medium">{formatCurrency(latestRecord.utilities_cost)}</span>
                      </div>
                    )}
                    {latestRecord.maintenance_cost !== null && latestRecord.maintenance_cost !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Huolto ja korjaus</span>
                        <span className="font-medium">{formatCurrency(latestRecord.maintenance_cost)}</span>
                      </div>
                    )}
                    {latestRecord.management_fees !== null && latestRecord.management_fees !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Hallintokulut</span>
                        <span className="font-medium">{formatCurrency(latestRecord.management_fees)}</span>
                      </div>
                    )}
                    {latestRecord.insurance_cost !== null && latestRecord.insurance_cost !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Vakuutusmaksut</span>
                        <span className="font-medium">{formatCurrency(latestRecord.insurance_cost)}</span>
                      </div>
                    )}
                    {latestRecord.property_taxes !== null && latestRecord.property_taxes !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Kiinteistövero</span>
                        <span className="font-medium">{formatCurrency(latestRecord.property_taxes)}</span>
                      </div>
                    )}
                    {latestRecord.other_costs !== null && latestRecord.other_costs !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Muut kulut</span>
                        <span className="font-medium">{formatCurrency(latestRecord.other_costs)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-sm font-medium">Yhteensä</span>
                      <span className="font-semibold">{formatCurrency(latestRecord.operating_costs)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Vakuutustiedot</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Vakuutusarvo</span>
                      <span className="font-medium">{formatCurrency(latestRecord.insurance_value)}</span>
                    </div>
                    {latestRecord.insurance_provider && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Vakuutusyhtiö</span>
                        <span className="font-medium">{latestRecord.insurance_provider}</span>
                      </div>
                    )}
                    {latestRecord.insurance_policy_number && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Vakuutusnumero</span>
                        <span className="font-medium">{latestRecord.insurance_policy_number}</span>
                      </div>
                    )}
                    {latestRecord.insurance_renewal_date && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Uusimispäivä</span>
                        <span className="font-medium">{formatDate(latestRecord.insurance_renewal_date)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Investoinnit</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">CapEx ({latestRecord.financial_year})</span>
                      <span className="font-medium">{formatCurrency(latestRecord.capex_amount)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Year-over-year trends */}
          {chartData.length > 1 && (
            <>
              <Card>
                <CardHeader>
                    <CardTitle>Käyttökustannukset ja tuotot</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Area type="monotone" dataKey="Käyttökustannukset" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="Vuokratulot" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="NOI" stackId="3" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pääomarakenne</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={capitalChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="Markkina-arvo" fill="#3b82f6" />
                      <Bar dataKey="Velka" fill="#ef4444" />
                      <Bar dataKey="Oma pääoma" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}

          {/* All Records Table */}
          <Card>
            <CardHeader>
              <CardTitle>Historia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium text-gray-600">Vuosi</th>
                      <th className="text-right py-2 font-medium text-gray-600">Markkina-arvo</th>
                      <th className="text-right py-2 font-medium text-gray-600">Velka</th>
                      <th className="text-right py-2 font-medium text-gray-600">Käyttökust.</th>
                      <th className="text-right py-2 font-medium text-gray-600">Vuokratulot</th>
                      <th className="text-right py-2 font-medium text-gray-600">NOI</th>
                      <th className="text-right py-2 font-medium text-gray-600">CapEx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialData?.records.map((record) => (
                      <tr key={record.id} className="border-b last:border-b-0">
                        <td className="py-2 font-medium">{record.financial_year}</td>
                        <td className="text-right">{formatCurrency(record.market_value)}</td>
                        <td className="text-right">{formatCurrency(record.debt_amount)}</td>
                        <td className="text-right">{formatCurrency(record.operating_costs)}</td>
                        <td className="text-right">{formatCurrency(record.rental_income)}</td>
                        <td className="text-right">
                          <span className={record.net_operating_income && record.net_operating_income < 0 ? 'text-red-600' : ''}>
                            {formatCurrency(record.net_operating_income)}
                          </span>
                        </td>
                        <td className="text-right">{formatCurrency(record.capex_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
