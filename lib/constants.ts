// ─── Types ────────────────────────────────────────────────────────────────────

export type Page =
  | 'dashboard' | 'profile' | 'core' | 'targets'
  | 'gaps' | 'priority' | 'cdp' | 'report' | 'team' | 'myTargets'

export interface InstitutionProfile {
  name: string; type: string; level: string; mandate: string
  scope: string; focalName: string; focalTitle: string
  focalEmail: string; assessDate: string
}

export interface CoreRow {
  score: number | null; evidence: string; gap: string  // -1 = N/A (Not Applicable)
  capacityType: string; priority: string; suggestedSupport: string
}

export interface TargetRow {
  score: number | null; evidence: string  // -1 = N/A (Not Applicable)
  gapIdentified: string; capacityNeed: string
}

export interface PriorityRow {
  capacityGap: string; urgency: number; impact: number; feasibility: number
}

export interface CdpRow {
  capacityGap: string; action: string; institution: string
  timeline: string; budget: string; indicator: string; collaboration: string
}

export interface Assessment {
  id: string | null          // Supabase UUID once saved
  profile: InstitutionProfile
  coreRows: CoreRow[]
  targetRows: Record<string, TargetRow>
  required: Record<string, number>
  priorityRows: PriorityRow[]
  cdpRows: CdpRow[]
}

export interface UserProfile {
  id: string; full_name: string | null; email: string | null
  role: 'admin' | 'institution_lead' | 'contributor' | 'viewer'
  institution_id: string | null
}

// ─── Dimensions ───────────────────────────────────────────────────────────────

export const DIMENSIONS = [
  'Policy and Legal Capacity',
  'Institutional Capacity',
  'Technical Capacity',
  'Financial Capacity',
  'Coordination and Governance',
  'Knowledge and Information Management',
  'Infrastructure and Equipment',
  'Awareness and Capacity Development',
] as const

export type Dimension = (typeof DIMENSIONS)[number]

export const DEFAULT_REQUIRED: Record<Dimension, number> = {
  'Policy and Legal Capacity':             5,
  'Institutional Capacity':                5,
  'Technical Capacity':                    5,
  'Financial Capacity':                    5,
  'Coordination and Governance':           5,
  'Knowledge and Information Management':  5,
  'Infrastructure and Equipment':          5,
  'Awareness and Capacity Development':    5,
}

// ─── Core Questions (50) ──────────────────────────────────────────────────────

export interface CoreQuestion { section: Dimension; q: string }

