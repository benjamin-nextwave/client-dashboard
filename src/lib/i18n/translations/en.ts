import type { Translations } from './nl'

export const en: Translations = {
  locale: {
    nl: 'Dutch',
    en: 'English',
    hi: 'Hindi',
    chooseLanguage: 'Choose language',
  },

  nav: {
    overview: 'Overview',
    email: 'Email',
    leads: 'Leads',
    preview: 'Preview',
    dnc: 'DNC',
    contacts: 'Contacts',
    myCampaign: 'My campaign',
    contact: 'Contact',
    settings: 'Settings & help',
    groupCampaign: 'Campaign',
    groupSupport: 'Support',
    signOut: 'Sign out',
  },

  common: {
    close: 'Close',
    save: 'Save',
    saved: 'Saved',
    cancel: 'Cancel',
    delete: 'Delete',
    add: 'Add',
    loading: 'Loading...',
    error: 'Something went wrong',
    yes: 'Yes',
    no: 'No',
    back: 'Back',
    edit: 'Edit',
    view: 'View',
    refresh: 'Refresh',
  },

  campaign: {
    title: 'My campaign',
    introOnboardingDone:
      'Your onboarding is complete. All documents are available below.',
    introInProgress:
      'Follow the progress of your onboarding and approve where needed.',
    onboardingCompleteTitle: 'Onboarding complete',
    onboardingCompleteBody:
      'Thank you! All steps are done. Our team will handle the final preparations.',
  },

  flow: {
    sectionBadge: 'Campaign flow',
    sectionTitle: 'What does your campaign look like?',
    sectionIntro:
      'The complete path a lead goes through — click on a mail to view its content, or on an end node for how it is handled.',
    variantsCount: '{count} variants',
    clickToView: 'Click to view the email',
    clickToViewVariants: 'Click to view all variants',
    view: 'View',
    deadEnd: 'Dead-end',
    endOfCampaign: 'End of campaign',
    noResponse: 'No response',
    leadDroppedOff: 'Lead dropped off',
    positiveOutcome: 'Positive outcome',
    successDeadEndTag: 'Dead-end · Success',
    handledBy: 'Handled by: {role}',
    byYou: 'By you',
    byNextwave: 'By Nextwave',

    weergave: 'View',
    template: 'Template (with variables)',
    filledExample: 'Filled-in example',
    viewTemplate: 'Show template',
    viewFilledExample: 'Show filled-in example',
    subject: 'Subject',
    mailBody: 'Email body',
    noMailContent: 'No email content available.',

    dropoffIntro:
      'These are all the reasons a lead can drop out of the campaign at this point.',
    dropoffNoReasons: 'No specific drop-off reasons configured yet.',
    dropoffReasonCount: '{count} reasons',
    dropoffReasonCountSingular: '1 reason',
    dropoffOutroWithRole:
      'When a lead drops off for one of the reasons above, this branch of the campaign ends and the follow-up is taken care of by {role}.',
    dropoffOutroNoRole:
      'When a lead drops off for one of the reasons above, this branch of the campaign ends and no further action is needed.',

    successWhatHappens: 'What happens?',
    successWithRole:
      'The lead responded positively and is taken over from here by {role}. The campaign stops for this contact.',
    successNoRole:
      'The lead responded positively. The campaign stops for this contact and is handled further.',
  },
}
