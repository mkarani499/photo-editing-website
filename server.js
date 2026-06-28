require('dotenv').config();

console.log('🔍 TESTING ENV VARIABLES:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅' : '❌');
console.log('MPESA_CONSUMER_KEY:', process.env.MPESA_CONSUMER_KEY ? '✅' : '❌');
console.log('MPESA_CONSUMER_SECRET:', process.env.MPESA_CONSUMER_SECRET ? '✅' : '❌');
console.log('MPESA_PASSKEY:', process.env.MPESA_PASSKEY ? '✅' : '❌');
console.log('MPESA_SHORTCODE:', process.env.MPESA_SHORTCODE ? '✅' : '❌');

const express = require('express');
const cors = require('cors');
const path = require('path');

// ✅ ADDED: Import the new API handlers (Step 11.3)
const verifyPayment = require('./api/verify-payment');
const getOrders = require('./api/get-orders');

// ✅ ADDED: Import WhatsApp handlers
const updateWhatsApp = require('./api/update-whatsapp');
const getWhatsApp = require('./api/get-whatsapp');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Import your API handler
const initiatePayment = require('./api/initiate-payment');

// Test endpoint - to check if API is reachable
app.post('/api/test-payment', (req, res) => {
    console.log('✅ Test endpoint was called!');
    console.log('Request body:', req.body);
    res.json({ message: 'Test endpoint working!', body: req.body });
});

// Main payment endpoint
app.post('/api/initiate-payment', (req, res) => {
    console.log('📥 initiate-payment route was called!');
    initiatePayment(req, res);
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is working! 🚀' });
});

// ✅ ADDED: New routes for payment verification and orders (Step 11.3)
app.post('/api/verify-payment', (req, res) => {
    verifyPayment(req, res);
});

app.post('/api/get-orders', (req, res) => {
    getOrders(req, res);
});

// ✅ ADDED: WhatsApp routes
app.post('/api/update-whatsapp', (req, res) => {
    updateWhatsApp(req, res);
});

app.get('/api/get-whatsapp', (req, res) => {
    getWhatsApp(req, res);
});

// Serve HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/success.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Open this URL in your browser`);
});