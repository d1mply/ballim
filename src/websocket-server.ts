import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const WS_PORT = 3001;

// HTTP sunucusu oluştur
const server = createServer();

// WebSocket sunucusunu HTTP sunucusu üzerinde başlat
const wss = new WebSocketServer({ 
  server,
  path: '/ws',
  perMessageDeflate: false // Performans için sıkıştırmayı kapat
});

// Bağlantı hatalarını yakala
wss.on('error', (error) => {
  console.error('WebSocket sunucu hatası:', error);
});

wss.on('connection', (ws) => {
  console.log('Yeni bir istemci bağlandı');

  // Ping-pong ile bağlantı kontrolü
  const pingInterval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.ping();
    }
  }, 30000);

  ws.on('message', (message) => {
    try {
      // Gelen mesajı diğer tüm istemcilere ilet
      const data = message.toString();
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === ws.OPEN) {
          client.send(data);
        }
      });
    } catch (error) {
      console.error('Mesaj iletilirken hata:', error);
    }
  });

  ws.on('close', () => {
    console.log('Bir istemci bağlantıyı kapattı');
    clearInterval(pingInterval);
  });

  ws.on('error', (error) => {
    console.error('WebSocket bağlantı hatası:', error);
  });
});

// HTTP sunucusunu başlat - tüm IP adreslerinden erişime aç
server.listen(WS_PORT, '0.0.0.0', () => {
  console.log(`WebSocket sunucusu port ${WS_PORT} üzerinde çalışıyor`);
}); 