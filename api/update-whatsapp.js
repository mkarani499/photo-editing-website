const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const adminPassword = process.env.ADMIN_PASSWORD;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { whatsappNumber, adminKey } = req.body;

        // Admin authentication
        if (adminKey !== adminPassword) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!whatsappNumber) {
            return res.status(400).json({ error: 'WhatsApp number required' });
        }

        // Clean the number (remove spaces, ensure 254 format)
        let cleanNumber = whatsappNumber.replace(/\s/g, '');
        if (cleanNumber.startsWith('0')) {
            cleanNumber = '254' + cleanNumber.substring(1);
        } else if (!cleanNumber.startsWith('254')) {
            cleanNumber = '254' + cleanNumber;
        }

        // Save to settings table
        const { data, error } = await supabase
            .from('settings')
            .upsert({
                id: 1,
                whatsapp_number: cleanNumber,
                updated_at: new Date().toISOString()
            })
            .select();

        if (error) {
            console.error('❌ Supabase error:', error);
            return res.status(500).json({ error: 'Failed to save WhatsApp number' });
        }

        res.status(200).json({
            success: true,
            message: 'WhatsApp number updated successfully!',
            whatsappNumber: cleanNumber
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: 'Failed to update WhatsApp number' });
    }
}

module.exports = handler;