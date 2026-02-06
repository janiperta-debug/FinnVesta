import type { ReactNode } from "react";
import CookieConsent from "react-cookie-consent";
import { Footer } from "./Footer";

interface Props {
  children: ReactNode;
}

/**
 * A provider wrapping the whole app.
 *
 * You can add multiple providers here by nesting them,
 * and they will all be applied to the app.
 */
export const AppProvider = ({ children }: Props) => {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-grow">
        {children}
      </div>
      <Footer />
      <CookieConsent
        location="bottom"
        buttonText="Hyväksyn"
        cookieName="finnvesta_cookie_consent"
        style={{ background: "#2B373B" }}
        buttonStyle={{ color: "#4e503b", fontSize: "13px" }}
        expires={150}
      >
        Tämä sivusto käyttää evästeitä käyttökokemuksen parantamiseksi.{" "}
        <a href="/tietosuoja" style={{ color: "white", textDecoration: "underline" }}>
          Lue lisää tietosuojaselosteesta.
        </a>
      </CookieConsent>
    </div>
  );
};
