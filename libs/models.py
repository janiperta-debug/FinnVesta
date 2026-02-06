"""Database models for Vesta Pro property management system."""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field


class Kiinteisto(BaseModel):
    """Property model (Kiinteistö)."""
    id: Optional[int] = None
    nimi: str = Field(description="Property name")
    tyyppi: str = Field(description="Property type: asuinrakennus, liikerakennus, toimistorakennus")
    osoite: str = Field(description="Street address")
    postinumero: Optional[str] = None
    kaupunki: str = Field(description="City")
    pinta_ala: Optional[Decimal] = Field(None, description="Floor area in m²")
    rakennusvuosi: Optional[int] = Field(None, description="Year built")
    status: str = Field(default="aktiivinen", description="Status: aktiivinen, myyty, purettu")
    
    # Financial fields
    markkina_arvo: Optional[Decimal] = Field(None, description="Market valuation")
    hankinta_pvm: Optional[date] = Field(None, description="Purchase date")
    hankinta_hinta: Optional[Decimal] = Field(None, description="Purchase price")
    velka: Optional[Decimal] = Field(None, description="Debt")
    vuokra_tulot: Optional[Decimal] = Field(None, description="Annual rental income")
    kayttokustannukset: Optional[Decimal] = Field(None, description="Annual operating costs")
    vakuutusarvo: Optional[Decimal] = Field(None, description="Insurance value")
    
    luotu: Optional[datetime] = None
    paivitetty: Optional[datetime] = None

    class Config:
        from_attributes = True


class Kuntotarkastus(BaseModel):
    """Condition assessment model (Kuntotarkastus)."""
    id: Optional[int] = None
    kiinteisto_id: int = Field(description="Property ID")
    tarkastus_pvm: date = Field(description="Assessment date")
    tarkastaja: Optional[str] = Field(None, description="Inspector name")
    
    # Component scores (1-5, where 5 = excellent, 1 = critical)
    perustukset: Optional[int] = Field(None, ge=1, le=5, description="Foundation condition")
    runko: Optional[int] = Field(None, ge=1, le=5, description="Structure condition")
    katto: Optional[int] = Field(None, ge=1, le=5, description="Roof condition")
    julkisivu: Optional[int] = Field(None, ge=1, le=5, description="Facade condition")
    ikkunat: Optional[int] = Field(None, ge=1, le=5, description="Windows condition")
    iv_jarjestelma: Optional[int] = Field(None, ge=1, le=5, description="HVAC system condition")
    sahkojarjestelma: Optional[int] = Field(None, ge=1, le=5, description="Electrical system condition")
    lvi_jarjestelma: Optional[int] = Field(None, ge=1, le=5, description="Plumbing system condition")
    sisatilat: Optional[int] = Field(None, ge=1, le=5, description="Interior condition")
    
    kokonaisarvio: Optional[int] = Field(None, ge=1, le=5, description="Overall assessment")
    huomautukset: Optional[str] = Field(None, description="Notes and remarks")
    
    luotu: Optional[datetime] = None
    paivitetty: Optional[datetime] = None

    class Config:
        from_attributes = True


class Huoltotyo(BaseModel):
    """Maintenance/repair task model (Huoltotyö)."""
    id: Optional[int] = None
    kiinteisto_id: int = Field(description="Property ID")
    kuntotarkastus_id: Optional[int] = Field(None, description="Related assessment ID")
    
    otsikko: str = Field(description="Task title")
    kuvaus: Optional[str] = Field(None, description="Task description")
    komponentti: Optional[str] = Field(None, description="Component: katto, iv_jarjestelma, julkisivu, etc.")
    
    prioriteetti: str = Field(default="normaali", description="Priority: kriittinen, kiireellinen, normaali, matala")
    status: str = Field(default="suunnitteilla", description="Status: suunnitteilla, kaynnissa, valmis, peruttu")
    
    arvioitu_kustannus: Optional[Decimal] = Field(None, description="Estimated cost")
    toteutunut_kustannus: Optional[Decimal] = Field(None, description="Actual cost")
    rahoituslahde: Optional[str] = Field(None, description="Funding source: oma, laina, avustus")
    
    suunniteltu_aloitus: Optional[date] = Field(None, description="Planned start date")
    suunniteltu_valmistuminen: Optional[date] = Field(None, description="Planned completion date")
    toteutunut_aloitus: Optional[date] = Field(None, description="Actual start date")
    toteutunut_valmistuminen: Optional[date] = Field(None, description="Actual completion date")
    
    luotu: Optional[datetime] = None
    paivitetty: Optional[datetime] = None

    class Config:
        from_attributes = True
