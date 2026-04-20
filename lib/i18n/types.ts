export interface Translations {
  lang:    string   // display name
  dir:     'ltr' | 'rtl'

  nav: {
    brand:       string
    subtitle:    string
    assessment:  string
    analysis:    string
    outputs:     string
    dashboard:   string
    profile:     string
    core:        string
    targets:     string
    gaps:        string
    priority:    string
    cdp:         string
    report:      string
    exportData:  string
    signIn:      string
    signOut:     string
    institution: string
    addInst:     string
    copyright:   string
  }

  auth: {
    signIn:           string
    createAccount:    string
    resetPassword:    string
    signInDesc:       string
    registerDesc:     string
    resetDesc:        string
    fullName:         string
    email:            string
    password:         string
    minChars:         string
    iWillBe:          string
    adminNote:        string
    noAccount:        string
    alreadyAccount:   string
    forgotPassword:   string
    backToSignIn:     string
    signInBtn:        string
    createBtn:        string
    sendResetBtn:     string
    resetSuccess:     string
    confirmEmail:     string
    resetSent:        string
    errInvalidCreds:  string
    errAlreadyExists: string
    errNotConfirmed:  string
    errDbError:       string
    errWeakPassword:  string
    setNewPassword:   string
    newPassword:      string
    confirmPassword:  string
    updatePassword:   string
    passwordMismatch: string
    roles: {
      contributor:       string
      contributorDesc:   string
      institutionLead:   string
      institutionLeadDesc: string
      viewer:            string
      viewerDesc:        string
    }
  }

  topbar: {
    notSignedIn:  string
    localOnly:    string
    save:         string
    saving:       string
    noInstitution:string
    saved:        string
  }

  common: {
    back:         string
    saveAndContinue: string
    viewReport:   string
    loading:      string
    score:        string
    evidence:     string
    gap:          string
    type:         string
    priority:     string
    suggestedSupport: string
    indicator:    string
    action:       string
    institution:  string
    timeline:     string
    budget:       string
    collaboration: string
    noData:       string
    selectDots:   string
    addAction:    string
    remove:       string
    notScored:    string
    outOf5:       string
    print:        string
    of:           string
  }

  dashboard: {
    title:        string
    desc:         string
    overallScore: string
    coreIndicators: string
    answered:     string
    capacityGaps: string
    belowThreshold: string
    targetsAssessed: string
    kmgbfTargets:   string
    byDimension:    string
    radar:          string
    targetReadiness: string
    gapSummary:     string
    dimension:      string
    required:       string
    status:         string
    completeFirst:  string
  }

  profile: {
    title:       string
    desc:        string
    basicInfo:   string
    instName:    string
    instNamePh:  string
    type:        string
    level:       string
    scope:       string
    scopePh:     string
    mandate:     string
    mandatePh:   string
    contact:     string
    focalName:   string
    focalNamePh: string
    focalTitle:  string
    focalTitlePh:string
    focalEmail:  string
    assessDate:  string
    types:       string[]
    levels:      string[]
  }

  core: {
    title:     string
    desc:      string
    scale:     { s: number; l: string }[]
    sections:  string[]
    questions: string[]
    capacityTypes: string[]
    priorities:    string[]
  }

  targets: {
    title:   string
    desc:    string
    targets: {
      num:        number
      title:      string
      desc:       string
      indicators: string[]
    }[]
  }

  gaps: {
    title:     string
    desc:      string
    area:      string
    current:   string
    required:  string
    gap:       string
    priority:  string
    indicators:string
    scored:    string
  }

  priority: {
    title:       string
    desc:        string
    capacityGap: string
    dimension:   string
    urgency:     string
    impact:      string
    feasibility: string
    pScore:      string
    rank:        string
    formula:     string
    noGaps:      string
    priorityLevels: { Low: string; Med: string; High: string }
  }

  cdp: {
    title:       string
    desc:        string
    noActions:   string
    actions:     string
    action_one:  string
    timelines:   string[]
  }

  report: {
    title:     string
    desc:      string
    tabs: {
      summary:  string
      charts:   string
      core:     string
      targets:  string
      cdp:      string
    }
    overallReadiness: string
    dimensionScores:  string
    dimensionBar:     string
    radarChart:       string
    allTargets:       string
    interpretation:   string
    noTargets:        string
    noActions:        string
  }

  export: {
    title:    string
    desc:     string
    xlsx:     string
    xlsxSub:  string
    json:     string
    jsonSub:  string
    csv:      string
    csvSub:   string
    pdf:      string
    pdfSub:   string
    close:    string
  }

  dimensions: string[]

  interp: {
    critical:   string
    veryLimited:string
    basic:      string
    moderate:   string
    strong:     string
    adequate:   string
    notAssessed:string
  }
}