import * as Phaser from 'phaser';
import { gameStore } from '../../store/useGameStore';

type TileState = 'empty' | 'tilled' | 'planted' | 'grown';

interface FarmTile {
  state: TileState;
  sprite: Phaser.GameObjects.Image | null;
  cropSprite: Phaser.GameObjects.Image | null;
  plantedTime: number;
}

class FarmScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private playerSpeed: number = 200;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private eKey!: Phaser.Input.Keyboard.Key;

  private readonly MAP_WIDTH = 50;
  private readonly MAP_HEIGHT = 50;
  private readonly TILE_SIZE = 64;
  private readonly GROW_TIME = 5000;

  private groundLayer!: Phaser.GameObjects.Group;
  private collisionLayer!: Phaser.Physics.Arcade.StaticGroup;

  private farmGrid: FarmTile[][] = [];
  private gridOffsetX = 0;
  private gridOffsetY = 0;

  private highlightedTile: { row: number; col: number } | null = null;
  private highlightRectangle!: Phaser.GameObjects.Rectangle;

  private seedsText!: Phaser.GameObjects.Text;
  private cropsText!: Phaser.GameObjects.Text;

  private isMoving = false;
  private snapTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super({ key: 'FarmScene' });
  }

  preload(): void {
    // 纹理已经在 BootScene 中生成
  }

  create(): void {
    this.createMap();
    this.createPlayer();
    this.setupCamera();
    this.setupInput();
    this.setupCollisions();
    this.setupSpaceKey();
    this.setupEKey();
    this.initializeFarmGrid();
    this.createHighlightRectangle();
    this.createUI();
  }

  update(): void {
    this.handlePlayerMovement();
    this.updatePlayerAnimation();
    this.handleSpaceKey();
    this.updateHighlightedTile();
    this.handleEKey();
    this.updateGrowth();
    this.updateUI();
  }

  private createMap(): void {
    const worldWidth = this.MAP_WIDTH * this.TILE_SIZE;
    const worldHeight = this.MAP_HEIGHT * this.TILE_SIZE;

    this.groundLayer = this.add.group();
    this.collisionLayer = this.physics.add.staticGroup();

    for (let row = 0; row < this.MAP_HEIGHT; row++) {
      for (let col = 0; col < this.MAP_WIDTH; col++) {
        const x = col * this.TILE_SIZE + this.TILE_SIZE / 2;
        const y = row * this.TILE_SIZE + this.TILE_SIZE / 2;

        const groundTile = this.add.image(x, y, 'grass');
        this.groundLayer.add(groundTile);

        const isEdge = row === 0 || row === this.MAP_HEIGHT - 1 || 
                       col === 0 || col === this.MAP_WIDTH - 1;
        
        const isObstacle = (row >= 10 && row <= 15 && col >= 20 && col <= 25) ||
                           (row >= 30 && row <= 35 && col >= 10 && col <= 15) ||
                           (row >= 20 && row <= 22 && col >= 35 && col <= 40);

        if (isEdge || isObstacle) {
          const collisionTile = this.physics.add.staticImage(x, y, 'rock');
          this.collisionLayer.add(collisionTile);
        }
      }
    }

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
  }

  private createPlayer(): void {
    const startX = this.MAP_WIDTH * this.TILE_SIZE / 2;
    const startY = this.MAP_HEIGHT * this.TILE_SIZE / 2;

    this.player = this.physics.add.sprite(startX, startY, 'player');
    this.player.setOrigin(0.5);
    this.player.setCollideWorldBounds(true);
    this.player.setScale(1.2);
    this.player.setDepth(10);
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
    this.cursors = this.input.keyboard!.createCursorKeys();

    this.wasdKeys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
  }

  private setupCollisions(): void {
    this.physics.add.collider(this.player, this.collisionLayer);
  }

  private setupSpaceKey(): void {
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  private setupEKey(): void {
    this.eKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  private initializeFarmGrid(): void {
    const gridCenterX = this.MAP_WIDTH * this.TILE_SIZE / 2;
    const gridCenterY = this.MAP_HEIGHT * this.TILE_SIZE / 2;
    
    const gridWidth = 5 * this.TILE_SIZE;
    const gridHeight = 5 * this.TILE_SIZE;

    this.gridOffsetX = gridCenterX - gridWidth / 2;
    this.gridOffsetY = gridCenterY - gridHeight / 2;

    this.farmGrid = [];
    for (let row = 0; row < 5; row++) {
      this.farmGrid[row] = [];
      for (let col = 0; col < 5; col++) {
        this.farmGrid[row][col] = {
          state: 'empty',
          sprite: null,
          cropSprite: null,
          plantedTime: 0
        };
      }
    }
  }

  private createHighlightRectangle(): void {
    this.highlightRectangle = this.add.rectangle(
      0, 0,
      this.TILE_SIZE, this.TILE_SIZE,
      0xffff00, 0.3
    );
    this.highlightRectangle.setStrokeStyle(3, 0xffff00, 0.8);
    this.highlightRectangle.setVisible(false);
    this.highlightRectangle.setDepth(5);
  }

  private createUI(): void {
    this.seedsText = this.add.text(20, 20, '种子: 5', {
      fontSize: '20px',
      color: '#006400',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#90EE90'
    }).setDepth(100).setScrollFactor(0);

    this.cropsText = this.add.text(20, 55, '作物: 0', {
      fontSize: '20px',
      color: '#8B4513',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#90EE90'
    }).setDepth(100).setScrollFactor(0);

    const helpText = this.add.text(20, 100, 'WASD/方向键移动 | E键交互 | 空格获得金币', {
      fontSize: '16px',
      color: '#333333',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: 'rgba(255, 255, 255, 0.8)'
    }).setDepth(100).setScrollFactor(0);
  }

  private updateUI(): void {
    const state = gameStore.getState();
    this.seedsText.setText(`种子: ${state.inventory.seeds}`);
    this.cropsText.setText(`作物: ${state.inventory.crops}`);
  }

  private getTileWorldPosition(row: number, col: number): { x: number; y: number } {
    return {
      x: this.gridOffsetX + col * this.TILE_SIZE + this.TILE_SIZE / 2,
      y: this.gridOffsetY + row * this.TILE_SIZE + this.TILE_SIZE / 2
    };
  }

  private getPlayerNearestTile(): { row: number; col: number } | null {
    const playerX = this.player.x;
    const playerY = this.player.y;

    let closestDist = Infinity;
    let closestTile: { row: number; col: number } | null = null;

    console.log('--- 检测最近瓦片 ---');
    console.log('玩家位置:', playerX, playerY);

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const tilePos = this.getTileWorldPosition(row, col);
        const distance = Phaser.Math.Distance.Between(
          playerX, playerY,
          tilePos.x, tilePos.y
        );

        if (distance < this.TILE_SIZE) {
          console.log(`瓦片 (${row}, ${col}): 距离=${distance.toFixed(2)}`);
          if (distance < closestDist) {
            closestDist = distance;
            closestTile = { row, col };
            console.log(`  -> 成为当前最近瓦片`);
          }
        }
      }
    }

    console.log('最终最近瓦片:', closestTile);
    console.log('--- 检测结束 ---');

    return closestTile;
  }

  private getClosestGridPosition(): { x: number; y: number } | null {
    const playerX = this.player.x;
    const playerY = this.player.y;

    let closestDist = Infinity;
    let closestPos = null;

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const tilePos = this.getTileWorldPosition(row, col);
        const distance = Phaser.Math.Distance.Between(
          playerX, playerY,
          tilePos.x, tilePos.y
        );

        if (distance < closestDist && distance < this.TILE_SIZE * 1.5) {
          closestDist = distance;
          closestPos = tilePos;
        }
      }
    }

    return closestPos;
  }

  private snapPlayerToGrid(): void {
    const closestPos = this.getClosestGridPosition();
    
    if (closestPos) {
      if (this.snapTween && this.snapTween.isPlaying()) {
        this.snapTween.stop();
      }

      this.snapTween = this.tweens.add({
        targets: this.player,
        x: closestPos.x,
        y: closestPos.y,
        duration: 100,
        ease: 'Power2'
      });
    }
  }

  private updateHighlightedTile(): void {
    const nearestTile = this.getPlayerNearestTile();

    if (nearestTile) {
      const tilePos = this.getTileWorldPosition(nearestTile.row, nearestTile.col);
      this.highlightedTile = nearestTile;
      this.highlightRectangle.setPosition(tilePos.x, tilePos.y);
      this.highlightRectangle.setVisible(true);
    } else {
      this.highlightedTile = null;
      this.highlightRectangle.setVisible(false);
    }
  }

  private updateTileVisual(row: number, col: number): void {
    const tile = this.farmGrid[row][col];
    const tilePos = this.getTileWorldPosition(row, col);

    if (tile.sprite) {
      tile.sprite.destroy();
      tile.sprite = null;
    }

    if (tile.cropSprite) {
      tile.cropSprite.destroy();
      tile.cropSprite = null;
    }

    switch (tile.state) {
      case 'tilled':
        tile.sprite = this.add.image(tilePos.x, tilePos.y, 'tilled');
        tile.sprite.setDepth(1);
        break;
      case 'planted':
        tile.sprite = this.add.image(tilePos.x, tilePos.y, 'tilled');
        tile.sprite.setDepth(1);
        tile.cropSprite = this.add.image(tilePos.x, tilePos.y, 'crop');
        tile.cropSprite.setScale(0.3);
        tile.cropSprite.setDepth(2);
        break;
      case 'grown':
        tile.sprite = this.add.image(tilePos.x, tilePos.y, 'tilled');
        tile.sprite.setDepth(1);
        tile.cropSprite = this.add.image(tilePos.x, tilePos.y, 'crop_grown');
        tile.cropSprite.setScale(0.6);
        tile.cropSprite.setDepth(2);
        break;
    }
  }

  private handleEKey(): void {
    if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
      console.log('E键被按下！');
      console.log('highlightedTile:', this.highlightedTile);
      
      if (this.highlightedTile) {
        const { row, col } = this.highlightedTile;
        const tile = this.farmGrid[row][col];
        const state = gameStore.getState();
        
        console.log('当前瓦片状态:', tile.state);

        switch (tile.state) {
          case 'empty':
            tile.state = 'tilled';
            console.log('耕地成功！');
            this.updateTileVisual(row, col);
            break;

          case 'tilled':
            if (state.inventory.seeds > 0) {
              tile.state = 'planted';
              tile.plantedTime = this.time.now;
              gameStore.getState().addSeeds(-1);
              console.log('播种成功！剩余种子:', state.inventory.seeds - 1);
              this.updateTileVisual(row, col);
            } else {
              console.log('没有种子了！');
            }
            break;

          case 'grown':
            tile.state = 'empty';
            tile.plantedTime = 0;
            gameStore.getState().addCrops(1);
            console.log('收割成功！作物数量:', state.inventory.crops + 1);
            this.updateTileVisual(row, col);
            break;
        }
      } else {
        console.log('没有检测到附近的可交互瓦片！请移动到中心的耕地区域。');
      }
    }
  }

  private updateGrowth(): void {
    const currentTime = this.time.now;

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const tile = this.farmGrid[row][col];
        if (tile.state === 'planted' && tile.plantedTime > 0) {
          if (currentTime - tile.plantedTime >= this.GROW_TIME) {
            tile.state = 'grown';
            console.log(`作物成熟: (${row}, ${col})`);
            this.updateTileVisual(row, col);
          }
        }
      }
    }
  }

  private handlePlayerMovement(): void {
    const wasMoving = this.isMoving;
    let velocityX = 0;
    let velocityY = 0;

    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) {
      velocityX = -this.playerSpeed;
    } else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) {
      velocityX = this.playerSpeed;
    }

    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
      velocityY = -this.playerSpeed;
    } else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
      velocityY = this.playerSpeed;
    }

    this.isMoving = velocityX !== 0 || velocityY !== 0;

    if (this.isMoving) {
      if (this.snapTween && this.snapTween.isPlaying()) {
        this.snapTween.stop();
        this.snapTween = null;
      }
      this.player.setVelocityX(velocityX);
      this.player.setVelocityY(velocityY);
    } else {
      this.player.setVelocityX(0);
      this.player.setVelocityY(0);
      
      if (wasMoving && !this.snapTween) {
        this.snapPlayerToGrid();
      }
    }
  }

  private handleSpaceKey(): void {
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      gameStore.getState().addGold(10);
      console.log('Space pressed, added 10 gold!');
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
}

export default FarmScene;
export { FarmScene };
