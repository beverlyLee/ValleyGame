import * as Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { FarmScene } from '../scenes/FarmScene';

const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: 1280,
  height: 720,
  backgroundColor: '#90EE90',
  scene: [BootScene, FarmScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  }
};

export default GameConfig;
