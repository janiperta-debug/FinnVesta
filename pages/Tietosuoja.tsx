import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Tietosuoja() {
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
          <h1>Tietosuojaseloste</h1>
          <p className="text-muted-foreground">Päivitetty: {new Date().toLocaleDateString('fi-FI')}</p>

          <p>
            Olemme sitoutuneet suojaamaan yksityisyyttäsi ja varmistamaan GDPR:n noudattamisen. 
            Tämä seloste selittää, miten keräämme, käytämme ja suojaamme henkilötietojasi.
          </p>

          <h2>Rekisterinpitäjä</h2>
          <p>
            <strong>Nimi:</strong> Jani Perta / FinnVesta<br />
            <strong>Osoite:</strong> POSTE RESTANTE, 01300 Vantaa<br />
            <strong>Sähköposti:</strong> <a href="mailto:contact@finnvesta.fi">contact@finnvesta.fi</a>
          </p>

          <h2>1. Kerättävät tiedot</h2>
          <h3>Käyttäjätiedot:</h3>
          <ul>
            <li>Sähköpostiosoite (kirjautumista varten)</li>
            <li>Nimi ja profiilitiedot (jos annettu)</li>
            <li>Organisaatiotiedot</li>
          </ul>

          <h3>Kiinteistötiedot ja arvioinnit:</h3>
          <ul>
            <li>Kiinteistöjen perustiedot (osoite, rakennusvuosi, jne.)</li>
            <li>Kuntoarvioinnit ja tekniset tiedot</li>
            <li>PTS-suunnitelmat ja taloustiedot</li>
          </ul>

          <h2>2. Tietojen käyttötarkoitus</h2>
          <p>Käytämme henkilötietojasi vain seuraaviin tarkoituksiin:</p>
          <ul>
            <li>Palvelun tuottaminen ja ylläpito</li>
            <li>Kiinteistöjen hallinnan ja seurannan mahdollistaminen</li>
            <li>Käyttäjätuki ja viestintä</li>
            <li>Palvelun kehittäminen</li>
          </ul>

          <h2>3. Oikeusperusteet (GDPR)</h2>
          <p>Käsittelemme tietoja seuraavilla perusteilla:</p>
          <ul>
            <li><strong>Sopimus:</strong> Palvelun tarjoaminen ja käyttöehtojen noudattaminen.</li>
            <li><strong>Suostumus:</strong> Evästeet ja vapaaehtoiset tiedot.</li>
            <li><strong>Oikeutettu etu:</strong> Palvelun turvallisuus ja kehitys.</li>
          </ul>

          <h2>4. Tietojen jakaminen ja kolmannet osapuolet</h2>
          <p>Emme myy tietojasi. Käytämme seuraavia palveluntarjoajia tietojen käsittelyssä:</p>
          
          <h3>Stack Auth (Kirjautuminen)</h3>
          <p>Käytämme Stack Auth -palvelua käyttäjätunnistukseen ja tilien hallintaan.</p>

          <h3>Databutton (Hosting ja tietokanta)</h3>
          <p>Palvelumme ja tietokantamme sijaitsevat Databuttonin hallinnoimassa infrastruktuurissa (Neon Postgres, Google Cloud).</p>

          <h2>5. Sinun oikeutesi</h2>
          <p>Sinulla on oikeus:</p>
          <ul>
            <li>Pyytää kopio tiedoistasi</li>
            <li>Pyytää tietojen korjaamista tai poistamista</li>
            <li>Peruuttaa suostumuksesi</li>
          </ul>
          <p>
            Voit käyttää oikeuksiasi ottamalla yhteyttä: <a href="mailto:contact@finnvesta.fi">contact@finnvesta.fi</a>.
          </p>

          <h2>6. Tietoturva</h2>
          <p>
            Suojaamme tietosi asianmukaisilla teknisillä ja organisatorisilla toimenpiteillä, kuten salauksella ja turvallisilla yhteyksillä.
          </p>

          <h2>7. Evästeet</h2>
          <p>
            Käytämme evästeitä parantaaksemme käyttökokemusta ja analysoidaksemme palvelun käyttöä. 
            Välttämättömät evästeet ovat tarpeen palvelun toiminnalle (esim. kirjautuminen).
          </p>

          <h2>8. Yhteystiedot</h2>
          <p>
            Jos sinulla on kysyttävää tietosuojasta, ota yhteyttä:<br />
            <strong>Sähköposti:</strong> <a href="mailto:contact@finnvesta.fi">contact@finnvesta.fi</a>
          </p>
        </article>
      </div>
    </div>
  );
}
