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
    proposalNewBadge: string
    proposalApprove: string
    proposalApproved: string
    proposalApprovedBody: string
    proposalSending: string
    proposalShowMore: string
    proposalShowLess: string
    variantsNewBadge: string
    variantsApprove: string
    variantsApproved: string
    variantsApprovedBody: string
    variantsViewButton: string
    archiveTitle: string
    archiveDescription: string
    archiveFormSubmissions: string
    archiveVariantsPdf: string
    archiveVariants: string
    archiveProposal: string
    archiveOpenSubmissions: string
    archiveDownloadPdf: string
    archiveOpenVariants: string
    archiveOpenProposal: string
    contactBlockTitle: string
    contactBlockDescription: string
    contactBlockButton: string
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
  overview: {
    title: string
    noDataTitle: string
    noDataDescription: string
    period: string
    range7d: string
    range30d: string
    range90d: string
    rangeAll: string
    rangeAllPeriod: string
    rangePeriodLast: string
    statEmailsSent: string
    statUniqueReplies: string
    statUniqueRepliesSubtitle: string
    statBounced: string
    refreshHint: string
    dailyOverview: string
    dailyNoData: string
    legendSent: string
    legendReplies: string
    refreshButton: string
    refreshing: string
    refreshDone: string
    refreshFailed: string
    connectionFailed: string
    refreshHintBelow: string
    icpTitle: string
    wcpTitle: string
    chartJobTitle: string
    chartLocation: string
    chartCompanySize: string
    comingSoon: string
    comingSoonDescription: string
  }
  inbox: {
    title: string
    empty: string
    emptyDescription: string
    search: string
    sortNewest: string
    sortOldest: string
    folderAll: string
    folderUnreplied: string
    folderReplied: string
    backToInbox: string
    sentBy: string
    receivedAt: string
    replyButton: string
    replyPlaceholder: string
    sendReply: string
    sendingReply: string
    replySent: string
    replyFailed: string
    inIframeNote: string
    safariBannerLabel: string
    safariBannerText: string
    embedTitle: string
    embedLoginPrompt: string
    embedPasswordWarning: string
    embedEmailField: string
    embedPasswordField: string
    embedLoginButton: string
    embedForgotPassword: string
    interest: string
    interestPositive: string
    interestNeutral: string
    interestNegative: string
    interestNotSet: string
    leadDetailsTitle: string
    noReplyYet: string
    repliedAlready: string
    threadShowMore: string
    passwordHelpTitle: string
    passwordHelpBody: string
    passwordHelpButton: string
    passwordHelpSent: string
    passwordHelpError: string
    folderInbox: string
    folderArchived: string
    folderArchivedEmpty: string
    folderNewPlaceholder: string
    folderNewTitle: string
    folderConfirm: string
    folderRename: string
    folderDelete: string
    folderDeleteConfirm: string
    statusFilterAll: string
    statusFilterActionRequired: string
    statusFilterInConversation: string
    searchPlaceholderFull: string
    refreshButton: string
    refreshButtonProgress: string
    refreshTitle: string
    composeNew: string
    resultsCount: string
    noResultsForSearch: string
    composeTitle: string
    composeRecipient: string
    composeSubject: string
    composeBody: string
    composeSend: string
    composeSending: string
    composeSelectLead: string
    archiveButton: string
    archived: string
    moveToFolder: string
    notesTitle: string
    notesPlaceholder: string
    notesEmpty: string
    saveNote: string
    leadName: string
    leadEmail: string
    leadCompany: string
    leadJobTitle: string
    leadOpenLinkedIn: string
    leadOpenVacancy: string
    threadLoading: string
    threadEmpty: string
    threadShowFullEmail: string
    threadHideFullEmail: string
    objectionFlowTitle: string
    objectionStartButton: string
    objectionFlowStep: string
    objectionConsentIntro: string
    objectionConsentItem1: string
    objectionConsentItem2: string
    objectionConsentItem3: string
    objectionContinueChat: string
    objectionPreviousStep: string
    objectionAiTyping: string
    objectionAiInitial: string
    objectionMinTurnsRemaining: string
    objectionContinueClassify: string
    objectionLabelPositive: string
    objectionLabelMaybeLater: string
    objectionLabelMisunderstanding: string
    objectionLabelOther: string
    objectionAcceptLabel: string
    objectionPropose: string
    objectionFinalSubmit: string
    objectionAlreadyPending: string
    objectionApprovedNote: string
    objectionRejectedNote: string
  }
  leads: {
    title: string
    description: string
    weeklyAddsBanner: string
    empty: string
    emptyDescription: string
    filterAll: string
    filterTotal: string
    weekHeader: string
    leadCount: string
    leadCountSingular: string
    sentSubject: string
    sentBody: string
    replySubject: string
    replyBody: string
    notes: string
    noNotes: string
    aiJustification: string
    aiJustificationButton: string
    aiJustificationLoading: string
    submitObjection: string
    objectionPending: string
    objectionApproved: string
    objectionRejected: string
    objectionStep1Title: string
    objectionStep2Title: string
    objectionStep3Title: string
    objectionPrivacyTitle: string
    objectionPrivacyText: string
    objectionPrivacyAck: string
    objectionContinue: string
    objectionStartChat: string
    objectionChatPlaceholder: string
    objectionChatMinTurns: string
    objectionToClassify: string
    objectionPickLabel: string
    objectionExplanationLabel: string
    objectionExplanationPlaceholder: string
    objectionSubmit: string
    objectionSubmitting: string
  }
  preview: {
    title: string
    description: string
    empty: string
    emptyDescription: string
    searchPlaceholder: string
    contactCount: string
    contactCountSingular: string
    excluded: string
    excludeButton: string
    excluding: string
    notificationContactRemoved: string
    feedbackTitle: string
    feedbackIntro: string
    ratingLabel: string
    ratingExcellent: string
    ratingGood: string
    ratingNeutral: string
    ratingMediocre: string
    ratingBad: string
    feedbackPlaceholder: string
    wantsNewListLabel: string
    jobTitleFeedbackLabel: string
    industryFeedbackLabel: string
    generalNotesLabel: string
    submitFeedback: string
    feedbackSubmitting: string
    feedbackSuccess: string
    feedbackSuccessNewList: string
  }
  contacts: {
    title: string
    description: string
    empty: string
    emptyDescription: string
    searchPlaceholder: string
    contactCount: string
    contactCountSingular: string
    columnName: string
    columnEmail: string
    columnCompany: string
    columnJobTitle: string
    columnIndustry: string
    columnStatus: string
    searchButton: string
    clearSearch: string
    foundCount: string
    foundCountSingular: string
    foundFor: string
    moreFields: string
    pagination: string
    paginationPrevious: string
    paginationNext: string
  }
  dnc: {
    title: string
    description: string
    addEmailTitle: string
    addEmailPlaceholder: string
    addEmailButton: string
    addEmailSuccess: string
    addEmailError: string
    addDomainTitle: string
    addDomainPlaceholder: string
    addDomainButton: string
    addDomainSuccess: string
    addDomainError: string
    csvUploadTitle: string
    csvUploadDescription: string
    csvChooseFile: string
    csvPickColumn: string
    csvConfirm: string
    csvCancel: string
    csvFoundEmails: string
    csvImport: string
    csvImporting: string
    csvSuccess: string
    csvError: string
    listTitle: string
    listEmpty: string
    typeEmail: string
    typeDomain: string
    removeButton: string
  }
  sent: {
    title: string
    description: string
    empty: string
    emptyDescription: string
    columnDate: string
    columnSubject: string
    columnRecipient: string
    columnStatus: string
    backToSent: string
    sentTo: string
    sentAt: string
  }
  feedback: {
    title: string
    description: string
    newRequestTitle: string
    categoryLabel: string
    categoryBug: string
    categoryFeature: string
    categoryOptimization: string
    categoryOther: string
    categoryCampaignPerformance: string
    categoryNewMailVariants: string
    titleLabel: string
    titlePlaceholder: string
    descriptionLabel: string
    descriptionPlaceholder: string
    submitButton: string
    submitting: string
    submitSuccess: string
    submitError: string
    yourRequests: string
    statusNew: string
    statusInProgress: string
    statusThinking: string
    statusDenied: string
    statusApplied: string
    operatorReply: string
    noRequestsYet: string
  }
  settings: {
    title: string
    description: string
    profileSection: string
    languageSection: string
    languageDescription: string
    helpSection: string
    helpDescription: string
    videoGeneral: string
    videoReply: string
    videoInbox: string
    accountTitle: string
    fieldName: string
    fieldEmail: string
    fieldOrganization: string
    notSet: string
    contactToChange: string
    notificationsTitle: string
    notificationsToggleTitle: string
    notificationsToggleDesc: string
    notificationEmailLabel: string
    notificationEmailHint: string
    aboutTitle: string
    aboutLine1: string
    aboutLine2: string
    aboutLine3: string
  }
  onboarding: {
    title: string
    welcome: string
    description: string
    nextButton: string
  }
  campaignSubPages: {
    formTitle: string
    formDescription: string
    formCannotResubmit: string
    formAlreadySubmitted: string
    repliesTitle: string
    repliesDescription: string
    backToCampaign: string
  }
  chat: {
    placeholder: string
    sendButton: string
    rateLimited: string
    error: string
    welcomeMessage: string
    minimize: string
    expand: string
  }
  operator: {
    nav: {
      news: string
    }
    news: {
      // Page chrome
      pageTitle: string
      pageDescription: string
      createButton: string
      backToList: string

      // List view
      listEmpty: string
      cardEditAction: string
      cardPublishAction: string
      cardWithdrawAction: string
      cardCreatedAt: string
      cardPublishedAt: string

      // Status badges
      statusDraft: string
      statusPublished: string
      statusWithdrawn: string

      // Form section labels
      sectionContent: string
      sectionContentDescription: string
      sectionImage: string
      sectionImageDescription: string
      tabNl: string
      tabEn: string
      tabHi: string
      fieldTitle: string
      fieldBody: string
      fieldImage: string
      fieldImageHint: string
      previewButton: string

      // Submit buttons
      saveDraft: string
      saving: string
      publishButton: string
      publishing: string
      withdrawButton: string
      withdrawing: string

      // Validation / status messages
      publishGate: string
      saveSuccess: string
      publishSuccess: string
      withdrawSuccess: string

      // Preview modal
      previewModalTitle: string
      previewModalLanguageLabel: string
      previewModalCloseButton: string
      previewNoImage: string
    }
  }
  client: {
    news: {
      dismissButton: string
      megaphoneAriaLabel: string
      sidebarTitle: string
      sidebarBackToList: string
      sidebarEmpty: string
      relativeTimeJustNow: string
      relativeTimeMinutes: string
      relativeTimeHours: string
      relativeTimeDays: string
      relativeTimeWeeks: string
    }
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
    proposalNewBadge: 'Nieuw voorstel',
    proposalApprove: 'Goedkeuren',
    proposalApproved: 'Bedankt voor de goedkeuring',
    proposalApprovedBody:
      'NextWave gaat de aanpassingen toepassen. Je krijgt via mail te horen wanneer je campagne weer live staat met de toegepaste aanpassingen.',
    proposalSending: 'Versturen...',
    proposalShowMore: 'Alles lezen',
    proposalShowLess: 'Minder tonen',
    variantsNewBadge: 'Nieuwe mailvarianten',
    variantsApprove: 'Goedkeuren',
    variantsApproved: 'Mailvarianten goedgekeurd',
    variantsApprovedBody:
      'Bedankt! De mailvarianten zijn goedgekeurd en worden meegenomen in je campagne.',
    variantsViewButton: 'Bekijk varianten',
    archiveTitle: 'Terug te vinden',
    archiveDescription: 'Hier vind je al je eerder ingediende of goedgekeurde documenten terug.',
    archiveFormSubmissions: 'Ingevulde formulieren',
    archiveVariantsPdf: 'Mailvarianten (PDF)',
    archiveVariants: 'Mailvarianten',
    archiveProposal: 'Campagne-voorstel',
    archiveOpenSubmissions: 'Bekijk antwoorden',
    archiveDownloadPdf: 'Download PDF',
    archiveOpenVariants: 'Bekijk varianten',
    archiveOpenProposal: 'Bekijk voorstel',
    contactBlockTitle: 'Contact & ondersteuning',
    contactBlockDescription:
      'Heb je een vraag of feedback? Neem contact op met het NextWave team.',
    contactBlockButton: 'Stel een vraag',
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

  overview: {
    title: 'Overzicht',
    noDataTitle: 'Nog geen data',
    noDataDescription:
      'Klik op "Ververs de data" om de nieuwste statistieken op te halen uit uw Instantly workspace.',
    period: 'Periode:',
    range7d: '7 dagen',
    range30d: '30 dagen',
    range90d: '90 dagen',
    rangeAll: 'Alles',
    rangeAllPeriod: 'Alle tijd',
    rangePeriodLast: 'Afgelopen {days} dagen',
    statEmailsSent: 'Verzonden e-mails',
    statUniqueReplies: 'Unieke reacties',
    statUniqueRepliesSubtitle: 'Excl. out-of-office en automatische antwoorden',
    statBounced: 'Bounced',
    refreshHint: 'Klik op "Ververs de data" om de nieuwste statistieken op te halen.',
    dailyOverview: 'Dagelijks overzicht',
    dailyNoData: 'Geen data beschikbaar voor deze periode',
    legendSent: 'Verzonden',
    legendReplies: 'Reacties',
    refreshButton: 'Ververs de data',
    refreshing: 'Data wordt ververst...',
    refreshDone: 'Data ververst!',
    refreshFailed: 'Verversen mislukt. Probeer het opnieuw.',
    connectionFailed: 'Verbinding mislukt. Probeer het opnieuw.',
    refreshHintBelow: 'Zonder te verversen wordt mogelijk gedateerde data getoond',
    icpTitle: 'Ideal Customer Profile (ICP)',
    wcpTitle: 'Worst Customer Profile (WCP)',
    chartJobTitle: 'Functietitel',
    chartLocation: 'Locatie',
    chartCompanySize: 'Bedrijfsgrootte',
    comingSoon: 'Coming soon',
    comingSoonDescription:
      'Momenteel is het Nextwave team hard aan het werk om deze statistieken te verwerken. Binnenkort beschikbaar!',
  },

  inbox: {
    title: 'Inbox',
    empty: 'Geen positieve reacties',
    emptyDescription: 'Zodra er een lead positief reageert verschijnt hij hier.',
    search: 'Zoeken...',
    sortNewest: 'Nieuwste eerst',
    sortOldest: 'Oudste eerst',
    folderAll: 'Alle',
    folderUnreplied: 'Onbeantwoord',
    folderReplied: 'Beantwoord',
    backToInbox: 'Terug naar inbox',
    sentBy: 'Van',
    receivedAt: 'Ontvangen op',
    replyButton: 'Beantwoorden',
    replyPlaceholder: 'Typ je antwoord...',
    sendReply: 'Verstuur antwoord',
    sendingReply: 'Verzenden...',
    replySent: 'Antwoord verzonden',
    replyFailed: 'Versturen mislukt. Probeer het opnieuw.',
    inIframeNote: 'Deze inbox draait via een externe provider en is daarom niet vertaalbaar.',
    safariBannerLabel: 'Let op:',
    safariBannerText:
      'De inbox wordt momenteel niet ondersteund in Safari. Gebruik Google Chrome (eventueel incognito) voor de beste ervaring.',
    embedTitle: 'E-mail Inbox',
    embedLoginPrompt: 'Log in om je inbox te bekijken',
    embedPasswordWarning:
      'Let op: de login van de inbox heeft niet hetzelfde wachtwoord als het dashboard.',
    embedEmailField: 'E-mailadres',
    embedPasswordField: 'Wachtwoord',
    embedLoginButton: 'Inloggen',
    embedForgotPassword: 'Wachtwoord vergeten / inloggen lukt niet',
    interest: 'Interesse',
    interestPositive: 'Positief',
    interestNeutral: 'Neutraal',
    interestNegative: 'Negatief',
    interestNotSet: 'Niet ingesteld',
    leadDetailsTitle: 'Lead-details',
    noReplyYet: 'Nog niet beantwoord',
    repliedAlready: 'Reeds beantwoord',
    threadShowMore: 'Toon meer berichten',
    passwordHelpTitle: 'Wachtwoord vergeten?',
    passwordHelpBody:
      'Klik hieronder en we sturen je een nieuwe inloglink per e-mail. Geen zorgen, je hoeft niets te onthouden.',
    passwordHelpButton: 'Stuur me een nieuwe link',
    passwordHelpSent: 'We hebben een e-mail naar {email} gestuurd met instructies.',
    passwordHelpError: 'Er ging iets mis. Probeer het later opnieuw.',
    folderInbox: 'Inbox',
    folderArchived: 'Afgehandeld',
    folderArchivedEmpty: 'Geen afgehandelde leads.',
    folderNewPlaceholder: 'Mapnaam...',
    folderNewTitle: 'Nieuw mapje',
    folderConfirm: 'OK',
    folderRename: 'Hernoemen',
    folderDelete: 'Verwijderen',
    folderDeleteConfirm:
      'Weet u zeker dat u dit mapje wilt verwijderen? Leads worden terug naar Inbox verplaatst.',
    statusFilterAll: 'Alles',
    statusFilterActionRequired: 'Actie vereist',
    statusFilterInConversation: 'In gesprek',
    searchPlaceholderFull: 'Zoek op naam, e-mail of bedrijf...',
    refreshButton: 'Verversen',
    refreshButtonProgress: 'Verversen...',
    refreshTitle: 'Mist u recente e-mails? Klik hier om te verversen.',
    composeNew: 'Nieuwe e-mail',
    resultsCount: '{shown} van {total} leads',
    noResultsForSearch: 'Geen leads gevonden voor deze zoekopdracht.',
    composeTitle: 'Nieuwe e-mail',
    composeRecipient: 'Aan',
    composeSubject: 'Onderwerp',
    composeBody: 'Bericht',
    composeSend: 'Verzenden',
    composeSending: 'Verzenden...',
    composeSelectLead: 'Kies een lead',
    archiveButton: 'Markeer als afgehandeld',
    archived: 'Afgehandeld',
    moveToFolder: 'Verplaats naar map',
    notesTitle: 'Notities',
    notesPlaceholder: 'Voeg een notitie toe...',
    notesEmpty: 'Nog geen notities.',
    saveNote: 'Opslaan',
    leadName: 'Naam',
    leadEmail: 'E-mail',
    leadCompany: 'Bedrijf',
    leadJobTitle: 'Functie',
    leadOpenLinkedIn: 'Open LinkedIn',
    leadOpenVacancy: 'Open vacature',
    threadLoading: 'Berichten laden...',
    threadEmpty: 'Geen berichten in deze thread.',
    threadShowFullEmail: 'Toon volledig bericht',
    threadHideFullEmail: 'Verberg volledig bericht',
    objectionFlowTitle: 'Bezwaar indienen',
    objectionStartButton: 'Bezwaar indienen',
    objectionFlowStep: 'Stap {current} van {total}',
    objectionConsentIntro:
      'Voordat je begint vragen we je toestemming voor de volgende verwerking:',
    objectionConsentItem1:
      'Je gesprek met de AI-coach wordt opgeslagen voor beoordeling.',
    objectionConsentItem2:
      'Onze operators kunnen het bezwaar samen met de chatlog inzien.',
    objectionConsentItem3: 'De gegevens worden alleen gebruikt voor de beoordeling.',
    objectionContinueChat: 'Doorgaan naar gesprek',
    objectionPreviousStep: 'Vorige stap',
    objectionAiTyping: 'AI denkt na...',
    objectionAiInitial:
      'Hoi! Ik help je om je bezwaar duidelijk te formuleren. Wat is er gebeurd?',
    objectionMinTurnsRemaining:
      'Nog {remaining} {label} nodig voor verder kunt.',
    objectionContinueClassify: 'Doorgaan naar categorisering',
    objectionLabelPositive: 'Positieve interesse na alles',
    objectionLabelMaybeLater: 'Mogelijk later interessant',
    objectionLabelMisunderstanding: 'Misverstand / verkeerd geclassificeerd',
    objectionLabelOther: 'Andere reden',
    objectionAcceptLabel: 'Accepteer label',
    objectionPropose: 'Stel ander label voor',
    objectionFinalSubmit: 'Bezwaar versturen',
    objectionAlreadyPending: 'Je bezwaar is in behandeling.',
    objectionApprovedNote: 'Je bezwaar is goedgekeurd.',
    objectionRejectedNote: 'Je bezwaar is afgewezen.',
  },

  leads: {
    title: 'Campagne leads',
    description:
      'Hieronder staan de leads die handmatig zijn toegevoegd vanuit de lopende campagnes.',
    weeklyAddsBanner: 'Nieuwe leads worden wekelijks toegevoegd.',
    empty: 'Nog geen leads',
    emptyDescription: 'Zodra er leads zijn toegevoegd verschijnen ze hier.',
    filterAll: 'Alle',
    filterTotal: 'Totaal',
    weekHeader: 'Week {week} · {year}',
    leadCount: '{count} leads',
    leadCountSingular: '1 lead',
    sentSubject: 'Verzonden onderwerp',
    sentBody: 'Verzonden bericht',
    replySubject: 'Reactie onderwerp',
    replyBody: 'Reactie',
    notes: 'Notities',
    noNotes: 'Geen notities',
    aiJustification: 'AI-onderbouwing',
    aiJustificationButton: 'Bekijk AI-onderbouwing',
    aiJustificationLoading: 'AI-onderbouwing wordt opgesteld...',
    submitObjection: 'Bezwaar indienen',
    objectionPending: 'Bezwaar in behandeling',
    objectionApproved: 'Bezwaar goedgekeurd',
    objectionRejected: 'Bezwaar afgewezen',
    objectionStep1Title: 'Privacy & toestemming',
    objectionStep2Title: 'AI-coach',
    objectionStep3Title: 'Categorisering',
    objectionPrivacyTitle: 'Voordat je begint',
    objectionPrivacyText:
      'Je gesprek met de AI-coach wordt opgeslagen en gedeeld met onze operators voor de beoordeling van je bezwaar.',
    objectionPrivacyAck: 'Ik ga akkoord met deze verwerking',
    objectionContinue: 'Doorgaan',
    objectionStartChat: 'Start gesprek',
    objectionChatPlaceholder: 'Beschrijf je bezwaar...',
    objectionChatMinTurns: 'Stuur minstens {n} berichten voordat je verder kunt.',
    objectionToClassify: 'Categoriseer dit bezwaar',
    objectionPickLabel: 'Welke categorie past het beste?',
    objectionExplanationLabel: 'Korte toelichting',
    objectionExplanationPlaceholder: 'Voeg een korte toelichting toe (min. 10 tekens)',
    objectionSubmit: 'Bezwaar indienen',
    objectionSubmitting: 'Versturen...',
  },

  preview: {
    title: 'Voorvertoning',
    description: 'Bekijk welke contacten in de komende 7 dagen worden benaderd.',
    empty: 'Geen voorvertoning beschikbaar',
    emptyDescription: 'Er staan geen contacten gepland voor de komende 7 dagen.',
    searchPlaceholder: 'Zoek op naam, e-mail, bedrijf...',
    contactCount: '{count} contacten',
    contactCountSingular: '1 contact',
    excluded: 'Uitgesloten',
    excludeButton: 'Uitsluiten',
    excluding: 'Uitsluiten...',
    notificationContactRemoved: 'Contact verwijderd uit de lijst.',
    feedbackTitle: 'Feedback geven',
    feedbackIntro: 'Beoordeel deze voorvertoning en geef ons feedback.',
    ratingLabel: 'Hoe beoordeel je deze lijst?',
    ratingExcellent: 'Uitstekend',
    ratingGood: 'Goed',
    ratingNeutral: 'Neutraal',
    ratingMediocre: 'Matig',
    ratingBad: 'Slecht',
    feedbackPlaceholder: 'Optionele toelichting...',
    wantsNewListLabel: 'Ik wil een volledig nieuwe lijst',
    jobTitleFeedbackLabel: 'Welke functietitels wil je wel/niet zien?',
    industryFeedbackLabel: 'Welke industrieën wil je wel/niet zien?',
    generalNotesLabel: 'Overige opmerkingen',
    submitFeedback: 'Feedback versturen',
    feedbackSubmitting: 'Versturen...',
    feedbackSuccess: 'Bedankt voor je feedback!',
    feedbackSuccessNewList:
      'Binnen 24 uur ontvang je een nieuwe lijst binnen het dashboard.',
  },

  contacts: {
    title: 'Contacten',
    description: 'Een overzicht van alle contacten in jouw campagnes.',
    empty: 'Nog geen contacten',
    emptyDescription: 'Contacten verschijnen hier zodra ze zijn toegevoegd aan een campagne.',
    searchPlaceholder: 'Zoek op naam, e-mail, bedrijf...',
    contactCount: '{count} contacten',
    contactCountSingular: '1 contact',
    columnName: 'Naam',
    columnEmail: 'E-mail',
    columnCompany: 'Bedrijf',
    columnJobTitle: 'Functietitel',
    columnIndustry: 'Industrie',
    columnStatus: 'Status',
    searchButton: 'Zoeken',
    clearSearch: 'Wissen',
    foundCount: '{count} contacten gevonden',
    foundCountSingular: '1 contact gevonden',
    foundFor: 'voor "{query}"',
    moreFields: '+{count} velden',
    pagination: 'Pagina {current} van {total}',
    paginationPrevious: 'Vorige',
    paginationNext: 'Volgende',
  },

  dnc: {
    title: 'Do Not Contact',
    description:
      'E-mailadressen en domeinen op deze lijst worden uitgesloten van toekomstige campagnes.',
    addEmailTitle: 'E-mailadres toevoegen',
    addEmailPlaceholder: 'naam@voorbeeld.nl',
    addEmailButton: 'Toevoegen',
    addEmailSuccess: 'E-mailadres toegevoegd.',
    addEmailError: 'Toevoegen mislukt.',
    addDomainTitle: 'Domein toevoegen',
    addDomainPlaceholder: 'voorbeeld.nl',
    addDomainButton: 'Toevoegen',
    addDomainSuccess: 'Domein toegevoegd.',
    addDomainError: 'Toevoegen mislukt.',
    csvUploadTitle: 'CSV bulk-import',
    csvUploadDescription:
      'Upload een CSV-bestand met een e-mailkolom om adressen in bulk toe te voegen.',
    csvChooseFile: 'Bestand kiezen',
    csvPickColumn: 'Selecteer de kolom met e-mailadressen',
    csvConfirm: 'Bevestigen',
    csvCancel: 'Annuleren',
    csvFoundEmails: '{count} e-mailadressen gevonden',
    csvImport: 'Importeren',
    csvImporting: 'Importeren...',
    csvSuccess: '{imported} van {total} adressen geïmporteerd.',
    csvError: 'Fout bij het lezen van het CSV-bestand.',
    listTitle: 'Geblokkeerde adressen',
    listEmpty: 'Geen geblokkeerde adressen',
    typeEmail: 'E-mail',
    typeDomain: 'Domein',
    removeButton: 'Verwijderen',
  },

  sent: {
    title: 'Verzonden e-mails',
    description: 'Een overzicht van alle verzonden e-mails per campagne.',
    empty: 'Geen verzonden e-mails',
    emptyDescription: 'Verzonden e-mails verschijnen hier zodra de campagne is gestart.',
    columnDate: 'Datum',
    columnSubject: 'Onderwerp',
    columnRecipient: 'Ontvanger',
    columnStatus: 'Status',
    backToSent: 'Terug naar verzonden',
    sentTo: 'Verzonden naar',
    sentAt: 'Verzonden op',
  },

  feedback: {
    title: 'Contact',
    description: 'Stel je vraag of geef feedback aan ons team.',
    newRequestTitle: 'Nieuw verzoek',
    categoryLabel: 'Categorie',
    categoryBug: 'Bug / fout',
    categoryFeature: 'Nieuwe functie',
    categoryOptimization: 'Verbetering',
    categoryOther: 'Anders',
    categoryCampaignPerformance: 'Campagne-prestatie',
    categoryNewMailVariants: 'Nieuwe mailvarianten',
    titleLabel: 'Titel',
    titlePlaceholder: 'Korte samenvatting...',
    descriptionLabel: 'Beschrijving',
    descriptionPlaceholder: 'Beschrijf zo duidelijk mogelijk...',
    submitButton: 'Verzenden',
    submitting: 'Verzenden...',
    submitSuccess: 'Bedankt! Je verzoek is ontvangen.',
    submitError: 'Versturen mislukt. Probeer het opnieuw.',
    yourRequests: 'Jouw eerdere verzoeken',
    statusNew: 'Nieuw',
    statusInProgress: 'In behandeling',
    statusThinking: 'Wordt overwogen',
    statusDenied: 'Afgewezen',
    statusApplied: 'Doorgevoerd',
    operatorReply: 'Antwoord van NextWave',
    noRequestsYet: 'Je hebt nog geen verzoeken ingediend.',
  },

  settings: {
    title: 'Instellingen & uitleg',
    description: 'Beheer je voorkeuren en bekijk uitleg over het dashboard.',
    profileSection: 'Profiel',
    languageSection: 'Taal',
    languageDescription:
      'Kies de taal van het dashboard. Deze keuze wordt onthouden voor de volgende keer dat je inlogt.',
    helpSection: 'Uitleg & ondersteuning',
    helpDescription: 'Bekijk de uitleg per onderdeel of neem contact op met het team.',
    videoGeneral: 'Algemene dashboard uitleg',
    videoReply: 'Reageren op mails',
    videoInbox: 'Inloggen in de inbox',
    accountTitle: 'Account',
    fieldName: 'Naam',
    fieldEmail: 'E-mailadres',
    fieldOrganization: 'Organisatie',
    notSet: 'Niet ingesteld',
    contactToChange: 'Neem contact op met je accountmanager om accountgegevens te wijzigen.',
    notificationsTitle: 'Meldingen',
    notificationsToggleTitle: 'Notificaties bij nieuwe leads',
    notificationsToggleDesc: 'Ontvang een melding wanneer een nieuwe positieve lead binnenkomt',
    notificationEmailLabel: 'Notificatie e-mailadres',
    notificationEmailHint: 'Laat leeg om meldingen naar je login e-mailadres te sturen.',
    aboutTitle: 'Over dit dashboard',
    aboutLine1: 'Dit dashboard wordt beheerd door NextWave Solutions.',
    aboutLine2:
      'Campagnegegevens worden automatisch gesynchroniseerd vanuit je actieve campagnes. De data wordt elke 15 minuten bijgewerkt.',
    aboutLine3: 'Heb je vragen? Neem contact op met je accountmanager.',
  },

  onboarding: {
    title: 'Welkom',
    welcome: 'Welkom op je nieuwe dashboard',
    description:
      'Hieronder volgt een korte uitleg om je op weg te helpen. Klik op "Doorgaan" om te beginnen.',
    nextButton: 'Doorgaan',
  },

  campaignSubPages: {
    formTitle: 'Campagne-vragenlijst',
    formDescription: 'Vul deze vragenlijst in zodat wij je campagne kunnen opzetten.',
    formCannotResubmit:
      'Je hebt het formulier al ingediend. Neem contact op als je iets wilt aanpassen.',
    formAlreadySubmitted: 'Formulier reeds ingediend',
    repliesTitle: 'Mijn antwoorden',
    repliesDescription: 'Een overzicht van de antwoorden die je hebt ingediend.',
    backToCampaign: 'Terug naar mijn campagne',
  },

  chat: {
    placeholder: 'Stel een vraag over je campagne...',
    sendButton: 'Verstuur',
    rateLimited: 'Te veel berichten. Probeer het over een minuut opnieuw.',
    error: 'Er ging iets mis. Probeer het opnieuw.',
    welcomeMessage: 'Hoi! Ik help je graag met vragen over je dashboard. Stel maar!',
    minimize: 'Minimaliseren',
    expand: 'Open chat',
  },

  operator: {
    nav: {
      news: 'Nieuws',
    },
    news: {
      pageTitle: 'Nieuwsberichten',
      pageDescription: 'Beheer aankondigingen die in alle klantdashboards verschijnen.',
      createButton: 'Nieuw nieuwsbericht',
      backToList: 'Terug naar overzicht',

      listEmpty: 'Nog geen nieuwsberichten. Klik op "Nieuw nieuwsbericht" om er één aan te maken.',
      cardEditAction: 'Bewerken',
      cardPublishAction: 'Publiceren',
      cardWithdrawAction: 'Intrekken',
      cardCreatedAt: 'Aangemaakt',
      cardPublishedAt: 'Gepubliceerd',

      statusDraft: 'Concept',
      statusPublished: 'Gepubliceerd',
      statusWithdrawn: 'Ingetrokken',

      sectionContent: 'Inhoud',
      sectionContentDescription: 'Vul titel en tekst in voor alle drie de talen voordat je publiceert.',
      sectionImage: 'Afbeelding',
      sectionImageDescription: 'Optioneel — wordt boven titel en tekst getoond. Max 2 MB, PNG/JPEG/WebP.',
      tabNl: 'Nederlands',
      tabEn: 'Engels',
      tabHi: 'Hindi',
      fieldTitle: 'Titel',
      fieldBody: 'Tekst',
      fieldImage: 'Afbeelding kiezen',
      fieldImageHint: 'PNG, JPEG of WebP — max 2 MB',
      previewButton: 'Voorvertoning',

      saveDraft: 'Concept opslaan',
      saving: 'Opslaan...',
      publishButton: 'Publiceren',
      publishing: 'Publiceren...',
      withdrawButton: 'Intrekken',
      withdrawing: 'Intrekken...',

      publishGate: 'Publiceren is pas mogelijk als alle drie de taalvarianten (NL, EN, Hindi) een titel en tekst hebben.',
      saveSuccess: 'Concept opgeslagen.',
      publishSuccess: 'Nieuwsbericht gepubliceerd.',
      withdrawSuccess: 'Nieuwsbericht ingetrokken.',

      previewModalTitle: 'Voorvertoning',
      previewModalLanguageLabel: 'Taal',
      previewModalCloseButton: 'Sluiten',
      previewNoImage: 'Geen afbeelding',
    },
  },
  client: {
    news: {
      dismissButton: 'Ik heb het gelezen',
      megaphoneAriaLabel: 'Open nieuwsoverzicht',
      sidebarTitle: 'Nieuws',
      sidebarBackToList: 'Terug naar overzicht',
      sidebarEmpty: 'Geen nieuwsberichten.',
      relativeTimeJustNow: 'zojuist',
      relativeTimeMinutes: '{count} min geleden',
      relativeTimeHours: '{count} uur geleden',
      relativeTimeDays: '{count} dagen geleden',
      relativeTimeWeeks: '{count} weken geleden',
    },
  },
}
