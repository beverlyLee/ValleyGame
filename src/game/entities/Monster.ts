import * as Phaser from 'phaser';

export interface MonsterConfig {
  id: string;
  type: 'slime';
  x: number;
  y: number;
  health: number;
  damage: number;
  speed: number;
}

class Monster {
  public scene: Phaser.Scene;
  public id: string;
  public type: 'slime';
  public sprite!: Phaser.Physics.Arcade.Sprite;
  public health: number;
  public maxHealth: number;
  public damage: number;
  public speed: number;
  public isAlive: boolean = true;
  private healthBar!: Phaser.GameObjects.Graphics;
  private aggroRange: number = 200;
  private attackCooldown: number = 0;
  private attackCooldownTime: number = 1000;

  constructor(scene: Phaser.Scene, config: MonsterConfig) {
    this.scene = scene;
    this.id = config.id;
    this.type = config.type;
    this.health = config.health;
    this.maxHealth = config.health;
    this.damage = config.damage;
    this.speed = config.speed;

    this.createSprite(config.x, config.y);
    this.createHealthBar();
  }

  private createSprite(x: number, y: number): void {
    const graphics = this.scene.add.graphics();
    
    if (this.type === 'slime') {
      graphics.fillStyle(0xFF4444, 1);
      graphics.fillCircle(20, 20, 20);
      graphics.fillStyle(0xFF6666, 1);
      graphics.fillCircle(16, 16, 8);
      graphics.fillStyle(0x000000, 1);
      graphics.fillCircle(14, 18, 3);
      graphics.fillCircle(26, 18, 3);
      graphics.fillStyle(0xFFFFFF, 1);
      graphics.fillCircle(13, 16, 1);
      graphics.fillCircle(25, 16, 1);
    }
    
    graphics.generateTexture(this.id, 40, 40);
    graphics.destroy();

    this.sprite = this.scene.physics.add.sprite(x, y, this.id);
    this.sprite.setOrigin(0.5);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setScale(1.2);
    this.sprite.setDepth(10);
    this.sprite.setData('monster', this);
    this.sprite.setData('monsterId', this.id);
  }

  private createHealthBar(): void {
    this.healthBar = this.scene.add.graphics();
    this.healthBar.setDepth(15);
    this.updateHealthBar();
  }

  public updateHealthBarPosition(): void {
    this.updateHealthBar();
  }

  private updateHealthBar(): void {
    this.healthBar.clear();
    
    const barWidth = 40;
    const barHeight = 6;
    const x = this.sprite.x - barWidth / 2;
    const y = this.sprite.y - 35;
    
    this.healthBar.fillStyle(0x000000, 0.8);
    this.healthBar.fillRect(x, y, barWidth, barHeight);
    
    const healthPercent = this.health / this.maxHealth;
    const healthColor = healthPercent > 0.5 ? 0x00FF00 : healthPercent > 0.25 ? 0xFFFF00 : 0xFF0000;
    this.healthBar.fillStyle(healthColor, 1);
    this.healthBar.fillRect(x, y, barWidth * healthPercent, barHeight);
    
    this.healthBar.lineStyle(1, 0x000000, 1);
    this.healthBar.strokeRect(x, y, barWidth, barHeight);
  }

  public update(player: Phaser.Physics.Arcade.Sprite, delta: number): void {
    if (!this.isAlive) return;

    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }

    const distance = Phaser.Math.Distance.Between(
      player.x, player.y,
      this.sprite.x, this.sprite.y
    );

    if (distance < this.aggroRange) {
      this.moveTowardsPlayer(player);
    } else {
      this.sprite.setVelocity(0, 0);
    }

    this.updateHealthBar();
  }

  private moveTowardsPlayer(player: Phaser.Physics.Arcade.Sprite): void {
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y,
      player.x, player.y
    );

    this.sprite.setVelocity(
      Math.cos(angle) * this.speed,
      Math.sin(angle) * this.speed
    );
  }

  public canAttack(): boolean {
    return this.attackCooldown <= 0;
  }

  public resetAttackCooldown(): void {
    this.attackCooldown = this.attackCooldownTime;
  }

  public takeDamage(amount: number): boolean {
    this.health -= amount;
    
    if (this.health <= 0) {
      this.isAlive = false;
      this.die();
      return true;
    }
    
    this.sprite.setTint(0xFFFFFF);
    this.scene.time.delayedCall(100, () => {
      if (this.sprite && this.sprite.active) {
        this.sprite.clearTint();
      }
    });
    
    return false;
  }

  private die(): void {
    this.isAlive = false;
    if (this.healthBar) {
      this.healthBar.destroy();
      this.healthBar = null as any;
    }
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null as any;
    }
  }

  public destroy(): void {
    this.isAlive = false;
    if (this.healthBar) {
      this.healthBar.destroy();
      this.healthBar = null as any;
    }
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null as any;
    }
  }
}

export default Monster;
export { Monster };
// MonsterConfig is already exported via 'export interface MonsterConfig'
