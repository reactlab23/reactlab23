const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Load data from JSON files
let blueprintData = null;
let tikTokData = null;

try {
  blueprintData = JSON.parse(fs.readFileSync('blueprint (22).json', 'utf8'));
  console.log('Blueprint data loaded successfully');
} catch (error) {
  console.error('Error loading blueprint data:', error.message);
}

try {
  tikTokData = JSON.parse(fs.readFileSync('Новый текстовый документ (2).json', 'utf8'));
  console.log('TikTok data loaded successfully');
} catch (error) {
  console.error('Error loading TikTok data:', error.message);
}

// API Routes for communication
app.get('/api/status', (req, res) => {
  res.json({
    status: 'active',
    message: 'Communication system is working',
    blueprintLoaded: !!blueprintData,
    tikTokDataLoaded: !!tikTokData,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/blueprint/info', (req, res) => {
  if (!blueprintData) {
    return res.status(404).json({ error: 'Blueprint data not loaded' });
  }
  
  res.json({
    name: blueprintData.name,
    moduleCount: blueprintData.flow ? blueprintData.flow.length : 0,
    hasConnections: !!(blueprintData.connections && blueprintData.connections.length > 0)
  });
});

app.get('/api/tiktok/stats', (req, res) => {
  if (!tikTokData || !Array.isArray(tikTokData)) {
    return res.status(404).json({ error: 'TikTok data not loaded or invalid' });
  }
  
  const validVideos = tikTokData.filter(item => item.id && !item.error);
  
  res.json({
    totalItems: tikTokData.length,
    validVideos: validVideos.length,
    errors: tikTokData.length - validVideos.length,
    totalViews: validVideos.reduce((sum, video) => sum + (video.authorMeta?.fans || 0), 0)
  });
});

// Communication endpoints
app.post('/api/message', (req, res) => {
  const { message, type = 'general' } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  // Process the message based on type
  let response = {
    received: message,
    type: type,
    timestamp: new Date().toISOString(),
    reply: null
  };
  
  // Simple message processing
  if (message.toLowerCase().includes('статус') || message.toLowerCase().includes('status')) {
    response.reply = 'Система коммуникации активна. Blueprint и TikTok данные загружены.';
  } else if (message.toLowerCase().includes('данные') || message.toLowerCase().includes('data')) {
    response.reply = `Доступны данные: ${blueprintData ? 'Blueprint ✓' : 'Blueprint ✗'}, ${tikTokData ? 'TikTok ✓' : 'TikTok ✗'}`;
  } else if (message.toLowerCase().includes('привет') || message.toLowerCase().includes('hello')) {
    response.reply = 'Привет! Я система коммуникации для автоматизации. Как дела?';
  } else {
    response.reply = 'Сообщение получено. Система готова к общению!';
  }
  
  res.json(response);
});

// WebSocket server for real-time communication
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection established');
  
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Добро пожаловать в систему коммуникации!',
    timestamp: new Date().toISOString()
  }));
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('Received WebSocket message:', message);
      
      // Echo back with processing
      const response = {
        type: 'response',
        original: message,
        reply: `Получено через WebSocket: "${message.text || message.message || 'пустое сообщение'}"`,
        timestamp: new Date().toISOString()
      };
      
      ws.send(JSON.stringify(response));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Ошибка обработки сообщения',
        timestamp: new Date().toISOString()
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

server.listen(PORT, () => {
  console.log(`Communication server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api/`);
  console.log(`WebSocket available at ws://localhost:${PORT}`);
});