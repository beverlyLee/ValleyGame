import * as Phaser from 'phaser';
import { gameStore } from '../../store/useGameStore';
import NPC, { type NPCConfig } from '../entities/NPC';
import { TimeSystem, SEASON_COLORS, SEASON_NAMES, type TimeState } from '../systems/TimeSystem';
import { 
  CROPS_CONFIG, 
  type CropType, 
  type GrowthStage, 
  type CropQuality,
  CropQualityValues,
  QUALITY_NAMES,
  QUALITY_ICONS,
  QUALITY_COLORS,
  QUALITY_PRICE_MULTIPLIER,
  getGrowthStageTexture, 
  getGrowthStageProgress,
  getCropsBySeason,
  GROWTH_STAGE_REQUIREMENTS,
  getGrowthStageOrder,
  getNextGrowthStage,
  getGrowthStageIndex
} from '../config/CropsConfig';

type TileState = 'empty' | 'tilled' | 'planted' | 'grown' | 'watered';

interface FarmTile {
  state: TileState;
  sprite: Phaser.GameObjects.Image | null;
  cropSprite: Phaser.GameObjects.Image | null;
  plantedTime: number;
  isWatered: boolean;
  isFertilized: boolean;
  cropType?: CropType;
  wateredDays: number;
  lastDayWatered: number;
  isRegrowing?: boolean;
  consecutivePlantingDays?: number;
  lastCropType?: CropType;
  isGiant?: boolean;
  giantCenterRow?: number;
  giantCenterCol?: number;
  currentGrowthStage: GrowthStage;
  daysInCurrentStage: number;
  stageActionsCompleted: { water: boolean; fertilizer: boolean };
}

interface PlaceableItemSprite {
  row: number;
  col: number;
  type: 'fence' | 'sprinkler';
  sprite: Phaser.GameObjects.Image;
  rangeSprite?: Phaser.GameObjects.Rectangle;
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
  private xKey!: Phaser.Input.Keyboard.Key;
  private kKey!: Phaser.Input.Keyboard.Key;
  private bKey!: Phaser.Input.Keyboard.Key;
  private lKey!: Phaser.Input.Keyboard.Key;
  private fKey!: Phaser.Input.Keyboard.Key;
  private iKey!: Phaser.Input.Keyboard.Key;
  private shiftKey!: Phaser.Input.Keyboard.Key;

  private readonly MAP_WIDTH = 50;
  private readonly MAP_HEIGHT = 50;
  private readonly TILE_SIZE = 64;

  private timeSystem!: TimeSystem;
  private currentTimeState: TimeState | null = null;
  private lastSolarTermIndex: number = -1;

  private npcs: NPC[] = [];
  private isInShopArea: boolean = false;
  private shopArea: { x: number; y: number; width: number; height: number } = {
    x: 0,
    y: 0,
    width: 300,
    height: 300
  };

  private mineEntrance!: Phaser.Physics.Arcade.Sprite;
  private isTransitioningToMine: boolean = false;

  private groundLayer!: Phaser.GameObjects.Group;
  private collisionLayer!: Phaser.Physics.Arcade.StaticGroup;

  private farmGrid: FarmTile[][] = [];
  private gridOffsetX = 0;
  private gridOffsetY = 0;
  private currentFarmSize = 5;

  private highlightedTile: { row: number; col: number } | null = null;
  private highlightRectangle!: Phaser.GameObjects.Rectangle;
  private farmGridBorder!: Phaser.GameObjects.Rectangle;

  private farmLevelText!: Phaser.GameObjects.Text;
  private expansionText!: Phaser.GameObjects.Text;

  private isMoving = false;
  private snapTween: Phaser.Tweens.Tween | null = null;

  private lanterns: Phaser.GameObjects.Container[] = [];
  private lanternPositions: { x: number; y: number }[] = [];
  private nearestLanternIndex: number | null = null;

  private placeableItemSprites: PlaceableItemSprite[] = [];
  private previewSprite: Phaser.GameObjects.Image | null = null;
  private previewRangeSprite: Phaser.GameObjects.Rectangle | null = null;

  private questBoard!: Phaser.Physics.Arcade.Sprite;
  private isNearQuestBoard: boolean = false;

  private lastDay: number = -1;
  private lastHour: number = -1;

  constructor() {
    super({ key: 'FarmScene' });
  }

  preload(): void {
  }

  create(): void {
    this.isTransitioningToMine = false;
    
    this.initializeTimeSystem();
    this.createMap();
    this.createPlayer();
    this.setupCamera();
    this.setupInput();
    this.setupCollisions();
    this.setupSpaceKey();
    this.setupEKey();
    this.setupXKey();
    this.setupKKey();
    this.setupBKey();
    this.setupLKey();
    this.setupFKey();
    this.setupIKey();
    this.setupShiftKey();
    this.initializeFarmGrid();
    this.createHighlightRectangle();
    this.createPreviewSprites();
    this.setupShopArea();
    this.createMineEntrance();
    this.createQuestBoard();
    this.createNPCs();
    this.initializeLanternPositions();
    this.checkLanternFestival();
    this.updateSeasonBackgroundColor();
    this.spawnPlaceableItemsFromStore();
    this.setupMouseInput();
    this.subscribeToStore();
  }

