const express = require('express');
const axios = require('axios');

const bankRouter = express.Router();

bankRouter.get('/', async (req, res) => {
  try {
    if (!process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY.includes('your_actual_live_key_here')) {
      return res.status(503).json({
        status: false,
        message: 'Bank list service not configured. Please contact administrator.'
      });
    }

    const response = await axios.get('https://api.paystack.co/bank', {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    });
    // Return the full Paystack response which includes {status: true, data: [...]}
    res.json(response.data);
  } catch (err) {
    console.error('Banks fetch error:', err.message);

    if (err.response?.status === 401 || err.response?.status === 403) {
      return res.status(503).json({
        status: false,
        message: 'Bank list service authentication failed. Please contact administrator.'
      });
    }

    res.status(500).json({ 
      status: false,
      message: 'Failed to fetch banks from Paystack', 
      error: err.message 
    });
  }
});

bankRouter.post('/verify-account', async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;
    
    if (!accountNumber || !bankCode) {
      return res.status(400).json({ 
        status: false,
        message: 'Account number and bank code are required' 
      });
    }

    // Check if Paystack key is configured
    if (!process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY.includes('your_actual_live_key_here')) {
      console.error('Paystack API key not configured');
      return res.status(503).json({ 
        status: false,
        message: 'Bank verification service not configured. Please contact administrator.' 
      });
    }

    const response = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );
    
    res.json(response.data);
  } catch (err) {
    console.error('Account verification error:', err.response?.data || err.message);
    
    // Provide specific error messages
    if (err.response?.status === 401) {
      return res.status(401).json({ 
        status: false,
        message: 'Invalid Paystack API key. Please contact administrator.' 
      });
    }
    
    if (err.response?.status === 422 || err.response?.data?.message?.includes('Could not resolve')) {
      return res.status(404).json({ 
        status: false,
        message: 'Could not resolve account. Please check account number and bank.' 
      });
    }
    
    res.status(500).json({ 
      status: false,
      message: err.response?.data?.message || 'Failed to verify account. Please try again.' 
    });
  }
});

module.exports = bankRouter;
