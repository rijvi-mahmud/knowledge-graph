import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { z } from 'zod';
import { remarkSiteUrl } from './src/lib/remark-site-url';
import { remarkSpecIds } from './src/lib/remark-spec-ids';

/**
 * Knowledge-graph frontmatter schema.
 *
 * Design rule: every structured fact lives in frontmatter (machine-readable,
 * queryable, diffable), and the MDX body carries only narrative that does not
 * repeat it. Pages render the frontmatter via <ModuleSpec /> so humans and AI
 * read the same single source of truth.
 *
 * Knowledge sits at three levels: core (`industry` unset) -> industry ->
 * domain. A page names its parent in `extends` and declares ONLY what it adds
 * on top - never a full refork. Pages render the merged inheritance chain.
 */

// --- graph edges -----------------------------------------------------------

// Domain-graph edge: how this module relates to another concept.
// Applies only where this jurisdiction's law applies; untagged items apply everywhere.
// Kept in step with the jurisdiction setting of healthcare modules (us | eu).
const jurisdiction = z.enum(['us', 'eu']).optional();

const relationSchema = z.object({
  type: z.enum([
    'has_many',
    'has_one',
    'belongs_to',
    'requires',
    'can_trigger',
    'produces_event',
    'requires_permission',
    'exposes_to',
  ]),
  target: z.string(), // module/concept id, e.g. "insurance" or "event:appointment.booked"
  note: z.string().optional(),
});

// Runtime service coupling. Distinct from `relationships`: this is about what
// must be reachable for the service to function, not domain semantics.
// Another module this one relies on, and the contract between them: only what
// this module needs from it (upstream) or gives it (downstream), never how the
// other module works. Each module is its own bounded context.
const dependencySchema = z.object({
  service: z.string(),
  direction: z.enum(['upstream', 'downstream']),
  reason: z.string(),
  criticality: z.enum(['hard', 'soft']).default('hard'), // hard = blocks core flow when down
  contract: z.array(z.string()).default([]), // e.g. "Is this slot free for these participants?"
});

// --- domain description ----------------------------------------------------

const actorSchema = z.object({
  name: z.string(), // e.g. "Patient", "Scheduler", "System"
  description: z.string(),
});

const glossarySchema = z.object({
  term: z.string(),
  definition: z.string(),
});

const conceptSchema = z.object({
  name: z.string(),
  description: z.string(),
});

const fieldSchema = z.object({
  jurisdiction, // us or eu; see `jurisdiction` above
  name: z.string(),
  type: z.string(), // free-form so domains can use their own vocabulary
  required: z.boolean().default(false),
  description: z.string().optional(),
  constraints: z.string().optional(), // e.g. "must be in the future"
  variant: z.string().optional(), // applies only to this variant of the module, e.g. "inpatient"
});

// --- rules, validation, lifecycle ------------------------------------------

// Business rule: WHY the system behaves a certain way. `rationale` matters most
// for AI - it prevents an assistant from "fixing" a rule it does not understand.
const businessRuleSchema = z.object({
  jurisdiction, // us or eu; see `jurisdiction` above
  id: z.string(), // e.g. "BR-1"
  text: z.string(),
  rationale: z.string().optional(),
  variant: z.string().optional(), // applies only to this variant of the module, e.g. "inpatient"
});

// Field-level validation, kept separate from business rules: these are
// mechanical input checks, not domain policy.
const validationSchema = z.object({
  jurisdiction, // us or eu; see `jurisdiction` above
  field: z.string(),
  rule: z.string(),
  error: z.string(), // error code/message raised when the rule fails
});

const stateMachineSchema = z.object({
  initial: z.string(),
  states: z.array(z.string()),
  transitions: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      trigger: z.string(),
      guard: z.string().optional(), // condition that must hold for the transition
    }),
  ),
});

// End-to-end flow across actors/services. This is the "common workflows"
// layer - the part teams most often reinvent per company.
const workflowSchema = z.object({
  jurisdiction, // us or eu; see `jurisdiction` above
  name: z.string(),
  trigger: z.string().optional(),
  actor: z.string().optional(),
  steps: z.array(z.string()),
  outcome: z.string().optional(),
  variant: z.string().optional(), // applies only to this variant of the module, e.g. "inpatient"
});