  update(_time: number, delta: number): void {
    this.updateTimeSystem(delta);
    this.handlePlayerMovement();
    this.updatePlayerAnimation();
    this.handleSpaceKey();
    this.updateHighlightedTile();
    this.handleEKey();
    this.handleXKey();
    this.handleKKey();
    this.handleBKey();
    this.handleFKey();
    this.handleIKey();
    this.handleSaveKey();
    this.handleLoadKey();
    this.updateGrowth();
    this.updateNPCs();
    this.checkShopArea();
    this.checkMineEntrance();
    this.checkNearestLantern();
    this.checkDayChange();
    this.checkQuestBoard();
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

        if (isEdge) {
          const collisionTile = this.physics.add.staticImage(x, y, 'rock');
          this.collisionLayer.add(collisionTile);
        }
      }
    }

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
  }

  private initializeTimeSystem(): void {
    const state = gameStore.getState();
    this.timeSystem = new TimeSystem(state.totalGameMinutes);
    this.currentTimeState = this.timeSystem.getState();
    this.lastSolarTermIndex = this.currentTimeState.solarTermIndex;
    gameStore.getState().setTimeState(this.currentTimeState);
  }

  private updateTimeSystem(delta: number): void {
    if (!this.timeSystem) return;

    this.timeSystem.update(delta);
    const newTimeState = this.timeSystem.getState();
    
    const totalMinutes = this.timeSystem.getTotalMinutes();
    gameStore.getState().setTotalGameMinutes(totalMinutes);

    if (newTimeState.solarTermIndex !== this.lastSolarTermIndex) {
      this.lastSolarTermIndex = newTimeState.solarTermIndex;
      this.updateSeasonBackgroundColor();
      this.checkLanternFestival();
    }

    this.currentTimeState = newTimeState;
    gameStore.getState().setTimeState(newTimeState);
  }

  private updateSeasonBackgroundColor(): void {
    if (!this.currentTimeState) return;
    
    const season = this.currentTimeState.season;
    const color = SEASON_COLORS[season];
    this.cameras.main.setBackgroundColor(color);
    console.log(`季节变化: ${SEASON_NAMES[season]}, 背景色: #${color.toString(16)}`);
  }

  private initializeLanternPositions(): void {
    const worldWidth = this.MAP_WIDTH * this.TILE_SIZE;
    const worldHeight = this.MAP_HEIGHT * this.TILE_SIZE;
    const centerX = worldWidth / 2;
    const centerY = worldHeight / 2;

    this.lanternPositions = [
      { x: centerX - 300, y: centerY - 300 },
      { x: centerX + 300, y: centerY - 300 },
      { x: centerX - 300, y: centerY + 300 },
      { x: centerX + 300, y: centerY + 300 },
      { x: centerX, y: centerY }
    ];
  }

  private checkLanternFestival(): void {
    if (!this.currentTimeState) return;

    const isLanternFestival = this.currentTimeState.isLanternFestival;
    
    if (isLanternFestival) {
      console.log('🎉 灯会开始！');
      gameStore.getState().setToolsDisabled(true);
      gameStore.getState().resetLanterns();
      this.spawnLanterns();
      gameStore.getState().showNotification('🎊 灯会开始了！去点亮灯笼吧！按 E 键点亮附近的灯笼');
    } else {
      gameStore.getState().setToolsDisabled(false);
      this.despawnLanterns();
    }
  }

  private spawnLanterns(): void {
    this.despawnLanterns();

    const state = gameStore.getState();
    
    for (let i = 0; i < this.lanternPositions.length; i++) {
      const pos = this.lanternPositions[i];
      const isLit = state.lanternLit[i];
      
      const lantern = this.createLanternSprite(pos.x, pos.y, isLit, i);
      this.lanterns.push(lantern);
    }
  }

  private createLanternSprite(x: number, y: number, isLit: boolean, index: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    container.setDepth(15);
    container.setData('lanternIndex', index);

    const pole = this.add.rectangle(0, 30, 8, 80, 0x8B4513);
    container.add(pole);

    const lanternBody = this.add.ellipse(0, -20, 40, 50, isLit ? 0xFF4500 : 0x8B0000);
    lanternBody.setStrokeStyle(3, 0xFFD700);
    container.add(lanternBody);

    const lanternTop = this.add.rectangle(0, -50, 30, 10, 0xFFD700);
    container.add(lanternTop);

    const lanternBottom = this.add.rectangle(0, 10, 30, 10, 0xFFD700);
    container.add(lanternBottom);

    const tassel = this.add.line(0, 15, 0, 0, 0, 25, 0xFF0000, 3);
    container.add(tassel);

    if (isLit) {
      const glow = this.add.circle(0, -20, 60, 0xFFD700, 0.3);
      container.add(glow);

      this.tweens.add({
        targets: lanternBody,
        scale: { from: 1, to: 1.05 },
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    return container;
  }

  private despawnLanterns(): void {
    for (const lantern of this.lanterns) {
      lantern.destroy();
    }
    this.lanterns = [];
  }

  private checkNearestLantern(): void {
    if (!this.currentTimeState?.isLanternFestival) {
      this.nearestLanternIndex = null;
      return;
    }

    const state = gameStore.getState();
    let nearestIndex: number | null = null;
    let nearestDist = Infinity;

    for (let i = 0; i < this.lanterns.length; i++) {
      if (state.lanternLit[i]) continue;

      const lantern = this.lanterns[i];
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        lantern.x, lantern.y
      );

      if (distance < 100 && distance < nearestDist) {
        nearestDist = distance;
        nearestIndex = i;
      }
    }

    this.nearestLanternIndex = nearestIndex;
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

  private setupXKey(): void {
    this.xKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
  }

  private setupKKey(): void {
    this.kKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.K);
  }

  private setupBKey(): void {
    this.bKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.B);
  }

  private setupLKey(): void {
    this.lKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.L);
  }

  private setupFKey(): void {
    this.fKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F);
  }

  private setupIKey(): void {
    this.iKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.I);
  }

  private setupShiftKey(): void {
    this.shiftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
  }

  private getFarmSize(): number {
    return gameStore.getState().farmSize;
  }

  private initializeFarmGrid(): void {
    const state = gameStore.getState();
    this.currentFarmSize = state.farmSize;
    
    const gridCenterX = this.MAP_WIDTH * this.TILE_SIZE / 2;
    const gridCenterY = this.MAP_HEIGHT * this.TILE_SIZE / 2;
    
    const gridWidth = this.currentFarmSize * this.TILE_SIZE;
    const gridHeight = this.currentFarmSize * this.TILE_SIZE;

    this.gridOffsetX = gridCenterX - gridWidth / 2;
    this.gridOffsetY = gridCenterY - gridHeight / 2;

    if (this.farmGridBorder) {
      this.farmGridBorder.destroy();
    }
    this.farmGridBorder = this.add.rectangle(
      this.gridOffsetX + gridWidth / 2,
      this.gridOffsetY + gridHeight / 2,
      gridWidth,
      gridHeight,
      0x000000,
      0
    );
    this.farmGridBorder.setStrokeStyle(4, 0x8B4513, 1);
    this.farmGridBorder.setDepth(0);

    this.farmGrid = [];
    for (let row = 0; row < this.currentFarmSize; row++) {
      this.farmGrid[row] = [];
      for (let col = 0; col < this.currentFarmSize; col++) {
        const storeTile = state.farmGrid[row]?.[col];
        if (storeTile) {
          const hasCrop = storeTile.state === 'planted' || storeTile.state === 'grown';
          const validStages: GrowthStage[] = ['seed', 'sprout', 'flower', 'mature'];
          const savedStage = storeTile.currentGrowthStage as GrowthStage;
          const initialStage: GrowthStage = savedStage && validStages.includes(savedStage)
            ? savedStage
            : hasCrop && storeTile.cropType
              ? getGrowthStageProgress(storeTile.wateredDays ?? 0, CROPS_CONFIG[storeTile.cropType]?.growthDays ?? 4)
              : 'seed';
          
          this.farmGrid[row][col] = {
            state: storeTile.state,
            sprite: null,
            cropSprite: null,
            plantedTime: storeTile.plantedTime,
            isWatered: storeTile.isWatered ?? false,
            isFertilized: storeTile.isFertilized ?? false,
            cropType: storeTile.cropType,
            wateredDays: storeTile.wateredDays ?? 0,
            lastDayWatered: -1,
            isRegrowing: storeTile.isRegrowing,
            consecutivePlantingDays: storeTile.consecutivePlantingDays,
            lastCropType: storeTile.lastCropType,
            isGiant: storeTile.isGiant,
            giantCenterRow: storeTile.giantCenterRow,
            giantCenterCol: storeTile.giantCenterCol,
            currentGrowthStage: initialStage,
            daysInCurrentStage: 0,
            stageActionsCompleted: {
              water: storeTile.isWatered ?? false,
              fertilizer: storeTile.isFertilized ?? false
            }
          };
          this.updateTileVisual(row, col);
        } else {
          this.farmGrid[row][col] = {
            state: 'empty',
            sprite: null,
            cropSprite: null,
            plantedTime: 0,
            isWatered: false,
            isFertilized: false,
            wateredDays: 0,
            lastDayWatered: -1,
            currentGrowthStage: 'seed',
            daysInCurrentStage: 0,
            stageActionsCompleted: { water: false, fertilizer: false }
          };
        }
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

  // @ts-ignore: Unused function, possibly for future use
  private createUI(): void {
    const state = gameStore.getState();
    const startY = 320;
    const lineHeight = 28;
    const smallFontSize = '11px';
    
    this.farmLevelText = this.add.text(20, startY, `📊 农场等级: ${state.farmLevel} (${state.farmSize}x${state.farmSize})`, {
      fontSize: smallFontSize,
      color: '#FFFFFF',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: { x: 8, y: 4 }
    }).setDepth(100).setScrollFactor(0);

    const expansionCost = gameStore.getState().getExpansionCost();
    this.expansionText = this.add.text(20, startY + lineHeight, `🔨 扩展农场 (X键): ${expansionCost} 金币`, {
      fontSize: smallFontSize,
      color: '#FFD700',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: { x: 8, y: 4 }
    }).setDepth(100).setScrollFactor(0);

    this.add.text(20, startY + lineHeight * 2 + 15, 'WASD/方向键移动 | E键交互 | X键扩展农场 | 空格获得金币', {
      fontSize: '10px',
      color: '#FFFFFF',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: { x: 6, y: 3 }
    }).setDepth(100).setScrollFactor(0);
  }

  // @ts-ignore: Unused function, possibly for future use
  private updateUI(): void {
    const state = gameStore.getState();
    this.farmLevelText.setText(`📊 农场等级: ${state.farmLevel} (${state.farmSize}x${state.farmSize})`);
    
    const expansionCost = gameStore.getState().getExpansionCost();
    const canExpand = gameStore.getState().canExpandFarm();
    this.expansionText.setText(`🔨 扩展农场 (X键): ${expansionCost} 金币${canExpand ? ' ✔' : ' (金币不足)'}`);
    this.expansionText.setBackgroundColor(canExpand ? '#16a085' : '#7f8c8d');
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
    const farmSize = this.getFarmSize();

    let closestDist = Infinity;
    let closestTile: { row: number; col: number } | null = null;

    for (let row = 0; row < farmSize; row++) {
      for (let col = 0; col < farmSize; col++) {
        const tilePos = this.getTileWorldPosition(row, col);
        const distance = Phaser.Math.Distance.Between(
          playerX, playerY,
          tilePos.x, tilePos.y
        );

        if (distance < this.TILE_SIZE && distance < closestDist) {
          closestDist = distance;
          closestTile = { row, col };
        }
      }
    }

    return closestTile;
  }

  private getClosestGridPosition(): { x: number; y: number } | null {
    const playerX = this.player.x;
    const playerY = this.player.y;
    const farmSize = this.getFarmSize();

    let closestDist = Infinity;
    let closestPos = null;

    for (let row = 0; row < farmSize; row++) {
      for (let col = 0; col < farmSize; col++) {
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

    const textureKey = tile.isWatered ? 'watered' : 'tilled';

    switch (tile.state) {
      case 'tilled':
      case 'watered':
        tile.sprite = this.add.image(tilePos.x, tilePos.y, textureKey);
        tile.sprite.setDepth(1);
        break;
      case 'planted':
        tile.sprite = this.add.image(tilePos.x, tilePos.y, textureKey);
        tile.sprite.setDepth(1);
        if (tile.cropType) {
          const growthStage = this.getCropGrowthStage(tile);
          const cropTextureKey = getGrowthStageTexture(tile.cropType, growthStage);
          tile.cropSprite = this.add.image(tilePos.x, tilePos.y, cropTextureKey);
          let scale = 0.5;
          switch (growthStage) {
            case 'seed': scale = 0.5; break;
            case 'sprout': scale = 0.6; break;
            case 'flower': scale = 0.7; break;
            case 'mature': scale = 0.8; break;
          }
          tile.cropSprite.setScale(scale);
          tile.cropSprite.setDepth(2);
        }
        break;
      case 'grown':
        tile.sprite = this.add.image(tilePos.x, tilePos.y, textureKey);
        tile.sprite.setDepth(1);
        if (tile.cropType) {
          const cropTextureKey = getGrowthStageTexture(tile.cropType, 'mature');
          tile.cropSprite = this.add.image(tilePos.x, tilePos.y, cropTextureKey);
          tile.cropSprite.setScale(0.7);
          tile.cropSprite.setDepth(2);
        } else {
          tile.cropSprite = this.add.image(tilePos.x, tilePos.y, 'crop_grown');
          tile.cropSprite.setScale(0.6);
          tile.cropSprite.setDepth(2);
        }
        break;
    }
  }

  private syncTileToStore(row: number, col: number): void {
    const tile = this.farmGrid[row][col];
    gameStore.getState().updateFarmTile(row, col, {
      state: tile.state,
      plantedTime: tile.plantedTime,
      isWatered: tile.isWatered,
      isFertilized: tile.isFertilized,
      wateredDays: tile.wateredDays,
      cropType: tile.cropType,
      isRegrowing: tile.isRegrowing,
      consecutivePlantingDays: tile.consecutivePlantingDays,
      lastCropType: tile.lastCropType,
      isGiant: tile.isGiant,
      giantCenterRow: tile.giantCenterRow,
      giantCenterCol: tile.giantCenterCol,
      currentGrowthStage: tile.currentGrowthStage
    });
  }

  private handleEKey(): void {
    if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
      const state = gameStore.getState();

      if (this.nearestLanternIndex !== null && this.currentTimeState?.isLanternFestival) {
        this.lightLantern(this.nearestLanternIndex);
        return;
      }

      if (state.toolsDisabled) {
        gameStore.getState().showNotification('⚠️ 灯会期间工具暂时禁用，请去点亮灯笼！');
        return;
      }

      const nearestNPC = this.getNearestNPC();
      
      if (nearestNPC) {
        this.interactWithNPC(nearestNPC);
      } else if (this.isNearQuestBoard) {
        gameStore.getState().showQuestBoard();
      } else if (this.highlightedTile) {
        const { row, col } = this.highlightedTile;
        const tile = this.farmGrid[row][col];
        const selectedTool = state.selectedTool;
        
        console.log('当前瓦片状态:', tile.state, '选中工具:', selectedTool);

        if (selectedTool === 'wateringCan') {
          if (tile.state === 'empty') {
            gameStore.getState().showNotification('⚠️ 这块地还没耕地！请先用锄头耕地。');
            console.log('这块地还没耕地，无法浇水');
          } else if (tile.state === 'tilled' || tile.state === 'watered') {
            if (tile.isWatered) {
              gameStore.getState().showNotification('💧 已经浇过水了！取消选择水壶后可以种植作物。');
              console.log('已经浇过水了，取消选择水壶后可以种植');
            } else {
              tile.isWatered = true;
              this.updateTileVisual(row, col);
              this.syncTileToStore(row, col);
              console.log('浇水成功！');
              gameStore.getState().showNotification('💧 浇水成功！取消选择水壶后可以种植作物。');
            }
          } else if (tile.state === 'planted' || tile.state === 'grown') {
            if (!tile.isWatered) {
              tile.isWatered = true;
              this.updateTileVisual(row, col);
              this.syncTileToStore(row, col);
              console.log('浇水成功！');
              gameStore.getState().showNotification('💧 浇水成功！');
            }
            
            if (tile.state === 'planted') {
              const cropConfig = tile.cropType ? CROPS_CONFIG[tile.cropType] : null;
              const stageName = GROWTH_STAGE_REQUIREMENTS[tile.currentGrowthStage]?.name || '种子';
              gameStore.getState().showNotification(`🌱 ${cropConfig?.name || '作物'}正在生长中... 当前阶段: ${stageName}`);
              console.log(`作物生长中，当前阶段: ${tile.currentGrowthStage}, 浇水天数: ${tile.wateredDays}`);
            }
          }
        } else {
          switch (tile.state) {
            case 'empty': {
              const tillingRange = gameStore.getState().getHoeTillingRange();
              const farmSize = this.getFarmSize();
              
              if (tillingRange === 3) {
                for (let r = row - 1; r <= row + 1; r++) {
                  for (let c = col - 1; c <= col + 1; c++) {
                    if (r >= 0 && r < farmSize && c >= 0 && c < farmSize) {
                      const targetTile = this.farmGrid[r]?.[c];
                      if (targetTile && targetTile.state === 'empty') {
                        targetTile.state = 'tilled';
                        this.updateTileVisual(r, c);
                        this.syncTileToStore(r, c);
                      }
                    }
                  }
                }
                console.log('铜质锄头耕地成功！范围 3x3');
                gameStore.getState().showNotification('🔨 铜质锄头：3x3 范围耕地成功！');
              } else {
                tile.state = 'tilled';
                console.log('耕地成功！');
                this.updateTileVisual(row, col);
                this.syncTileToStore(row, col);
              }
              break;
            }

            case 'tilled':
            case 'watered':
              this.handlePlanting(row, col, tile);
              break;

            case 'planted':
              if (tile.isWatered) {
                const cropConfig = tile.cropType ? CROPS_CONFIG[tile.cropType] : null;
                const stageName = GROWTH_STAGE_REQUIREMENTS[tile.currentGrowthStage]?.name || '种子';
                gameStore.getState().showNotification(`🌱 ${cropConfig?.name || '作物'}正在生长中... 当前阶段: ${stageName}`);
                console.log(`作物生长中，当前阶段: ${tile.currentGrowthStage}, 浇水天数: ${tile.wateredDays}`);
              } else {
                gameStore.getState().showNotification('⚠️ 作物需要浇水才能生长！请选择水壶浇水。');
                console.log('作物需要浇水');
              }
              break;

            case 'grown':
              if (tile.isGiant) {
                const selectedToolForGiant = state.selectedTool;
                if (selectedToolForGiant !== 'axe') {
                  gameStore.getState().showNotification('⚠️ 巨型作物需要用斧头砍伐！');
                  console.log('巨型作物需要用斧头砍伐！');
                  break;
                }
                
                this.harvestGiantCrop(row, col);
                break;
              }
              
              const harvestedCropType = tile.cropType;
              const isFertilized = tile.isFertilized;
              
              if (harvestedCropType) {
                const cropConfig = CROPS_CONFIG[harvestedCropType];
                
                const actualHarvestType = harvestedCropType === 'ancientSeed' ? 'ancientFruit' : harvestedCropType;
                const harvestResult = gameStore.getState().harvestCropWithQuality(actualHarvestType, isFertilized);
                gameStore.getState().addCropWithQuality(actualHarvestType, harvestResult.quality, 1);
                
                const actualCropConfig = CROPS_CONFIG[actualHarvestType];
                const qualityName = QUALITY_NAMES[harvestResult.quality];
                const qualityIcon = QUALITY_ICONS[harvestResult.quality];
                
                const baseExp = actualCropConfig ? Math.floor(actualCropConfig.sellPrice * 0.2) : 10;
                const qualityMultiplier = QUALITY_PRICE_MULTIPLIER[harvestResult.quality];
                const earnedExp = Math.floor(baseExp * qualityMultiplier);
                
                if (harvestResult.quality > CropQualityValues.Normal) {
                  this.createHarvestParticles(row, col, harvestResult.quality);
                }
                
                if (cropConfig?.regrowable && cropConfig.regrowDays !== undefined) {
                  tile.state = 'planted';
                  tile.wateredDays = 0;
                  tile.isRegrowing = true;
                  tile.isWatered = true;
                  tile.currentGrowthStage = 'seed';
                  tile.daysInCurrentStage = 0;
                  tile.stageActionsCompleted = {
                    water: true,
                    fertilizer: tile.isFertilized ?? false
                  };
                  
                  console.log(`收割可再生作物！获得 ${qualityIcon}${qualityName} ${actualCropConfig?.name || actualHarvestType}，价格: ${harvestResult.price} 金币，获得经验: ${earnedExp}。作物已进入再生阶段，需要 ${cropConfig.regrowDays} 天。`);
                  gameStore.getState().showNotification(`🌾 收获了 ${qualityIcon}${qualityName} ${actualCropConfig?.name || actualHarvestType}！作物正在再生中（需要${cropConfig.regrowDays}天）...`);
                } else {
                  tile.state = 'empty';
                  tile.plantedTime = 0;
                  tile.isWatered = false;
                  tile.isFertilized = false;
                  tile.wateredDays = 0;
                  tile.cropType = undefined;
                  tile.isRegrowing = false;
                  tile.currentGrowthStage = 'seed';
                  tile.daysInCurrentStage = 0;
                  tile.stageActionsCompleted = { water: false, fertilizer: false };
                  
                  console.log(`收割成功！获得 ${qualityIcon}${qualityName} ${actualCropConfig?.name || actualHarvestType}，价格: ${harvestResult.price} 金币，获得经验: ${earnedExp}`);
                  gameStore.getState().showNotification(`🌾 收获了 ${qualityIcon}${qualityName} ${actualCropConfig?.name || actualHarvestType}！价值 ${harvestResult.price} 金币，经验 +${earnedExp}`);
                }
                gameStore.getState().addExp(earnedExp);
              } else {
                tile.state = 'empty';
                tile.plantedTime = 0;
                tile.isWatered = false;
                tile.isFertilized = false;
                tile.wateredDays = 0;
                tile.cropType = undefined;
                tile.isRegrowing = false;
                tile.currentGrowthStage = 'seed';
                tile.daysInCurrentStage = 0;
                tile.stageActionsCompleted = { water: false, fertilizer: false };
                
                gameStore.getState().addCrops(1);
                gameStore.getState().addExp(10);
                console.log('收割成功！作物数量:', state.getTotalCropCount() + 1, '获得经验: 10');
              }
              this.updateTileVisual(row, col);
              this.syncTileToStore(row, col);
              break;
          }
        }
      } else {
        console.log('没有检测到附近的可交互对象！');
      }
    }
  }

  private getAvailableSeedsForCurrentSeason(): CropType[] {
    const state = gameStore.getState();
    const season = this.currentTimeState?.season;
    
    if (!season) {
      const allCrops = Object.keys(CROPS_CONFIG) as CropType[];
      return allCrops.filter(cropType => state.getSeedCount(cropType) > 0);
    }

    const cropsInSeason = getCropsBySeason(season);
    const availableSeeds: CropType[] = [];

    for (const crop of cropsInSeason) {
      const count = state.getSeedCount(crop.id);
      if (count > 0) {
        availableSeeds.push(crop.id);
      }
    }

    return availableSeeds;
  }

  private handlePlanting(row: number, col: number, tile: FarmTile): void {
    const state = gameStore.getState();
    const availableSeeds = this.getAvailableSeedsForCurrentSeason();

    if (availableSeeds.length === 0) {
      const seasonName = this.currentTimeState?.season 
        ? SEASON_NAMES[this.currentTimeState.season] 
        : '当前';
      gameStore.getState().showNotification(`⚠️ ${seasonName}没有可种植的作物，请去商店购买种子！`);
      console.log(`${seasonName}没有可种植的作物`);
      return;
    }

    if (availableSeeds.length === 1) {
      const cropType = availableSeeds[0];
      const seedCount = state.getSeedCount(cropType);
      
      if (seedCount > 0) {
        tile.state = 'planted';
        tile.plantedTime = this.time.now;
        tile.cropType = cropType;
        tile.wateredDays = 0;
        tile.isRegrowing = false;
        tile.currentGrowthStage = 'seed';
        tile.daysInCurrentStage = 0;
        tile.stageActionsCompleted = {
          water: tile.isWatered ?? false,
          fertilizer: tile.isFertilized ?? false
        };
        gameStore.getState().addSeedByType(cropType, -1);
        gameStore.getState().addQuestProgress('plant', 'seed', 1);
        gameStore.getState().selectSeedType(cropType);
        const cropConfig = CROPS_CONFIG[cropType];
        console.log(`播种成功！种植了 ${cropConfig?.name || cropType}，剩余种子:`, seedCount - 1);
        gameStore.getState().showNotification(`🌱 种植了 ${cropConfig?.name || cropType}！`);
        this.updateTileVisual(row, col);
        this.syncTileToStore(row, col);
      }
    } else {
      gameStore.getState().showCropSelection(row, col);
      console.log(`显示作物选择窗口，可选 ${availableSeeds.length} 种作物`);
    }
  }

  private getCropGrowthStage(tile: FarmTile): GrowthStage {
    return tile.currentGrowthStage || 'seed';
  }

  private isCropMature(tile: FarmTile): boolean {
    return tile.currentGrowthStage === 'mature' || tile.state === 'grown';
  }

  private lightLantern(index: number): void {
    const state = gameStore.getState();
    if (state.lanternLit[index]) return;

    gameStore.getState().lightLantern(index);
    console.log(`🎈 点亮了第 ${index + 1} 个灯笼！`);

    if (this.lanterns[index]) {
      this.lanterns[index].destroy();
      const pos = this.lanternPositions[index];
      const newLantern = this.createLanternSprite(pos.x, pos.y, true, index);
      this.lanterns[index] = newLantern;
    }

    gameStore.getState().showNotification(`🎈 灯笼 ${index + 1}/5 已点亮！`);

    const allLit = gameStore.getState().lanternLit.every(lit => lit);
    if (allLit) {
      gameStore.getState().showNotification('🎉 恭喜！所有灯笼都点亮了！灯会圆满成功！');
      console.log('🎉 所有灯笼都点亮了！');
    }
  }

  private getNearestNPC(): NPC | null {
    let nearest: NPC | null = null;
    let nearestDistance = Infinity;

    for (const npc of this.npcs) {
      if (npc.isNearPlayer(this.player)) {
        const distance = Phaser.Math.Distance.Between(
          this.player.x, this.player.y,
          npc.sprite.x, npc.sprite.y
        );
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = npc;
        }
      }
    }

    return nearest;
  }

  private interactWithNPC(npc: NPC): void {
    const dialogue = npc.getRandomDialogue();
    
    if (npc.role === 'shopkeeper') {
      gameStore.getState().showDialog(npc.name, dialogue, 'shop');
    } else if (npc.role === 'blacksmith') {
      gameStore.getState().showDialog(npc.name, dialogue, 'blacksmith');
    } else {
      gameStore.getState().showDialog(npc.name, dialogue);
    }
    
    gameStore.getState().updateRelationship(npc.id, 1);
    npc.setInteracting(true);
    console.log(`与 ${npc.name} 交互，好感度 +1`);
  }

  private handleSaveKey(): void {
    if (this.shiftKey.isDown && Phaser.Input.Keyboard.JustDown(this.wasdKeys.S)) {
      gameStore.getState().saveGame();
      console.log('已保存游戏 (Shift+S)');
    }
  }

  private handleLoadKey(): void {
    if (this.shiftKey.isDown && Phaser.Input.Keyboard.JustDown(this.lKey)) {
      const success = gameStore.getState().loadGame();
      if (success) {
        this.refreshFarmGridFromStore();
        console.log('已读取游戏 (Shift+L)');
      }
    }
  }

  private refreshFarmGridFromStore(): void {
    const state = gameStore.getState();
    
    if (state.farmSize !== this.currentFarmSize) {
      this.currentFarmSize = state.farmSize;
      
      const gridCenterX = this.MAP_WIDTH * this.TILE_SIZE / 2;
      const gridCenterY = this.MAP_HEIGHT * this.TILE_SIZE / 2;
      
      const gridWidth = this.currentFarmSize * this.TILE_SIZE;
      const gridHeight = this.currentFarmSize * this.TILE_SIZE;

      this.gridOffsetX = gridCenterX - gridWidth / 2;
      this.gridOffsetY = gridCenterY - gridHeight / 2;

      if (this.farmGridBorder) {
        this.farmGridBorder.destroy();
      }
      this.farmGridBorder = this.add.rectangle(
        this.gridOffsetX + gridWidth / 2,
        this.gridOffsetY + gridHeight / 2,
        gridWidth,
        gridHeight,
        0x000000,
        0
      );
      this.farmGridBorder.setStrokeStyle(4, 0x8B4513, 1);
      this.farmGridBorder.setDepth(0);
    }

    for (let row = 0; row < this.currentFarmSize; row++) {
      for (let col = 0; col < this.currentFarmSize; col++) {
        const storeTile = state.farmGrid[row]?.[col];
        if (storeTile) {
          if (!this.farmGrid[row]) {
            this.farmGrid[row] = [];
          }
          if (!this.farmGrid[row][col]) {
            this.farmGrid[row][col] = {
              state: 'empty',
              sprite: null,
              cropSprite: null,
              plantedTime: 0,
              isWatered: false,
              isFertilized: false,
              wateredDays: 0,
              lastDayWatered: -1,
              currentGrowthStage: 'seed',
              daysInCurrentStage: 0,
              stageActionsCompleted: { water: false, fertilizer: false }
            };
          }
          const hasCrop = storeTile.state === 'planted' || storeTile.state === 'grown';
          const initialStage: GrowthStage = hasCrop && storeTile.cropType
            ? getGrowthStageProgress(storeTile.wateredDays ?? 0, CROPS_CONFIG[storeTile.cropType]?.growthDays ?? 4)
            : 'seed';
          
          this.farmGrid[row][col].state = storeTile.state;
          this.farmGrid[row][col].plantedTime = storeTile.plantedTime;
          this.farmGrid[row][col].isWatered = storeTile.isWatered || false;
          this.farmGrid[row][col].isFertilized = storeTile.isFertilized || false;
          this.farmGrid[row][col].wateredDays = storeTile.wateredDays || 0;
          this.farmGrid[row][col].cropType = storeTile.cropType;
          this.farmGrid[row][col].isRegrowing = storeTile.isRegrowing;
          this.farmGrid[row][col].consecutivePlantingDays = storeTile.consecutivePlantingDays;
          this.farmGrid[row][col].lastCropType = storeTile.lastCropType;
          this.farmGrid[row][col].isGiant = storeTile.isGiant;
          this.farmGrid[row][col].giantCenterRow = storeTile.giantCenterRow;
          this.farmGrid[row][col].giantCenterCol = storeTile.giantCenterCol;
          this.farmGrid[row][col].currentGrowthStage = initialStage;
          this.farmGrid[row][col].daysInCurrentStage = 0;
          this.farmGrid[row][col].stageActionsCompleted = {
            water: storeTile.isWatered || false,
            fertilizer: storeTile.isFertilized || false
          };
          this.updateTileVisual(row, col);
        }
      }
    }
  }

  private handleXKey(): void {
    if (Phaser.Input.Keyboard.JustDown(this.xKey)) {
      console.log('X键被按下 - 尝试扩展农场');
      
      const state = gameStore.getState();
      const canExpand = state.canExpandFarm();
      
      if (canExpand) {
        const success = state.expandFarm();
        if (success) {
          console.log('农场扩展成功！');
          this.refreshFarmGrid();
        }
      } else {
        const cost = state.getExpansionCost();
        console.log(`金币不足！需要 ${cost} 金币，当前只有 ${state.gold} 金币`);
      }
    }
  }

  private handleKKey(): void {
    if (Phaser.Input.Keyboard.JustDown(this.kKey)) {
      console.log('K键被按下 - 切换技能面板');
      gameStore.getState().toggleSkillsPanel();
    }
  }

  private handleBKey(): void {
    if (Phaser.Input.Keyboard.JustDown(this.bKey)) {
      const state = gameStore.getState();
      if (state.shopVisible) {
        console.log('B键被按下 - 关闭商店');
        gameStore.getState().hideShop();
      } else {
        console.log('B键被按下 - 打开商店');
        gameStore.getState().showShop();
      }
    }
  }

  private handleFKey(): void {
    if (Phaser.Input.Keyboard.JustDown(this.fKey)) {
      const state = gameStore.getState();
      const fertilizerCount = state.getFertilizerCount();
      
      if (fertilizerCount <= 0) {
        gameStore.getState().showNotification('⚠️ 没有肥料了！请去商店购买。');
        console.log('没有肥料了！');
        return;
      }

      if (!this.highlightedTile) {
        gameStore.getState().showNotification('⚠️ 请先选中一个已耕地的地块！');
        console.log('没有选中地块！');
        return;
      }

      const { row, col } = this.highlightedTile;
      const tile = this.farmGrid[row][col];

      if (tile.state === 'planted' || tile.state === 'grown') {
        gameStore.getState().showNotification('⚠️ 该地块已经种了作物！请在播种前施肥。');
        console.log('该地块已经种了作物！');
        return;
      }

      if (tile.state !== 'tilled' && tile.state !== 'watered') {
        gameStore.getState().showNotification('⚠️ 只能在已耕地的地块上施肥！');
        console.log('只能在已耕地的地块上施肥！');
        return;
      }

      if (tile.isFertilized) {
        gameStore.getState().showNotification('⚠️ 该地块已经施过肥了！');
        console.log('该地块已经施过肥了！');
        return;
      }

      tile.isFertilized = true;
      gameStore.getState().addFertilizer(-1);
      this.syncTileToStore(row, col);
      
      gameStore.getState().showNotification('🌱 施肥成功！作物品质将会提升。');
      console.log(`施肥成功！在 (${row}, ${col}) 地块施肥，剩余肥料: ${fertilizerCount - 1}`);
    }
  }

  private handleIKey(): void {
    if (Phaser.Input.Keyboard.JustDown(this.iKey)) {
      console.log('I键被按下 - 切换背包');
      gameStore.getState().toggleInventory();
    }
  }

  private refreshFarmGrid(): void {
    const state = gameStore.getState();
    
    if (state.farmSize !== this.currentFarmSize) {
      this.currentFarmSize = state.farmSize;
      
      const gridCenterX = this.MAP_WIDTH * this.TILE_SIZE / 2;
      const gridCenterY = this.MAP_HEIGHT * this.TILE_SIZE / 2;
      
      const gridWidth = this.currentFarmSize * this.TILE_SIZE;
      const gridHeight = this.currentFarmSize * this.TILE_SIZE;

      const oldOffsetX = this.gridOffsetX;
      const oldOffsetY = this.gridOffsetY;

      this.gridOffsetX = gridCenterX - gridWidth / 2;
      this.gridOffsetY = gridCenterY - gridHeight / 2;

      const oldFarmGrid = [...this.farmGrid];
      
      if (this.farmGridBorder) {
        this.farmGridBorder.destroy();
      }
      this.farmGridBorder = this.add.rectangle(
        this.gridOffsetX + gridWidth / 2,
        this.gridOffsetY + gridHeight / 2,
        gridWidth,
        gridHeight,
        0x000000,
        0
      );
      this.farmGridBorder.setStrokeStyle(4, 0x8B4513, 1);
      this.farmGridBorder.setDepth(0);

      const offsetChangeX = this.gridOffsetX - oldOffsetX;
      const offsetChangeY = this.gridOffsetY - oldOffsetY;

      this.farmGrid = [];
      for (let row = 0; row < this.currentFarmSize; row++) {
        this.farmGrid[row] = [];
        for (let col = 0; col < this.currentFarmSize; col++) {
          const oldRow = row - 1;
          const oldCol = col - 1;
          
          if (oldFarmGrid[oldRow] && oldFarmGrid[oldRow][oldCol]) {
            this.farmGrid[row][col] = oldFarmGrid[oldRow][oldCol];
            
            if (this.farmGrid[row][col].sprite) {
              this.farmGrid[row][col].sprite!.x += offsetChangeX + this.TILE_SIZE;
              this.farmGrid[row][col].sprite!.y += offsetChangeY + this.TILE_SIZE;
            }
            if (this.farmGrid[row][col].cropSprite) {
              this.farmGrid[row][col].cropSprite!.x += offsetChangeX + this.TILE_SIZE;
              this.farmGrid[row][col].cropSprite!.y += offsetChangeY + this.TILE_SIZE;
            }
          } else {
            this.farmGrid[row][col] = {
              state: 'empty',
              sprite: null,
              cropSprite: null,
              plantedTime: 0,
              isWatered: false,
              isFertilized: false,
              wateredDays: 0,
              lastDayWatered: 0,
              currentGrowthStage: 'seed',
              daysInCurrentStage: 0,
              stageActionsCompleted: { water: false, fertilizer: false }
            };
          }
        }
      }
      
      console.log(`农场已刷新为 ${this.currentFarmSize}x${this.currentFarmSize}`);
    }
  }

  private createHarvestParticles(row: number, col: number, quality: CropQuality): void {
    const tilePos = this.getTileWorldPosition(row, col);
    const colorHex = QUALITY_COLORS[quality];
    
    const particles = this.add.particles(tilePos.x, tilePos.y, 'rock', {
      speed: { min: 50, max: 150 },
      angle: { min: 225, max: 315 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 800,
      gravityY: 200,
      quantity: 5,
      tint: parseInt(colorHex.replace('#', ''), 16)
    });

    this.time.delayedCall(1000, () => {
      particles.destroy();
    });

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const distance = this.TILE_SIZE * 0.3;
      const startX = tilePos.x + Math.cos(angle) * distance;
      const startY = tilePos.y + Math.sin(angle) * distance;
      
      const spark = this.add.circle(startX, startY, 4, parseInt(colorHex.replace('#', ''), 16));
      spark.setDepth(100);
      spark.setAlpha(1);
      
      const targetX = tilePos.x + (Math.random() - 0.5) * this.TILE_SIZE;
      const targetY = tilePos.y - this.TILE_SIZE * (0.5 + Math.random() * 0.5);
      
      this.tweens.add({
        targets: spark,
        x: targetX,
        y: targetY,
        alpha: 0,
        scale: 0.5,
        duration: 600 + Math.random() * 400,
        ease: 'Power2.out',
        onComplete: () => {
          spark.destroy();
        }
      });
    }

    const sparkleCount = quality === CropQualityValues.Iridium ? 12 : quality === CropQualityValues.Gold ? 8 : 5;
    for (let i = 0; i < sparkleCount; i++) {
      this.time.delayedCall(i * 50, () => {
        const sparkX = tilePos.x + (Math.random() - 0.5) * this.TILE_SIZE * 0.6;
        const sparkY = tilePos.y + (Math.random() - 0.5) * this.TILE_SIZE * 0.6;
        const sparkle = this.add.text(sparkX, sparkY, '✨', {
          fontSize: '16px',
          color: colorHex
        });
        sparkle.setOrigin(0.5);
        sparkle.setDepth(100);
        
        this.tweens.add({
          targets: sparkle,
          y: sparkY - 30 - Math.random() * 20,
          alpha: 0,
          scale: 1.5,
          duration: 700 + Math.random() * 300,
          ease: 'Power2.out',
          onComplete: () => {
            sparkle.destroy();
          }
        });
      });
    }
  }

  private updateGrowth(): void {
    const farmSize = this.getFarmSize();

    for (let row = 0; row < farmSize; row++) {
      for (let col = 0; col < farmSize; col++) {
        if (this.farmGrid[row] && this.farmGrid[row][col]) {
          const tile = this.farmGrid[row][col];
          if (tile.state === 'planted' && tile.plantedTime > 0) {
            if (this.isCropMature(tile)) {
              tile.state = 'grown';
              const cropConfig = tile.cropType ? CROPS_CONFIG[tile.cropType] : null;
              console.log(`作物成熟: (${row}, ${col}) - ${cropConfig?.name || '未知'}`);
              this.updateTileVisual(row, col);
              this.syncTileToStore(row, col);
            } else {
              this.updateTileVisual(row, col);
            }
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

  private setupShopArea(): void {
    const worldWidth = this.MAP_WIDTH * this.TILE_SIZE;
    
    this.shopArea.x = worldWidth - this.shopArea.width - 200;
    this.shopArea.y = 200;
    
    const shopIndicator = this.add.rectangle(
      this.shopArea.x + this.shopArea.width / 2,
      this.shopArea.y + this.shopArea.height / 2,
      this.shopArea.width,
      this.shopArea.height,
      0x228B22,
      0.2
    );
    shopIndicator.setStrokeStyle(4, 0x228B22, 0.8);
    shopIndicator.setDepth(0);
    
    this.add.text(
      this.shopArea.x + this.shopArea.width / 2,
      this.shopArea.y + 20,
      '🏪 杂货商店',
      {
        fontSize: '20px',
        color: '#228B22',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(0.5).setDepth(5);
  }

  private createMineEntrance(): void {
    const worldWidth = this.MAP_WIDTH * this.TILE_SIZE;
    const worldHeight = this.MAP_HEIGHT * this.TILE_SIZE;

    const graphics = this.add.graphics();
    
    graphics.fillStyle(0x5c4033, 1);
    graphics.fillRect(5, 10, 50, 50);
    
    graphics.fillStyle(0x2a2a2a, 1);
    graphics.beginPath();
    graphics.moveTo(30, 15);
    graphics.lineTo(10, 60);
    graphics.lineTo(50, 60);
    graphics.closePath();
    graphics.fill();
    
    graphics.fillStyle(0x1a1a1a, 1);
    graphics.beginPath();
    graphics.moveTo(30, 25);
    graphics.lineTo(15, 55);
    graphics.lineTo(45, 55);
    graphics.closePath();
    graphics.fill();
    
    graphics.fillStyle(0xFFD700, 1);
    graphics.fillCircle(20, 12, 3);
    graphics.fillCircle(40, 12, 3);
    
    graphics.generateTexture('mine_entrance', 60, 65);
    graphics.destroy();

    const entranceX = worldWidth / 2 - 400;
    const entranceY = worldHeight - this.TILE_SIZE * 4;

    this.mineEntrance = this.physics.add.sprite(
      entranceX,
      entranceY,
      'mine_entrance'
    );
    this.mineEntrance.setOrigin(0.5);
    this.mineEntrance.setImmovable(true);
    this.mineEntrance.setDepth(5);
    this.mineEntrance.setData('isMineEntrance', true);

    this.add.text(
      this.mineEntrance.x,
      this.mineEntrance.y - 55,
      '⛏️ 矿洞入口',
      {
        fontSize: '20px',
        color: '#5c4033',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(0.5).setDepth(100);

    this.add.text(
      this.mineEntrance.x,
      this.mineEntrance.y - 28,
      '触碰进入',
      {
        fontSize: '14px',
        color: '#FFD700',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: { x: 8, y: 3 }
      }
    ).setOrigin(0.5).setDepth(100);

    const glow = this.add.circle(
      this.mineEntrance.x,
      this.mineEntrance.y,
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
  }

  private checkMineEntrance(): void {
    if (!this.mineEntrance || this.isTransitioningToMine) return;

    const distance = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.mineEntrance.x, this.mineEntrance.y
    );

    if (distance < 80) {
      this.isTransitioningToMine = true;
      console.log('🚀 准备进入矿洞...');
      console.log(`📍 玩家位置: (${this.player.x}, ${this.player.y})`);
      console.log(`📍 矿洞入口位置: (${this.mineEntrance.x}, ${this.mineEntrance.y})`);
      console.log(`📏 距离: ${distance}`);
      
      this.player.setVelocity(0, 0);
      
      this.cameras.main.fadeOut(500, 0, 0, 0);
      
      this.time.delayedCall(600, () => {
        console.log('🎬 场景切换: FarmScene -> MineScene');
        this.scene.start('MineScene');
      });
    }
  }

  private createNPCs(): void {
    const worldWidth = this.MAP_WIDTH * this.TILE_SIZE;
    const worldHeight = this.MAP_HEIGHT * this.TILE_SIZE;
    const centerX = worldWidth / 2;
    const centerY = worldHeight / 2;
    
    const blacksmithConfig: NPCConfig = {
      id: 'blacksmith',
      name: '铁匠老陈',
      role: 'blacksmith',
      startX: centerX - 300,
      startY: centerY - 200,
      waypoints: [
        {
          x: centerX,
          y: centerY - 300,
          startTime: 8,
          endTime: 12,
          label: '广场'
        },
        {
          x: centerX - 300,
          y: centerY - 200,
          startTime: 12,
          endTime: 14,
          label: '铁匠铺'
        },
        {
          x: centerX + 200,
          y: centerY - 100,
          startTime: 14,
          endTime: 18,
          label: '酒馆'
        },
        {
          x: centerX - 300,
          y: centerY - 200,
          startTime: 18,
          endTime: 24,
          label: '铁匠铺'
        },
        {
          x: centerX - 300,
          y: centerY - 200,
          startTime: 0,
          endTime: 8,
          label: '铁匠铺'
        }
      ],
      dialogues: [
        '年轻人，今天天气不错，适合打铁。',
        '需要我帮你打造什么工具吗？',
        '我的手艺在这附近可是数一数二的！',
        '昨天晚上又梦到了年轻时当冒险者的日子...'
      ],
      color: 0x8B4513
    };
    
    const shopkeeperConfig: NPCConfig = {
      id: 'shopkeeper',
      name: '杂货商小王',
      role: 'shopkeeper',
      startX: this.shopArea.x + this.shopArea.width / 2,
      startY: this.shopArea.y + this.shopArea.height / 2,
      waypoints: [
        {
          x: centerX,
          y: centerY - 300,
          startTime: 8,
          endTime: 10,
          label: '广场'
        },
        {
          x: this.shopArea.x + this.shopArea.width / 2,
          y: this.shopArea.y + this.shopArea.height / 2,
          startTime: 10,
          endTime: 20,
          label: '商店'
        },
        {
          x: centerX + 200,
          y: centerY - 100,
          startTime: 20,
          endTime: 22,
          label: '酒馆'
        },
        {
          x: this.shopArea.x + this.shopArea.width / 2,
          y: this.shopArea.y + this.shopArea.height / 2,
          startTime: 22,
          endTime: 24,
          label: '商店'
        },
        {
          x: this.shopArea.x + this.shopArea.width / 2,
          y: this.shopArea.y + this.shopArea.height / 2,
          startTime: 0,
          endTime: 8,
          label: '商店'
        }
      ],
      dialogues: [
        '欢迎光临！需要什么种子吗？',
        '今天有新鲜的种子到货哦！',
        '买得多可以优惠！',
        '记得常来看看，新品种子很快就到了！'
      ],
      color: 0x228B22
    };
    
    const blacksmith = new NPC(this, blacksmithConfig);
    const shopkeeper = new NPC(this, shopkeeperConfig);
    
    this.npcs.push(blacksmith);
    this.npcs.push(shopkeeper);
    
    this.physics.add.collider(this.player, blacksmith.sprite);
    this.physics.add.collider(this.player, shopkeeper.sprite);
    this.physics.add.collider(blacksmith.sprite, this.collisionLayer);
    this.physics.add.collider(shopkeeper.sprite, this.collisionLayer);
  }

  private updateNPCs(): void {
    const state = gameStore.getState();
    const isInAnyInteraction = state.dialogVisible || state.shopVisible || state.blacksmithVisible;
    
    if (!isInAnyInteraction) {
      for (const npc of this.npcs) {
        npc.setInteracting(false);
      }
    }
    
    for (const npc of this.npcs) {
      npc.update(this.player);
    }
  }

  private checkShopArea(): void {
    const playerX = this.player.x;
    const playerY = this.player.y;
    
    const inShop = 
      playerX >= this.shopArea.x &&
      playerX <= this.shopArea.x + this.shopArea.width &&
      playerY >= this.shopArea.y &&
      playerY <= this.shopArea.y + this.shopArea.height;
    
    if (inShop && !this.isInShopArea) {
      this.isInShopArea = true;
      gameStore.getState().showShop();
    } else if (!inShop && this.isInShopArea) {
      this.isInShopArea = false;
      gameStore.getState().hideShop();
    }
  }

  private subscribeToStore(): void {
    gameStore.subscribe((state, prevState) => {
      if (state.farmSize !== this.currentFarmSize) {
        this.refreshFarmGrid();
      }

      if (state.pendingPlantingAction && !prevState.pendingPlantingAction) {
        this.executePendingPlanting(state.pendingPlantingAction);
      }
    });
  }

  private executePendingPlanting(action: { cropType: CropType; row: number; col: number }): void {
    const state = gameStore.getState();
    const { cropType, row, col } = action;

    const seedCount = state.getSeedCount(cropType);
    if (seedCount <= 0) {
      state.showNotification('⚠️ 没有该类型的种子了！');
      state.clearPendingPlantingAction();
      return;
    }

    if (row < 0 || row >= this.currentFarmSize || col < 0 || col >= this.currentFarmSize) {
      state.clearPendingPlantingAction();
      return;
    }

    const tile = this.farmGrid[row][col];
    if (tile.state !== 'tilled' && tile.state !== 'watered') {
      state.clearPendingPlantingAction();
      return;
    }

    tile.state = 'planted';
    tile.plantedTime = this.time.now;
    tile.cropType = cropType;
    tile.wateredDays = 0;
    tile.isRegrowing = false;
    tile.currentGrowthStage = 'seed';
    tile.daysInCurrentStage = 0;
    tile.stageActionsCompleted = {
      water: tile.isWatered ?? false,
      fertilizer: tile.isFertilized ?? false
    };
    
    gameStore.getState().addSeedByType(cropType, -1);
    gameStore.getState().addQuestProgress('plant', 'seed', 1);
    gameStore.getState().selectSeedType(cropType);
    
    const cropConfig = CROPS_CONFIG[cropType];
    console.log(`播种成功！种植了 ${cropConfig?.name || cropType}，剩余种子:`, seedCount - 1);
    gameStore.getState().showNotification(`🌱 种植了 ${cropConfig?.name || cropType}！`);
    
    this.updateTileVisual(row, col);
    this.syncTileToStore(row, col);
    
    gameStore.getState().clearPendingPlantingAction();
  }

  private createPreviewSprites(): void {
    this.previewSprite = this.add.image(0, 0, 'fence');
    this.previewSprite.setVisible(false);
    this.previewSprite.setDepth(6);
    this.previewSprite.setAlpha(0.6);

    this.previewRangeSprite = this.add.rectangle(0, 0, this.TILE_SIZE * 3, this.TILE_SIZE * 3, 0x4682B4, 0.2);
    this.previewRangeSprite.setVisible(false);
    this.previewRangeSprite.setDepth(5);
    this.previewRangeSprite.setStrokeStyle(2, 0x4682B4, 0.5);
  }

  private createQuestBoard(): void {
    const worldWidth = this.MAP_WIDTH * this.TILE_SIZE;
    const worldHeight = this.MAP_HEIGHT * this.TILE_SIZE;
    const centerX = worldWidth / 2;
    const centerY = worldHeight / 2;

    const boardX = centerX + 400;
    const boardY = centerY - 200;

    this.questBoard = this.physics.add.sprite(boardX, boardY, 'quest_board');
    this.questBoard.setOrigin(0.5);
    this.questBoard.setImmovable(true);
    this.questBoard.setDepth(5);
    this.questBoard.setScale(1.5);
    this.questBoard.setData('isQuestBoard', true);

    this.add.text(
      this.questBoard.x,
      this.questBoard.y - 55,
      '📋 任务板',
      {
        fontSize: '20px',
        color: '#8B4513',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(0.5).setDepth(100);

    this.add.text(
      this.questBoard.x,
      this.questBoard.y - 28,
      '按 E 查看',
      {
        fontSize: '14px',
        color: '#FFD700',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: { x: 8, y: 3 }
      }
    ).setOrigin(0.5).setDepth(100);

    const glow = this.add.circle(
      this.questBoard.x,
      this.questBoard.y,
      50,
      0x8B4513,
      0.15
    );
    glow.setDepth(4);

    this.tweens.add({
      targets: glow,
      alpha: { from: 0.15, to: 0.35 },
      scale: { from: 1, to: 1.2 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private spawnPlaceableItemsFromStore(): void {
    const state = gameStore.getState();
    
    for (const itemSprite of this.placeableItemSprites) {
      itemSprite.sprite.destroy();
      if (itemSprite.rangeSprite) {
        itemSprite.rangeSprite.destroy();
      }
    }
    this.placeableItemSprites = [];

    for (const item of state.placeableItems) {
      this.spawnPlaceableItem(item.row, item.col, item.type);
    }
  }

  private spawnPlaceableItem(row: number, col: number, type: 'fence' | 'sprinkler'): void {
    const tilePos = this.getTileWorldPosition(row, col);
    const sprite = this.add.image(tilePos.x, tilePos.y, type);
    sprite.setDepth(3);
    sprite.setScale(type === 'fence' ? 1.2 : 1);

    let rangeSprite: Phaser.GameObjects.Rectangle | undefined;
    if (type === 'sprinkler') {
      rangeSprite = this.add.rectangle(
        tilePos.x,
        tilePos.y,
        this.TILE_SIZE * 3,
        this.TILE_SIZE * 3,
        0x4682B4,
        0.1
      );
      rangeSprite.setStrokeStyle(2, 0x4682B4, 0.3);
      rangeSprite.setDepth(2);
    }

    this.placeableItemSprites.push({
      row,
      col,
      type,
      sprite,
      rangeSprite
    });
  }

  private setupMouseInput(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.handleMouseMove(pointer);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.handleMouseClick();
      }
    });
  }

  private handleMouseMove(pointer: Phaser.Input.Pointer): void {
    const state = gameStore.getState();
    const selectedTool = state.selectedTool;

    if (!selectedTool || (selectedTool !== 'fence' && selectedTool !== 'sprinkler')) {
      if (this.previewSprite) this.previewSprite.setVisible(false);
      if (this.previewRangeSprite) this.previewRangeSprite.setVisible(false);
      return;
    }

    const worldPos = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tile = this.getGridTileFromWorld(worldPos.x, worldPos.y);

    if (!tile) {
      if (this.previewSprite) this.previewSprite.setVisible(false);
      if (this.previewRangeSprite) this.previewRangeSprite.setVisible(false);
      return;
    }

    const tilePos = this.getTileWorldPosition(tile.row, tile.col);
    
    const hasExistingItem = this.placeableItemSprites.some(
      item => item.row === tile.row && item.col === tile.col
    );

    if (this.previewSprite) {
      this.previewSprite.setTexture(selectedTool);
      this.previewSprite.setPosition(tilePos.x, tilePos.y);
      this.previewSprite.setAlpha(hasExistingItem ? 0.2 : 0.6);
      this.previewSprite.setVisible(true);
    }

    if (this.previewRangeSprite) {
      if (selectedTool === 'sprinkler') {
        this.previewRangeSprite.setPosition(tilePos.x, tilePos.y);
        this.previewRangeSprite.setAlpha(hasExistingItem ? 0.1 : 0.2);
        this.previewRangeSprite.setVisible(true);
      } else {
        this.previewRangeSprite.setVisible(false);
      }
    }
  }

  private handleMouseClick(): void {
    const state = gameStore.getState();
    const selectedTool = state.selectedTool;

    if (!selectedTool || (selectedTool !== 'fence' && selectedTool !== 'sprinkler')) {
      return;
    }

    const pointer = this.input.activePointer;
    if (!pointer) return;

    const worldPos = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tile = this.getGridTileFromWorld(worldPos.x, worldPos.y);

    if (!tile) {
      return;
    }

    const hasExistingItem = this.placeableItemSprites.some(
      item => item.row === tile.row && item.col === tile.col
    );

    if (hasExistingItem) {
      gameStore.getState().showNotification('⚠️ 该位置已有物品！');
      return;
    }

    if (selectedTool === 'fence') {
      if (state.fenceCount <= 0) {
        gameStore.getState().showNotification('⚠️ 没有篱笆可放置！');
        return;
      }
      const success = gameStore.getState().placeFence(tile.row, tile.col);
      if (success) {
        this.spawnPlaceableItem(tile.row, tile.col, 'fence');
        gameStore.getState().showNotification('✅ 放置了篱笆！');
      }
    } else if (selectedTool === 'sprinkler') {
      if (state.sprinklerCount <= 0) {
        gameStore.getState().showNotification('⚠️ 没有洒水器可放置！');
        return;
      }
      const success = gameStore.getState().placeSprinkler(tile.row, tile.col);
      if (success) {
        this.spawnPlaceableItem(tile.row, tile.col, 'sprinkler');
        gameStore.getState().showNotification('✅ 放置了洒水器！');
      }
    }
  }

  private getGridTileFromWorld(worldX: number, worldY: number): { row: number; col: number } | null {
    const col = Math.floor((worldX - this.gridOffsetX) / this.TILE_SIZE);
    const row = Math.floor((worldY - this.gridOffsetY) / this.TILE_SIZE);

    if (row >= 0 && row < this.currentFarmSize && col >= 0 && col < this.currentFarmSize) {
      return { row, col };
    }
    return null;
  }

  private checkDayChange(): void {
    if (!this.currentTimeState) return;

    const currentDay = this.currentTimeState.day;
    const currentHour = this.currentTimeState.hour;

    if (this.lastDay === -1) {
      this.lastDay = currentDay;
      this.lastHour = currentHour;
      return;
    }

    if (this.lastHour === 23 && currentHour === 0) {
      console.log('🌅 新的一天开始了！');
      this.processDailyGrowth();
      this.resetWateredTiles();
      this.triggerSprinklers();
    }

    this.lastDay = currentDay;
    this.lastHour = currentHour;
  }

  private processDailyGrowth(): void {
    let grownCount = 0;
    const playerLevel = gameStore.getState().playerLevel;
    const growthSpeedMultiplier = gameStore.getState().getGrowthSpeedMultiplier();

    for (let row = 0; row < this.currentFarmSize; row++) {
      for (let col = 0; col < this.currentFarmSize; col++) {
        const tile = this.farmGrid[row]?.[col];
        if (tile && tile.state === 'planted' && tile.isWatered) {
          tile.wateredDays += growthSpeedMultiplier;
          
          if (tile.cropType) {
            if (tile.consecutivePlantingDays === undefined) {
              tile.consecutivePlantingDays = 0;
            }
            tile.consecutivePlantingDays++;
            
            const cropConfig = CROPS_CONFIG[tile.cropType];
            if (cropConfig) {
              const targetDays = tile.isRegrowing && cropConfig.regrowDays !== undefined
                ? cropConfig.regrowDays
                : cropConfig.growthDays;
              
              const newStage = getGrowthStageProgress(tile.wateredDays, targetDays);
              
              if (newStage !== tile.currentGrowthStage) {
                tile.currentGrowthStage = newStage;
                tile.daysInCurrentStage = 0;
                
                if (newStage === 'mature') {
                  tile.state = 'grown';
                  gameStore.getState().showNotification(`🌱 ${cropConfig.name} 成熟了！`);
                }
              } else {
                tile.daysInCurrentStage++;
              }
            }
          }
          
          this.updateTileVisual(row, col);
          this.syncTileToStore(row, col);
          grownCount++;
        }
        
        if (tile && tile.state === 'planted' && tile.cropType) {
          const cropConfig = CROPS_CONFIG[tile.cropType];
          if (cropConfig && this.isCropMature(tile)) {
            if (playerLevel >= 5 && cropConfig.canBecomeGiant) {
              const consecutiveDays = tile.consecutivePlantingDays || 0;
              if (consecutiveDays >= 10) {
                if (Math.random() < 0.01) {
                  const canBecomeGiant = this.checkGiantCropSpace(row, col, tile.cropType);
                  if (canBecomeGiant) {
                    this.convertToGiantCrop(row, col, tile.cropType);
                  }
                }
              }
            }
          }
        }
      }
    }

    if (grownCount > 0) {
      console.log(`🎯 ${grownCount} 块作物因浇水而成长！`);
    }
  }

  private checkGiantCropSpace(centerRow: number, centerCol: number, cropType: CropType): boolean {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const row = centerRow + dr;
        const col = centerCol + dc;
        
        if (row < 0 || row >= this.currentFarmSize || col < 0 || col >= this.currentFarmSize) {
          return false;
        }
        
        const tile = this.farmGrid[row][col];
        if (tile.isGiant) {
          return false;
        }
        
        if (tile.cropType !== cropType) {
          return false;
        }
      }
    }
    return true;
  }

  private convertToGiantCrop(centerRow: number, centerCol: number, cropType: CropType): void {
    const cropConfig = CROPS_CONFIG[cropType];
    
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const row = centerRow + dr;
        const col = centerCol + dc;
        const tile = this.farmGrid[row][col];
        
        tile.isGiant = true;
        tile.giantCenterRow = centerRow;
        tile.giantCenterCol = centerCol;
        tile.state = 'grown';
        
        this.updateTileVisual(row, col);
        this.syncTileToStore(row, col);
      }
    }
    
    console.log(`🌱 巨型作物形成！位置: (${centerRow}, ${centerCol})，类型: ${cropConfig?.name || cropType}`);
    gameStore.getState().showNotification(`🌱 巨型作物形成了！位置: (${centerRow + 1}, ${centerCol + 1})`);
  }

  private harvestGiantCrop(row: number, col: number): void {
    const tile = this.farmGrid[row][col];
    
    let centerRow = tile.giantCenterRow ?? row;
    let centerCol = tile.giantCenterCol ?? col;
    
    const centerTile = this.farmGrid[centerRow][centerCol];
    const cropType = centerTile.cropType;
    
    if (!cropType) {
      console.log('错误：巨型作物没有作物类型！');
      return;
    }
    
    const cropConfig = CROPS_CONFIG[cropType];
    const dropCount = Math.floor(Math.random() * 6) + 15;
    
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = centerRow + dr;
        const c = centerCol + dc;
        
        if (r >= 0 && r < this.currentFarmSize && c >= 0 && c < this.currentFarmSize) {
          const t = this.farmGrid[r][c];
          t.state = 'empty';
          t.plantedTime = 0;
          t.isWatered = false;
          t.isFertilized = false;
          t.wateredDays = 0;
          t.cropType = undefined;
          t.isRegrowing = false;
          t.isGiant = false;
          t.giantCenterRow = undefined;
          t.giantCenterCol = undefined;
          t.consecutivePlantingDays = 0;
          
          this.updateTileVisual(r, c);
          this.syncTileToStore(r, c);
        }
      }
    }
    
    const state = gameStore.getState();
    const harvestResult = state.harvestCropWithQuality(cropType, false);
    
    for (let i = 0; i < dropCount; i++) {
      state.addCropWithQuality(cropType, harvestResult.quality, 1);
    }
    
    const totalExp = dropCount * 10;
    state.addExp(totalExp);
    
    const qualityName = QUALITY_NAMES[harvestResult.quality];
    const qualityIcon = QUALITY_ICONS[harvestResult.quality];
    
    console.log(`🪓 砍伐巨型作物成功！获得 ${qualityIcon}${qualityName} ${cropConfig?.name || cropType} x${dropCount}，获得经验: ${totalExp}`);
    gameStore.getState().showNotification(`🪓 砍伐巨型作物成功！获得 ${dropCount} 个${cropConfig?.name || cropType}！`);
  }

  private triggerSprinklers(): void {
    const sprinklers = this.placeableItemSprites.filter(item => item.type === 'sprinkler');
    
    if (sprinklers.length === 0) {
      console.log('没有安装洒水器，跳过自动浇水');
      return;
    }

    let wateredCount = 0;

    for (const sprinkler of sprinklers) {
      const range = 1;
      
      for (let dr = -range; dr <= range; dr++) {
        for (let dc = -range; dc <= range; dc++) {
          const row = sprinkler.row + dr;
          const col = sprinkler.col + dc;

          if (row >= 0 && row < this.currentFarmSize && col >= 0 && col < this.currentFarmSize) {
            const tile = this.farmGrid[row]?.[col];
            if (tile && (tile.state === 'tilled' || tile.state === 'planted' || tile.state === 'grown')) {
              if (!tile.isWatered) {
                tile.isWatered = true;
                this.updateTileVisual(row, col);
                this.syncTileToStore(row, col);
                wateredCount++;
              }
            }
          }
        }
      }
    }

    if (wateredCount > 0) {
      gameStore.getState().showNotification(`💧 洒水器自动浇水 ${wateredCount} 块土地！`);
      console.log(`洒水器自动浇水 ${wateredCount} 块土地！`);
    }
  }

  private resetWateredTiles(): void {
    for (let row = 0; row < this.currentFarmSize; row++) {
      for (let col = 0; col < this.currentFarmSize; col++) {
        const tile = this.farmGrid[row]?.[col];
        if (tile && tile.isWatered && (tile.state === 'tilled' || tile.state === 'planted')) {
          tile.isWatered = false;
          this.updateTileVisual(row, col);
          this.syncTileToStore(row, col);
        }
      }
    }
  }

  private checkQuestBoard(): void {
    if (!this.questBoard) return;

    const distance = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.questBoard.x, this.questBoard.y
    );

    const wasNear = this.isNearQuestBoard;
    this.isNearQuestBoard = distance < 100;

    if (!wasNear && this.isNearQuestBoard) {
      gameStore.getState().showNotification('📋 按 E 键查看任务板');
    }
  }
}

export default FarmScene;
export { FarmScene };
