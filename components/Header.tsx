import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, Settings, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { stackClientApp } from 'app/auth';
import { useSafeUser } from 'app/auth/use-safe-user';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSafeUser();
  const [isOpen, setIsOpen] = useState(false);
  
  const isLandingPage = location.pathname === '/';

  const handleAuthClick = () => {
    if (user) {
      navigate('/portfolio');
    } else if (stackClientApp) {
      window.location.href = stackClientApp.urls.signIn;
    } else {
      navigate('/auth/sign-in');
    }
  };

  const handleSignOut = async () => {
    if (stackClientApp) {
      await stackClientApp.signOut();
    }
  };

  const scrollToSection = (id: string) => {
    setIsOpen(false);
    if (!isLandingPage) {
      navigate('/');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 transition-all duration-300 supports-[backdrop-filter]:bg-slate-900/60">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div 
          className="flex items-center gap-2 cursor-pointer group" 
          onClick={() => navigate('/')}
        >
          <img 
            src="https://static.riff.new/public/fiery-pianissimo-accent-iwjq/finnvesta_logo.png" 
            alt="FinnVesta" 
            className="h-10 w-auto transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
          />
          <span className="text-xl font-bold tracking-tight text-white">FinnVesta</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {user ? (
            <nav className="flex gap-6">
              <button 
                onClick={() => navigate('/portfolio')}
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Etusivu
              </button>
              <button 
                onClick={() => navigate('/hallinta-käyttäjät')}
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Hallinta
              </button>
              <button 
                onClick={() => navigate('/asetukset')}
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Asetukset
              </button>
            </nav>
          ) : isLandingPage && (
            <nav className="flex gap-6">
              <button 
                onClick={() => scrollToSection('features')}
                className="text-sm font-medium text-slate-400 hover:text-amber-400 transition-colors"
              >
                Ominaisuudet
              </button>
              <button 
                onClick={() => scrollToSection('contact-form')}
                className="text-sm font-medium text-slate-400 hover:text-amber-400 transition-colors"
              >
                Ota yhteyttä
              </button>
            </nav>
          )}

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-2">
                <Button onClick={handleAuthClick} className="rounded-lg bg-amber-500 text-white hover:bg-amber-600 border-none font-semibold">
                  Avaa sovellus
                </Button>
                <Button variant="ghost" onClick={handleSignOut} className="text-slate-300 hover:text-white hover:bg-white/10" title="Kirjaudu ulos">
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <>
                <Button variant="ghost" onClick={handleAuthClick} className="text-slate-300 hover:text-white hover:bg-white/10">
                  Kirjaudu
                </Button>
                <button 
                  onClick={() => scrollToSection('contact-form')}
                  className="h-9 px-4 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-md shadow-amber-500/20 transition-all active:scale-[0.98]"
                >
                  Varaa demo
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-white/10">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-slate-900 border-l border-white/10 text-white">
              <div className="flex flex-col gap-6 mt-6">
                {user ? (
                  <>
                     <button 
                      onClick={() => { navigate('/portfolio'); setIsOpen(false); }}
                      className="text-lg font-medium text-left text-slate-300 hover:text-amber-400"
                    >
                      Etusivu
                    </button>
                    <button 
                      onClick={() => { navigate('/hallinta-käyttäjät'); setIsOpen(false); }}
                      className="text-lg font-medium text-left text-slate-300 hover:text-amber-400 flex items-center gap-2"
                    >
                      <Shield className="w-5 h-5" />
                      Hallinta
                    </button>
                    <button 
                      onClick={() => { navigate('/asetukset'); setIsOpen(false); }}
                      className="text-lg font-medium text-left text-slate-300 hover:text-amber-400 flex items-center gap-2"
                    >
                      <Settings className="w-5 h-5" />
                      Asetukset
                    </button>
                    <div className="h-px bg-white/10" />
                  </>
                ) : isLandingPage && (
                  <>
                    <button 
                      onClick={() => scrollToSection('features')}
                      className="text-lg font-medium text-left text-slate-300 hover:text-amber-400"
                    >
                      Ominaisuudet
                    </button>
                    <button 
                      onClick={() => scrollToSection('contact-form')}
                      className="text-lg font-medium text-left text-slate-300 hover:text-amber-400"
                    >
                      Ota yhteyttä
                    </button>
                  </>
                )}
                <div className="h-px bg-white/10" />
                {user ? (
                  <div className="flex flex-col gap-3">
                    <Button onClick={handleAuthClick} className="w-full bg-amber-500 hover:bg-amber-600 text-white border-none">
                      Avaa sovellus
                    </Button>
                    <Button variant="outline" onClick={handleSignOut} className="w-full border-white/10 hover:bg-white/10 text-white hover:text-white bg-transparent">
                      <LogOut className="h-4 w-4 mr-2" />
                      Kirjaudu ulos
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Button onClick={() => scrollToSection('contact-form')} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white border-none">
                      Varaa demo
                    </Button>
                    <Button variant="outline" onClick={handleAuthClick} className="w-full border-white/10 hover:bg-white/10 text-white hover:text-white bg-transparent">
                      Kirjaudu sisään
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
