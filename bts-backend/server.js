// server.js
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import webpush from 'web-push';
import { fileURLToPath } from 'url';

// Setup __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express + Socket.IO setup
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

const PORT = process.env.PORT || 3000;


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve sw.js, icons, etc.

// Load nickname list from file
const filePath = path.join(__dirname, 'nicknames.json');
let nicknames = [];
if (fs.existsSync(filePath)) {
  try {
    nicknames = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error('❌ Error reading nicknames file:', err);
    nicknames = [];
  }
}

// POST /register
app.post('/register', (req, res) => {
  const { nickname } = req.body;
  if (!nickname || typeof nickname !== 'string') {
    return res.json({ success: false, message: 'Invalid nickname' });
  }

  const lowercaseNickname = nickname.toLowerCase();
  if (nicknames.includes(lowercaseNickname)) {
    return res.json({ success: false, message: 'Nickname already taken' });
  }

  nicknames.push(lowercaseNickname);
  fs.writeFileSync(filePath, JSON.stringify(nicknames, null, 2));
  res.json({ success: true });
});

// Web Push Setup (secure keys in env for production!)
const publicKey = 'BLEuZFY064dYuBtZzErjsHJ30Vf15_Tw5v2nYuOYBjMyqes7bm-BYaN75eLLBOHS6HaSUJsEqXxSSiGD7hPrzRA';
const privateKey = 'sEfbRqMFFkvA3Ebev_yn8OcnTEUACD7ww3MzWAALwRI';
webpush.setVapidDetails('mailto:bts@army.com', publicKey, privateKey);

// Push subscriptions
let subscriptions = [];
app.post('/subscribe', (req, res) => {
  const sub = req.body;
  if (!subscriptions.find((s) => s.endpoint === sub.endpoint)) {
    subscriptions.push(sub);
  }
  res.status(201).json({});
});

// Live button logic
let activeUsersForButton = new Set();
let alertThreshold = 3;
let lastAlertTime = 0;

io.on('connection', (socket) => {
  console.log('🟣 A user connected:', socket.id);

  // Slight delay to fix overcounting on refresh
  setTimeout(() => {
    io.emit('update-user-count', io.engine.clientsCount);
  }, 100);

  // BTS live button press handler
  socket.on('bts-live', () => {
    const now = Date.now();
    activeUsersForButton.add(socket.id);
    console.log(`👥 Unique Users Pressed: ${activeUsersForButton.size}`);

    if (activeUsersForButton.size >= alertThreshold && now - lastAlertTime > 60000) {
      lastAlertTime = now;
      console.log('🚨 Threshold reached — sending notifications');

      // Desktop + Push
      io.emit('show-notification');

      subscriptions.forEach((sub) => {
        webpush.sendNotification(
          sub,
          JSON.stringify({
            title: 'BTS is LIVE!',
            body: 'A member just went live on Weverse! 💜',
            icon: '/purple-heart1.png',
          })
        ).catch((err) => console.error('❌ Push Error:', err));
      });

      activeUsersForButton.clear();
    }
  });

  // On disconnect
  socket.on('disconnect', () => {
    console.log('🔴 User disconnected:', socket.id);
    activeUsersForButton.delete(socket.id);

    setTimeout(() => {
      io.emit('update-user-count', io.engine.clientsCount);
    }, 100);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