// --- requirements ----------------------------------------------------------

// How a requirement is shown to be met. The four methods of ISO/IEC/IEEE 29148.
const verificationMethod = z.enum(['test', 'demonstration', 'inspection', 'analysis']);

const requirementSchema = z.object({
  jurisdiction, // us or eu; see `jurisdiction` above
  id: z.string(), // e.g. "FR-1"
  text: z.string(),
  priority: z.enum(['must', 'should', 'could']).default('must'),
  verification: verificationMethod.optional(),
  variant: z.string().optional(), // applies only to this variant of the module, e.g. "inpatient"
});

// Something the spec takes as true but does not enforce. If it stops being
// true, the requirements that depend on it need another look.
const assumptionSchema = z.object({
  jurisdiction, // us or eu; see `jurisdiction` above
  id: z.string(), // e.g. "AS-1"
  text: z.string(),
  rationale: z.string().optional(),
});

// A limit on how the module may be built: a design constraint or a standard
// it must comply with (ISO/IEC/IEEE 29148 "design constraints" and
// "standards compliance").
const constraintSchema = z.object({
  jurisdiction, // us or eu; see `jurisdiction` above
  id: z.string(), // e.g. "CON-1"
  text: z.string(),
  rationale: z.string().optional(),
});

// One row of the permission matrix: an action, and what each actor may do.
// Cells are usually "any", "own" (appointments they take part in) or "none";
// anything else is a condition, explained in the note.
const accessSchema = z.object({
  action: z.string(), // e.g. "Reschedule"
  roles: z.record(z.string(), z.string()), // actor name -> any | own | none | condition
  permission: z.string().optional(), // the named permission that grants it, e.g. "appointment.manage"
  note: z.string().optional(),
});

// A situation that is easy to get wrong, the behaviour the spec requires, and
// the ids that cover it.
const edgeCaseSchema = z.object({
  jurisdiction, // us or eu; see `jurisdiction` above
  id: z.string(), // e.g. "EC-1"
  situation: z.string(),
  behaviour: z.string(),
  covers: z.array(z.string()).default([]),
  variant: z.string().optional(), // applies only to this variant of the module, e.g. "inpatient"
});

// A setting a deployment can change, with its default.
const settingSchema = z.object({
  jurisdiction, // us or eu; see `jurisdiction` above
  name: z.string(),
  type: z.string(),
  default: z.string().optional(),
  description: z.string(),
});

// Personal data a field holds, why it's kept, and for how long.
const personalDataSchema = z.object({
  jurisdiction, // us or eu; see `jurisdiction` above
  field: z.string(),
  category: z.string(), // e.g. "personal", "pseudonymous", "free text"
  purpose: z.string(),
  retention: z.string(),
});

// A measurable performance requirement: what is measured, the target, and how.
const performanceSchema = z.object({
  id: z.string(), // e.g. "PERF-1"
  indicator: z.string(),
  target: z.string(),
  measurement: z.string(),
});

// Something that could go wrong, what it would cost, and how the spec limits it.
// A legal obligation that applies to the module, such as a HIPAA or GDPR
// provision, how the spec meets it, and the ids that do. Obligations the
// deployment or another module must meet say so in status.
const complianceSchema = z.object({
  jurisdiction, // us or eu; see `jurisdiction` above
  id: z.string(), // e.g. "CMP-H1"
  regulation: z.string(), // e.g. "HIPAA Privacy Rule", "GDPR"
  provision: z.string(), // e.g. "45 CFR 164.524", "Article 15"
  obligation: z.string(),
  how: z.string(),
  status: z.enum(['met', 'partly met', 'deployment', 'other module']).default('met'),
  covered_by: z.array(z.string()).default([]),
});

const riskSchema = z.object({
  jurisdiction, // us or eu; see `jurisdiction` above
  id: z.string(), // e.g. "RISK-1"
  risk: z.string(),
  impact: z.string(),
  mitigation: z.string(),
});

