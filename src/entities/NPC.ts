import Phaser from 'phaser';

export class NPC extends Phaser.Physics.Arcade.Sprite {
  npcId: string;
  private interactCallback: () => void;
  private interactZone: Phaser.GameObjects.Zone;
  private prompt: Phaser.GameObjects.Text;
  private canInteract = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    npcId: string,
    onInteract: () => void,
    /** Shown above the NPC when the player is in range (e.g. E to talk, R to fight). */
    interactHint = 'Press E',
  ) {
    super(scene, x, y, textureKey);
    this.npcId = npcId;
    this.interactCallback = onInteract;

    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body

    this.setScale(1.5);
    this.setDepth(5);

    // Interaction zone
    this.interactZone = scene.add.zone(x, y, 80, 80);
    scene.physics.add.existing(this.interactZone, true);
    const zb = this.interactZone.body as Phaser.Physics.Arcade.StaticBody;
    zb.updateFromGameObject();

    // Prompt text
    this.prompt = scene.add.text(x, y - 45, interactHint, {
      fontSize: '12px', fontFamily: 'Arial', color: '#ffd700',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(10).setVisible(false);
  }

  getZone(): Phaser.GameObjects.Zone {
    return this.interactZone;
  }

  showPrompt(): void {
    if (this.canInteract) this.prompt.setVisible(true);
  }

  hidePrompt(): void {
    this.prompt.setVisible(false);
  }

  setInteractHint(text: string): void {
    this.prompt.setText(text);
  }

  interact(): void {
    if (!this.canInteract) return;
    this.interactCallback();
  }

  setCanInteract(val: boolean): void {
    this.canInteract = val;
    if (!val) this.prompt.setVisible(false);
  }
}
