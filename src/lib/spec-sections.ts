/**
 * The reference half of a spec page, in reading order.
 *
 * Shared by <ModuleSpec /> (HTML) and spec-markdown (AI) so both surfaces group
 * and order sections identically. Section ids are stable anchors - change a
 * title freely, never an id.
 */

export const SPEC_SECTIONS = [
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
  { id: 'nfrs', title: 'Non-functional requirements' },
  { id: 'acceptance', title: 'Acceptance criteria' },
  { id: 'actors', title: 'Actors' },
  { id: 'concepts', title: 'Concepts' },
  { id: 'glossary', title: 'Glossary' },
  { id: 'decisions', title: 'Decisions' },
  { id: 'open-questions', title: 'Open questions' },
  { id: 'changelog', title: 'Version history' },
] as const;

export type SpecSectionId = (typeof SPEC_SECTIONS)[number]['id'];

/** Rules first: they are what a reader most often comes for. */
export const SPEC_GROUPS: { id: string; title: string; sections: SpecSectionId[] }[] = [
  {
    id: 'rules',
    title: 'Rules & behaviour',
    sections: ['business-rules', 'validations', 'state-machine', 'workflows'],
  },
  { id: 'data', title: 'Data', sections: ['data-model', 'relationships'] },
  {
    id: 'interface',
    title: 'Interface',
    sections: ['api', 'events', 'permissions', 'errors', 'dependencies'],
  },
  {
    id: 'requirements-group',
    title: 'Requirements',
    sections: ['requirements', 'nfrs', 'acceptance'],
  },
  { id: 'terms', title: 'People & terms', sections: ['actors', 'concepts', 'glossary'] },
  { id: 'history', title: 'History', sections: ['decisions', 'open-questions', 'changelog'] },
];

export const sectionTitle = (id: SpecSectionId) => SPEC_SECTIONS.find((s) => s.id === id)!.title;
