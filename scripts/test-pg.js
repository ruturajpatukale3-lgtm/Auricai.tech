const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync('../.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

// Using connection string format: postgres-[project_ref]...
// Supabase provides Postgres connection params, but we usually use a connection string.
// If the user's connection string isn't here, we'll try to find it.

console.log(envVars);
