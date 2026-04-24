type PeerData = { name: string; scene: string; x: number; y: number };
type PeerCallback = (data: PeerData) => void;
type PeerLeaveCallback = (name: string) => void;

const WS_URL = 'ws://localhost:3001';
const SEND_INTERVAL_MS = 50; // ~20 fps position updates

export class MultiplayerManager {
  private static instance: MultiplayerManager;
  private ws: WebSocket | null = null;
  private myName = '';
  private peerName = '';
  private lastSendTime = 0;

  private onPeerUpdateCb: PeerCallback | null = null;
  private onPeerLeftCb: PeerLeaveCallback | null = null;

  private constructor() {}

  static getInstance(): MultiplayerManager {
    if (!MultiplayerManager.instance) {
      MultiplayerManager.instance = new MultiplayerManager();
    }
    return MultiplayerManager.instance;
  }

  /**
   * Register this player on the server (makes you discoverable).
   * Call after a multiplayer session starts, before entering the world.
   */
  register(myName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.myName = myName;
      try {
        this.ws = new WebSocket(WS_URL);
      } catch {
        reject(new Error('Could not connect to multiplayer server'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Connection timed out'));
        this.ws?.close();
      }, 5000);

      this.ws.onopen = () => {
        clearTimeout(timeout);
        this._send({ type: 'register', name: myName });
        this.ws!.onmessage = this._handleMessage.bind(this);
        resolve();
      };

      this.ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Could not connect to multiplayer server'));
      };
    });
  }

  /**
   * After registering, request to join a named peer.
   * Resolves with peer's current location, rejects if not online.
   */
  join(targetName: string): Promise<PeerData> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Not connected'));
        return;
      }
      this.peerName = targetName;

      const prevHandler = this.ws!.onmessage;

      this.ws!.onmessage = (event: MessageEvent) => {
        let msg: Record<string, unknown>;
        try { msg = JSON.parse(event.data as string); } catch { return; }

        if (msg.type === 'peer_found') {
          this.ws!.onmessage = this._handleMessage.bind(this);
          resolve({ name: targetName, scene: msg.scene as string, x: msg.x as number, y: msg.y as number });
        } else if (msg.type === 'peer_not_found') {
          this.ws!.onmessage = prevHandler;
          reject(new Error(`${targetName} is not online`));
        } else {
          // Pass other messages through while waiting
          this._handleMessage(event);
        }
      };

      this._send({ type: 'join', target: targetName });
    });
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getPeerName(): string { return this.peerName; }
  getMyName(): string { return this.myName; }

  onPeerUpdate(cb: PeerCallback): void { this.onPeerUpdateCb = cb; }
  onPeerLeft(cb: PeerLeaveCallback): void { this.onPeerLeftCb = cb; }

  sendPosition(scene: string, x: number, y: number): void {
    const now = Date.now();
    if (now - this.lastSendTime < SEND_INTERVAL_MS) return;
    this.lastSendTime = now;
    this._send({ type: 'move', scene, x: Math.round(x), y: Math.round(y) });
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this.myName = '';
    this.peerName = '';
    this.onPeerUpdateCb = null;
    this.onPeerLeftCb = null;
  }

  private _handleMessage(event: MessageEvent): void {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(event.data as string); } catch { return; }

    const type = msg.type as string;

    if (type === 'peer_move' || type === 'peer_joined') {
      this.onPeerUpdateCb?.({
        name: msg.peer as string,
        scene: msg.scene as string,
        x: msg.x as number,
        y: msg.y as number,
      });
    } else if (type === 'peer_left') {
      this.onPeerLeftCb?.(msg.peer as string);
    }
  }

  private _send(msg: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}
