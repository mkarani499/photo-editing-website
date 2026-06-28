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

console.log('🔑 API File Loaded:');
console.log('SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
console.log('MPESA_CONSUMER_KEY:', consumerKey ? '✅' : '❌');
console.log('MPESA_CONSUMER_SECRET:', consumerSecret ? '✅' : '❌');
console.log('MPESA_PASSKEY:', passkey ? '✅' : '❌');
console.log('MPESA_SHORTCODE:', shortcode ? '✅' : '❌');
console.log('Environment:', environment);

// Initialize Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// M-Pesa API URLs
const baseUrl = environment === 'sandbox' 
    ? 'https://sandbox.safaricom.co.ke'
    : 'https://api.safaricom.co.ke';

console.log('🌐 Base URL:', baseUrl);

// THIS IS THE HANDLER FUNCTION - it runs when someone clicks "Pay"
async function handler(req, res) {
    console.log('📥 Payment handler called!');
    
    // Only allow POST requests
    if (req.method !== 'POST') {
        console.log('❌ Method not POST:', req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('📦 Request body:', req.body);
        
        const { phone, photoCount, tier } = req.body; // ✅ ADDED: tier from request

        // Validate input
        if (!phone || !photoCount) {
            console.log('❌ Missing phone or photoCount');
            return res.status(400).json({ error: 'Phone number and photo count required' });
        }

        console.log('✅ Validation passed');

        // Clean phone number (remove spaces, add 254)
        let cleanPhone = phone.replace(/\s/g, '');
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '254' + cleanPhone.substring(1);
        } else if (!cleanPhone.startsWith('254')) {
            cleanPhone = '254' + cleanPhone;
        }
        console.log('📱 Clean phone:', cleanPhone);

        // ✅ UPDATED: Calculate price based on tier
        const tierPricing = {
            basic: 10,
            standard: 16,
            premium: 30
        };
        const pricePerPhoto = tierPricing[req.body.tier] || 10;
        const amount = pricePerPhoto * photoCount;
        console.log('💰 Price per photo:', pricePerPhoto);
        console.log('💰 Total amount:', amount);
        console.log('📊 Tier selected:', req.body.tier || 'basic (default)');

        // Generate order number
        const orderNumber = `ORD-${Date.now()}`;
        console.log('📋 Order number:', orderNumber);

        console.log('🔑 Getting M-Pesa access token...');
        
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

        console.log('✅ Got access token');

        // 2. Prepare STK Push request
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
        console.log('⏰ Timestamp:', timestamp);

        const stkRequest = {
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amount,
            PartyA: cleanPhone,
            PartyB: shortcode,
            PhoneNumber: cleanPhone,
            CallBackURL: 'https://yourdomain.com/api/callback',
            AccountReference: orderNumber,
            TransactionDesc: `Photo editing - ${photoCount} photos (${req.body.tier || 'basic'} tier)`
        };

        console.log('📤 Sending STK Push to:', cleanPhone);

        // 3. Send STK Push
        const stkResponse = await axios.post(
            `${baseUrl}/mpesa/stkpush/v1/processrequest`,
            stkRequest,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ STK Push sent. CheckoutRequestID:', stkResponse.data.CheckoutRequestID);

        // 4. Save order to Supabase
        const { data, error } = await supabase
            .from('orders')
            .insert([
                {
                    order_number: orderNumber,
                    customer_phone: cleanPhone,
                    photo_count: photoCount,
                    amount: amount,
                    tier: req.body.tier || 'basic', // ✅ ADDED: Save tier to database
                    checkout_request_id: stkResponse.data.CheckoutRequestID,
                    status: 'pending'
                }
            ]);

        if (error) {
            console.error('❌ Supabase error:', error);
            return res.status(500).json({ error: 'Failed to save order' });
        }

        console.log('✅ Order saved to Supabase');

        // 5. Return success with CheckoutRequestID
        res.status(200).json({
            success: true,
            checkoutRequestID: stkResponse.data.CheckoutRequestID,
            orderNumber: orderNumber,
            message: 'STK Push sent successfully. Please check your phone for the M-Pesa prompt.'
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('📡 Response data:', error.response.data);
            console.error('📡 Response status:', error.response.status);
        }
        res.status(500).json({
            error: 'Payment initiation failed',
            details: error.message
        });
    }
}

// EXPORT THE HANDLER - this makes it available to server.js
module.exports = handler;