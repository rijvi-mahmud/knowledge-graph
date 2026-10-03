import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { z } from 'zod';

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
const dependencySchema = z.object({
  service: z.string(),
  direction: z.enum(['upstream', 'downstream']),
  reason: z.string(),
  criticality: z.enum(['hard', 'soft']).default('hard'), // hard = blocks core flow when down
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
  name: z.string(),
  type: z.string(), // free-form so domains can use their own vocabulary
  required: z.boolean().default(false),
  description: z.string().optional(),
  constraints: z.string().optional(), // e.g. "must be in the future"
});

// --- rules, validation, lifecycle ------------------------------------------

// Business rule: WHY the system behaves a certain way. `rationale` matters most
// for AI - it prevents an assistant from "fixing" a rule it does not understand.
const businessRuleSchema = z.object({
  id: z.string(), // e.g. "BR-1"
  text: z.string(),
  rationale: z.string().optional(),
});

// Field-level validation, kept separate from business rules: these are
// mechanical input checks, not domain policy.
const validationSchema = z.object({
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
  name: z.string(),
  trigger: z.string().optional(),
  actor: z.string().optional(),
  steps: z.array(z.string()),
  outcome: z.string().optional(),
});

// --- requirements ----------------------------------------------------------

const requirementSchema = z.object({
  id: z.string(), // e.g. "FR-1"
  text: z.string(),
  priority: z.enum(['must', 'should', 'could']).default('must'),
});

const nfrSchema = z.object({
  category: z.enum([
    'performance',
    'security',
    'scalability',
    'availability',
    'compliance',
    'observability',
    'maintainability',
  ]),
  text: z.string(),
});

// Testable acceptance criteria in Given/When/Then form - the bridge between
// this spec and generated tests.
const acceptanceSchema = z.object({
  id: z.string(), // e.g. "AC-1"
  given: z.string(),
  when: z.string(),
  then: z.string(),
});

// --- interface -------------------------------------------------------------

const endpointSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path: z.string(),
  description: z.string(),
  request: z.string().optional(), // shape summary, not full OpenAPI
  response: z.string().optional(),
  errors: z.array(z.string()).default([]), // error codes this endpoint can raise
});

const eventSchema = z.object({
  name: z.string(), // e.g. "appointment.booked"
  description: z.string().optional(),
  payload: z.array(z.string()).default([]),
});

const permissionSchema = z.object({
  name: z.string(), // e.g. "appointment.write"
  description: z.string(),
});

const errorSchema = z.object({
  code: z.string(), // e.g. "APPOINTMENT_SLOT_TAKEN"
  http: z.number().optional(),
  message: z.string(),
});

// --- history & decisions ---------------------------------------------------

// Architecture/business decision record. The company-specific 20% mostly lands
// here: not documentation, but decisions AI must respect on later changes.
const decisionSchema = z.object({
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

  // 1. overview
  purpose: z.string().optional(),
  scope: z.array(z.string()).default([]),
  nonGoals: z.array(z.string()).default([]),
  actors: z.array(actorSchema).default([]),
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

  // 4. requirements
  functionalRequirements: z.array(requirementSchema).default([]),
  nonFunctionalRequirements: z.array(nfrSchema).default([]),
  acceptanceCriteria: z.array(acceptanceSchema).default([]),

  // 5. interface
  api: z.array(endpointSchema).default([]),
  events: z.array(eventSchema).default([]),
  permissions: z.array(permissionSchema).default([]),
  errors: z.array(errorSchema).default([]),
  dependencies: z.array(dependencySchema).default([]),

  // 6. history
  decisions: z.array(decisionSchema).default([]),
  openQuestions: z.array(z.string()).default([]),
  changelog: z.array(changelogSchema).default([]),
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
    // MDX options
  },
});
