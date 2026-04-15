# Instructie: Doelgroepdata Extractor

Hieronder plak ik een ingevuld klantformulier van een mailcampagne klant. Extraheer uitsluitend de relevante scraping-data en presenteer deze in het onderstaande format.

**Negeer volledig:** aanbod, CTA, tone of voice, risk reversal, opmerkingen, voorbeelden, contactgegevens en alle overige informatie.

## Wat te extraheren

1. **Functietitels** – direct vermeld óf logisch afleidbaar uit de genoemde niche/sector
2. **Sectoren** – alle genoemde branches en niches
3. **Bedrijfsgrootte** – het opgegeven medewerkersaantal of bereik
4. **Locatie** – alle locaties inclusief radius indien vermeld
5. **Uitsluitingen** – eigenschappen die expliciet vermeden moeten worden *(laat leeg als niet vermeld)*
6. **Overige eisen/wensen** – specifieke doelgroepwensen die buiten de standaardcategorieën vallen (bijv. minimale omzet, groeifase, technologiegebruik, certificeringen, etc.) *(laat leeg als niet vermeld)*

## Output format

```
Klant: [bedrijfsnaam]

Functietitels:
- [titel 1]
- [titel 2]

Sectoren:
- [sector 1]
- [sector 2]

Bedrijfsgrootte: [x-y medewerkers]

Locatie:
- [stad] (+[radius])

Uitsluitingen:
- [uitsluiting 1]

Overige eisen/wensen:
- [eis/wens 1]
```

## Regels

- Voeg **geen** interpretaties, aanbevelingen of extra uitleg toe
- Alleen de gevraagde velden, niets meer
- Als een veld ontbreekt in het formulier, schrijf dan: `- niet vermeld`
- Functietitels mogen afgeleid worden als de sector duidelijk is (bijv. "Accountancy" → DGA, Directeur, Financieel Manager)

---

## Formulier

*[PLAK HIER HET INGEVULDE FORMULIER]*
