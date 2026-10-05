/**
 * The reference half of a spec, split into the pages a module shows in the
 * sidebar.
 *
 * Shared by <ModuleSpec /> (HTML), spec-markdown (AI) and the source loader
 * (which creates one sub-page per group), so every surface groups and orders
 * sections identically. The grouping follows ISO/IEC/IEEE 29148: an overview,
 * then behaviour, data, interfaces, requirements, verification and supporting
 * information. Section ids are stable anchors: change a title freely, never
 * an id.
 */

export const SPEC_SECTIONS = [
  { id: 'actors', title: 'Actors' },
  { id: 'assumptions', title: 'Assumptions' },
  { id: 'business-rules', title: 'Business rules' },
  { id: 'validations', title: 'Validations' },
  { id: 'state-machine', title: 'State machine' },
  { id: 'workflows', title: 'Workflows' },
  { id: 'data-model', title: 'Data model' },
  { id: 'relationships', title: 'Relationships' },
  { id: 'api', title: 'API contract' },
  { id: 'events', title: 'Events' },
  { id: 'permissions', title: 'Permissions' },
  { id: 'errors', title: 'Errors' },
  { id: 'dependencies', title: 'Dependencies' },
  { id: 'requirements', title: 'Functional requirements' },
  { id: 'nfrs', title: 'Quality requirements' },
  { id: 'constraints', title: 'Constraints' },
  { id: 'acceptance', title: 'Acceptance criteria' },
  { id: 'concepts', title: 'Concepts' },
  { id: 'glossary', title: 'Glossary' },
  { id: 'decisions', title: 'Decisions' },
  { id: 'open-questions', title: 'Open questions' },
  { id: 'references', title: 'References' },
  { id: 'changelog', title: 'Version history' },
] as const;

export type SpecSectionId = (typeof SPEC_SECTIONS)[number]['id'];

export interface SpecGroup {
  id: string;
  title: string;
  /** Sub-page slug under the module, or null for the module's own page. */
  slug: string | null;
  /** One line for the sub-page's description, completed with the module name. */
  summary: string;
  sections: SpecSectionId[];
}

/** In reading order. Rules come first after the overview: they are what readers most often come for. */
export const SPEC_GROUPS: SpecGroup[] = [
  {
    id: 'overview',
    title: 'Overview',
    slug: null,
    summary: 'Purpose, scope, actors and assumptions',
    sections: ['actors', 'assumptions'],
  },
  {
    id: 'rules',
    title: 'Rules & behaviour',
    slug: 'rules',
    summary: 'Business rules, validations, the state machine and workflows',
    sections: ['business-rules', 'validations', 'state-machine', 'workflows'],
  },
  {
    id: 'data',
    title: 'Data',
    slug: 'data',
    summary: 'The data model and relationships to other modules',
    sections: ['data-model', 'relationships'],
  },
  {
    id: 'interface',
    title: 'Interface',
    slug: 'interface',
    summary: 'API contract, events, permissions, errors and dependencies',
    sections: ['api', 'events', 'permissions', 'errors', 'dependencies'],
  },
  {
    id: 'requirements',
    title: 'Requirements',
    slug: 'requirements',
    summary: 'Functional requirements, quality requirements and constraints',
    sections: ['requirements', 'nfrs', 'constraints'],
  },
  {
    id: 'verification',
    title: 'Verification',
    slug: 'verification',
    summary: 'Acceptance criteria and the rules and requirements each one verifies',
    sections: ['acceptance'],
  },
  {
    id: 'terms',
    title: 'Terms & history',
    slug: 'terms',
    summary: 'Concepts, glossary, decisions, open questions, references and version history',
    sections: ['concepts', 'glossary', 'decisions', 'open-questions', 'references', 'changelog'],
  },
];

export const sectionTitle = (id: SpecSectionId) => SPEC_SECTIONS.find((s) => s.id === id)!.title;

export const groupBySlug = (slug: string) => SPEC_GROUPS.find((g) => g.slug === slug);
