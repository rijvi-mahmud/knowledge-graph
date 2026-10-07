/**
 * The sections of a spec and the groups they sit in.
 *
 * Shared by <ModuleSpec /> (HTML), spec-markdown (AI) and the source loader,
 * which gives every section its own page inside a sidebar folder per group.
 * Titles follow ISO/IEC/IEEE 29148 where it has one. Requirements say what the
 * module must do, including its HTTP interface, never how it is stored or
 * coded. Storage and code live only in the non-normative Reference
 * implementation group. Section ids are stable anchors and URL slugs: change a
 * title freely, never an id.
 */

export const SPEC_SECTIONS = [
  { id: 'actors', title: 'Actors', summary: 'Who interacts with the module' },
  {
    id: 'context',
    title: 'Product perspective',
    summary: 'Where the module sits among the services around it',
  },
  {
    id: 'assumptions',
    title: 'Assumptions and dependencies',
    summary: 'What the spec takes as true, and why',
  },
  {
    id: 'business-rules',
    title: 'Business rules',
    summary: 'The rules the module enforces, each with its reason',
  },
  {
    id: 'state-machine',
    title: 'State machine',
    summary: 'Statuses and the only transitions allowed between them',
  },
  { id: 'workflows', title: 'Workflows', summary: 'Step-by-step flows and who runs them' },
  { id: 'validations', title: 'Validations', summary: 'Input checks and the error each one raises' },
  {
    id: 'edge-cases',
    title: 'Edge cases',
    summary: 'Situations that are easy to get wrong, and the required behaviour',
  },
  { id: 'data-model', title: 'Data model', summary: 'Logical fields, types and constraints' },
  { id: 'relationships', title: 'Relationships', summary: 'How the module relates to others' },
  {
    id: 'operations',
    title: 'API',
    summary: 'Every operation: its HTTP endpoint, who calls it, input, result and errors',
  },
  {
    id: 'api-conventions',
    title: 'API conventions',
    summary: 'Authentication, error format, retries, paging, rate limits and versioning',
  },
  { id: 'events', title: 'Events', summary: 'Events the module emits and their payloads' },
  {
    id: 'event-delivery',
    title: 'Event delivery',
    summary: 'What every event carries, and the delivery guarantees consumers can rely on',
  },
  { id: 'errors', title: 'Errors', summary: 'Every error code, its HTTP status and meaning' },
  {
    id: 'dependencies',
    title: 'Dependencies',
    summary: 'Services the module needs, and what happens when they are down',
  },
  {
    id: 'access-matrix',
    title: 'Permission matrix',
    summary: 'What each actor may do, action by action',
  },
  { id: 'permissions', title: 'Permissions', summary: 'Named permissions and what they grant' },
  {
    id: 'privacy',
    title: 'Privacy and retention',
    summary: 'Personal data held, why, for how long, and how it is erased',
  },
  {
    id: 'compliance',
    title: 'Compliance',
    summary: 'Which HIPAA, GDPR and other legal obligations apply, and how the spec meets each',
  },
  {
    id: 'requirements',
    title: 'Functional requirements',
    summary: 'What the service must do, and how each requirement is verified',
  },
  {
    id: 'performance',
    title: 'Performance requirements',
    summary: 'Measurable indicators, their targets and how they are measured',
  },
  {
    id: 'nfrs',
    title: 'Quality attributes',
    summary: 'Availability, security, scalability and other qualities',
  },
  {
    id: 'constraints',
    title: 'Design constraints',
    summary: 'Limits on how the module may be built',
  },
  { id: 'settings', title: 'Configuration', summary: 'Settings a deployment can change' },
  {
    id: 'acceptance',
    title: 'Acceptance criteria',
    summary: 'Given / When / Then criteria for tests',
  },
  {
    id: 'traceability',
    title: 'Traceability matrix',
    summary: 'Which acceptance criteria verify each rule and requirement',
  },
  {
    id: 'tables',
    title: 'Storage design',
    summary: 'One way to store the data: tables, indexes and constraints',
  },
  {
    id: 'technical-notes',
    title: 'Implementation notes',
    summary: 'Guidance for the hard parts, with example code',
  },
  { id: 'concepts', title: 'Concepts', summary: 'The domain concepts the module is built on' },
  { id: 'glossary', title: 'Glossary', summary: 'Definitions of the terms used' },
  { id: 'acronyms', title: 'Acronyms', summary: 'Abbreviations used in the spec' },
  {
    id: 'decisions',
    title: 'Decisions',
    summary: 'Design decisions, their reasons and the alternatives rejected',
  },
  { id: 'risks', title: 'Risks', summary: 'What could go wrong, its impact and how it is limited' },
  { id: 'open-questions', title: 'Open questions', summary: 'What has not been decided yet' },
  { id: 'references', title: 'References', summary: 'Standards and sources the spec relies on' },
  { id: 'changelog', title: 'Version history', summary: 'What changed in each version' },
] as const;

export type SpecSectionId = (typeof SPEC_SECTIONS)[number]['id'];

export interface SpecGroup {
  id: string;
  title: string;
  /** Sidebar folder slug under the module, or null for the module's own page. */
  slug: string | null;
  sections: SpecSectionId[];
}

/** In reading order. Functions come first after the overview: they are what readers most often come for. */
export const SPEC_GROUPS: SpecGroup[] = [
  {
    id: 'overview',
    title: 'Overview',
    slug: null,
    sections: ['context', 'actors', 'assumptions'],
  },
  {
    id: 'functions',
    title: 'Functions',
    slug: 'functions',
    sections: ['business-rules', 'state-machine', 'workflows', 'validations', 'edge-cases'],
  },
  { id: 'data', title: 'Data', slug: 'data', sections: ['data-model', 'relationships'] },
  {
    id: 'interfaces',
    title: 'External interfaces',
    slug: 'interfaces',
    sections: ['operations', 'api-conventions', 'events', 'event-delivery', 'errors', 'dependencies'],
  },
  {
    id: 'security',
    title: 'Security',
    slug: 'security',
    sections: ['access-matrix', 'permissions', 'privacy', 'compliance'],
  },
  {
    id: 'requirements',
    title: 'Requirements',
    slug: 'requirements',
    sections: ['requirements', 'performance', 'nfrs', 'constraints', 'settings'],
  },
  {
    id: 'verification',
    title: 'Verification',
    slug: 'verification',
    sections: ['acceptance', 'traceability'],
  },
  {
    // Non-normative: one way to build it. Nothing in the groups above depends on it.
    id: 'reference-implementation',
    title: 'Reference implementation',
    slug: 'reference-implementation',
    sections: ['tables', 'technical-notes'],
  },
  {
    id: 'supporting',
    title: 'Supporting information',
    slug: 'supporting',
    sections: [
      'concepts',
      'glossary',
      'acronyms',
      'decisions',
      'risks',
      'open-questions',
      'references',
      'changelog',
    ],
  },
];

const byId = new Map<string, (typeof SPEC_SECTIONS)[number]>(SPEC_SECTIONS.map((s) => [s.id, s]));

export const sectionTitle = (id: SpecSectionId) => byId.get(id)!.title;
export const sectionSummary = (id: SpecSectionId) => byId.get(id)!.summary;

/** The group a section belongs to. */
export const groupOf = (id: SpecSectionId) => SPEC_GROUPS.find((g) => g.sections.includes(id))!;
