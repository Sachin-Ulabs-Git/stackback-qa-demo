#!/usr/bin/env node
// Linear workspace setup script
// Configures: workflow states, labels, and issue templates
// Target: test-product-data-qa / TestProductDataQa team

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually (no dotenv needed)
const envFile = readFileSync(resolve(__dirname, '.env'), 'utf8');
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) process.env[key.trim()] = val.join('=').trim();
});

const API_KEY = process.env.LINEAR_API_KEY;
const ENDPOINT = 'https://api.linear.app/graphql';

// ─── GraphQL helper ────────────────────────────────────────────────────────────
async function gql(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

// ─── Data definitions ──────────────────────────────────────────────────────────

const WORKFLOW_STATES = [
  { name: 'Triage',    type: 'unstarted', color: '#eb5757', position: 0 },
  { name: 'Backlog',   type: 'backlog',   color: '#6b7280', position: 1 },
  { name: 'Confirmed', type: 'started',   color: '#f2c94c', position: 2 },
  { name: 'In Review', type: 'started',   color: '#1a4fa0', position: 3 },
  { name: 'Done',      type: 'completed', color: '#1a7a3a', position: 4 },
];

const LABELS = [
  // ── Surface: Customer Zone (blue) ──
  { name: 'Storefront Surface',      color: '#1a4fa0' },
  { name: 'Portal Surface',          color: '#1a4fa0' },
  { name: 'Landing Surface',         color: '#1a4fa0' },
  // ── Surface: Merchant Zone (green) ──
  { name: 'Order Module',                        color: '#1a7a3a' },
  { name: 'CX Module',                           color: '#1a7a3a' },
  { name: 'Selling Formats / Purchase Options',  color: '#1a7a3a' },
  { name: 'Customer Notification Module',        color: '#1a7a3a' },
  { name: 'Admin Notification Module',           color: '#1a7a3a' },
  { name: 'Settings & Config',                   color: '#1a7a3a' },
  { name: 'Onboarding',                          color: '#1a7a3a' },
  { name: 'Customer Module',                     color: '#1a7a3a' },
  { name: 'Integrations Module',                 color: '#1a7a3a' },
  // ── Error Types ──
  { name: 'Purchase Error',          color: '#1a4fa0' },
  { name: 'Timeline Error',          color: '#1a7a3a' },
  { name: 'Scheduler Error',         color: '#b45309' },
  { name: 'CX Module Error',         color: '#6d28d9' },
  { name: 'UI Feedback',             color: '#6b7280' },
  // ── Severity ──
  { name: 'Critical',                color: '#d63030' },
  { name: 'High',                    color: '#c85a00' },
  { name: 'Medium',                  color: '#b45309' },
  { name: 'Low',                     color: '#6b7280' },
];

const TEMPLATE_1_BODY = `Surface: [select from label]   |   Error Type: [select from label]
Store: [Name]   |   Plan: [Prepaid / PAYG / Bundle]

---

In [Surface > Sub-module], while [doing X], [describe what went wrong].
[Add context — plan type, steps that led here, what you expected.]

To reproduce:
1.
2.
3.

Screenshots / Logs: [Attach]`;

const TEMPLATE_2_BODY = `Surface / Screen: [Storefront / Portal / Landing / Admin screen name]
Component: [e.g. Edit Drawer CTA, Pricing Summary card, Widget plan selector]
Device: Mobile / Desktop / Both

---

[Describe what's off — what it looks like vs what it should look like.]

Screenshots: [Attach — annotate if possible]`;

const PROJECTS = [
  { name: 'Try Before You Buy',   description: 'TBYB page and widget — INT-03' },
  { name: 'WhatsApp Integration', description: 'Wati + Interakt integration — PT-01' },
  { name: 'Master Admin',         description: 'Admin notification route — INT-01' },
];

const TEMPLATES = [
  {
    name: 'Module / Functional Issue',
    description: 'For broken or wrong behaviour — calculations, failed actions, jobs not firing.',
    body: TEMPLATE_1_BODY,
  },
  {
    name: 'UI / Design Issue',
    description: 'For visual or UX problems — misalignment, mobile vs desktop, component parity.',
    body: TEMPLATE_2_BODY,
  },
];

// ─── Main setup ────────────────────────────────────────────────────────────────

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Linear Setup — TestProductDataQa');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── Step 1: Get team ────────────────────────────────────────────────────────
  console.log('① Fetching team...');
  const { teams } = await gql(`query { teams { nodes { id name key } } }`);
  const team = teams.nodes.find(t => t.key === 'TES') || teams.nodes[0];
  if (!team) throw new Error('No team found in this workspace.');
  console.log(`   ✅ Team: ${team.name} (ID: ${team.id})\n`);

  // ── Step 2: Workflow states ─────────────────────────────────────────────────
  console.log('② Setting up workflow states...');
  const { workflowStates } = await gql(`
    query($teamId: ID!) {
      workflowStates(filter: { team: { id: { eq: $teamId } } }) {
        nodes { id name type }
      }
    }
  `, { teamId: team.id });

  const existing = workflowStates.nodes.map(s => s.name.toLowerCase());
  console.log(`   Existing: ${workflowStates.nodes.map(s => s.name).join(', ')}`);

  for (const state of WORKFLOW_STATES) {
    if (existing.includes(state.name.toLowerCase())) {
      console.log(`   ⏭️  "${state.name}" already exists — skipping`);
      continue;
    }
    const result = await gql(`
      mutation($input: WorkflowStateCreateInput!) {
        workflowStateCreate(input: $input) {
          success
          workflowState { id name }
        }
      }
    `, { input: { teamId: team.id, name: state.name, type: state.type, color: state.color, position: state.position } });

    if (result.workflowStateCreate.success) {
      console.log(`   ✅ Created: ${state.name}`);
    } else {
      console.log(`   ❌ Failed: ${state.name}`);
    }
  }
  console.log();

  // ── Step 3: Labels ──────────────────────────────────────────────────────────
  console.log('③ Creating labels...');

  const { issueLabels } = await gql(`
    query($teamId: ID!) {
      issueLabels(filter: { team: { id: { eq: $teamId } } }) {
        nodes { id name }
      }
    }
  `, { teamId: team.id });
  const existingLabels = issueLabels.nodes.map(l => l.name.toLowerCase());

  let labelOk = 0, labelSkip = 0, labelFail = 0;

  for (const label of LABELS) {
    if (existingLabels.includes(label.name.toLowerCase())) {
      console.log(`   ⏭️  "${label.name}" already exists — skipping`);
      labelSkip++;
      continue;
    }
    try {
      const result = await gql(`
        mutation($input: IssueLabelCreateInput!) {
          issueLabelCreate(input: $input) {
            success
            issueLabel { id name }
          }
        }
      `, { input: { teamId: team.id, name: label.name, color: label.color } });

      if (result.issueLabelCreate.success) {
        console.log(`   ✅ ${label.name}`);
        labelOk++;
      } else {
        console.log(`   ❌ ${label.name}`);
        labelFail++;
      }
    } catch (err) {
      console.log(`   ❌ ${label.name} — ${err.message}`);
      labelFail++;
    }
  }
  console.log(`   → ${labelOk} created, ${labelSkip} skipped, ${labelFail} failed\n`);

  // ── Step 4: Templates ───────────────────────────────────────────────────────
  console.log('④ Creating issue templates...');

  for (const tmpl of TEMPLATES) {
    try {
      const result = await gql(`
        mutation($input: TemplateCreateInput!) {
          templateCreate(input: $input) {
            success
            template { id name }
          }
        }
      `, {
        input: {
          teamId: team.id,
          name: tmpl.name,
          description: tmpl.description,
          type: 'issue',
          templateData: JSON.stringify({ description: tmpl.body }),
        }
      });

      if (result.templateCreate.success) {
        console.log(`   ✅ ${tmpl.name}`);
      } else {
        console.log(`   ❌ ${tmpl.name}`);
      }
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log(`   ⏭️  "${tmpl.name}" already exists — skipping`);
      } else {
        console.log(`   ❌ ${tmpl.name} — ${err.message}`);
      }
    }
  }

  // ── Step 5: Projects ────────────────────────────────────────────────────────
  console.log('\n⑤ Creating projects...');
  for (const project of PROJECTS) {
    try {
      const result = await gql(`
        mutation($input: ProjectCreateInput!) {
          projectCreate(input: $input) {
            success
            project { id name }
          }
        }
      `, {
        input: {
          name: project.name,
          description: project.description,
          teamIds: [team.id],
        }
      });

      if (result.projectCreate.success) {
        console.log(`   ✅ ${project.name}`);
      } else {
        console.log(`   ❌ ${project.name}`);
      }
    } catch (err) {
      console.log(`   ❌ ${project.name} — ${err.message}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅ Setup complete — check Linear now');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(err => {
  console.error('\n❌ Setup failed:\n', err.message);
  process.exit(1);
});