// A standard, regulation or source the spec relies on.
const referenceSchema = z.object({
  id: z.string(), // e.g. "REF-1"
  title: z.string(),
  url: z.string(),
  note: z.string().optional(),
});

const nfrSchema = z.object({
  jurisdiction, // us or eu; see `jurisdiction` above
  category: z.enum([
    'performance',
    'security',
    'scalability',
    'availability',
    'compliance',
    'observability',
    'maintainability',
    // The remaining ISO/IEC 25010 product quality characteristics.
    'reliability',
    'compatibility',
    'usability',
    'portability',
    'safety',
  ]),
  text: z.string(),
});

// Testable acceptance criteria in Given/When/Then form - the bridge between
// this spec and generated tests.
const acceptanceSchema = z.object({
  jurisdiction, // us or eu; see `jurisdiction` above
  id: z.string(), // e.g. "AC-1"
  given: z.string(),
  when: z.string(),
  then: z.string(),
  verifies: z.array(z.string()).default([]), // rule and requirement ids, e.g. ["BR-4", "FR-2"]
  variant: z.string().optional(), // applies only to this variant of the module, e.g. "inpatient"
});

// --- interface -------------------------------------------------------------

// Something a caller can ask the module to do, and the HTTP endpoint that
// exposes it. HTTP is a standard interface, so the endpoint is part of the
// external interface requirements (ISO/IEC/IEEE 29148), stated once, here.
const operationSchema = z.object({
  jurisdiction, // us or eu; see `jurisdiction` above
  name: z.string(), // e.g. "Book an appointment"
  actor: z.string().optional(), // who may call it, by actor name
  description: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  path: z.string().optional(), // e.g. "/appointments/{id}/cancel"
  success: z.number().optional(), // HTTP status on success, e.g. 201
  input: z.string().optional(),
  output: z.string().optional(),
  errors: z.array(z.string()).default([]), // error codes this operation can return
  variant: z.string().optional(), // applies only to this variant of the module, e.g. "inpatient"
});

// A convention every endpoint follows: authentication, errors, paging...
const apiConventionSchema = z.object({
  topic: z.string(),
  text: z.string(),
  reference: z.string().optional(), // e.g. "RFC 9457"
});

const eventSchema = z.object({
  jurisdiction, // us or eu; see `jurisdiction` above
  name: z.string(), // e.g. "appointment.booked"
  description: z.string().optional(),
  payload: z.array(z.string()).default([]),
});

const permissionSchema = z.object({
  name: z.string(), // e.g. "appointment.write"
  description: z.string(),
});

const errorSchema = z.object({
  jurisdiction, // us or eu; see `jurisdiction` above
  code: z.string(), // e.g. "APPOINTMENT_SLOT_TAKEN"
  http: z.number().optional(), // HTTP status, e.g. 409
  message: z.string(),
});

// --- history & decisions ---------------------------------------------------

// Architecture/business decision record. The company-specific 20% mostly lands
// here: not documentation, but decisions AI must respect on later changes.
const decisionSchema = z.object({
  jurisdiction, // us or eu; see `jurisdiction` above
  id: z.string(), // e.g. "ADR-1"
  decision: z.string(),
  rationale: z.string(),
  alternatives: z.string().optional(),
  date: z.string().optional(), // ISO date
});

const changelogSchema = z.object({
  version: z.string(),
  date: z.string().optional(),
  changes: z.array(z.string()),
  breaking: z.boolean().default(false),
});

// --- reference implementation ---------------------------------------------
// Non-normative: one way to build what the requirements describe. Nothing in
// the requirements depends on it, so a team on another store or language
// replaces only this part.

// Reference storage design: tables for one way to store the data. PostgreSQL
// is the reference dialect.
const columnSchema = z.object({
  name: z.string(),
  type: z.string(),
  nullable: z.boolean().default(false),
  default: z.string().optional(),
  note: z.string().optional(),
});
const tableSchema = z.object({
  name: z.string(),
  description: z.string(),
  columns: z.array(columnSchema),
  indexes: z.array(z.object({ name: z.string(), definition: z.string(), note: z.string().optional() })).default([]),
  constraints: z.array(z.object({ name: z.string(), definition: z.string(), note: z.string().optional() })).default([]),
});

