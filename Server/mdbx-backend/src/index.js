require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRouter = require('./routes/authRouter');
const userRoutes = require('./routes/userRoutes');
const transactionRoutes = require('./routes/transactions');
const bankRoutes = require('./routes/banks');
const errorHandler = require('./middleware/errorHandler');
const pool = require('./db');
const { initializeContributionCron } = require('./services/contributionCron');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();
app.set('trust proxy', 1);

// ✅ SECURITY: Add security headers with helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// ✅ SECURITY: Enforce HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '200kb' }));
app.use(apiLimiter);

const contributionRoutes = require('./routes/contributions');
const adminRoutes = require('./routes/admin');
const subscriberRoutes = require('./routes/subscribers');
const coopRoutes = require('./routes/coops');
const walletRoutes = require('./routes/wallets');
const grantRoutes = require('./routes/grants');
const lookupRoutes = require('./routes/lookups');
const locationRoutes = require('./routes/locations');
const apiDocsRoutes = require('./routes/apiDocs');
const homeRoutes = require('./routes/home');

// Auth routes
app.use('/auth', authRouter);
// Transaction routes (must come before /users to avoid conflicts)
app.use('/users/transactions', transactionRoutes);
// Contribution routes
app.use('/contributions', contributionRoutes);
// Admin routes
app.use('/admin', adminRoutes);
// User routes
app.use('/users', userRoutes);
// Bank routes
app.use('/banks', bankRoutes);
// Subscriber routes
app.use('/subscribers', subscriberRoutes);
// Coop routes
app.use('/coops', coopRoutes);
// Wallet routes
app.use('/wallets', walletRoutes);
// Grant routes
app.use('/grants', grantRoutes);
// Lookup routes (reference data)
app.use('/lookups', lookupRoutes);
// Location routes (countries, states, cities, LGAs)
app.use('/locations', locationRoutes);
// API Documentation
app.use('/api-docs', apiDocsRoutes);
// Homepage
app.use('/', homeRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MyDewbox API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      color: #333;
      padding: 40px 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { text-align: center; color: white; margin-bottom: 60px; }
    .header h1 { font-size: 3rem; font-weight: 800; margin-bottom: 10px; }
    .status { background: #10b981; color: white; padding: 8px 20px; border-radius: 20px; display: inline-block; margin-top: 20px; }
    .card { background: white; border-radius: 16px; padding: 30px; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
    .card h2 { color: #667eea; font-size: 1.8rem; margin-bottom: 20px; }
    .endpoint { background: #f8fafc; border-left: 4px solid #667eea; padding: 20px; margin: 15px 0; border-radius: 8px; }
    .method { display: inline-block; padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 0.85rem; margin-right: 10px; }
    .get { background: #10b981; color: white; }
    .post { background: #3b82f6; color: white; }
    .put { background: #f59e0b; color: white; }
    .delete { background: #ef4444; color: white; }
    code { background: #1e293b; color: #10b981; padding: 2px 8px; border-radius: 4px; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 MyDewbox API</h1>
      <p>RESTful API for Financial Management</p>
      <span class="status">✓ Online</span>
    </div>

    <div class="card">
      <h2>🔐 Authentication</h2>
      <div class="endpoint">
        <span class="method post">POST</span>
        <code>/auth/register</code>
        <p>Register a new user account</p>
      </div>
      <div class="endpoint">
        <span class="method post">POST</span>
        <code>/auth/login</code>
        <p>Login and receive JWT token</p>
      </div>
    </div>

    <div class="card">
      <h2>👤 Users</h2>
      <div class="endpoint">
        <span class="method get">GET</span>
        <code>/users/profile</code>
        <p>Get user profile information</p>
      </div>
      <div class="endpoint">
        <span class="method put">PUT</span>
        <code>/users/profile</code>
        <p>Update user profile</p>
      </div>
      <div class="endpoint">
        <span class="method get">GET</span>
        <code>/users/balance</code>
        <p>Get user wallet balance</p>
      </div>
    </div>

    <div class="card">
      <h2>💸 Transactions</h2>
      <div class="endpoint">
        <span class="method get">GET</span>
        <code>/users/transactions</code>
        <p>Get transaction history</p>
      </div>
      <div class="endpoint">
        <span class="method post">POST</span>
        <code>/users/transactions</code>
        <p>Create new transaction</p>
      </div>
    </div>

    <div class="card">
      <h2>🏦 Banks</h2>
      <div class="endpoint">
        <span class="method get">GET</span>
        <code>/banks</code>
        <p>Get list of supported banks</p>
      </div>
      <div class="endpoint">
        <span class="method post">POST</span>
        <code>/banks/verify-account</code>
        <p>Verify bank account details</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
  res.send(html);
});

app.use(errorHandler);

const PORT = process.env.PORT || 4000;

// Test database connection before starting server
async function startServer() {
  try {
    console.log('\n🔄 Connecting to database...');
    console.log(`📍 Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`📦 Database: ${process.env.DB_NAME || 'not configured'}`);
    
    // Test the connection
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully!\n');
    connection.release();
    
    // Initialize cron jobs
    initializeContributionCron();
    
    // Start the server
    app.listen(PORT, () => {
      console.log('╔════════════════════════════════════════╗');
      console.log('║   🚀 MDBX Backend Server Started      ║');
      console.log('╚════════════════════════════════════════╝');
      console.log(`\n📡 Server running on: http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⏰ Started at: ${new Date().toLocaleString()}\n`);
      console.log('Available endpoints:');
      console.log('  • GET  / - Health check');
      console.log('  • POST /auth/* - Authentication routes');
      console.log('  • GET  /users/* - User routes');
      console.log('  • GET  /users/transactions/* - Transaction routes');
      console.log('  • GET  /banks/* - Bank routes');
      console.log('  • GET  /subscribers/* - Subscriber routes');
      console.log('  • GET  /coops/* - Cooperative routes');
      console.log('  • GET  /wallets/* - Wallet routes');
      console.log('  • GET  /grants/* - Grant routes');
      console.log('  • GET  /lookups/* - Lookup/Reference data routes\n');
      console.log('Press Ctrl+C to stop the server\n');
    });
  } catch (error) {
    console.error('\n❌ Database connection failed!');
    console.error('Error:', error.message);
    console.error('\n💡 Tips:');
    console.error('  1. Check if your database server is running');
    console.error('  2. Verify your .env file has correct credentials:');
    console.error('     - DB_HOST');
    console.error('     - DB_USERNAME');
    console.error('     - DB_PASSWORD');
    console.error('     - DB_NAME');
    console.error('  3. Ensure the database exists\n');
    process.exit(1);
  }
}

startServer();

module.exports = app;
