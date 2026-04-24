import { WebSocketServer } from 'ws';

const PORT = 3001;
const wss = new WebSocketServer({ port: PORT });

// name -> { ws, scene, x, y, peer: string | null }
const players = new Map();

function send(ws, msg) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

// WebSocket.OPEN is 1 in the ws module
const WS_OPEN = 1;

function safeSend(ws, msg) {
  if (ws.readyState === WS_OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

wss.on('connection', (ws) => {
  let myName = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'register': {
        myName = msg.name;
        players.set(myName, { ws, scene: 'TownScene', x: 0, y: 0, peer: null });
        console.log(`[+] ${myName} registered`);
        break;
      }

      case 'join': {
        if (!myName) return;
        const targetName = msg.target;
        const target = players.get(targetName);

        if (!target || target.ws.readyState !== WS_OPEN) {
          safeSend(ws, { type: 'peer_not_found', peer: targetName });
          return;
        }

        // Pair them
        players.get(myName).peer = targetName;
        target.peer = myName;

        const me = players.get(myName);

        // Tell joiner where target is
        safeSend(ws, {
          type: 'peer_found',
          peer: targetName,
          scene: target.scene,
          x: target.x,
          y: target.y,
        });

        // Notify target
        safeSend(target.ws, {
          type: 'peer_joined',
          peer: myName,
          scene: me.scene,
          x: me.x,
          y: me.y,
        });

        console.log(`[=] ${myName} joined ${targetName}`);
        break;
      }

      case 'move': {
        if (!myName) return;
        const me = players.get(myName);
        if (!me) return;
        me.x = msg.x;
        me.y = msg.y;
        me.scene = msg.scene;

        if (me.peer) {
          const target = players.get(me.peer);
          if (target) {
            safeSend(target.ws, {
              type: 'peer_move',
              peer: myName,
              scene: msg.scene,
              x: msg.x,
              y: msg.y,
            });
          }
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    if (!myName) return;
    console.log(`[-] ${myName} disconnected`);
    const me = players.get(myName);
    if (me?.peer) {
      const target = players.get(me.peer);
      if (target) {
        target.peer = null;
        safeSend(target.ws, { type: 'peer_left', peer: myName });
      }
    }
    players.delete(myName);
  });
});

console.log(`Unleashed multiplayer server running on ws://localhost:${PORT}`);