// Implementation guidance: how to build something the spec requires.
const technicalNoteSchema = z.object({
  jurisdiction, // us or eu; see `jurisdiction` above
  id: z.string(), // e.g. "TN-1"
  title: z.string(),
  text: z.string(),
  code: z.string().optional(), // an illustrative snippet, e.g. SQL
});

// --- the page schema -------------------------------------------------------

const graphSchema = pageSchema.extend({
  // identity
  module: z.string().optional(), // unset = ordinary docs page, not a graph node
  version: z.string().default('0.1.0'),
  status: z.enum(['draft', 'review', 'stable', 'deprecated']).default('draft'),
  industry: z.string().optional(), // unset = industry-neutral core
  domain: z.string().optional(), // set = domain layer inside `industry`
  // Parent page path relative to content/docs, e.g. "core/appointment" or
  // "healthcare/appointment". Unset for core and for modules that exist only
  // at this level (e.g. a domain-only concept with no core counterpart).
  extends: z.string().optional(),

  // Variants: kinds of the same module that differ in a few items, such as
  // outpatient and inpatient appointments. Each gets its own sidebar page
  // listing the items tagged with it; untagged items apply to every variant.
  variants: z
    .array(z.object({ id: z.string(), title: z.string(), description: z.string(), summary: z.string() }))
    .default([]),

  // 1. overview
  purpose: z.string().optional(),
  scope: z.array(z.string()).default([]),
  nonGoals: z.array(z.string()).default([]),
  actors: z.array(actorSchema).default([]),
  assumptions: z.array(assumptionSchema).default([]),
  glossary: z.array(glossarySchema).default([]),

  // 2. domain
  concepts: z.array(conceptSchema).default([]),
  dataModel: z.array(fieldSchema).default([]),
  relationships: z.array(relationSchema).default([]),

  // 3. behaviour
  businessRules: z.array(businessRuleSchema).default([]),
  validations: z.array(validationSchema).default([]),
  stateMachine: stateMachineSchema.optional(),
  workflows: z.array(workflowSchema).default([]),
  edgeCases: z.array(edgeCaseSchema).default([]),

  // 4. requirements
  functionalRequirements: z.array(requirementSchema).default([]),
  nonFunctionalRequirements: z.array(nfrSchema).default([]),
  constraints: z.array(constraintSchema).default([]),
  settings: z.array(settingSchema).default([]),
  performanceTargets: z.array(performanceSchema).default([]),
  acceptanceCriteria: z.array(acceptanceSchema).default([]),

  // 5. interface
  operations: z.array(operationSchema).default([]),
  apiConventions: z.array(apiConventionSchema).default([]),
  events: z.array(eventSchema).default([]),
  permissions: z.array(permissionSchema).default([]),
  accessMatrix: z.array(accessSchema).default([]),
  personalData: z.array(personalDataSchema).default([]),
  deliveryGuarantees: z.array(assumptionSchema).default([]), // same shape: id, text, rationale
  errors: z.array(errorSchema).default([]),
  dependencies: z.array(dependencySchema).default([]),

  // 6. history
  decisions: z.array(decisionSchema).default([]),
  openQuestions: z.array(z.string()).default([]),
  changelog: z.array(changelogSchema).default([]),
  references: z.array(referenceSchema).default([]),

  // reference implementation (non-normative)
  tables: z.array(tableSchema).default([]),
  technicalNotes: z.array(technicalNoteSchema).default([]),
  acronyms: z.array(glossarySchema).default([]),
  risks: z.array(riskSchema).default([]),
  compliance: z.array(complianceSchema).default([]),
});

// A domain always lives inside an industry; a domain page without one would
// have no industry layer to inherit from.
const layeredSchema = graphSchema.refine((d) => !d.domain || d.industry, {
  message: '`domain` requires `industry`',
  path: ['domain'],
});

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: layeredSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkSiteUrl, remarkSpecIds],
  },
});
