import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fix() {
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('username', 'admin');
    
    if (error) {
        console.error('Error deleting admin:', error);
    } else {
        console.log('Admin user deleted. Restart server to recreate with correct hash.');
    }
}

fix();
