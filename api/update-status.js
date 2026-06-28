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
        const { status, adminKey, message } = req.body;

        // Admin authentication
        if (adminKey !== adminPassword) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!status || !['online', 'offline'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Use "online" or "offline"' });
        }

        // Update settings
        const { data, error } = await supabase
            .from('settings')
            .upsert({
                id: 1,
                status: status,
                message: message || (status === 'online' 
                    ? '✅ I am online and accepting orders!' 
                    : '🔴 I am currently offline. Orders will be processed later.'),
                updated_at: new Date().toISOString()
            })
            .select();

        if (error) {
            console.error('❌ Supabase error:', error);
            return res.status(500).json({ error: 'Failed to update status' });
        }

        res.status(200).json({
            success: true,
            status: status,
            message: message || (status === 'online' 
                ? '✅ I am online and accepting orders!' 
                : '🔴 I am currently offline. Orders will be processed later.')
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
}

module.exports = handler;