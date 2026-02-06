import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Check, BarChart3, Calendar, TrendingUp, Users, ArrowRight, ArrowLeft, Shield, Clock, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { apiClient } from 'app';
import { toast } from 'sonner';
  import { stackClientApp } from 'app/auth';
  import { useSafeUser } from 'app/auth/use-safe-user';
import { Header } from '@/components/Header';

export default function App() {
  const navigate = useNavigate();
  const user = useSafeUser();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    municipality: '',
    phone: '',
    message: '',
    preferred_date: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // PWA & Service Worker Registration
  useEffect(() => {
    const initPWA = async () => {
      // 1. Inject Manifest
      try {
        const apiBase = apiClient.baseUrl || ''; 
        // Normalize base URL to ensure clean paths
        const cleanBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
        
        const manifestUrl = `${cleanBase}/pwa/manifest.json`;
        const swUrl = `${cleanBase}/pwa/sw.js`;

        let link = document.querySelector("link[rel~='manifest']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'manifest';
          document.head.appendChild(link);
        }
        link.href = manifestUrl;

        // 2. Register Service Worker
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.register(swUrl, {
              scope: '/' 
            });
            console.log('SW registered:', registration);
          } catch (error) {
            console.error('SW registration failed:', error);
          }
        }
      } catch (e) {
        console.error("PWA Init Error", e);
      }
    };

    initPWA();

    // 3. Install Prompt
    const installHandler = (e: any) => {
      e.preventDefault();
      // Show toast after a small delay to not annoy immediately
      setTimeout(() => {
        toast("Käytä FinnVestaa sovelluksena", {
          description: "Asenna kotinäytölle nopeampaa käyttöä varten.",
          action: {
            label: "Asenna",
            onClick: () => {
              e.prompt();
              e.userChoice.then((choiceResult: any) => {
                if (choiceResult.outcome === 'accepted') {
                  console.log('User accepted the install prompt');
                }
              });
            }
          },
          duration: Infinity, // Keep until dismissed or clicked
          cancel: {
            label: "Ei nyt",
            onClick: () => {}
          }
        });
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', installHandler);
    return () => window.removeEventListener('beforeinstallprompt', installHandler);
  }, []);

  // Debug: Log Stack Auth URLs on mount
  useEffect(() => {
    // console.log('Stack Auth URLs:', stackClientApp.urls);
    // console.log('Current user:', user);
  }, [user]);

  const handleAuthClick = () => {
  if (user) {
  navigate('/portfolio');
  } else if (stackClientApp) {
  window.location.href = stackClientApp.urls.signIn;
  } else {
  navigate('/auth/sign-in');
  }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        preferred_date: formData.preferred_date || null
      };
      // @ts-ignore - API client types might lag behind backend updates
      const response = await apiClient.submit_contact_request(payload);
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        setFormData({ name: '', email: '', municipality: '', phone: '', message: '' });
      }
    } catch (error) {
      toast.error('Virhe lomakkeen lähetyksessä. Yritä uudelleen.');
      console.error('Contact form error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 selection:bg-amber-500/30">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-40 lg:pt-48 lg:pb-56 bg-slate-900">
        {/* Modern Mesh Gradient Background */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/20 rounded-full blur-[120px] -z-10 animate-pulse" />
        <div className="absolute top-[20%] right-[-5%] w-[30%] h-[50%] bg-teal-500/10 rounded-full blur-[100px] -z-10" />
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] -z-10" />
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10" />
        
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-1.5 text-sm font-medium text-amber-200/90 mb-8 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
              <span className="flex h-2 w-2 rounded-full bg-amber-400 mr-2 shadow-[0_0_10px_rgba(245,158,11,0.6)] animate-pulse"></span>
              Uuden ajan kiinteistöjohtaminen
            </div>
            
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.1] text-white drop-shadow-2xl">
              Kiinteistöomaisuuden hallinta <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-200 to-amber-100">ilman arvailua</span>
            </h1>
            
            <p className="text-xl text-slate-400 mb-12 leading-relaxed max-w-2xl mx-auto font-light px-2">
              Korvaa kalliit kertaluontoiset konsulttiraportit jatkuvalla, dataan perustuvalla tilannekuvalla. 
              FinnVesta on työkalu kunnille ja kiinteistönomistajille, jotka haluavat tehdä parempia päätöksiä.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center px-4">
              {/* Primary Action Button - Modern Gradient */}
              <button 
                className="group relative h-14 px-8 text-lg font-semibold text-white rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all duration-300 hover:scale-[1.02]"
                onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <span className="flex items-center gap-2 drop-shadow-sm">
                  Varaa esittely
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>

              <Button 
                size="lg" 
                variant="outline"
                className="h-14 px-8 text-lg rounded-xl border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all text-white hover:text-white hover:border-white/20"
                onClick={handleAuthClick}
              >
                {user ? 'Avaa sovellus' : 'Kirjaudu sisään'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Glass Cards */}
      <section id="features" className="py-24 relative overflow-hidden bg-slate-900">
        {/* Subtle Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px] -z-10" />

        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 tracking-tight">
              Kaikki tarvittava yhdessä alustassa
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              FinnVesta yhdistää teknisen kuntoseurannan, taloudellisen suunnittelun ja ylläpidon hallinnan saumattomaksi kokonaisuudeksi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Building2 className="w-6 h-6 text-amber-400" />}
              title="Rakennusportfolio"
              description="Hallitse kaikkia rakennuksia yhdessä näkymässä. Seuraa pinta-aloja, ikää ja teknisiä tietoja keskitetysti."
            />
            <FeatureCard 
              icon={<Shield className="w-6 h-6 text-teal-400" />}
              title="Jatkuva kuntoseuranta"
              description="9-komponenttinen tarkastusmenetelmä antaa reaaliaikaisen kuvan rakennusten kunnosta ilman raskaita raportteja."
            />
            <FeatureCard 
              icon={<Calendar className="w-6 h-6 text-orange-400" />}
              title="PTS-suunnittelu"
              description="Automatisoitu 15 vuoden investointisuunnitelma auttaa ennakoimaan korjausvelkaa ja tulevia kustannuksia."
            />
            <FeatureCard 
              icon={<Calculator className="w-6 h-6 text-indigo-400" />}
              title="Talous & Arvonmääritys"
              description="Seuraa markkina-arvoja, ylläpitokustannuksia ja tuottoa reaaliajassa. Tee päätöksiä lukujen perusteella."
            />
            <FeatureCard 
              icon={<Clock className="w-6 h-6 text-amber-400" />}
              title="Huoltohistoria"
              description="Dokumentoi kaikki toimenpiteet ja säilytä historia yhdessä paikassa. Ei enää kadonneita huoltokirjoja."
            />
            <FeatureCard 
              icon={<Users className="w-6 h-6 text-teal-400" />}
              title="Tiimityöskentely"
              description="Jaa näkymät isännöitsijöiden, huoltoyhtiöiden ja johdon kesken. Hallitse käyttöoikeuksia helposti."
            />
          </div>
        </div>
      </section>

      {/* Value Prop Section - Modern Dark Card */}
      <section className="py-24 relative overflow-hidden px-4 bg-slate-900 border-y border-white/5">
        <div className="container mx-auto sm:px-6">
          <div className="relative rounded-3xl overflow-hidden bg-slate-800/50 backdrop-blur-xl border border-white/10 shadow-2xl">
            {/* Gradient Glow */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-amber-500/10 to-transparent blur-[80px] -z-10" />
            
            <div className="relative grid md:grid-cols-2 gap-12 items-center p-8 sm:p-12 lg:p-20">
              <div className="relative z-10">
                <div className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm font-medium mb-6">
                  Miksi FinnVesta?
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-8 leading-tight text-white tracking-tight">
                  Älykkäämpää <br className="hidden sm:block"/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-orange-200">kiinteistöjohtamista</span>
                </h2>
                <div className="space-y-8">
                  <div className="flex gap-5">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Check className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2 text-white">Eroon Excel-viidakosta</h3>
                      <p className="text-slate-400 leading-relaxed">Keskitetty tietopankki korvaa hajanaiset tiedostot ja kansiot. Kaikki tieto yhdessä paikassa.</p>
                    </div>
                  </div>
                  <div className="flex gap-5">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Check className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2 text-white">Aina ajantasainen PTS</h3>
                      <p className="text-slate-400 leading-relaxed">Investointisuunnitelma päivittyy automaattisesti kuntotietojen muuttuessa.</p>
                    </div>
                  </div>
                </div>
                
                <button 
                  className="mt-12 h-12 px-8 rounded-lg bg-white text-slate-900 font-semibold hover:bg-slate-100 transition-colors flex items-center gap-2 shadow-lg"
                  onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Varaa ilmainen esittely
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Enhanced Visual Placeholder - Abstract UI */}
              <div className="relative h-[300px] sm:h-[400px] lg:h-[500px] w-full flex items-center justify-center hidden md:flex">
                <div className="relative w-full max-w-md perspective-[2000px]">
                  {/* Glass Card 1 */}
                  <div className="absolute top-0 right-0 w-80 h-64 bg-slate-900/60 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl p-6 transform rotate-y-[-10deg] translate-z-10 transition-transform hover:translate-z-20 hover:rotate-y-0 duration-500">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-3 h-3 rounded-full bg-red-400/80" />
                      <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                      <div className="w-3 h-3 rounded-full bg-green-400/80" />
                    </div>
                    <div className="space-y-3">
                      <div className="h-2 w-full bg-white/10 rounded-full" />
                      <div className="h-2 w-3/4 bg-white/10 rounded-full" />
                      <div className="h-2 w-1/2 bg-white/10 rounded-full" />
                    </div>
                    <div className="mt-8 grid grid-cols-2 gap-3">
                       <div className="h-20 bg-amber-500/10 rounded-lg border border-amber-500/10" />
                       <div className="h-20 bg-teal-500/10 rounded-lg border border-teal-500/10" />
                    </div>
                  </div>
                  
                  {/* Glass Card 2 */}
                  <div className="absolute top-20 left-0 w-80 h-72 bg-slate-800/80 backdrop-blur-xl rounded-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-6 transform rotate-y-[5deg] translate-z-20 transition-transform hover:translate-z-30 hover:rotate-y-0 duration-500">
                    <div className="flex justify-between items-center mb-6">
                       <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                         <BarChart3 className="w-4 h-4 text-amber-400" />
                       </div>
                       <div className="h-2 w-12 bg-white/20 rounded-full" />
                    </div>
                    <div className="flex items-end gap-2 h-32 mb-6">
                      <div className="w-full bg-amber-500/20 rounded-t-sm h-[40%]" />
                      <div className="w-full bg-amber-500/30 rounded-t-sm h-[70%]" />
                      <div className="w-full bg-amber-500/50 rounded-t-sm h-[50%]" />
                      <div className="w-full bg-amber-500/80 rounded-t-sm h-[85%]" />
                      <div className="w-full bg-amber-500 rounded-t-sm h-[60%]" />
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full mb-2" />
                    <div className="h-2 w-2/3 bg-white/10 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact-form" className="py-32 relative bg-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:20px_20px] -z-10" />
        <div className="container mx-auto px-6">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                Varaa esittely
              </h2>
              <p className="text-slate-400">
                Jätä yhteystietosi, niin olemme sinuun yhteydessä ja sovimme lyhyen etäesittelyn.
              </p>
            </div>

            <Card className="border-white/10 shadow-2xl bg-slate-800/50 backdrop-blur-md">
              <CardContent className="pt-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-200">Nimi *</Label>
                      <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Etunimi Sukunimi"
                        className="bg-slate-900/50 border-white/10 focus-visible:ring-amber-500 text-white placeholder:text-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-200">Sähköposti *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="etunimi.sukunimi@organisaatio.fi"
                        className="bg-slate-900/50 border-white/10 focus-visible:ring-amber-500 text-white placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="municipality" className="text-slate-200">Organisaatio</Label>
                      <Input
                        id="municipality"
                        value={formData.municipality}
                        onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
                        placeholder="Yritys tai kunta"
                        className="bg-slate-900/50 border-white/10 focus-visible:ring-amber-500 text-white placeholder:text-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-slate-200">Puhelinnumero</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+358 40 123 4567"
                        className="bg-slate-900/50 border-white/10 focus-visible:ring-amber-500 text-white placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferred_date" className="text-slate-200">Toivottu ajankohta (valinnainen)</Label>
                    <Input
                      id="preferred_date"
                      type="datetime-local"
                      value={formData.preferred_date}
                      onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                      className="bg-slate-900/50 border-white/10 focus-visible:ring-amber-500 text-white placeholder:text-slate-600 [color-scheme:dark]"
                    />
                    <p className="text-xs text-slate-500">Ehdota aikaa, joka sopii sinulle parhaiten.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-slate-200">Viesti (valinnainen)</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Kerro lyhyesti tarpeistasi..."
                      rows={4}
                      className="bg-slate-900/50 border-white/10 focus-visible:ring-amber-500 text-white placeholder:text-slate-600"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full h-12 text-lg font-semibold text-white rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Lähetetään...' : 'Lähetä esittelypyyntö'}
                  </button>
                  
                  <p className="text-xs text-center text-slate-500 mt-4">
                    Lähettämällä lomakkeen hyväksyt <Link to="/tietosuoja" className="underline hover:text-amber-400">tietosuosuojaselosteen</Link>.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-white/5 bg-slate-900">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6 text-white tracking-tight">Valmis tehostamaan kiinteistöjohtamista?</h2>
          <p className="text-xl mb-10 text-slate-400 opacity-80 max-w-2xl mx-auto">
            Varaa esittely tänään ja näe, miten FinnVesta säästää aikaa ja rahaa.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              className="h-12 px-8 rounded-lg bg-white text-slate-900 font-semibold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Varaa esittely
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group p-8 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md shadow-lg hover:shadow-amber-500/10 transition-all duration-300 hover:-translate-y-1 hover:border-white/10 hover:bg-white/[0.07]">
      <div className="w-14 h-14 rounded-xl bg-slate-800/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/5 shadow-inner">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{title}</h3>
      <p className="text-slate-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
