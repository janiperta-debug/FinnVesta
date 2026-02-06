import { useNavigate } from "react-router-dom";
import { Building2, BarChart3, Calendar, Wrench, Settings, Shield, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@stackframe/react";
import { useState, useEffect } from "react";
import { apiClient } from "app";
import { Header } from "@/components/Header";

export default function Portfolio() {
  const navigate = useNavigate();
  const user = useUser();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    try {
      // Try to access admin endpoint - if it works, user is admin
      await apiClient.list_all_users();
      setIsAdmin(true);
    } catch {
      setIsAdmin(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-foreground mb-3">
              Tervetuloa FinnVesta-järjestelmään
            </h2>
            <p className="text-muted-foreground">
              Kiinteistöportfolion kunnonhallinta ja seuranta
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-border group" onClick={() => navigate('/PortfolioYhteenveto')}>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors flex items-center justify-center mb-3">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Portfolio-yhteenveto</CardTitle>
                <CardDescription>
                  Katsaus koko kiinteistöportfolioon, kuntopisteet ja korjausvelka
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="default">Avaa yhteenveto</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-border group" onClick={() => navigate('/Kuntoarviot')}>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors flex items-center justify-center mb-3">
                  <Activity className="w-6 h-6 text-blue-600 dark:text-blue-500" />
                </div>
                <CardTitle>Kuntoarviot</CardTitle>
                <CardDescription>
                  Kuntoluokkajakauma, kriittiset havainnot ja arviointitarpeet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="default">Tarkastele kuntoa</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-border group" onClick={() => navigate('/Rakennukset')}>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-secondary/10 group-hover:bg-secondary/20 transition-colors flex items-center justify-center mb-3">
                  <Building2 className="w-6 h-6 text-secondary-foreground/80 dark:text-secondary-foreground" />
                </div>
                <CardTitle>Rakennukset</CardTitle>
                <CardDescription>
                  Yksittäisten rakennusten tiedot ja kuntotarkastukset
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="default">Selaa rakennuksia</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-border group" onClick={() => navigate('/Huoltohistoria')}>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors flex items-center justify-center mb-3">
                  <Wrench className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
                </div>
                <CardTitle>Huoltohistoria</CardTitle>
                <CardDescription>
                  Huolto-, korjaus- ja peruskorjaustöiden hallinta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="default">Hallinnoi huoltotöitä</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-border group" onClick={() => navigate('/Investointisuunnitelma')}>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                </div>
                <CardTitle>Investointisuunnitelma</CardTitle>
                <CardDescription>
                  PTS 2040 - Pitkän aikavälin investointisuunnitelma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="default">Avaa suunnitelma</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
