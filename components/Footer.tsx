import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="border-t border-white/5 bg-slate-900 text-slate-400 py-12 mt-auto">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <span className="text-lg font-bold text-white mb-2 block">FinnVesta</span>
            <p className="text-sm text-slate-500">© {new Date().getFullYear()} FinnVesta. Kaikki oikeudet pidätetään.</p>
          </div>
          <div className="flex gap-8 text-sm font-medium text-slate-400">
            <Link to="/tietosuoja" className="hover:text-amber-400 transition-colors">
              Tietosuoja
            </Link>
            <Link to="/kayttoehdot" className="hover:text-amber-400 transition-colors">
              Käyttöehdot
            </Link>
            <a href="mailto:contact@finnvesta.fi" className="hover:text-amber-400 transition-colors">
              Ota yhteyttä
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
