import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const contents = fs.readFileSync(filePath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function normalizePhone(phone) {
  return phone.replace(/[^\d+]/g, '');
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const nextValue = argv[index + 1];
    values[key] = nextValue && !nextValue.startsWith('--') ? nextValue : 'true';
  }
  return values;
}

const projectRoot = path.resolve(process.cwd());
loadEnvFile(path.join(projectRoot, '.env.local'));
loadEnvFile(path.join(projectRoot, '.env'));

const args = parseArgs(process.argv.slice(2));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const requiredSetupCode = process.env.OWNER_BOOTSTRAP_TOKEN;

if (!url || !serviceRoleKey) {
  console.error('Missing Supabase environment variables. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.');
  process.exit(1);
}

if (!args.name || !args.phone || !args.email || !args.password) {
  console.error('Usage: node scripts/bootstrap-owner.mjs --name "Owner Name" --phone "9876543210" --email "owner@example.com" --password "StrongPass123" [--setup-code "code"]');
  process.exit(1);
}

if (requiredSetupCode && args['setup-code'] !== requiredSetupCode) {
  console.error('Invalid setup code.');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const { count, error: countError } = await supabase
  .from('users')
  .select('id', { count: 'exact', head: true })
  .eq('role', 'owner');

if (countError) {
  console.error(`Could not check existing owner state: ${countError.message}`);
  process.exit(1);
}

if ((count || 0) > 0) {
  console.error('Owner account already exists. Bootstrap is closed.');
  process.exit(1);
}

const email = String(args.email).trim().toLowerCase();
const name = String(args.name).trim();
const phone = normalizePhone(String(args.phone));
const password = String(args.password);

const { data: authResult, error: authError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
    name,
    role: 'owner'
  }
});

if (authError || !authResult.user) {
  console.error(`Could not create owner auth user: ${authError?.message || 'Unknown error'}`);
  process.exit(1);
}

const { error: insertError } = await supabase.from('users').insert({
  id: authResult.user.id,
  role: 'owner',
  name,
  phone,
  email
});

if (insertError) {
  await supabase.auth.admin.deleteUser(authResult.user.id);
  console.error(`Could not create owner profile: ${insertError.message}`);
  process.exit(1);
}

console.log(`Owner created successfully: ${email}`);
