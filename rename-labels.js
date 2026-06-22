#!/usr/bin/env node
// Renames existing labels in Linear to match PDF v4 naming exactly

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(resolve(__dirname, '.env'), 'utf8');
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) process.env[key.trim()] = val.join('=').trim();
});

const API_KEY = process.env.LINEAR_API_KEY;
const ENDPOINT = 'https://api.linear.app/graphql';

async function gql(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': API_KEY },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

// Old name → New name (matching PDF v4 exactly)
const RENAMES = {
  'Selling Formats':      'Selling Formats / Purchase Options',
  'Customer Notification': 'Customer Notification Module',
  'Admin Notification':   'Admin Notification Module',
  'Integrations':         'Integrations Module',
};

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Label Rename — matching PDF v4');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { teams } = await gql(`query { teams { nodes { id key } } }`);
  const team = teams.nodes.find(t => t.key === 'TES');

  const { issueLabels } = await gql(`
    query($teamId: ID!) {
      issueLabels(filter: { team: { id: { eq: $teamId } } }) {
        nodes { id name }
      }
    }
  `, { teamId: team.id });

  for (const [oldName, newName] of Object.entries(RENAMES)) {
    const label = issueLabels.nodes.find(l => l.name === oldName);

    if (!label) {
      console.log(`   ⏭️  "${oldName}" not found — skipping`);
      continue;
    }

    const result = await gql(`
      mutation($id: String!, $input: IssueLabelUpdateInput!) {
        issueLabelUpdate(id: $id, input: $input) {
          success
          issueLabel { id name }
        }
      }
    `, { id: label.id, input: { name: newName } });

    if (result.issueLabelUpdate.success) {
      console.log(`   ✅ "${oldName}" → "${newName}"`);
    } else {
      console.log(`   ❌ Failed to rename "${oldName}"`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅ Labels updated — check Linear now');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error);
