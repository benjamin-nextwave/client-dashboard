// Nederlandse dictionary — de bron-taal. Andere talen moeten exact dezelfde
// keys hebben (anders crasht TypeScript). Voeg nieuwe strings hier eerst toe.

export interface Translations {
  locale: { nl: string; en: string; hi: string; chooseLanguage: string }
  nav: {
    overview: string
    email: string
    leads: string
    preview: string
    dnc: string
    contacts: string
    myCampaign: string
    contact: string
    settings: string
    groupCampaign: string
    groupSupport: string
    signOut: string
  }
  common: {
    close: string
    save: string
    saved: string
    cancel: string
    delete: string
    add: string
    loading: string
    error: string
    yes: string
    no: string
    back: string
    edit: string
    view: string
    refresh: string
  }
  campaign: {
    title: string
    introOnboardingDone: string
    introInProgress: string
    onboardingCompleteTitle: string
    onboardingCompleteBody: string
  }
  flow: {
    sectionBadge: string
    sectionTitle: string
    sectionIntro: string
    variantsCount: string
    clickToView: string
    clickToViewVariants: string
    view: string
    deadEnd: string
    endOfCampaign: string
    noResponse: string
    leadDroppedOff: string
    positiveOutcome: string
    successDeadEndTag: string
    handledBy: string
    byYou: string
    byNextwave: string
    weergave: string
    template: string
    filledExample: string
    viewTemplate: string
    viewFilledExample: string
    subject: string
    mailBody: string
    noMailContent: string
    dropoffIntro: string
    dropoffNoReasons: string
    dropoffReasonCount: string
    dropoffReasonCountSingular: string
    dropoffOutroWithRole: string
    dropoffOutroNoRole: string
    successWhatHappens: string
    successWithRole: string
    successNoRole: string
  }
}

export const nl: Translations = {
  locale: {
    nl: 'Nederlands',
    en: 'Engels',
    hi: 'Hindi',
    chooseLanguage: 'Kies taal',
  },

  nav: {
    overview: 'Overzicht',
    email: 'E-mail',
    leads: 'Leads',
    preview: 'Voorvertoning',
    dnc: 'DNC',
    contacts: 'Contacten',
    myCampaign: 'Mijn campagne',
    contact: 'Contact',
    settings: 'Instellingen & uitleg',
    groupCampaign: 'Campagne',
    groupSupport: 'Ondersteuning',
    signOut: 'Uitloggen',
  },

  common: {
    close: 'Sluiten',
    save: 'Opslaan',
    saved: 'Opgeslagen',
    cancel: 'Annuleer',
    delete: 'Verwijderen',
    add: 'Toevoegen',
    loading: 'Laden...',
    error: 'Er ging iets mis',
    yes: 'Ja',
    no: 'Nee',
    back: 'Terug',
    edit: 'Bewerken',
    view: 'Bekijken',
    refresh: 'Vernieuwen',
  },

  campaign: {
    title: 'Mijn campagne',
    introOnboardingDone: 'Je onboarding is afgerond. Alle documenten vind je hieronder terug.',
    introInProgress: 'Volg de voortgang van je onboarding en geef waar nodig goedkeuring.',
    onboardingCompleteTitle: 'Onboarding voltooid',
    onboardingCompleteBody:
      'Bedankt! Alle stappen zijn afgerond. Ons team gaat verder met de laatste voorbereidingen.',
  },

  flow: {
    sectionBadge: 'Campagne-flow',
    sectionTitle: 'Hoe ziet jouw campagne eruit?',
    sectionIntro:
      'Het complete pad dat een lead doorloopt — klik op een mail om de inhoud te bekijken, of op een eindknooppunt voor de afhandeling.',
    variantsCount: '{count} varianten',
    clickToView: 'Klik om de mail te bekijken',
    clickToViewVariants: 'Klik om alle varianten te bekijken',
    view: 'Bekijk',
    deadEnd: 'Dead-end',
    endOfCampaign: 'Einde campagne',
    noResponse: 'Geen reactie',
    leadDroppedOff: 'Lead is afgehaakt',
    positiveOutcome: 'Positief afgehandeld',
    successDeadEndTag: 'Dead-end · Succes',
    handledBy: 'Afhandeling: {role}',
    byYou: 'Door jou',
    byNextwave: 'Door Nextwave',

    // step modal
    weergave: 'Weergave',
    template: 'Template (met variabelen)',
    filledExample: 'Ingevuld voorbeeld',
    viewTemplate: 'Bekijk template',
    viewFilledExample: 'Bekijk ingevuld voorbeeld',
    subject: 'Onderwerp',
    mailBody: 'Mail body',
    noMailContent: 'Geen mail-inhoud beschikbaar.',

    // dropoff modal
    dropoffIntro:
      'Dit zijn alle redenen waardoor een lead op dit punt uit de campagne kan vallen.',
    dropoffNoReasons: 'Er zijn nog geen specifieke afhaak-redenen ingesteld.',
    dropoffReasonCount: '{count} redenen',
    dropoffReasonCountSingular: '1 reden',
    dropoffOutroWithRole:
      'Wanneer een lead via één van bovenstaande redenen afhaakt, eindigt deze tak van de campagne en wordt de afhandeling opgepakt door {role}.',
    dropoffOutroNoRole:
      'Wanneer een lead via één van bovenstaande redenen afhaakt, eindigt deze tak van de campagne en volgt geen verdere actie meer.',

    // success modal
    successWhatHappens: 'Wat gebeurt er?',
    successWithRole:
      'De lead heeft positief gereageerd en wordt vanaf hier opgepakt door {role}. De campagne stopt voor deze contactpersoon.',
    successNoRole:
      'De lead heeft positief gereageerd. De campagne stopt voor deze contactpersoon en wordt verder afgehandeld.',
  },
}
