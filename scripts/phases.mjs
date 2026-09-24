// Single source of truth for the SDLC pipeline: phases, owning roles, gates.
// Used by state.mjs, gate.mjs, the PreToolUse guard and the dashboard.

export const ROLES = {
  pm:        { name: 'Product Manager', emoji: '🧭', agent: 'product-manager' },
  architect: { name: 'Architect',       emoji: '📐', agent: 'architect' },
  dev:       { name: 'Developer',       emoji: '💻', agent: 'developer' },
  qa:        { name: 'QA Engineer',     emoji: '🧪', agent: 'qa-engineer' },
  reviewer:  { name: 'Code Reviewer',   emoji: '🔍', agent: 'reviewer' },
  devops:    { name: 'DevOps Engineer', emoji: '🚀', agent: 'devops' },
  sre:       { name: 'SRE',             emoji: '🛟', agent: 'sre' },
  human:     { name: 'Stakeholder (you)', emoji: '🙋', agent: null },
  system:    { name: 'Pipeline',        emoji: '⚙️', agent: null },
};

// gate.kind:
//   human  – needs /sdlc:approve (a stakeholder / tech-lead sign-off)
//   auto   – verified mechanically by gate.mjs
//   none   – no exit gate
export const PHASES = [
  {
    id: 'idea', title: 'Idea', role: 'pm',
    summary: 'Capture the idea as an Epic so everyone agrees on the "why".',
    industry: 'A client or founder pitches an idea; the PM writes it down as an Epic.',
    gate: { kind: 'auto', label: 'Epic recorded' },
  },
  {
    id: 'requirements', title: 'Requirements', role: 'pm',
    summary: 'Write the PRD and user stories with acceptance criteria.',
    industry: 'PMs interview users and write a Product Requirements Document before any code.',
    gate: { kind: 'human', label: 'Stakeholder approves PRD' },
  },
  {
    id: 'design', title: 'Design', role: 'architect',
    summary: 'Choose the architecture and record the decision in an ADR.',
    industry: 'Architects write design docs / ADRs so future engineers know why choices were made.',
    gate: { kind: 'human', label: 'Tech lead approves design' },
  },
  {
    id: 'planning', title: 'Planning', role: 'pm',
    summary: 'Estimate stories, create a milestone and sprint board.',
    industry: 'Teams run sprint planning: estimate, prioritise, commit to a sprint.',
    gate: { kind: 'auto', label: 'Every story estimated' },
  },
  {
    id: 'build', title: 'Build', role: 'dev',
    summary: 'Implement stories on a feature branch and open a Pull Request.',
    industry: 'Developers never push to main; they open a PR linked to the story.',
    gate: { kind: 'auto', label: 'PR open & app builds' },
  },
  {
    id: 'test', title: 'Test', role: 'qa',
    summary: 'Write tests and a CI pipeline; CI must be green.',
    industry: 'QA and CI catch bugs automatically on every push.',
    gate: { kind: 'auto', label: 'CI green' },
  },
  {
    id: 'review', title: 'Code Review', role: 'reviewer',
    summary: 'Peer review the PR; the developer addresses comments.',
    industry: 'At least one other engineer must approve before code merges.',
    gate: { kind: 'human', label: 'Reviewer verdict + your approval' },
  },
  {
    id: 'deploy', title: 'Deploy', role: 'devops',
    summary: 'Preview deploy, merge, production deploy, tag a release.',
    industry: 'DevOps ships through a pipeline: preview → production → release notes.',
    gate: { kind: 'auto', label: 'Production URL healthy' },
  },
  {
    id: 'operate', title: 'Operate', role: 'sre',
    summary: 'Write the runbook and monitor production health.',
    industry: 'SREs keep the service running and respond to incidents.',
    gate: { kind: 'auto', label: 'Runbook + health check' },
  },
];

export const phaseIndex = (id) => PHASES.findIndex((p) => p.id === id);
