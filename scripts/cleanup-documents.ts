
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.dirname(__dirname);
const envPath = path.join(PROJECT_ROOT, '.env.local');

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach((line) => {
        const [key, value] = line.split('=');
        if (key && value) {
            if (key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') {
                supabaseUrl = value.trim().replace(/"/g, '');
            }
            if (key.trim() === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
                supabaseKey = value.trim().replace(/"/g, '');
            }
        }
    });
}

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    console.log('🗑️  Starting database cleanup...');

    const { error, count } = await supabase
        .from('documents')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (error) {
        console.error('❌ Error deleting documents:', error);
        process.exit(1);
    }

    console.log(`✅ Successfully deleted documents.`);
}

cleanup().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