export const CORE_QUESTIONS: CoreQuestion[] = [
  { section: 'Policy and Legal Capacity', q: 'Biodiversity policies and strategies aligned with KMGBF targets' },
  { section: 'Policy and Legal Capacity', q: 'Biodiversity considerations integrated into sectoral policies (agriculture, fisheries, forestry, infrastructure etc.)' },
  { section: 'Policy and Legal Capacity', q: 'Biodiversity targets integrated into institutional strategic plans and annual workplans' },
  { section: 'Policy and Legal Capacity', q: 'Legal mandates for biodiversity management clearly defined' },
  { section: 'Policy and Legal Capacity', q: 'Biodiversity safeguards incorporated in environmental regulations and licensing' },
  { section: 'Policy and Legal Capacity', q: 'Environmental impact assessment frameworks include biodiversity safeguards' },
  { section: 'Policy and Legal Capacity', q: 'Compliance and enforcement mechanisms for biodiversity laws' },
  { section: 'Institutional Capacity', q: 'Existence of a dedicated biodiversity unit or focal point' },
  { section: 'Institutional Capacity', q: 'Adequate staffing levels for biodiversity management' },
  { section: 'Institutional Capacity', q: 'Staff roles and responsibilities clearly defined' },
  { section: 'Institutional Capacity', q: 'Institutional biodiversity strategy/action plan exists' },
  { section: 'Institutional Capacity', q: 'Staff trained in biodiversity management and conservation' },
  { section: 'Institutional Capacity', q: 'Capacity for project planning and implementation of biodiversity programs' },
  { section: 'Institutional Capacity', q: 'Capacity for monitoring and evaluation of biodiversity projects' },
  { section: 'Technical Capacity', q: 'Ability to conduct biodiversity monitoring and surveys' },
  { section: 'Technical Capacity', q: 'GIS and spatial analysis capability' },
  { section: 'Technical Capacity', q: 'Ecosystem restoration planning and implementation expertise' },
  { section: 'Technical Capacity', q: 'Biodiversity data collection and field survey capacity' },
  { section: 'Technical Capacity', q: 'Biodiversity assessment expertise (species, ecosystems, habitats)' },
  { section: 'Technical Capacity', q: 'Capacity to assess ecosystem services and natural capital' },
  { section: 'Technical Capacity', q: 'Capacity to implement nature-based solutions' },
  { section: 'Financial Capacity', q: 'Dedicated biodiversity budget within institution' },
  { section: 'Financial Capacity', q: 'Access to national biodiversity financing mechanisms' },
  { section: 'Financial Capacity', q: 'Ability to mobilize external funding (donors, climate funds etc.)' },
  { section: 'Financial Capacity', q: 'Capacity for financial planning and budgeting' },
  { section: 'Financial Capacity', q: 'Capacity to develop biodiversity funding proposals' },
  { section: 'Financial Capacity', q: 'Availability of sustainable financing mechanisms (PES, biodiversity offsets, green funds)' },
  { section: 'Coordination and Governance', q: 'Coordination with national biodiversity authorities' },
  { section: 'Coordination and Governance', q: 'Coordination with regional and local governments' },
  { section: 'Coordination and Governance', q: 'Engagement with Indigenous Peoples and local communities' },
  { section: 'Coordination and Governance', q: 'Mechanisms for stakeholder participation' },
  { section: 'Coordination and Governance', q: 'Collaboration with private sector actors' },
  { section: 'Coordination and Governance', q: 'Multi-stakeholder platforms for biodiversity governance' },
  { section: 'Knowledge and Information Management', q: 'Biodiversity databases available and accessible' },
  { section: 'Knowledge and Information Management', q: 'National biodiversity monitoring systems established' },
  { section: 'Knowledge and Information Management', q: 'Data management systems for biodiversity information' },
  { section: 'Knowledge and Information Management', q: 'Capacity to analyze biodiversity data' },
  { section: 'Knowledge and Information Management', q: 'Capacity to report on national biodiversity indicators' },
  { section: 'Knowledge and Information Management', q: 'Knowledge sharing platforms within and across institutions' },
  { section: 'Knowledge and Information Management', q: 'Integration of traditional and indigenous knowledge' },
  { section: 'Infrastructure and Equipment', q: 'Field equipment for biodiversity surveys (GPS, sampling equipment etc.)' },
  { section: 'Infrastructure and Equipment', q: 'Laboratory facilities for biodiversity analysis' },
  { section: 'Infrastructure and Equipment', q: 'ICT infrastructure for biodiversity data management' },
  { section: 'Infrastructure and Equipment', q: 'Access to remote sensing and satellite data' },
  { section: 'Infrastructure and Equipment', q: 'Vehicles and logistics for field monitoring' },
  { section: 'Infrastructure and Equipment', q: 'Restoration equipment and nursery infrastructure' },
  { section: 'Awareness and Capacity Development', q: 'Staff training programs on biodiversity management' },
  { section: 'Awareness and Capacity Development', q: 'Public awareness programs on biodiversity conservation' },
  { section: 'Awareness and Capacity Development', q: 'Capacity building programs for communities' },
  { section: 'Awareness and Capacity Development', q: 'Knowledge exchange with research institutions and universities' },
]

