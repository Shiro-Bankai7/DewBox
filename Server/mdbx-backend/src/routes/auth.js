const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { registerValidation, loginValidation } = require('../validators/auth');
const { validationResult } = require('express-validator');
const pool = require('../db');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// ✅ SECURITY: Apply rate limiting to registration
router.post('/register', registerLimiter, registerValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  console.log('📝 Registration request received');
  console.log('📋 Request body fields:', Object.keys(req.body));
  
  // Destructure all possible fields from frontend
  const {
    name, email, mobile, password, balance,
    firstname, othername, address1, country, state, dob, alternatePhone, currency, referral, referralPhone, nextOfKinName, nextOfKinContact, surname, city, gender, lga, joinEsusu
  } = req.body;
  
  console.log('✅ Required fields check:', {
    firstname: !!firstname,
    othername: !!othername,
    surname: !!surname,
    email: !!email,
    mobile: !!mobile,
    password: !!password,
    lga: !!lga,
    joinEsusu: !!joinEsusu
  });
  
  // Generate name if not provided
  const fullName = name && name.trim() ? name : [firstname, othername, surname].filter(Boolean).join(' ');
  
  // Retry logic for database operations
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`🔄 Retry attempt ${attempt}/${maxRetries}`);
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
      
      // 1. Check if user already exists by mobile or email
      console.log('🔍 Step 1: Checking for existing user...');
      // Try multiple mobile formats to prevent duplicates
      const mobileFormats = [];
      mobileFormats.push(mobile);
      const cleanMobile = mobile.replace(/[\s-]/g, '');
      mobileFormats.push(cleanMobile);
      
      if (cleanMobile.startsWith('+234')) {
        mobileFormats.push(cleanMobile.slice(1)); // 234XXXXXXXXXX
        mobileFormats.push('0' + cleanMobile.slice(4)); // 0XXXXXXXXXX
      } else if (cleanMobile.startsWith('234')) {
        mobileFormats.push('+' + cleanMobile); // +234XXXXXXXXXX
        mobileFormats.push('0' + cleanMobile.slice(3)); // 0XXXXXXXXXX
      } else if (cleanMobile.startsWith('0')) {
        mobileFormats.push('234' + cleanMobile.slice(1)); // 234XXXXXXXXXX
        mobileFormats.push('+234' + cleanMobile.slice(1)); // +234XXXXXXXXXX
      }
      
      const placeholders = mobileFormats.map(() => '?').join(',');
      const [existing] = await pool.query(
        `SELECT id FROM user WHERE mobile IN (${placeholders}) OR email = ?`,
        [...mobileFormats, email]
      );
      
      if (existing.length > 0) {
        console.log('⚠️ User already exists');
        return res.status(409).json({ message: 'Mobile number or email already registered' });
      }
      
      console.log('✅ Step 1 complete: No existing user found');
      
      // 2. Create subscriber first
      console.log('🔍 Step 2: Creating subscriber...');
      // Convert dob to 'YYYY-MM-DD' format for MySQL
      const dobFormatted = dob ? new Date(dob).toISOString().slice(0, 10) : null;
      
      console.log('📋 Subscriber data:', {
        firstname, othername, surname, city, lga, joinEsusu,
        dobFormatted, mobile, alternatePhone
      });
      
      const [subscriberResult] = await pool.query(
        `INSERT INTO subscribers (firstname, othername, address1, country, state, dob, mobile, alternatePhone, currency, referral, referralPhone, nextOfKinName, nextOfKinContact, surname, city, gender, password, lga, joinEsusu) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [firstname, othername, address1, country, state, dobFormatted, mobile, alternatePhone, currency, referral, referralPhone, nextOfKinName, nextOfKinContact, surname, city, gender, password ? await bcrypt.hash(password, 10) : null, lga, joinEsusu]
      );
      const subscriberId = subscriberResult.insertId;
      await pool.query(
        `INSERT INTO subscriber_balance
         (subscriber_id, mtd_contributed, ytd_contributed, available_balance,
          mtd_wallets, mtd_wallets_copy1, mtd_esusu, ytd_esusu, mtd_purchases, ytd_purchases)
         VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0)`,
        [subscriberId]
      );
      console.log('✅ Step 2 complete: Subscriber created with ID:', subscriberId);
      
      // 3. Create user and link to subscriber
      console.log('🔍 Step 3: Creating user...');
      await pool.query(
        `INSERT INTO user (id, name, email, mobile, password, balance, subscriber_id) VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
        [fullName, email, mobile, password ? await bcrypt.hash(password, 10) : null, balance || 0, subscriberId]
      );
      console.log('✅ Step 3 complete: User created');
      
      // Fetch the UUID of the user just inserted
      console.log('🔍 Step 4: Fetching user UUID...');
      const [userRows] = await pool.query('SELECT id, name, email, mobile, password, balance FROM user WHERE mobile = ? OR email = ?', [mobile, email]);
      const userId = userRows[0]?.id;
      console.log('✅ Step 4 complete: User ID:', userId);
      
      // 3b. Insert into users table for validation (if not already present)
      console.log('🔍 Step 5: Checking users table...');
      const [existingUsers] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
      if (existingUsers.length === 0) {
        await pool.query(
          `INSERT INTO users (id, name, email, mobile, password, balance) VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, fullName, email, mobile, userRows[0]?.password, balance || 0]
        );
        console.log('✅ Step 5 complete: User added to users table');
      } else {
        console.log('✅ Step 5 complete: User already in users table');
      }
      
      // 4. Update subscriber with userId (if needed)
      console.log('🔍 Step 6: Updating subscriber with userId...');
      await pool.query('UPDATE subscribers SET userId = ? WHERE id = ?', [userId, subscriberId]);
      console.log('✅ Step 6 complete: Subscriber updated');
      
      // 5. Return user and subscriber info
      console.log('🔍 Step 7: Generating response...');
      // Add hasContributed property (default false for now)
      const user = { id: userId, name: fullName, email, mobile, balance, subscriber_id: subscriberId };
      const subscriber = { 
        id: subscriberId, 
        firstname, 
        othername,
        surname,
        address1, 
        country, 
        state, 
        city,
        lga,
        dob, 
        mobile, 
        alternatePhone, 
        currency, 
        referral, 
        referralPhone, 
        nextOfKinName, 
        nextOfKinContact, 
        gender,
        joinEsusu,
        userId 
      };
      const hasContributed = false; // TODO: Replace with real logic if available
      const tokenPayload = { id: userId, email, mobile, hasContributed };
      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });
      
      console.log('✅ Registration successful!');
      return res.status(201).json({ user, subscriber, token, hasContributed });
      
    } catch (err) {
      lastError = err;
      console.error(`❌ Registration error on attempt ${attempt}:`, err.message);
      
      // Check if it's a connection error that we should retry
      const isConnectionError = err.code === 'ECONNRESET' || 
                               err.code === 'PROTOCOL_CONNECTION_LOST' ||
                               err.code === 'ETIMEDOUT' ||
                               err.errno === 'ECONNRESET';
      
      if (!isConnectionError || attempt === maxRetries) {
        // Don't retry for non-connection errors or if we've exhausted retries
        break;
      }
      
      console.log(`⚠️ Connection error detected, will retry...`);
    }
  }

  // If we get here, all retries failed
  console.error('❌ All retry attempts failed');
  console.error('❌ Last error:', lastError);
  console.error('❌ Stack trace:', lastError?.stack);

  res.status(500).json({ 
    message: 'Registration failed. Please try again.', 
    error: lastError?.message || 'Database connection error',
    details: process.env.NODE_ENV === 'development' ? lastError?.stack : undefined
  });
});

// ✅ SECURITY: Apply rate limiting to login
router.post('/login', loginLimiter, loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  let { mobile, password } = req.body;
  
  try {
    // Try multiple mobile number formats to find the user
    const mobileFormats = [];
    
    // Original format
    mobileFormats.push(mobile);
    
    // Remove any spaces or dashes
    const cleanMobile = mobile.replace(/[\s-]/g, '');
    mobileFormats.push(cleanMobile);
    
    // If starts with +234, add 234 and 0 versions
    if (cleanMobile.startsWith('+234')) {
      mobileFormats.push(cleanMobile.slice(1)); // 234XXXXXXXXXX
      mobileFormats.push('0' + cleanMobile.slice(4)); // 0XXXXXXXXXX
    } 
    // If starts with 234, add +234 and 0 versions
    else if (cleanMobile.startsWith('234')) {
      mobileFormats.push('+' + cleanMobile); // +234XXXXXXXXXX
      mobileFormats.push('0' + cleanMobile.slice(3)); // 0XXXXXXXXXX
    }
    // If starts with 0, add 234 and +234 versions
    else if (cleanMobile.startsWith('0')) {
      mobileFormats.push('234' + cleanMobile.slice(1)); // 234XXXXXXXXXX
      mobileFormats.push('+234' + cleanMobile.slice(1)); // +234XXXXXXXXXX
    }
    // If starts with 1 (US format), add +1 version
    else if (cleanMobile.startsWith('1') && cleanMobile.length === 11) {
      mobileFormats.push('+' + cleanMobile); // +1XXXXXXXXXX
    }
    
    console.log('[AUTH DEBUG] Trying mobile formats:', mobileFormats);
    
    // Try to find user with any of the formats
    const placeholders = mobileFormats.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT * FROM user WHERE mobile IN (${placeholders})`,
      mobileFormats
    );
    
    console.log('[AUTH DEBUG] User found:', rows.length > 0 ? 'Yes' : 'No');
    
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const payload = { id: user.id, email: user.email, mobile: user.mobile, hasContributed: false };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: payload, token, hasContributed: false });
  } catch (err) {
    console.error('LOGIN ERROR:', err); // Log full error to console
    res.status(500).json({ message: 'Login failed', error: err.message, stack: err.stack });
  }
});

router.get('/check', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    res.json({ user });
  });
});

module.exports = router;
