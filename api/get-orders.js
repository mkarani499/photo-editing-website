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
        const { adminKey } = req.body;

        // Admin authentication
        if (adminKey !== adminPassword) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get recent orders (last 50)
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('❌ Supabase error:', error);
            return res.status(500).json({ error: 'Failed to fetch orders' });
        }

        res.status(200).json({
            success: true,
            orders: data || []
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
}

module.exports = handler;