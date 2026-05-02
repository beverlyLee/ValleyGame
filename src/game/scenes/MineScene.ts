import * as Phaser from 'phaser';
import { gameStore } from '../../store/useGameStore';
import Monster from '../entities/Monster';
import type { MonsterConfig } from '../entities/Monster';

interface BreakableRock {
  id: string;
  sprite: Phaser.Physics.Arcade.Sprite;
  health: number;
}

class MineScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private playerSpeed: number = 200;
  private jKey!: Phaser.Input.Keyboard.Key;
  private eKey!: Phaser.Input.Keyboard.Key;

  private readonly MAP_WIDTH = 30;
  private readonly MAP_HEIGHT = 30;
  private readonly TILE_SIZE = 64;

  private groundLayer!: Phaser.GameObjects.Group;
  private collisionLayer!: Phaser.Physics.Arcade.StaticGroup;

  private monsters: Monster[] = [];
  private breakableRocks: BreakableRock[] = [];

  private isAttacking: boolean = false;
  private attackHitbox!: Phaser.GameObjects.Arc;
  private attackAngle: number = 0;
  private attackDuration: number = 200;
  private attackCooldown: number = 0;
  private attackCooldownTime: number = 400;

  private exitPortal!: Phaser.Physics.Arcade.Sprite;

  // @ts-ignore: Unused class property, possibly for future use
  private _lastTime: number = 0;

  private damageTextGroup!: Phaser.GameObjects.Group;

  constructor() {
    super({ key: 'MineScene' });
  }

  preload(): void {
  }

  create(): void {
    console.log('⛏️ MineScene 开始创建...');
    
    this._lastTime = this.time.now;

    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.createMap();
    this.createPlayer();
    this.setupCamera();
    this.setupInput();
    this.setupCollisions();
    this.createExitPortal();
    this.createMonsters();
    this.createBreakableRocks();
    this.createAttackHitbox();
    this.createUI();
    this.subscribeToStore();

    console.log('✅ MineScene 创建完成！');
    console.log(`👾 怪物数量: ${this.monsters.length}`);
    console.log(`🪨 可破坏岩石数量: ${this.breakableRocks.length}`);
  }

  update(time: number, delta: number): void {
    this._lastTime = time;

    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }

    this.handlePlayerMovement();
    this.updatePlayerAnimation();
    this.handleAttackKey();
    this.handleEKey();
    this.updateAttackHitbox();
    this.updateMonsters(delta);
    this.checkExitPortal();
    this.updateUI();
  }

  private createMap(): void {
    const worldWidth = this.MAP_WIDTH * this.TILE_SIZE;
    const worldHeight = this.MAP_HEIGHT * this.TILE_SIZE;

    this.cameras.main.setBackgroundColor(0x12121f);

    this.groundLayer = this.add.group();
    this.collisionLayer = this.physics.add.staticGroup();

    const groundGraphics = this.add.graphics();
    groundGraphics.fillStyle(0x1e1e30, 1);
    groundGraphics.fillRect(0, 0, this.TILE_SIZE, this.TILE_SIZE);
    groundGraphics.fillStyle(0x181828, 1);
    groundGraphics.fillRect(3, 3, 18, 12);
    groundGraphics.fillRect(42, 42, 14, 10);
    groundGraphics.fillRect(20, 40, 12, 8);
    groundGraphics.fillStyle(0x25253d, 1);
    groundGraphics.fillRect(25, 8, 8, 6);
    groundGraphics.fillRect(45, 15, 10, 8);
    const groundTextureKey = 'mine_ground_tile';
    groundGraphics.generateTexture(groundTextureKey, this.TILE_SIZE, this.TILE_SIZE);
    groundGraphics.destroy();

    const groundAltGraphics = this.add.graphics();
    groundAltGraphics.fillStyle(0x1a1a2e, 1);
    groundAltGraphics.fillRect(0, 0, this.TILE_SIZE, this.TILE_SIZE);
    groundAltGraphics.fillStyle(0x222240, 1);
    groundAltGraphics.fillRect(8, 8, 15, 10);
    groundAltGraphics.fillRect(38, 38, 16, 12);
    groundAltGraphics.fillStyle(0x1c1c35, 1);
    groundAltGraphics.fillRect(30, 15, 10, 8);
    groundAltGraphics.fillRect(12, 45, 12, 8);
    const groundAltTextureKey = 'mine_ground_alt_tile';
    groundAltGraphics.generateTexture(groundAltTextureKey, this.TILE_SIZE, this.TILE_SIZE);
    groundAltGraphics.destroy();

    const wallGraphics = this.add.graphics();
    wallGraphics.fillStyle(0x3a2718, 1);
    wallGraphics.fillRect(0, 0, this.TILE_SIZE, this.TILE_SIZE);
    wallGraphics.fillStyle(0x2d1f10, 1);
    wallGraphics.fillRect(2, 2, this.TILE_SIZE - 4, this.TILE_SIZE - 4);
    wallGraphics.fillStyle(0x4a3728, 1);
    wallGraphics.fillRect(8, 8, 18, 13);
    wallGraphics.fillRect(36, 40, 18, 14);
    wallGraphics.fillStyle(0x5c4033, 1);
    wallGraphics.fillRect(10, 35, 10, 9);
    wallGraphics.fillRect(42, 12, 14, 11);
    const wallTextureKey = 'mine_wall_tile';
    wallGraphics.generateTexture(wallTextureKey, this.TILE_SIZE, this.TILE_SIZE);
    wallGraphics.destroy();

    const crystalGraphics = this.add.graphics();
    crystalGraphics.fillStyle(0x00BFFF, 0.8);
    crystalGraphics.beginPath();
    crystalGraphics.moveTo(32, 10);
    crystalGraphics.lineTo(40, 30);
    crystalGraphics.lineTo(35, 54);
    crystalGraphics.lineTo(29, 54);
    crystalGraphics.lineTo(24, 30);
    crystalGraphics.closePath();
    crystalGraphics.fill();
    crystalGraphics.fillStyle(0x87CEEB, 0.5);
    crystalGraphics.beginPath();
    crystalGraphics.moveTo(32, 15);
    crystalGraphics.lineTo(37, 28);
    crystalGraphics.lineTo(34, 45);
    crystalGraphics.lineTo(30, 45);
    crystalGraphics.lineTo(27, 28);
    crystalGraphics.closePath();
    crystalGraphics.fill();
    const crystalTextureKey = 'mine_crystal';
    crystalGraphics.generateTexture(crystalTextureKey, 64, 64);
    crystalGraphics.destroy();

    const torchGraphics = this.add.graphics();
    torchGraphics.fillStyle(0x8B4513, 1);
    torchGraphics.fillRect(28, 35, 8, 25);
    torchGraphics.fillStyle(0xFF6600, 1);
    torchGraphics.beginPath();
    torchGraphics.moveTo(32, 10);
    torchGraphics.lineTo(38, 35);
    torchGraphics.lineTo(26, 35);
    torchGraphics.closePath();
    torchGraphics.fill();
    torchGraphics.fillStyle(0xFFCC00, 0.8);
    torchGraphics.beginPath();
    torchGraphics.moveTo(32, 18);
    torchGraphics.lineTo(36, 32);
    torchGraphics.lineTo(28, 32);
    torchGraphics.closePath();
    torchGraphics.fill();
    const torchTextureKey = 'mine_torch';
    torchGraphics.generateTexture(torchTextureKey, 64, 64);
    torchGraphics.destroy();

    const boneGraphics = this.add.graphics();
    boneGraphics.fillStyle(0xF5F5DC, 1);
    boneGraphics.fillRect(10, 28, 44, 8);
    boneGraphics.fillStyle(0xFFFFF0, 1);
    boneGraphics.fillCircle(12, 32, 6);
    boneGraphics.fillCircle(52, 32, 6);
    boneGraphics.fillCircle(12, 28, 4);
    boneGraphics.fillCircle(52, 28, 4);
    const boneTextureKey = 'mine_bone';
    boneGraphics.generateTexture(boneTextureKey, 64, 64);
    boneGraphics.destroy();

    const mushroomGraphics = this.add.graphics();
    mushroomGraphics.fillStyle(0x8B0000, 1);
    mushroomGraphics.beginPath();
    mushroomGraphics.arc(32, 24, 14, Math.PI, 0, false);
    mushroomGraphics.closePath();
    mushroomGraphics.fill();
    mushroomGraphics.fillStyle(0xFFFFFF, 0.6);
    mushroomGraphics.fillCircle(26, 18, 3);
    mushroomGraphics.fillCircle(36, 20, 2);
    mushroomGraphics.fillStyle(0xF5DEB3, 1);
    mushroomGraphics.fillRect(29, 24, 6, 12);
    const mushroomTextureKey = 'mine_mushroom';
    mushroomGraphics.generateTexture(mushroomTextureKey, 64, 64);
    mushroomGraphics.destroy();

    for (let row = 0; row < this.MAP_HEIGHT; row++) {
      for (let col = 0; col < this.MAP_WIDTH; col++) {
        const x = col * this.TILE_SIZE + this.TILE_SIZE / 2;
        const y = row * this.TILE_SIZE + this.TILE_SIZE / 2;

        const isEdge = row === 0 || row === this.MAP_HEIGHT - 1 || 
                       col === 0 || col === this.MAP_WIDTH - 1;

        if (isEdge) {
          const collisionTile = this.physics.add.staticImage(x, y, wallTextureKey);
          this.collisionLayer.add(collisionTile);
        } else {
          const useAltGround = Math.random() < 0.3;
          const groundTileKey = useAltGround ? groundAltTextureKey : groundTextureKey;
          const groundTile = this.add.image(x, y, groundTileKey);
          this.groundLayer.add(groundTile);

          if (Math.random() < 0.08) {
            const decoration = this.add.graphics();
            decoration.fillStyle(0x141425, 1);
            const decoX = Math.random() * 40 + 10;
            const decoY = Math.random() * 40 + 10;
            decoration.fillRect(decoX, decoY, 10 + Math.random() * 6, 6 + Math.random() * 4);
            const decoKey = `mine_deco_${row}_${col}`;
            decoration.generateTexture(decoKey, this.TILE_SIZE, this.TILE_SIZE);
            decoration.destroy();
            
            const decoSprite = this.add.image(x, y, decoKey);
            this.groundLayer.add(decoSprite);
          }
        }
      }
    }

    this.createDecorationElements(
      worldWidth, 
      worldHeight, 
      crystalTextureKey, 
      torchTextureKey, 
      boneTextureKey, 
      mushroomTextureKey
    );

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    
    console.log('🗺️ MineScene 地图创建完成');
    console.log(`   - 地面瓦片数量: ${this.groundLayer.getChildren().length}`);
    console.log(`   - 碰撞瓦片数量: ${this.collisionLayer.getChildren().length}`);
  }

  private createDecorationElements(
    worldWidth: number,
    worldHeight: number,
    crystalTextureKey: string,
    torchTextureKey: string,
    boneTextureKey: string,
    mushroomTextureKey: string
  ): void {
    const centerX = worldWidth / 2;
    const centerY = worldHeight / 2;
    const safeMargin = this.TILE_SIZE * 3;

    const crystalPositions = [
      { x: centerX - 400, y: centerY - 300 },
      { x: centerX + 400, y: centerY - 300 },
      { x: centerX - 300, y: centerY + 200 },
      { x: centerX + 300, y: centerY + 200 },
      { x: centerX - 500, y: centerY },
      { x: centerX + 500, y: centerY },
    ];

    for (const pos of crystalPositions) {
      if (pos.x > safeMargin && pos.x < worldWidth - safeMargin &&
          pos.y > safeMargin && pos.y < worldHeight - safeMargin) {
        const crystal = this.add.image(pos.x, pos.y, crystalTextureKey);
        crystal.setDepth(3);
        crystal.setScale(0.8 + Math.random() * 0.4);
        
        this.tweens.add({
          targets: crystal,
          alpha: { from: 0.7, to: 1 },
          scale: { from: crystal.scale * 0.95, to: crystal.scale * 1.05 },
          duration: 2000 + Math.random() * 1000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });

        const glow = this.add.circle(pos.x, pos.y, 30, 0x00BFFF, 0.15);
        glow.setDepth(2);
        this.tweens.add({
          targets: glow,
          alpha: { from: 0.1, to: 0.25 },
          scale: { from: 1, to: 1.2 },
          duration: 2000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    }

    const torchPositions = [
      { x: safeMargin + this.TILE_SIZE, y: safeMargin + this.TILE_SIZE },
      { x: worldWidth - safeMargin - this.TILE_SIZE, y: safeMargin + this.TILE_SIZE },
      { x: safeMargin + this.TILE_SIZE, y: worldHeight - safeMargin - this.TILE_SIZE },
      { x: worldWidth - safeMargin - this.TILE_SIZE, y: worldHeight - safeMargin - this.TILE_SIZE },
      { x: centerX - 200, y: centerY - 300 },
      { x: centerX + 200, y: centerY - 300 },
    ];

    for (const pos of torchPositions) {
      const torch = this.add.image(pos.x, pos.y, torchTextureKey);
      torch.setDepth(4);
      torch.setScale(0.9);

      const torchGlow = this.add.circle(pos.x, pos.y - 15, 40, 0xFF6600, 0.1);
      torchGlow.setDepth(3);
      
      this.tweens.add({
        targets: [torch, torchGlow],
        alpha: { from: 0.85, to: 1 },
        scale: { from: 0.95, to: 1.05 },
        duration: 300 + Math.random() * 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    for (let i = 0; i < 8; i++) {
      const x = safeMargin + Math.random() * (worldWidth - safeMargin * 2);
      const y = safeMargin + Math.random() * (worldHeight - safeMargin * 2);
      
      const decorationType = Math.random();
      let sprite: Phaser.GameObjects.Image;
      
      if (decorationType < 0.4) {
        sprite = this.add.image(x, y, boneTextureKey);
        sprite.setRotation(Math.random() * Math.PI);
        sprite.setScale(0.6 + Math.random() * 0.3);
      } else {
        sprite = this.add.image(x, y, mushroomTextureKey);
        sprite.setScale(0.5 + Math.random() * 0.3);
      }
      
      sprite.setDepth(2);
      this.groundLayer.add(sprite);
    }
  }

  private createPlayer(): void {
    const centerX = this.MAP_WIDTH * this.TILE_SIZE / 2;
    const centerY = this.MAP_HEIGHT * this.TILE_SIZE / 2;
    
    const startX = centerX;
    const startY = centerY + 200;

    this.player = this.physics.add.sprite(startX, startY, 'player');
    this.player.setOrigin(0.5);
    this.player.setCollideWorldBounds(true);
    this.player.setScale(1.2);
    this.player.setDepth(10);
    
    console.log(`🎮 玩家起始位置: (${startX}, ${startY})`);
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(
      0, 
      0, 
      this.MAP_WIDTH * this.TILE_SIZE, 
      this.MAP_HEIGHT * this.TILE_SIZE
    );
    
    this.cameras.main.startFollow(this.player, true, 0.05, 0.05);
    this.cameras.main.setZoom(1);
  }

  private setupInput(): void {
    if (!this.input.keyboard) {
      console.error('❌ 键盘输入系统未初始化！');
      return;
    }

    this.cursors = this.input.keyboard.createCursorKeys();

    this.wasdKeys = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };

    this.jKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    console.log('✅ 键盘输入初始化完成');
  }

  private setupCollisions(): void {
    this.physics.add.collider(this.player, this.collisionLayer);
  }

  private createExitPortal(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x8B4513, 1);
    graphics.fillRect(5, 5, 50, 50);
    graphics.fillStyle(0x654321, 1);
    graphics.fillRect(10, 10, 40, 40);
    graphics.fillStyle(0xFFD700, 1);
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI / 2) + (Math.PI / 4);
      const x = 30 + Math.cos(angle) * 12;
      const y = 30 + Math.sin(angle) * 12;
      graphics.fillCircle(x, y, 4);
    }
    graphics.generateTexture('exit_portal', 60, 60);
    graphics.destroy();

    const portalX = this.TILE_SIZE * 4;
    const portalY = this.TILE_SIZE * 4;

    this.exitPortal = this.physics.add.sprite(
      portalX,
      portalY,
      'exit_portal'
    );
    this.exitPortal.setOrigin(0.5);
    this.exitPortal.setImmovable(true);
    this.exitPortal.setDepth(5);

    const glow = this.add.circle(
      portalX,
      portalY,
      50,
      0xFFD700,
      0.15
    );
    glow.setDepth(4);

    this.tweens.add({
      targets: glow,
      alpha: { from: 0.15, to: 0.35 },
      scale: { from: 1, to: 1.2 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.add.text(
      this.exitPortal.x,
      this.exitPortal.y - 50,
      '🚪 返回农场',
      {
        fontSize: '16px',
        color: '#FFD700',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: { x: 8, y: 4 }
      }
    ).setOrigin(0.5).setDepth(100);

    console.log(`🚪 出口传送门位置: (${portalX}, ${portalY})`);
  }

  private createMonsters(): void {
    const centerX = this.MAP_WIDTH * this.TILE_SIZE / 2;
    const centerY = this.MAP_HEIGHT * this.TILE_SIZE / 2;
    
    const playerStartX = centerX;
    const playerStartY = centerY + 200;

    const slimeConfigs: MonsterConfig[] = [
      { id: 'slime_1', type: 'slime', x: playerStartX - 150, y: playerStartY - 150, health: 30, damage: 10, speed: 50 },
      { id: 'slime_2', type: 'slime', x: playerStartX + 150, y: playerStartY - 150, health: 30, damage: 10, speed: 50 },
      { id: 'slime_3', type: 'slime', x: playerStartX, y: playerStartY - 250, health: 30, damage: 10, speed: 50 }
    ];

    for (const config of slimeConfigs) {
      const monster = new Monster(this, config);
      this.monsters.push(monster);
      
      this.physics.add.collider(monster.sprite, this.collisionLayer);
      
      this.physics.add.collider(this.player, monster.sprite);
    }
    
    console.log(`👾 创建了 ${this.monsters.length} 个怪物`);
  }

  private createBreakableRocks(): void {
    const centerX = this.MAP_WIDTH * this.TILE_SIZE / 2;
    const centerY = this.MAP_HEIGHT * this.TILE_SIZE / 2;
    
    const playerStartX = centerX;
    const playerStartY = centerY + 200;

    const rockPositions = [
      { x: playerStartX - 250, y: playerStartY - 50 },
      { x: playerStartX + 250, y: playerStartY - 50 },
      { x: playerStartX - 200, y: playerStartY - 200 },
      { x: playerStartX + 200, y: playerStartY - 200 },
      { x: playerStartX - 350, y: playerStartY - 150 },
      { x: playerStartX + 350, y: playerStartY - 150 }
    ];

    for (let i = 0; i < rockPositions.length; i++) {
      const pos = rockPositions[i];
      const graphics = this.add.graphics();
      
      graphics.fillStyle(0x808080, 1);
      graphics.fillRect(5, 10, 50, 40);
      graphics.fillStyle(0x696969, 1);
      graphics.fillRect(10, 15, 40, 30);
      graphics.fillStyle(0x909090, 1);
      graphics.fillRect(15, 18, 15, 10);
      graphics.fillRect(35, 25, 10, 8);
      
      const textureKey = `breakable_rock_${i}`;
      graphics.generateTexture(textureKey, 60, 55);
      graphics.destroy();

      const rockSprite = this.physics.add.sprite(pos.x, pos.y, textureKey);
      rockSprite.setOrigin(0.5);
      rockSprite.setImmovable(true);
      rockSprite.setDepth(5);
      rockSprite.setData('rockId', `rock_${i}`);
      
      const body = rockSprite.body as Phaser.Physics.Arcade.Body;
      body.setSize(50, 40, true);

      this.breakableRocks.push({
        id: `rock_${i}`,
        sprite: rockSprite,
        health: 2
      });

      this.physics.add.collider(this.player, rockSprite);
      
      for (const monster of this.monsters) {
        this.physics.add.collider(monster.sprite, rockSprite);
      }
    }
  }

  private createAttackHitbox(): void {
    this.attackHitbox = this.add.arc(
      this.player.x,
      this.player.y,
      120,
      -Math.PI / 3,
      Math.PI / 3,
      false,
      0xFFD700,
      0.5
    );
    this.attackHitbox.setStrokeStyle(4, 0xFF8C00, 0.9);
    this.attackHitbox.setDepth(20);
    this.attackHitbox.setVisible(false);
  }

  private createUI(): void {
    this.damageTextGroup = this.add.group();

    this.add.text(20, 20, '矿洞', {
      fontSize: '24px',
      color: '#FFD700',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: 'rgba(0, 0, 0, 0.7)'
    }).setDepth(100).setScrollFactor(0);

    this.add.text(20, 60, `按 J 攻击 | 按 E 敲石头`, {
      fontSize: '14px',
      color: '#FFFFFF',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: 'rgba(0, 0, 0, 0.7)'
    }).setDepth(100).setScrollFactor(0);
  }

  private updateUI(): void {
  }

  private handlePlayerMovement(): void {
    let velocityX = 0;
    let velocityY = 0;

    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) {
      velocityX = -this.playerSpeed;
      this.attackAngle = Math.PI;
    } else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) {
      velocityX = this.playerSpeed;
      this.attackAngle = 0;
    }

    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
      velocityY = -this.playerSpeed;
      this.attackAngle = -Math.PI / 2;
    } else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
      velocityY = this.playerSpeed;
      this.attackAngle = Math.PI / 2;
    }

    if (!this.isAttacking) {
      this.player.setVelocityX(velocityX);
      this.player.setVelocityY(velocityY);
    }
  }

  private updatePlayerAnimation(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const isMoving = body.velocity.x !== 0 || body.velocity.y !== 0;

    if (isMoving) {
      this.player.setTint(0xFFD700);
      this.player.setScale(1.3);
    } else {
      this.player.clearTint();
      this.player.setScale(1.2);
    }
  }

  private handleAttackKey(): void {
    if (Phaser.Input.Keyboard.JustDown(this.jKey) && this.attackCooldown <= 0 && !this.isAttacking) {
      this.isAttacking = true;
      this.attackCooldown = this.attackCooldownTime;
      
      this.attackHitbox.setVisible(true);
      this.attackHitbox.setRotation(this.attackAngle);
      
      this.checkAttackHits();

      this.time.delayedCall(this.attackDuration, () => {
        this.isAttacking = false;
        this.attackHitbox.setVisible(false);
      });
    }
  }

  private checkAttackHits(): void {
    const attackCenterX = this.player.x + Math.cos(this.attackAngle) * 60;
    const attackCenterY = this.player.y + Math.sin(this.attackAngle) * 60;
    const attackRadius = 120;

    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const monster = this.monsters[i];
      if (!monster.isAlive || !monster.sprite) {
        this.monsters.splice(i, 1);
        continue;
      }

      const monsterX = monster.sprite.x;
      const monsterY = monster.sprite.y;

      const distance = Phaser.Math.Distance.Between(
        attackCenterX, attackCenterY,
        monsterX, monsterY
      );

      if (distance < attackRadius) {
        const isDead = monster.takeDamage(15);
        
        this.showDamageText(monsterX, monsterY - 40, '15');
        this.createAttackEffect(monsterX, monsterY);
        
        if (isDead) {
          gameStore.getState().addOres(1);
          console.log('击杀怪物，获得矿石 +1');
          this.monsters.splice(i, 1);
        }
      }
    }
  }

  private createAttackEffect(x: number, y: number): void {
    const effects: Phaser.GameObjects.Graphics[] = [];
    
    for (let i = 0; i < 8; i++) {
      const effect = this.add.graphics();
      effect.fillStyle(0xFFD700, 1);
      effect.fillCircle(0, 0, 8);
      effect.setPosition(x, y);
      effect.setDepth(25);
      effects.push(effect);
      
      const angle = (Math.PI * 2 / 8) * i;
      const distance = 40 + Math.random() * 30;
      
      this.tweens.add({
        targets: effect,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: { from: 1, to: 0 },
        scale: { from: 1, to: 0.3 },
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          effect.destroy();
        }
      });
    }
  }

  private showDamageText(x: number, y: number, text: string): void {
    const damageText = this.add.text(x, y, text, {
      fontSize: '32px',
      color: '#FF4444',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#FFFFFF',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(100);

    this.damageTextGroup.add(damageText);

    this.tweens.add({
      targets: damageText,
      y: y - 80,
      alpha: 0,
      scale: { from: 1.5, to: 0.5 },
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        damageText.destroy();
      }
    });
  }

  private handleEKey(): void {
    if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
      this.tryBreakRock();
    }
  }

  private tryBreakRock(): void {
    for (let i = this.breakableRocks.length - 1; i >= 0; i--) {
      const rock = this.breakableRocks[i];
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        rock.sprite.x, rock.sprite.y
      );

      if (distance < 100) {
        rock.health--;
        
        rock.sprite.setTint(0xAAAAAA);
        this.time.delayedCall(100, () => {
          if (rock.sprite && rock.sprite.active) {
            rock.sprite.clearTint();
          }
        });

        if (rock.health <= 0) {
          rock.sprite.destroy();
          this.breakableRocks.splice(i, 1);
          
          gameStore.getState().addStones(2);
          console.log('敲碎岩石，获得石头 +2');
          
          this.showDamageText(rock.sprite.x, rock.sprite.y - 30, '+2 石头');
        }
        break;
      }
    }
  }

  private updateAttackHitbox(): void {
    if (this.isAttacking) {
      const offsetX = Math.cos(this.attackAngle) * 40;
      const offsetY = Math.sin(this.attackAngle) * 40;
      this.attackHitbox.setPosition(
        this.player.x + offsetX,
        this.player.y + offsetY
      );
      this.attackHitbox.setRotation(this.attackAngle);
    }
  }

  private updateMonsters(delta: number): void {
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const monster = this.monsters[i];
      if (!monster.isAlive || !monster.sprite) {
        this.monsters.splice(i, 1);
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        monster.sprite.x, monster.sprite.y
      );
      
      const stopDistance = 60;
      const attackRange = 100;
      const aggroRange = 200;
      
      if (distance > stopDistance && distance <= aggroRange) {
        monster.update(this.player, delta);
      } else if (distance <= stopDistance) {
        monster.sprite.setVelocity(0, 0);
        monster.updateHealthBarPosition();
      }
      
      if (distance <= attackRange && monster.canAttack()) {
        console.log(`⚔️ 怪物 ${monster.id} 攻击玩家！距离: ${distance}`);
        this.onPlayerHitByMonster(monster);
      }
    }
  }

  private onPlayerHitByMonster(monster: Monster): void {
    const isDead = gameStore.getState().takeDamage(monster.damage);
    monster.resetAttackCooldown();
    
    console.log(`被 ${monster.type} 攻击，受到 ${monster.damage} 点伤害，剩余 HP: ${gameStore.getState().hp}`);
    
    this.player.setTint(0xFF0000);
    this.time.delayedCall(200, () => {
      if (this.player && this.player.active) {
        this.player.clearTint();
      }
    });

    if (isDead) {
      console.log('HP 为 0，传送回农场...');
      this.showDeathMessage();
    }
  }

  private showDeathMessage(): void {
    this.player.setTint(0x000000);
    
    const deathOverlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7
    );
    deathOverlay.setDepth(999);
    deathOverlay.setScrollFactor(0);

    // @ts-ignore: Variable not read but object is added to scene
    const _deathText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      '💀 你被击败了！',
      {
        fontSize: '48px',
        color: '#FF0000',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setDepth(1000).setScrollFactor(0);

    // @ts-ignore: Variable not read but object is added to scene
    const _hintText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 20,
      '正在传送回农场...',
      {
        fontSize: '24px',
        color: '#FFFFFF',
        fontFamily: 'Arial, sans-serif'
      }
    ).setOrigin(0.5).setDepth(1000).setScrollFactor(0);

    this.time.delayedCall(2000, () => {
      this.transportToFarm();
    });
  }

  private checkExitPortal(): void {
    const distance = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.exitPortal.x, this.exitPortal.y
    );

    if (distance < 50) {
      this.transportToFarm();
    }
  }

  private transportToFarm(): void {
    gameStore.getState().setHp(gameStore.getState().maxHp);
    this.scene.start('FarmScene');
  }

  private subscribeToStore(): void {
  }
}

export default MineScene;
export { MineScene };
