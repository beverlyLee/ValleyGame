import * as Phaser from 'phaser';
import { gameStore } from '../../store/useGameStore';

type TileState = 'empty' | 'tilled' | 'planted' | 'grown';

interface FarmTile {
  state: TileState;
  sprite: Phaser.GameObjects.Rectangle | null;
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

  private readonly GRID_SIZE = 5;
  private readonly TILE_SIZE = 64;
  private readonly GROW_TIME = 5000;

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
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 40, 40);
    graphics.generateTexture('player', 40, 40);
    graphics.destroy();
  }

  create(): void {
    this.addWelcomeText();
    this.createPlayer();
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
    this.handleEKey();
    this.updateHighlightedTile();
    this.updateGrowth();
    this.updateUI();
  }

  private addWelcomeText(): void {
    const width = this.cameras.main.width;

    this.add.text(width / 2, 50, 'Web Valley', {
      fontSize: '48px',
      color: '#333333',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
  }

  private createPlayer(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.player = this.physics.add.sprite(centerX, centerY, 'player');

    this.player.setOrigin(0.5);
    this.player.setCollideWorldBounds(true);
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
    this.physics.world.setBounds(
      0,
      0,
      this.cameras.main.width,
      this.cameras.main.height
    );
  }

  private setupSpaceKey(): void {
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  private setupEKey(): void {
    this.eKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  private initializeFarmGrid(): void {
    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;
    const gridWidth = this.GRID_SIZE * this.TILE_SIZE;
    const gridHeight = this.GRID_SIZE * this.TILE_SIZE;

    this.gridOffsetX = (screenWidth - gridWidth) / 2;
    this.gridOffsetY = (screenHeight - gridHeight) / 2 + 50;

    this.farmGrid = [];
    for (let row = 0; row < this.GRID_SIZE; row++) {
      this.farmGrid[row] = [];
      for (let col = 0; col < this.GRID_SIZE; col++) {
        this.farmGrid[row][col] = {
          state: 'empty',
          sprite: null,
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
    this.highlightRectangle.setStrokeStyle(2, 0xffff00, 0.8);
    this.highlightRectangle.setVisible(false);
    this.highlightRectangle.setDepth(1);
  }

  private createUI(): void {
    this.seedsText = this.add.text(20, 20, '种子: 5', {
      fontSize: '20px',
      color: '#006400',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#90EE90'
    }).setDepth(10);

    this.cropsText = this.add.text(20, 50, '作物: 0', {
      fontSize: '20px',
      color: '#8B4513',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#90EE90'
    }).setDepth(10);
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

    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
        const tilePos = this.getTileWorldPosition(row, col);
        const distance = Phaser.Math.Distance.Between(
          playerX, playerY,
          tilePos.x, tilePos.y
        );

        if (distance < this.TILE_SIZE) {
          return { row, col };
        }
      }
    }

    return null;
  }

  private getClosestGridPosition(): { x: number; y: number } | null {
    const playerX = this.player.x;
    const playerY = this.player.y;

    let closestDist = Infinity;
    let closestPos = null;

    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
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

    let color = 0x000000;
    let visible = false;

    switch (tile.state) {
      case 'tilled':
        color = 0x8B4513;
        visible = true;
        break;
      case 'planted':
        color = 0x00FF00;
        visible = true;
        break;
      case 'grown':
        color = 0xFFFF00;
        visible = true;
        break;
    }

    if (visible) {
      tile.sprite = this.add.rectangle(
        tilePos.x, tilePos.y,
        this.TILE_SIZE - 4, this.TILE_SIZE - 4,
        color, 0.8
      );
      tile.sprite.setDepth(0);
    }
  }

  private handleEKey(): void {
    if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
      if (this.highlightedTile) {
        const { row, col } = this.highlightedTile;
        const tile = this.farmGrid[row][col];
        const state = gameStore.getState();

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
      }
    }
  }

  private updateGrowth(): void {
    const currentTime = this.time.now;

    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
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
      this.player.setTint(0xff0000);
    } else {
      this.player.clearTint();
    }
  }
}

export default FarmScene;
export { FarmScene };
