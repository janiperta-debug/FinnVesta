import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from 'app';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Archive, Building, Trash2, RotateCcw, UserPlus, Info } from 'lucide-react';
import { toast } from 'sonner';
import type { 
  ListOrgUsersResponse, 
  ListArchivedBuildingsResponse, 
  OrganizationInfo 
} from 'types';

const Asetukset = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('team');
  
  // Team state
  const [users, setUsers] = useState<ListOrgUsersResponse | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Archive state
  const [archivedBuildings, setArchivedBuildings] = useState<ListArchivedBuildingsResponse | null>(null);
  const [loadingArchive, setLoadingArchive] = useState(false);
  
  // Org info state
  const [orgInfo, setOrgInfo] = useState<OrganizationInfo | null>(null);
  const [loadingOrgInfo, setLoadingOrgInfo] = useState(false);

  // Load data when tabs change
  useEffect(() => {
    if (activeTab === 'team') {
      loadUsers();
    } else if (activeTab === 'archive') {
      loadArchivedBuildings();
    } else if (activeTab === 'info') {
      loadOrgInfo();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await apiClient.list_org_users({ orgId: 2 });
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Virhe käyttäjien lataamisessa');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadArchivedBuildings = async () => {
    setLoadingArchive(true);
    try {
      const response = await apiClient.list_archived_buildings({ orgId: 2 });
      const data = await response.json();
      setArchivedBuildings(data);
    } catch (error) {
      console.error('Error loading archived buildings:', error);
      toast.error('Virhe arkistoitujen rakennusten lataamisessa');
    } finally {
      setLoadingArchive(false);
    }
  };

  const loadOrgInfo = async () => {
    setLoadingOrgInfo(true);
    try {
      const response = await apiClient.get_organization_info({ orgId: 2 });
      const data = await response.json();
      setOrgInfo(data);
    } catch (error) {
      console.error('Error loading org info:', error);
      toast.error('Virhe organisaation tietojen lataamisessa');
    } finally {
      setLoadingOrgInfo(false);
    }
  };

  const handleRemoveUser = async (userId: string, userName: string | null) => {
    if (!confirm(`Haluatko varmasti poistaa käyttäjän ${userName || userId}?`)) {
      return;
    }

    try {
      await apiClient.remove_user(userId, { orgId: 2 });
      toast.success('Käyttäjä poistettu onnistuneesti');
      loadUsers(); // Refresh list
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error('Virhe käyttäjän poistamisessa');
    }
  };

  const handleRestoreBuilding = async (buildingId: number, buildingName: string) => {
    if (!confirm(`Haluatko varmasti palauttaa rakennuksen "${buildingName}"?`)) {
      return;
    }

    try {
      await apiClient.restore_archived_building(buildingId, { orgId: 2 });
      toast.success(`Rakennus "${buildingName}" palautettu`);
      loadArchivedBuildings(); // Refresh list
    } catch (error) {
      console.error('Error restoring building:', error);
      toast.error('Virhe rakennuksen palauttamisessa');
    }
  };

  const handleInviteUser = () => {
    // TODO: Open a dialog/modal to invite user
    toast.info('Kutsu-toiminto tulossa pian');
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 py-4 px-6">
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
                Asetukset
              </h1>
              <p className="text-sm text-muted-foreground">
                Hallitse tiimiä ja organisaatioasetuksia
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              Käyttäjät
            </TabsTrigger>
            <TabsTrigger value="archive" className="gap-2">
              <Archive className="h-4 w-4" />
              Arkisto
            </TabsTrigger>
            <TabsTrigger value="info" className="gap-2">
              <Info className="h-4 w-4" />
              Tiedot
            </TabsTrigger>
          </TabsList>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tiimin jäsenet</CardTitle>
                    <CardDescription>
                      Hallitse organisaation käyttäjiä ja rooleja
                    </CardDescription>
                  </div>
                  <Button onClick={handleInviteUser} className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Kutsu käyttäjä
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="text-center py-8 text-muted-foreground">Ladataan...</div>
                ) : users && users.users.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nimi</TableHead>
                        <TableHead>Sähköposti</TableHead>
                        <TableHead>Rooli</TableHead>
                        <TableHead>Liittynyt</TableHead>
                        <TableHead className="text-right">Toiminnot</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium text-foreground">
                            {user.user_name || 'Ei nimeä'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.user_email || 'Ei sähköpostia'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role === 'admin' ? 'Admin' : 'Jäsen'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(user.joined_at).toLocaleDateString('fi-FI')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveUser(user.user_id, user.user_name)}
                              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            >
                              <Trash2 className="h-4 w-4" />
                              Poista
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Ei käyttäjiä. Kutsu ensimmäinen jäsen!
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Archive Tab */}
          <TabsContent value="archive" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Arkistoidut rakennukset</CardTitle>
                <CardDescription>
                  Palauta arkistoituja rakennuksia takaisin aktiivisiksi
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingArchive ? (
                  <div className="text-center py-8 text-muted-foreground">Ladataan...</div>
                ) : archivedBuildings && archivedBuildings.buildings.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nimi</TableHead>
                        <TableHead>Osoite</TableHead>
                        <TableHead>Rakennusvuosi</TableHead>
                        <TableHead>Pinta-ala</TableHead>
                        <TableHead>Arkistoitu</TableHead>
                        <TableHead className="text-right">Toiminnot</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {archivedBuildings.buildings.map((building) => (
                        <TableRow key={building.id}>
                          <TableCell className="font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-muted-foreground" />
                              {building.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {building.address || '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {building.construction_year}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {building.area_m2.toLocaleString('fi-FI')} m²
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(building.archived_at).toLocaleDateString('fi-FI')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestoreBuilding(building.id, building.name)}
                              className="gap-2"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Palauta
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Ei arkistoituja rakennuksia
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Org Info Tab */}
          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Organisaation tiedot</CardTitle>
                <CardDescription>
                  Näytä organisaation perustiedot ja lisenssi-informaatio
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOrgInfo ? (
                  <div className="text-center py-8 text-muted-foreground">Ladataan...</div>
                ) : orgInfo ? (
                  <div className="space-y-6">
                    {/* Organization Name */}
                    <div>
                      <label className="text-sm font-medium text-foreground">
                        Organisaation nimi
                      </label>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {orgInfo.name}
                      </p>
                    </div>

                    {/* Subscription Tier */}
                    <div>
                      <label className="text-sm font-medium text-foreground">
                        Lisenssi
                      </label>
                      <div className="mt-1">
                        <Badge 
                          variant="outline" 
                          className="text-sm px-3 py-1"
                        >
                          {orgInfo.subscription_tier === 'professional' ? 'Professional' : 
                           orgInfo.subscription_tier === 'basic' ? 'Basic' : 
                           orgInfo.subscription_tier}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Lisenssin hallinta tapahtuu Jani Pertan kautta
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
                      <div>
                        <label className="text-sm font-medium text-foreground">
                          Käyttäjiä
                        </label>
                        <p className="mt-1 text-2xl font-semibold text-foreground">
                          {orgInfo.total_users}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground">
                          Aktiivisia rakennuksia
                        </label>
                        <p className="mt-1 text-2xl font-semibold text-foreground">
                          {orgInfo.total_buildings}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground">
                          Arkistoituja rakennuksia
                        </label>
                        <p className="mt-1 text-2xl font-semibold text-foreground">
                          {orgInfo.total_archived_buildings}
                        </p>
                      </div>
                    </div>

                    {/* Created Date */}
                    <div className="pt-4 border-t border-border">
                      <label className="text-sm font-medium text-foreground">
                        Luotu
                      </label>
                      <p className="mt-1 text-muted-foreground">
                        {new Date(orgInfo.created_at).toLocaleDateString('fi-FI', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Virhe tietojen lataamisessa
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Asetukset;
