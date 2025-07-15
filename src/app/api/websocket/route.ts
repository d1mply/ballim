import { NextResponse } from 'next/server';
import { Server } from 'ws';
import { createServer } from 'http';

let wss: Server | null = null;
let httpServer: ReturnType<typeof createServer> | null = null;
const PORT = 3000;

const startWebSocketServer = () => {
  if (!wss) {
    try {
      // HTTP sunucusu oluştur
      httpServer = createServer();
      
      // WebSocket sunucusunu HTTP sunucusu üzerinde başlat
      wss = new WebSocketServer({ server: httpServer });

      wss.on('connection', (ws) => {
        console.log('Yeni bir istemci bağlandı');

        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message.toString());
            
            // Mesajı diğer tüm istemcilere ilet
            wss?.clients.forEach((client) => {
              if (client !== ws && client.readyState === ws.OPEN) {
                // Stok güncellemelerini de ekle
                if (data.type === 'STATUS_UPDATE') {
                  client.send(JSON.stringify({
                    ...data,
                    stockUpdate: true
                  }));
                } else {
                  client.send(message.toString());
                }
              }
            });
          } catch (error) {
            console.error('WebSocket mesajı işlenirken hata:', error);
          }
        });

        ws.on('close', () => {
          console.log('Bir istemci bağlantıyı kapattı');
        });

        ws.on('error', (error) => {
          console.error('WebSocket bağlantı hatası:', error);
        });
      });

      // HTTP sunucusunu başlat
      httpServer.listen(PORT, () => {
        console.log(`WebSocket sunucusu başlatıldı - port ${PORT}`);
      });

    } catch (error) {
      console.error('WebSocket sunucusu başlatılırken hata:', error);
      throw error;
    }
  }
};

// API route handler
export async function GET() {
  try {
    startWebSocketServer();
    
    return NextResponse.json({ 
      status: 'success',
      message: 'WebSocket sunucusu başlatıldı',
      port: PORT
    });
  } catch (error) {
    console.error('WebSocket sunucusu başlatma hatası:', error);
    return NextResponse.json(
      { error: 'WebSocket sunucusu başlatılamadı' },
      { status: 500 }
    );
  }
} 