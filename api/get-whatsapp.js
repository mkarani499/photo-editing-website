const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function handler(req, res) {
    try {
        // Get WhatsApp number from settings
        const { data, error } = await supabase
            .from('settings')
            .select('whatsapp_number')
            .eq('id', 1)
            .single();

        if (error || !data || !data.whatsapp_number) {
            // Default number if not set
            return res.status(200).json({
                whatsappNumber: '254757133071'
            });
        }

        res.status(200).json({
            whatsappNumber: data.whatsapp_number
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(200).json({
            whatsappNumber: '254757133071'
        });
    }
}

module.exports = handler;