import * as Phaser from 'phaser';
import { gameStore } from '../../store/useGameStore';

export interface Waypoint {
  x: number;
  y: number;
  startTime: number;
  endTime: number;
  label: string;
}

export interface NPCConfig {
  id: string;
  name: string;
  role: 'blacksmith' | 'shopkeeper';
  startX: number;
  startY: number;
  waypoints: Waypoint[];
  dialogues: string[];
  color: number;
}

class NPC {
  public scene: Phaser.Scene;
  public id: string;
  public name: string;
  public role: 'blacksmith' | 'shopkeeper';
  public sprite!: Phaser.Physics.Arcade.Sprite;
  public waypoints: Waypoint[];
  public currentWaypoint: Waypoint | null;
  public dialogues: string[];
  // @ts-expect-error: color is defined in config but not used in sprite rendering
  private _color: number;
  private nameTag!: Phaser.GameObjects.Text;
  private interactionIndicator!: Phaser.GameObjects.Text;
  private isMoving: boolean = false;
  private moveSpeed: number = 30;
  private isInteracting: boolean = false;

  constructor(scene: Phaser.Scene, config: NPCConfig) {
    this.scene = scene;
    this.id = config.id;
    this.name = config.name;
    this.role = config.role;
    this.waypoints = config.waypoints;
    this.dialogues = config.dialogues;
    this.currentWaypoint = null;
    this._color = config.color;

    this.createSprite(config.startX, config.startY);
    this.createNameTag();
    this.createInteractionIndicator();
  }

  private createSprite(x: number, y: number): void {
    const graphics = this.scene.add.graphics();
    
    if (this.role === 'blacksmith') {
      graphics.fillStyle(0x8B4513, 1);
      graphics.fillRect(8, 20, 24, 28);
      graphics.fillStyle(0x654321, 1);
      graphics.fillRect(10, 22, 20, 24);
      graphics.fillStyle(0xFFE4C4, 1);
      graphics.fillCircle(20, 12, 12);
      graphics.fillStyle(0x000000, 1);
      graphics.fillRect(8, 2, 24, 8);
      graphics.fillCircle(15, 10, 2);
      graphics.fillCircle(25, 10, 2);
      graphics.fillStyle(0xFF6347, 1);
      graphics.fillCircle(20, 15, 2);
    } else {
      graphics.fillStyle(0x228B22, 1);
      graphics.fillRect(8, 20, 24, 28);
      graphics.fillStyle(0x32CD32, 1);
      graphics.fillRect(10, 22, 20, 24);
      graphics.fillStyle(0xFFE4C4, 1);
      graphics.fillCircle(20, 12, 12);
      graphics.fillStyle(0x8B4513, 1);
      graphics.fillRect(8, 0, 24, 6);
      graphics.fillStyle(0x000000, 1);
      graphics.fillCircle(15, 10, 2);
      graphics.fillCircle(25, 10, 2);
      graphics.fillStyle(0xFF69B4, 1);
      graphics.fillCircle(20, 15, 2);
    }
    
    graphics.generateTexture(this.id, 40, 48);
    graphics.destroy();

    this.sprite = this.scene.physics.add.sprite(x, y, this.id);
    this.sprite.setOrigin(0.5);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setScale(1.2);
    this.sprite.setDepth(10);
    this.sprite.setData('npc', this);
    this.sprite.setImmovable(true);
  }

  private createNameTag(): void {
    this.nameTag = this.scene.add.text(0, 0, this.name, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5).setDepth(100);
  }

  private createInteractionIndicator(): void {
    this.interactionIndicator = this.scene.add.text(0, 0, '按 E 交互', {
      fontSize: '12px',
      color: '#FFD700',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5).setDepth(100).setVisible(false);
  }

  public update(player: Phaser.Physics.Arcade.Sprite): void {
    const isNearPlayer = this.isNearPlayer(player);
    
    if (this.isInteracting || isNearPlayer) {
      this.sprite.setVelocity(0, 0);
      this.isMoving = false;
      this.updateUI(player);
      return;
    }
    this.updateSchedule();
    this.updateMovement();
    this.updateUI(player);
  }

  private updateSchedule(): void {
    const currentHour = this.getCurrentHour();
    
    for (const waypoint of this.waypoints) {
      if (currentHour >= waypoint.startTime && currentHour < waypoint.endTime) {
        if (this.currentWaypoint !== waypoint) {
          this.currentWaypoint = waypoint;
          this.moveTo(waypoint.x, waypoint.y);
        }
        break;
      }
    }
  }

  private getCurrentHour(): number {
    const gameTime = gameStore.getState().gameTime || 8;
    return gameTime;
  }

  private moveTo(x: number, y: number): void {
    this.isMoving = true;
    const dx = x - this.sprite.x;
    const dy = y - this.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 5) {
      const vx = (dx / distance) * this.moveSpeed;
      const vy = (dy / distance) * this.moveSpeed;
      this.sprite.setVelocity(vx, vy);
    } else {
      this.sprite.setVelocity(0, 0);
      this.isMoving = false;
    }
  }

  private updateMovement(): void {
    if (this.currentWaypoint && this.isMoving) {
      const distance = Phaser.Math.Distance.Between(
        this.sprite.x, this.sprite.y,
        this.currentWaypoint.x, this.currentWaypoint.y
      );
      
      if (distance < 10) {
        this.sprite.setVelocity(0, 0);
        this.isMoving = false;
        this.sprite.setPosition(this.currentWaypoint.x, this.currentWaypoint.y);
      }
    }
  }

  private updateUI(player: Phaser.Physics.Arcade.Sprite): void {
    const distance = Phaser.Math.Distance.Between(
      player.x, player.y,
      this.sprite.x, this.sprite.y
    );

    this.nameTag.setPosition(this.sprite.x, this.sprite.y - 40);
    
    if (distance < 100) {
      this.interactionIndicator.setPosition(this.sprite.x, this.sprite.y - 65);
      this.interactionIndicator.setVisible(true);
    } else {
      this.interactionIndicator.setVisible(false);
    }
  }

  public getRandomDialogue(): string {
    const index = Math.floor(Math.random() * this.dialogues.length);
    return this.dialogues[index];
  }

  public isNearPlayer(player: Phaser.Physics.Arcade.Sprite): boolean {
    const distance = Phaser.Math.Distance.Between(
      player.x, player.y,
      this.sprite.x, this.sprite.y
    );
    return distance < 100;
  }

  public setInteracting(interacting: boolean): void {
    this.isInteracting = interacting;
  }

  public destroy(): void {
    this.sprite.destroy();
    this.nameTag.destroy();
    this.interactionIndicator.destroy();
  }
}

export default NPC;
export { NPC };
// NPCConfig and Waypoint are already exported via 'export interface'
