import * as Phaser from 'phaser';
import { gameStore } from '../../store/useGameStore';
import NPC, { type NPCConfig } from '../entities/NPC';
import { TimeSystem, SEASON_COLORS, SEASON_NAMES, type Season, type TimeState } from '../systems/TimeSystem';

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
  private xKey!: Phaser.Input.Keyboard.Key;
  private lKey!: Phaser.Input.Keyboard.Key;
  private shiftKey!: Phaser.Input.Keyboard.Key;

  private readonly MAP_WIDTH = 50;
  private readonly MAP_HEIGHT = 50;
  private readonly TILE_SIZE = 64;
  private readonly GROW_TIME = 5000;

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
    this.setupLKey();
    this.setupShiftKey();
    this.initializeFarmGrid();
    this.createHighlightRectangle();
    this.createUI();
    this.setupShopArea();
    this.createMineEntrance();
    this.createNPCs();
    this.initializeLanternPositions();
    this.checkLanternFestival();
    this.updateSeasonBackgroundColor();
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
    this.handleSaveKey();
    this.handleLoadKey();
    this.updateGrowth();
    this.updateUI();
    this.updateNPCs();
    this.checkShopArea();
    this.checkMineEntrance();
    this.checkNearestLantern();
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

  private setupLKey(): void {
    this.lKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.L);
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
          this.farmGrid[row][col] = {
            state: storeTile.state,
            sprite: null,
            cropSprite: null,
            plantedTime: storeTile.plantedTime
          };
          this.updateTileVisual(row, col);
        } else {
          this.farmGrid[row][col] = {
            state: 'empty',
            sprite: null,
            cropSprite: null,
            plantedTime: 0
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

  private syncTileToStore(row: number, col: number): void {
    const tile = this.farmGrid[row][col];
    gameStore.getState().updateFarmTile(row, col, {
      state: tile.state,
      plantedTime: tile.plantedTime
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
      } else if (this.highlightedTile) {
        const { row, col } = this.highlightedTile;
        const tile = this.farmGrid[row][col];
        
        console.log('当前瓦片状态:', tile.state);

        switch (tile.state) {
          case 'empty':
            tile.state = 'tilled';
            console.log('耕地成功！');
            this.updateTileVisual(row, col);
            this.syncTileToStore(row, col);
            break;

          case 'tilled':
            if (state.inventory.seeds > 0) {
              if (this.canPlantInCurrentSeason()) {
                tile.state = 'planted';
                tile.plantedTime = this.time.now;
                gameStore.getState().addSeeds(-1);
                console.log('播种成功！剩余种子:', state.inventory.seeds - 1);
                this.updateTileVisual(row, col);
                this.syncTileToStore(row, col);
              } else {
                gameStore.getState().showNotification('⚠️ 时令不对，现在不是播种的季节！');
                console.log('时令不对，无法播种');
              }
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
            this.syncTileToStore(row, col);
            break;
        }
      } else {
        console.log('没有检测到附近的可交互对象！');
      }
    }
  }

  private canPlantInCurrentSeason(): boolean {
    if (!this.currentTimeState) return true;

    const seedSeasons: Season[] = ['spring'];
    return this.timeSystem.isSolarTermInSeasons(
      this.currentTimeState.solarTermIndex,
      seedSeasons
    );
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
              plantedTime: 0
            };
          }
          this.farmGrid[row][col].state = storeTile.state;
          this.farmGrid[row][col].plantedTime = storeTile.plantedTime;
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
              plantedTime: 0
            };
          }
        }
      }
      
      console.log(`农场已刷新为 ${this.currentFarmSize}x${this.currentFarmSize}`);
    }
  }

  private updateGrowth(): void {
    const currentTime = this.time.now;
    const farmSize = this.getFarmSize();

    for (let row = 0; row < farmSize; row++) {
      for (let col = 0; col < farmSize; col++) {
        if (this.farmGrid[row] && this.farmGrid[row][col]) {
          const tile = this.farmGrid[row][col];
          if (tile.state === 'planted' && tile.plantedTime > 0) {
            if (currentTime - tile.plantedTime >= this.GROW_TIME) {
              tile.state = 'grown';
              console.log(`作物成熟: (${row}, ${col})`);
              this.updateTileVisual(row, col);
              this.syncTileToStore(row, col);
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
    gameStore.subscribe((state) => {
      if (state.farmSize !== this.currentFarmSize) {
        this.refreshFarmGrid();
      }
    });
  }
}

export default FarmScene;
export { FarmScene };
