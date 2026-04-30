# CSV Analyse Prompt

Analyseer het bijgevoegde CSV-bestand volledig — verwerk **alle rijen**, ook als het er 2000+ zijn.

---

## Stap 1 – Aantal rijen

Geef eerst het **totaal aantal rijen** (exclusief de headerrij) weer.

---

## Stap 2 – Analyse per kolom

Voer de analyse uit voor de volgende drie kolommen: **Job Title**, **Industry** en **Location**.

Geef voor elke kolom een genummerde lijst met percentages, gesorteerd van hoogste naar laagste.

### Regel voor "Overig"
Als de staart van de verdeling (de kleinste groepen samen) **minder dan 10%** van het totaal uitmaakt, groepeer deze dan onder **"Overig (x%)"**.

---

## Stap 3 – Normalisatieregels

### Job Title
Groepeer functietitels onder de dichtstbijzijnde standaardcategorie hieronder. Gebruik taalkundige gelijkenis (ook Engelstalige varianten).

| Standaardcategorie | Voorbeelden van varianten |
|--------------------|--------------------------|
| CEO | Chief Executive Officer, CEO, C.E.O. |
| Eigenaar | Owner, Eigenaar, Bedrijfseigenaar |
| Mede-eigenaar | Co-owner, Mede eigenaar |
| Oprichter | Founder, Oprichter |
| Mede-oprichter | Co-founder, Mede oprichter, Medeoprichter |
| DGA | Directeur-grootaandeelhouder, DGA |
| Directeur | Director, Directeur, Managing Director, MD |
| Algemeen manager | General Manager, GM, Algemeen Manager |
| Partner | Partner, Vennoot |
| HR Manager | HR Manager, Human Resources Manager, P&O Manager |
| Manager | Manager, Teamleider, Team Lead, Afdelingsmanager |

Als een functietitel nergens onder past, ga dan als volgt te werk:

1. **Groepeer alle niet-passende titels** die inhoudelijk sterk op elkaar lijken (bijv. "Recruiter", "Talent Acquisition Specialist", "Headhunter").
2. Als zo'n groep **10% of meer** van het totaal uitmaakt → **verzin een passende, alomvattende Nederlandse functiecategorie** voor deze groep (bijv. "Recruiter & Talent Acquisition") en neem deze op in de lijst.
3. Als zo'n groep **minder dan 10%** uitmaakt → categoriseer als **"Overig"**.

### Industry
Groepeer bedrijfstakken met kleine naamverschillen of synoniemen samen onder één noemer.  
Voorbeelden: "IT", "ICT", "Tech", "Technologie" → één groep; "Bouw", "Bouwsector", "Construction" → één groep.  
Gebruik de meest voorkomende of meest logische Nederlandse naam als groepsnaam.

### Location
Normaliseer spellingsvarianten en afkortingen naar de volledige plaatsnaam of regio.  
Groepeer niet inhoudelijk — toon de werkelijke verdeling van locaties.

---

## Verwacht outputformaat

**Totaal aantal rijen: X**

---

### Job Title
1. CEO (34%)
2. Oprichter (18%)
3. Eigenaar (15%)
4. ...
5. Overig (8%)

---

### Industry
1. Technologie (22%)
2. Bouw (18%)
3. ...
4. Overig (6%)

---

### Location
1. Amsterdam (25%)
2. Rotterdam (18%)
3. ...
4. Overig (9%)
