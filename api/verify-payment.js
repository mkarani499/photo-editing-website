const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const consumerKey = process.env.MPESA_CONSUMER_KEY;
const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
const passkey = process.env.MPESA_PASSKEY;
const shortcode = process.env.MPESA_SHORTCODE;
const environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
const adminPassword = process.env.ADMIN_PASSWORD;

// Initialize Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// M-Pesa API URLs
const baseUrl = environment === 'sandbox' 
    ? 'https://sandbox.safaricom.co.ke'
    : 'https://api.safaricom.co.ke';

async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { checkoutRequestID, adminKey } = req.body;

        // Simple admin authentication
        if (adminKey !== adminPassword) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!checkoutRequestID) {
            return res.status(400).json({ error: 'CheckoutRequestID required' });
        }

        console.log('🔍 Verifying payment:', checkoutRequestID);

        // 1. Get M-Pesa access token
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
        const tokenResponse = await axios.get(
            `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
            {
                headers: {
                    Authorization: `Basic ${auth}`
                }
            }
        );
        const accessToken = tokenResponse.data.access_token;

        // 2. Query payment status
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

        const queryRequest = {
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestID
        };

        const queryResponse = await axios.post(
            `${baseUrl}/mpesa/stkpushquery/v1/query`,
            queryRequest,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const result = queryResponse.data;
        console.log('📡 Query result:', result);

        // 3. Update order in Supabase
        const updateData = {
            mpesa_result_code: result.ResultCode || 'unknown',
            mpesa_result_desc: result.ResultDesc || 'No description',
            status: result.ResultCode === '0' ? 'paid' : 'failed'
        };

        if (result.ResultCode === '0') {
            updateData.paid_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('orders')
            .update(updateData)
            .eq('checkout_request_id', checkoutRequestID)
            .select();

        if (error) {
            console.error('❌ Supabase error:', error);
            return res.status(500).json({ error: 'Failed to update order' });
        }

        // 4. Return result
        const isSuccess = result.ResultCode === '0';
        res.status(200).json({
            success: isSuccess,
            resultCode: result.ResultCode,
            resultDesc: result.ResultDesc,
            status: isSuccess ? '✅ Payment successful!' : '❌ Payment failed',
            order: data?.[0] || null
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('📡 Response data:', error.response.data);
        }
        res.status(500).json({
            error: 'Payment verification failed',
            details: error.message
        });
    }
}

module.exports = handler;