import { useEffect, useState, useRef } from "react";
import { useSafeUser } from "app/auth/use-safe-user";
import { useNavigate } from "react-router-dom";
import { apiClient } from "app";
import { ArrowLeft, Users, Building, Building2, TrendingUp, Plus, Mail, Euro, AlertCircle, Copy, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { 
  ListAllUsersData, 
  ListOrganizationsData, 
  GetBillingDashboardData,
  CreateOrganizationRequest,
  AdminInviteUserRequest
} from "types";
import { Checkbox } from "@/components/ui/checkbox";

interface User {
  id: number;
  user_id: string;
  email: string;
  name: string | null;
  org_id: number;
  org_name: string;
  org_role: string;
  system_role: string;
  joined_at: string;
}

interface Organization {
  id: number;
  name: string;
  user_count: number;
  building_count: number;
  small_buildings: number;
  medium_buildings: number;
  large_buildings: number;
  sub_buildings: number;
}

interface BillingDashboard {
  total_users: number;
  total_buildings: number;
  total_organizations: number;
  organizations: Array<{
    org_id: number;
    org_name: string;
    active_users: number;
    total_buildings: number;
    small_buildings: number;
    medium_buildings: number;
    large_buildings: number;
    sub_buildings: number;
    user_monthly_cost?: number;
    building_monthly_cost?: number;
    monthly_cost?: number;
    annual_cost?: number;
  }>;
  pricing_configured: boolean;
  monthly_recurring_revenue?: number;
  annual_recurring_revenue?: number;
}

export default function HallintaKäyttäjät() {
  const navigate = useNavigate();
  const user = useSafeUser();
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [billing, setBilling] = useState<BillingDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const hasLoadedRef = useRef(false);

  // Dialog states
  const [createOrgDialogOpen, setCreateOrgDialogOpen] = useState(false);
  const [inviteUserDialogOpen, setInviteUserDialogOpen] = useState(false);
  const [selectedOrgForInvite, setSelectedOrgForInvite] = useState<number | null>(null);
  
  // Success Dialog State
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [copied, setCopied] = useState(false);
  
  // Delete Dialog State
  const [deleteOrgDialogOpen, setDeleteOrgDialogOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<{id: number, name: string} | null>(null);
  
  // Remove User Dialog State
  const [removeUserDialogOpen, setRemoveUserDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<{id: string, email: string, orgId: number} | null>(null);

  // Form states
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgTier, setNewOrgTier] = useState("basic");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("admin");

  // Pricing configuration states
  const [primaryUserFee, setPrimaryUserFee] = useState<string>("");
  const [additionalUserFee, setAdditionalUserFee] = useState<string>("");
  const [smallBuildingFee, setSmallBuildingFee] = useState<string>("");
  const [mediumBuildingFee, setMediumBuildingFee] = useState<string>("");
  const [largeBuildingFee, setLargeBuildingFee] = useState<string>("");
  const [subBuildingPercent, setSubBuildingPercent] = useState<string>("");
  const [pricingLoaded, setPricingLoaded] = useState(false);

  useEffect(() => {
    if (user && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all data in parallel including pricing
      const [usersRes, orgsRes, billingRes, pricingRes] = await Promise.all([
        apiClient.list_all_users(),
        apiClient.list_organizations(),
        apiClient.get_billing_dashboard(),
        apiClient.get_pricing_config()
      ]);

      const usersData = await usersRes.json();
      const orgsData = await orgsRes.json();
      const billingData = await billingRes.json();
      const pricingData = await pricingRes.json();

      setUsers(usersData);
      setOrganizations(orgsData);
      setBilling(billingData);
      
      // Load pricing configuration
      setPrimaryUserFee(pricingData.primary_user_annual_fee?.toString() || "");
      setAdditionalUserFee(pricingData.additional_user_annual_fee?.toString() || "");
      setSmallBuildingFee(pricingData.small_building_monthly_fee?.toString() || "");
      setMediumBuildingFee(pricingData.medium_building_monthly_fee?.toString() || "");
      setLargeBuildingFee(pricingData.large_building_monthly_fee?.toString() || "");
      setSubBuildingPercent(pricingData.sub_building_percent?.toString() || "20");
      setPricingLoaded(true);
      
      setIsAdmin(true);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setError("Admin-pääsy vaaditaan. Sinulla ei ole oikeuksia tälle sivulle.");
        setIsAdmin(false);
      } else {
        setError("Tietojen lataaminen epäonnistui: " + (err.message || "Tuntematon virhe"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSavePricing = async () => {
    try {
      const body = {
        primary_user_annual_fee: primaryUserFee ? parseFloat(primaryUserFee) : undefined,
        additional_user_annual_fee: additionalUserFee ? parseFloat(additionalUserFee) : undefined,
        small_building_monthly_fee: smallBuildingFee ? parseFloat(smallBuildingFee) : undefined,
        medium_building_monthly_fee: mediumBuildingFee ? parseFloat(mediumBuildingFee) : undefined,
        large_building_monthly_fee: largeBuildingFee ? parseFloat(largeBuildingFee) : undefined,
        sub_building_percent: subBuildingPercent ? parseFloat(subBuildingPercent) : undefined
      };

      await apiClient.update_pricing_config(body);
      toast.success("Hinnoittelu tallennettu onnistuneesti");
      
      // Reload data to refresh calculations
      loadData();
    } catch (err: any) {
      console.error('Error saving pricing:', err);
      toast.error("Virhe hinnoittelun tallentamisessa");
    }
  };

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) {
      toast.error("Organisaation nimi vaaditaan");
      return;
    }

    try {
      const body: CreateOrganizationRequest = {
        name: newOrgName,
        subscription_tier: newOrgTier
      };

      const res = await apiClient.create_organization(body);
      const data = await res.json();

      toast.success(`Organisaatio "${data.name}" luotu onnistuneesti`);
      setCreateOrgDialogOpen(false);
      setNewOrgName("");
      setNewOrgTier("basic");
      loadData(); // Refresh data
    } catch (err: any) {
      console.error('Error creating organization:', err);
      toast.error("Virhe organisaation luomisessa");
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Sähköpostiosoite vaaditaan");
      return;
    }

    if (!selectedOrgForInvite) {
      toast.error("Organisaatio vaaditaan");
      return;
    }

    try {
      const body: AdminInviteUserRequest = {
        email: inviteEmail,
        name: inviteName || undefined,
        org_role: inviteRole
      };

      const res = await apiClient.admin_invite_user(selectedOrgForInvite, body);
      // const data = await res.json(); // We don't necessarily need the backend message if we use the hardcoded one

      setInviteUserDialogOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("admin");
      setSelectedOrgForInvite(null);
      
      // Show success dialog with instructions
      const instructionMsg = `Käyttäjätilisi on nyt luotu. Siirry kirjautumissivulle, syötä sähköpostiosoitteesi ja valitse "Unohtuiko salasana" tai "Kirjaudu sähköpostilinkillä" asettaaksesi salasanasi.`;
      setSuccessMessage(instructionMsg);
      setSuccessDialogOpen(true);
      setCopied(false);
      
      loadData(); // Refresh data
    } catch (err: any) {
      console.error('Error inviting user:', err);
      toast.error("Virhe käyttäjän kutsumisessa");
    }
  };

  const handleDeleteOrg = async () => {
    if (!orgToDelete) return;

    try {
      await apiClient.delete_organization(orgToDelete.id);
      toast.success(`Organisaatio ${orgToDelete.name} ja kaikki sen tiedot on poistettu.`);
      setDeleteOrgDialogOpen(false);
      setOrgToDelete(null);
      loadData();
    } catch (err) {
      console.error("Error deleting organization:", err);
      toast.error("Virhe organisaation poistamisessa");
    }
  };
  
  const handleRemoveUser = async () => {
    if (!userToRemove) return;
    
    try {
      await apiClient.remove_user_from_org(userToRemove.orgId, userToRemove.user_id || userToRemove.id); 
      // Note: check variable naming compatibility. userToRemove.id should be the user_id (string)
      
      toast.success(`Käyttäjä ${userToRemove.email} poistettu organisaatiosta.`);
      setRemoveUserDialogOpen(false);
      setUserToRemove(null);
      loadData();
    } catch (err) {
      console.error("Error removing user:", err);
      toast.error("Virhe käyttäjän poistamisessa");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(successMessage);
    setCopied(true);
    toast.success("Viesti kopioitu leikepöydälle");
    setTimeout(() => setCopied(false), 2000);
  };

  const openInviteDialog = (orgId: number) => {
    setSelectedOrgForInvite(orgId);
    setInviteUserDialogOpen(true);
  };
  
  const openDeleteOrgDialog = (org: Organization) => {
    setOrgToDelete({ id: org.id, name: org.name });
    setDeleteOrgDialogOpen(true);
  };
  
  const openRemoveUserDialog = (user: OrgUser, orgId: number) => {
    setUserToRemove({ id: user.id, email: user.email || "Tuntematon", orgId });
    setRemoveUserDialogOpen(true);
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Kirjaudu sisään käyttääksesi tätä sivua.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Ladataan...</p>
        </div>
      </div>
    );
  }

  if (error || !isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Pääsy estetty"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/portfolio')}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Takaisin
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-foreground">
                Hallinta
              </h1>
              <p className="text-sm text-muted-foreground">
                Käyttäjien ja organisaatioiden hallinta
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      {billing && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Käyttäjiä yhteensä</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{billing.total_users}</div>
              <p className="text-xs text-muted-foreground">
                {billing.total_organizations} organisaatiossa
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rakennuksia yhteensä</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{billing.total_buildings}</div>
              <p className="text-xs text-muted-foreground">
                Kaikki organisaatiot
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organisaatioita</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{billing.total_organizations}</div>
              <p className="text-xs text-muted-foreground">
                Aktiivisia asiakkaita
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Käyttäjät</TabsTrigger>
          <TabsTrigger value="organizations">Organisaatiot</TabsTrigger>
          <TabsTrigger value="billing">Laskutus</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Käyttäjät</CardTitle>
                  <CardDescription>Hallitse käyttäjätilejä ja pääsyoikeuksia</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Lisää käyttäjä
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nimi</TableHead>
                    <TableHead>Sähköposti</TableHead>
                    <TableHead>Organisaatio</TableHead>
                    <TableHead>Org-rooli</TableHead>
                    <TableHead>Järjestelmärooli</TableHead>
                    <TableHead>Liittynyt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name || "—"}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.org_name}</TableCell>
                      <TableCell>
                        <Badge variant={u.org_role === 'admin' ? 'default' : 'secondary'}>
                          {u.org_role === 'admin' ? 'Admin' : 'Jäsen'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.system_role === 'admin' ? 'destructive' : 'outline'}>
                          {u.system_role === 'admin' ? 'Ylläpitäjä' : 'Käyttäjä'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(u.joined_at).toLocaleDateString('fi-FI')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Organisaatiot</CardTitle>
                  <CardDescription>Hallitse asiakasorganisaatioita</CardDescription>
                </div>
                <Dialog open={createOrgDialogOpen} onOpenChange={setCreateOrgDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Luo uusi organisaatio
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Luo uusi organisaatio</DialogTitle>
                      <DialogDescription>
                        Lisää uusi asiakasorganisaatio sopimuksen perusteella.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="org-name">Organisaation nimi *</Label>
                        <Input
                          id="org-name"
                          value={newOrgName}
                          onChange={(e) => setNewOrgName(e.target.value)}
                          placeholder="Esim. Asunto Oy Esimerkki"
                        />
                      </div>
                      <div>
                        <Label htmlFor="org-tier">Tilaustyyppi</Label>
                        <Select value={newOrgTier} onValueChange={setNewOrgTier}>
                          <SelectTrigger id="org-tier">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basic">Basic</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCreateOrgDialogOpen(false)}>
                        Peruuta
                      </Button>
                      <Button onClick={handleCreateOrganization}>
                        Luo organisaatio
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nimi</TableHead>
                    <TableHead>Käyttäjiä</TableHead>
                    <TableHead>Rakennuksia</TableHead>
                    <TableHead>Pienet (&lt;1000m²)</TableHead>
                    <TableHead>Keskikokoiset</TableHead>
                    <TableHead>Suuret (&gt;5000m²)</TableHead>
                    <TableHead>Piharakennukset</TableHead>
                    <TableHead className="text-right">Toiminnot</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>{org.user_count}</TableCell>
                      <TableCell>{org.building_count}</TableCell>
                      <TableCell>{org.small_buildings}</TableCell>
                      <TableCell>{org.medium_buildings}</TableCell>
                      <TableCell>{org.large_buildings}</TableCell>
                      <TableCell>{org.sub_buildings}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => openInviteDialog(org.id)}
                          >
                            <Mail className="h-4 w-4" />
                            Kutsu käyttäjä
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => openDeleteOrgDialog(org)}
                            title="Poista organisaatio"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invite User Dialog */}
        <Dialog open={inviteUserDialogOpen} onOpenChange={setInviteUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kutsu käyttäjä</DialogTitle>
              <DialogDescription>
                Kutsu uusi pääkäyttäjä organisaatioon.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="invite-email">Sähköpostiosoite *</Label>
                <Input
                  id="invite-email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Esim. pääkäyttäjä@example.com"
                />
              </div>
              <div>
                <Label htmlFor="invite-name">Nimi</Label>
                <Input
                  id="invite-name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Esim. Pääkäyttäjä"
                />
              </div>
              <div>
                <Label htmlFor="invite-role">Rooli</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Jäsen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteUserDialogOpen(false)}>
                Peruuta
              </Button>
              <Button onClick={handleInviteUser}>
                Kutsu käyttäjä
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success / Instruction Dialog */}
        <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Käyttäjä luotu onnistuneesti</DialogTitle>
              <DialogDescription>
                Lähetä alla oleva viesti käyttäjälle, jotta hän voi ottaa tilin käyttöön.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2 bg-muted p-4 rounded-md">
              <p className="text-sm font-medium leading-relaxed">
                {successMessage}
              </p>
            </div>
            <DialogFooter className="sm:justify-start">
              <Button
                type="button"
                variant="secondary"
                onClick={copyToClipboard}
                className="w-full sm:w-auto"
              >
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? "Kopioitu" : "Kopioi viesti"}
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={() => setSuccessDialogOpen(false)}
                className="w-full sm:w-auto ml-auto"
              >
                Sulje
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Organization Confirmation Dialog */}
        <Dialog open={deleteOrgDialogOpen} onOpenChange={setDeleteOrgDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Poista organisaatio?</DialogTitle>
              <DialogDescription className="text-destructive">
                Olet poistamassa organisaatiota <strong>{orgToDelete?.name}</strong>.
                <br /><br />
                Tämä toiminto poistaa <strong>pysyvästi</strong> kaikki organisaatioon liittyvät:
                <ul className="list-disc ml-5 mt-2 space-y-1 text-sm text-foreground">
                  <li>Rakennukset</li>
                  <li>Kuntotarkastukset ja raportit</li>
                  <li>Taloustiedot ja arvonmääritykset</li>
                  <li>Huoltohistoriat</li>
                  <li>Käyttäjäoikeudet</li>
                </ul>
                <br />
                Toimintoa ei voi kumota.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOrgDialogOpen(false)}>
                Peruuta
              </Button>
              <Button variant="destructive" onClick={handleDeleteOrg}>
                Poista organisaatio
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Remove User Confirmation Dialog */}
        <Dialog open={removeUserDialogOpen} onOpenChange={setRemoveUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Poista käyttäjä?</DialogTitle>
              <DialogDescription>
                Olet poistamassa käyttäjää <strong>{userToRemove?.email}</strong> organisaatiosta.
                <br /><br />
                Käyttäjä menettää pääsyn organisaation tietoihin, mutta hänen käyttäjätilinsä säilyy järjestelmässä.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRemoveUserDialogOpen(false)}>
                Peruuta
              </Button>
              <Button variant="destructive" onClick={handleRemoveUser}>
                Poista käyttäjä
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          {/* Pricing Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Hinnoittelun asetukset</CardTitle>
              <CardDescription>
                Aseta hinnoittelu käyttäjälisenssille ja rakennusten seurannalle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User Pricing */}
              <div>
                <h3 className="text-sm font-medium mb-3 text-foreground">Käyttäjälisenssit (vuosihinta)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Pääkäyttäjä (€/vuosi)</label>
                    <Input
                      type="number"
                      placeholder="esim. 99"
                      value={primaryUserFee}
                      onChange={(e) => setPrimaryUserFee(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Lisäkäyttäjä (€/vuosi)</label>
                    <Input
                      type="number"
                      placeholder="esim. 79"
                      value={additionalUserFee}
                      onChange={(e) => setAdditionalUserFee(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Building Pricing */}
              <div>
                <h3 className="text-sm font-medium mb-3 text-foreground">Rakennusten seuranta (kuukausihinta)</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Pieni (&lt;1000m²)</label>
                    <Input
                      type="number"
                      placeholder="esim. 20"
                      value={smallBuildingFee}
                      onChange={(e) => setSmallBuildingFee(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Piharakennus (% pienestä)</label>
                    <Input
                      type="number"
                      placeholder="esim. 20"
                      value={subBuildingPercent}
                      onChange={(e) => setSubBuildingPercent(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Keskikoko (1000-5000m²)</label>
                    <Input
                      type="number"
                      placeholder="esim. 14.99"
                      value={mediumBuildingFee}
                      onChange={(e) => setMediumBuildingFee(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Suuri &gt;5000m² (€/kk)</label>
                    <Input
                      type="number"
                      placeholder="esim. 24.99"
                      value={largeBuildingFee}
                      onChange={(e) => setLargeBuildingFee(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSavePricing}>
                Tallenna hinnoittelu
              </Button>
            </CardContent>
          </Card>

          {/* Revenue Summary */}
          {billing?.pricing_configured && (
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Kuukausittainen liikevaihto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <Euro className="h-5 w-5 text-green-600" />
                    <span className="text-2xl font-bold">{billing.monthly_recurring_revenue?.toLocaleString('fi-FI', { minimumFractionDigits: 2 })} €</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">MRR</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Vuosittainen liikevaihto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <span className="text-2xl font-bold">{billing.annual_recurring_revenue?.toLocaleString('fi-FI', { minimumFractionDigits: 2 })} €</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">ARR</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Organisaatiot yhteensä</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <span className="text-2xl font-bold">{billing.total_organizations}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Aktiivisia asiakkaita</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Organization Billing Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Laskutusyhteenveto</CardTitle>
                  <CardDescription>Organisaatiokohtainen laskutus</CardDescription>
                </div>
                <Button variant="outline">Vie CSV</Button>
              </div>
            </CardHeader>
            <CardContent>
              {billing && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organisaatio</TableHead>
                      <TableHead>Käyttäjät</TableHead>
                      <TableHead>Rakennukset</TableHead>
                      <TableHead>Pienet</TableHead>
                      <TableHead>Keskikokoiset</TableHead>
                      <TableHead>Suuret</TableHead>
                      <TableHead>Piharakennukset</TableHead>
                      {billing.pricing_configured && (
                        <>
                          <TableHead className="text-right">Käyttäjät €/kk</TableHead>
                          <TableHead className="text-right">Rakennukset €/kk</TableHead>
                          <TableHead className="text-right">Yhteensä €/kk</TableHead>
                          <TableHead className="text-right">Yhteensä €/v</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billing.organizations.map((org) => (
                      <TableRow key={org.org_id}>
                        <TableCell className="font-medium">{org.org_name}</TableCell>
                        <TableCell>{org.active_users}</TableCell>
                        <TableCell>{org.total_buildings}</TableCell>
                        <TableCell>{org.small_buildings}</TableCell>
                        <TableCell>{org.medium_buildings}</TableCell>
                        <TableCell>{org.large_buildings}</TableCell>
                        <TableCell>{org.sub_buildings}</TableCell>
                        {billing.pricing_configured && org.monthly_cost !== undefined && (
                          <>
                            <TableCell className="text-right">{org.user_monthly_cost?.toFixed(2)} €</TableCell>
                            <TableCell className="text-right">{org.building_monthly_cost?.toFixed(2)} €</TableCell>
                            <TableCell className="text-right font-medium">{org.monthly_cost?.toFixed(2)} €</TableCell>
                            <TableCell className="text-right font-medium">{org.annual_cost?.toFixed(2)} €</TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {!billing?.pricing_configured && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Määritä hinnoittelu yllä nähdäksesi laskutusarviot</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
