require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

// Import routes
const authRoutes = require('./src/routes/auth');
const apiRoutes = require('./src/routes/api');
const schedulerRoutes = require('./src/routes/scheduler');
const goRoutes = require('./src/routes/go');
const { startScheduler } = require('./src/services/schedulerService');

const app = express();
const PORT = process.env.PORT || 3000;

const gracefulShutdown = (server, signalname) => {
    console.log(`\n${signalname} signal received.`);
    console.log('Closing HTTP server...');

    server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
    });
};

// Required for reverse proxies
app.set('trust proxy', 1)

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'src/public')));

// Routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/scheduler', schedulerRoutes);
app.use('/planner', goRoutes);

// Root route
app.get('/', (req, res) => {
    if (req.session && req.session.account) {
        res.sendFile(path.join(__dirname, 'src/public/dashboard.html'))
    } else {
        res.sendFile(path.join(__dirname, 'src/public/anonymous.html'))
    }
});


// Start server
const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');

    // Start background scheduler
    startScheduler();

    // Catch interrupts for graceful shutdown
    process.on('SIGINT', () => gracefulShutdown(server, 'SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown(server, 'SIGTERM'));
});