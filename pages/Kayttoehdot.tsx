import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Kayttoehdot() {
  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="container mx-auto max-w-3xl">
        <Link to="/">
          <Button variant="ghost" className="mb-8 pl-0 hover:bg-transparent hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Takaisin etusivulle
          </Button>
        </Link>
        
        <article className="prose prose-slate dark:prose-invert max-w-none">
          <h1>Käyttöehdot</h1>
          <p className="text-muted-foreground">Päivitetty: {new Date().toLocaleDateString('fi-FI')}</p>

          <h2>1. Johdanto</h2>
          <p>
            Tervetuloa FinnVesta-palveluun. Nämä käyttöehdot ("Ehdot") säätelevät palvelun käyttöä. 
            Palveluntarjoaja on Jani Perta ("me", "meidän").
          </p>

          <h2>2. Ehtojen hyväksyminen</h2>
          <p>
            Käyttämällä FinnVesta-palvelua hyväksyt nämä ehdot ja sitoudut noudattamaan niitä. 
            Jos et hyväksy ehtoja, et voi käyttää palvelua.
          </p>

          <h2>3. Palvelun kuvaus</h2>
          <p>
            FinnVesta on kiinteistöjen kuntoseurantaan ja hallintaan tarkoitettu palvelu, joka auttaa kiinteistönomistajia 
            seuraamaan kuntoarvioita, huoltotoimenpiteitä ja investointisuunnitelmia.
          </p>

          <h2>4. Käyttäjätilit</h2>
          <p>
            Palvelun käyttö vaatii rekisteröitymisen. Olet vastuussa tilisi turvallisuudesta ja kaikesta tililläsi tapahtuvasta toiminnasta.
            Sitoudut antamaan oikeat ja ajantasaiset tiedot.
          </p>

          <h2>5. Vastuut ja velvollisuudet</h2>
          <p>
            Käyttäjä vastaa palveluun syöttämiensä tietojen oikeellisuudesta. 
            Emme vastaa tietojen häviämisestä tai virheellisistä tiedoista aiheutuvista välillisistä tai välittömistä vahingoista.
          </p>

          <h2>6. Palvelun saatavuus</h2>
          <p>
            Pyrimme pitämään palvelun saatavilla 24/7, mutta emme takaa keskeytyksetöntä toimintaa. 
            Pidätämme oikeuden huoltokatkoihin ja palvelun muutoksiin.
          </p>

          <h2>7. Immateriaalioikeudet</h2>
          <p>
            Kaikki palvelun oikeudet kuuluvat palveluntarjoajalle. Asiakas säilyttää oikeudet syöttämäänsä dataan.
          </p>

          <h2>8. Vastuunrajoitus</h2>
          <p>
            Palvelu tarjotaan "sellaisena kuin se on". Emme takaa palvelun soveltuvuutta tiettyyn käyttötarkoitukseen.
          </p>

          <h2>9. Sovellettava laki</h2>
          <p>
            Näihin ehtoihin sovelletaan Suomen lakia. Mahdolliset riidat ratkaistaan ensisijaisesti neuvottelemalla.
          </p>

          <h2>10. Yhteystiedot</h2>
          <p>
            Palveluun liittyvissä kysymyksissä voit ottaa yhteyttä:<br />
            <strong>Sähköposti:</strong> <a href="mailto:contact@finnvesta.fi">contact@finnvesta.fi</a><br />
            <strong>Osoite:</strong> POSTE RESTANTE, 01300 Vantaa
          </p>
        </article>
      </div>
    </div>
  );
}