export const CAPACITY_TYPES = ['', 'Policy', 'Institutional', 'Technical', 'Financial', 'Infrastructure', 'Knowledge', 'Coordination', 'Awareness']
export const PRIORITY_LEVELS = ['', 'Low', 'Med', 'High']
export const TIMELINES = ['', '0–6 months', '6–12 months', '1–2 years', '2–5 years', 'Long-term']

// ─── KMGBF Targets (23) ───────────────────────────────────────────────────────

export interface KmgbfTarget { num: number; title: string; desc: string; indicators: string[] }

export const KMGBF_TARGETS: KmgbfTarget[] = [
  { num:1,  title:'Spatial Planning',           desc:'Ensure all areas under participatory biodiversity-inclusive spatial planning.', indicators:['Spatial planning expertise for biodiversity-inclusive land/sea use','Legal and policy frameworks for participatory biodiversity planning','Biodiversity data and mapping for planning and monitoring'] },
  { num:2,  title:'Ecosystem Restoration',      desc:'30% of degraded ecosystems under effective restoration by 2030.',             indicators:['Technical expertise in ecosystem restoration','National capacity for restoration planning and implementation','Monitoring systems for restoration outcomes','Financial resources for restoration programs'] },
  { num:3,  title:'Protected Areas (30×30)',    desc:'30% of land and sea effectively conserved and managed by 2030.',              indicators:['Protected area management capacity (staff, skills, institutions)','Monitoring and enforcement in protected areas','Protected area planning and governance','Stakeholder coordination for conservation'] },
  { num:4,  title:'Halting Species Loss',       desc:'Halt human-induced extinction of known threatened species.',                  indicators:['Data on threatened species status and distribution','Capacity for biodiversity data collection and analysis','Monitoring systems for threatened species','Enforcement against illegal wildlife exploitation'] },
  { num:5,  title:'Sustainable Wild Species',   desc:'Ensure sustainable, safe and legal harvesting and trade of wild species.',    indicators:['Data on wild species use, trade, and population trends','Monitoring systems for sustainable harvesting','Legal and regulatory frameworks for wildlife use and trade','Capacity for community-based natural resource management'] },
  { num:6,  title:'Invasive Alien Species',     desc:'Reduce rate of introduction of invasive alien species.',                     indicators:['Data and information systems on invasive alien species','Biosecurity systems to prevent new introductions','Technical capacity for invasive species risk assessment and management','Coordination among agencies managing invasive species'] },
  { num:7,  title:'Pollution Reduction',        desc:'Reduce pollution to levels not harmful to biodiversity.',                     indicators:['Data on pollution sources and impacts on biodiversity','Monitoring systems for pollution in ecosystems','Regulatory frameworks controlling pollution','Technical capacity and equipment for pollution monitoring'] },
  { num:8,  title:'Climate & Biodiversity',     desc:'Minimize climate change impacts on biodiversity.',                           indicators:['Data on climate change impacts on biodiversity','Integration of biodiversity in climate policies and strategies','Technical capacity for climate risk assessment and ecosystem-based adaptation','Monitoring climate–biodiversity interactions'] },
  { num:9,  title:'Wild Species Benefits',      desc:'Ensure wild species managed sustainably to benefit people.',                  indicators:['Data on sustainable use and economic value of wild species','Monitoring systems for sustainable use','Policies supporting biodiversity-based livelihoods','Capacity for biodiversity-based value chains and markets'] },
  { num:10, title:'Sustainable Production',     desc:'Sustainable management of agriculture, aquaculture, fisheries and forestry.', indicators:['Data on biodiversity impacts of production sectors','Integration of biodiversity into agriculture, fisheries, forestry policies','Monitoring biodiversity outcomes in production systems','Capacity to promote biodiversity-friendly practices'] },
  { num:11, title:'Ecosystem Services',         desc:"Restore and maintain nature's contributions to people.",                     indicators:['Data and assessments of ecosystem services','Capacity for ecosystem service valuation and mapping','Integration of ecosystem services into policy and planning','Monitoring ecosystem condition and benefits'] },
  { num:12, title:'Urban Green Spaces',         desc:'Increase green/blue spaces in urban areas.',                                 indicators:['Data on urban biodiversity and green spaces','Technical capacity for urban biodiversity planning','Integration of biodiversity into urban development policies','Financial resources for urban green infrastructure'] },
  { num:13, title:'Access & Benefit Sharing',  desc:'Fair and equitable sharing of benefits from genetic resources.',             indicators:['Legal frameworks for access and benefit-sharing (ABS)','Institutional capacity to manage ABS processes','Monitoring compliance with ABS agreements','Data on use of genetic resources and digital sequence information'] },
  { num:14, title:'Biodiversity Mainstreaming', desc:'Integrate biodiversity values into policies across all sectors.',            indicators:['Integration of biodiversity values into national planning','Tools for biodiversity valuation and natural capital accounting','Capacity for environmental and biodiversity impact assessments','Availability of biodiversity data for decision-making'] },
  { num:15, title:'Business & Biodiversity',    desc:'Encourage business to assess and report on biodiversity impacts.',          indicators:['Policies requiring business biodiversity impact assessment and reporting','Capacity to guide or regulate business reporting','Availability of tools and data for business biodiversity assessments','Incentives for private sector biodiversity action'] },
  { num:16, title:'Sustainable Consumption',   desc:'Enable sustainable consumption choices.',                                    indicators:['Policies promoting sustainable consumption and waste reduction','Integration of circular economy and waste management in planning','Data on consumption patterns and biodiversity impacts','Capacity to support sustainable consumption initiatives'] },
  { num:17, title:'Biosafety',                 desc:'Establish measures for biosafety and biotechnology.',                        indicators:['Alignment with biosafety and biotechnology agreements','Institutional capacity for biosafety risk assessment','Monitoring and compliance systems for biotechnology regulations'] },
  { num:18, title:'Harmful Subsidies Reform',  desc:'Eliminate incentives harmful for biodiversity.',                             indicators:['Policies to identify and reform harmful biodiversity subsidies','Capacity to analyze and reform incentives and subsidies','Data on subsidies and their biodiversity impacts'] },
  { num:19, title:'Resource Mobilisation',     desc:'Progressively increase financial resources for biodiversity.',               indicators:['National strategies to mobilize biodiversity finance','Institutional capacity to manage biodiversity funding','Tools for financial planning and project evaluation','Data on biodiversity financial flows'] },
  { num:20, title:'Capacity Building',         desc:'Strengthen capacity-building and technology transfer.',                      indicators:['Strategies for capacity-building and technology transfer','Institutional capacity to coordinate capacity-building initiatives','Collaboration with research institutions and international partners','Availability of knowledge and research supporting biodiversity action'] },
  { num:21, title:'Knowledge & Innovation',    desc:'Ensure best available data accessible for decision-making.',                 indicators:['Policies and frameworks for biodiversity knowledge management','Platforms and databases for knowledge sharing','Availability of scientific, technical, and traditional knowledge'] },
  { num:22, title:'Participation & Rights',    desc:'Ensure full and equitable participation in biodiversity decisions.',         indicators:['Legal frameworks ensuring participation and access to biodiversity information','Institutional capacity for inclusive participation and stakeholder engagement','Systems for public access to biodiversity data and information'] },
  { num:23, title:'Gender Equality',           desc:'Ensure gender equality in biodiversity action.',                             indicators:['Policies promoting gender equality in biodiversity action','Capacity to implement gender-responsive biodiversity programs','Availability of gender-disaggregated data'] },
]

export const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard', profile: 'Institutional Profile',
  core: 'Core Capacity Assessment', targets: 'Target-Specific Assessment',
  gaps: 'Gap Analysis', priority: 'Prioritization',
  cdp: 'Capacity Development Plan', report: 'Reports & Analytics',
  team: 'Team',
  myTargets: 'Our KMGBF Targets',
}