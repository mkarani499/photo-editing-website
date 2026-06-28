const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function handler(req, res) {
    try {
        // Get status from Supabase
        const { data, error } = await supabase
            .from('settings')
            .select('status, message')
            .eq('id', 1)
            .single();

        if (error || !data) {
            // Default status if no settings found
            return res.status(200).json({
                status: 'online',
                message: '✅ I am online and accepting orders!'
            });
        }

        res.status(200).json({
            status: data.status || 'online',
            message: data.message || '✅ I am online and accepting orders!'
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(200).json({
            status: 'online',
            message: '✅ I am online and accepting orders!'
        });
    }
}

module.exports = handler;