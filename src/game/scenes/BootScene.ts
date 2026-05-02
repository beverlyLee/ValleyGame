import * as Phaser from 'phaser';
import { CROPS_CONFIG, type GrowthStage, getGrowthStageTexture } from '../config/CropsConfig';

class BootScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBox!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private percentText!: Phaser.GameObjects.Text;
  private assetText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'BootScene' });
  }

  private generateTextures(): void {
    const graphics = this.add.graphics();

    graphics.fillStyle(0x90EE90, 1);
    graphics.fillRect(0, 0, 64, 64);
    graphics.fillStyle(0x7CCD7C, 1);
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * 50 + 7;
      const y = Math.random() * 50 + 7;
      graphics.fillCircle(x, y, 2);
    }
    graphics.generateTexture('grass', 64, 64);
    graphics.clear();

    graphics.fillStyle(0x696969, 1);
    graphics.fillRect(0, 0, 64, 64);
    graphics.fillStyle(0x808080, 1);
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * 50 + 7;
      const y = Math.random() * 50 + 7;
      const size = Math.random() * 5 + 2;
      graphics.fillCircle(x, y, size);
    }
    graphics.generateTexture('rock', 64, 64);
    graphics.clear();

    graphics.fillStyle(0x8B4513, 1);
    graphics.fillRect(0, 0, 64, 64);
    graphics.fillStyle(0x654321, 1);
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * 50 + 7;
      const y = Math.random() * 50 + 7;
      graphics.fillCircle(x, y, 3);
    }
    graphics.generateTexture('tilled', 64, 64);
    graphics.clear();

    graphics.fillStyle(0x006400, 1);
    graphics.fillCircle(32, 32, 20);
    graphics.fillStyle(0x228B22, 1);
    graphics.fillCircle(32, 28, 16);
    graphics.fillStyle(0x32CD32, 1);
    graphics.fillCircle(32, 24, 12);
    graphics.generateTexture('crop', 64, 64);
    graphics.clear();

    graphics.fillStyle(0xFFD700, 1);
    graphics.fillCircle(32, 32, 20);
    graphics.fillStyle(0xFFA500, 1);
    graphics.fillCircle(32, 28, 16);
    graphics.fillStyle(0xFF8C00, 1);
    graphics.fillCircle(32, 24, 12);
    graphics.generateTexture('crop_grown', 64, 64);
    graphics.clear();

    graphics.fillStyle(0x4169E1, 1);
    graphics.fillRect(8, 20, 24, 28);
    graphics.fillStyle(0x6495ED, 1);
    graphics.fillRect(10, 22, 20, 24);
    graphics.fillStyle(0xFFE4C4, 1);
    graphics.fillCircle(20, 12, 12);
    graphics.fillStyle(0x8B4513, 1);
    graphics.fillRect(8, 2, 24, 8);
    graphics.fillStyle(0x000000, 1);
    graphics.fillCircle(15, 10, 2);
    graphics.fillCircle(25, 10, 2);
    graphics.fillStyle(0xFF69B4, 1);
    graphics.fillCircle(20, 15, 2);
    graphics.generateTexture('player', 40, 48);
    graphics.clear();

    graphics.fillStyle(0x8B4513, 1);
    graphics.fillRect(4, 8, 4, 48);
    graphics.fillRect(28, 8, 4, 48);
    graphics.fillStyle(0xA0522D, 1);
    graphics.fillRect(4, 16, 28, 4);
    graphics.fillRect(4, 28, 28, 4);
    graphics.fillRect(4, 40, 28, 4);
    graphics.generateTexture('fence', 36, 56);
    graphics.clear();

    graphics.fillStyle(0x708090, 1);
    graphics.fillRect(24, 16, 16, 40);
    graphics.fillStyle(0x4682B4, 1);
    graphics.fillRect(8, 8, 48, 12);
    graphics.fillStyle(0x87CEEB, 0.5);
    for (let i = 0; i < 6; i++) {
      graphics.fillCircle(12 + i * 8, 24, 2);
    }
    graphics.fillStyle(0x5F9EA0, 1);
    graphics.fillRect(28, 8, 8, 8);
    graphics.generateTexture('sprinkler', 64, 64);
    graphics.clear();

    graphics.fillStyle(0x8B4513, 1);
    graphics.fillRect(24, 20, 16, 44);
    graphics.fillStyle(0xDEB887, 1);
    graphics.fillRect(8, 4, 48, 24);
    graphics.fillStyle(0x8B4513, 1);
    graphics.fillRect(8, 4, 48, 2);
    graphics.fillRect(8, 26, 48, 2);
    graphics.fillRect(8, 4, 2, 24);
    graphics.fillRect(54, 4, 2, 24);
    graphics.fillStyle(0x4169E1, 1);
    graphics.fillRect(12, 8, 10, 6);
    graphics.fillRect(24, 8, 10, 6);
    graphics.fillRect(36, 8, 10, 6);
    graphics.fillRect(12, 16, 10, 6);
    graphics.fillRect(24, 16, 10, 6);
    graphics.fillRect(36, 16, 10, 6);
    graphics.generateTexture('quest_board', 64, 64);
    graphics.clear();

    graphics.fillStyle(0x4682B4, 1);
    graphics.fillRect(0, 0, 64, 64);
    graphics.fillStyle(0x1E90FF, 1);
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * 50 + 7;
      const y = Math.random() * 50 + 7;
      graphics.fillCircle(x, y, 3);
    }
    graphics.fillStyle(0x00BFFF, 0.3);
    graphics.fillRect(4, 4, 56, 56);
    graphics.generateTexture('watered', 64, 64);
    graphics.clear();

    this.generateCropTextures();
    graphics.destroy();
  }

  private generateCropTextures(): void {
    const graphics = this.add.graphics();

    for (const [cropType, crop] of Object.entries(CROPS_CONFIG)) {
      const stages: GrowthStage[] = ['seed', 'sprout', 'flower', 'mature'];
      
      for (const stage of stages) {
        const textureKey = getGrowthStageTexture(cropType as any, stage);
        graphics.clear();

        const colors = crop.color;

        switch (stage) {
          case 'seed':
            graphics.fillStyle(colors.seed, 1);
            graphics.fillCircle(32, 35, 12);
            graphics.fillStyle(0x654321, 0.8);
            graphics.fillCircle(30, 33, 3);
            graphics.fillCircle(34, 36, 2);
            break;
          case 'sprout':
            graphics.fillStyle(colors.sprout, 1);
            graphics.fillRect(28, 20, 8, 25);
            graphics.fillStyle(0x228B22, 0.9);
            graphics.fillEllipse(22, 28, 10, 6);
            graphics.fillEllipse(42, 32, 10, 6);
            break;
          case 'flower':
            graphics.fillStyle(colors.sprout, 1);
            graphics.fillRect(30, 15, 4, 30);
            graphics.fillStyle(colors.flower, 1);
            for (let i = 0; i < 5; i++) {
              const angle = (i / 5) * Math.PI * 2;
              const x = 32 + Math.cos(angle) * 12;
              const y = 20 + Math.sin(angle) * 10;
              graphics.fillEllipse(x, y, 8, 6);
            }
            graphics.fillStyle(0xFFD700, 1);
            graphics.fillCircle(32, 20, 6);
            break;
          case 'mature':
            graphics.fillStyle(colors.sprout, 0.8);
            graphics.fillRect(30, 10, 4, 35);
            graphics.fillStyle(colors.mature, 1);
            if (cropType === 'rice') {
              graphics.fillStyle(0xFFD700, 1);
              graphics.fillEllipse(32, 15, 15, 10);
              graphics.fillStyle(0xDAA520, 1);
              for (let i = 0; i < 6; i++) {
                graphics.fillRect(25 + i * 2, 12, 2, 6);
              }
            } else if (cropType === 'peony') {
              graphics.fillStyle(0xFF1493, 1);
              for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const x = 32 + Math.cos(angle) * 14;
                const y = 18 + Math.sin(angle) * 12;
                graphics.fillEllipse(x, y, 10, 7);
              }
              graphics.fillStyle(0xFFD700, 1);
              graphics.fillCircle(32, 18, 8);
            } else if (cropType === 'strawberry') {
              graphics.fillStyle(0xFF0000, 1);
              graphics.fillEllipse(32, 25, 14, 16);
              graphics.fillStyle(0xFFFF00, 1);
              for (let i = 0; i < 8; i++) {
                graphics.fillCircle(26 + (i % 4) * 4, 20 + Math.floor(i / 4) * 10, 1.5);
              }
              graphics.fillStyle(0x228B22, 1);
              graphics.fillEllipse(32, 12, 12, 6);
            } else if (cropType === 'corn') {
              graphics.fillStyle(0xFFD700, 1);
              graphics.fillEllipse(32, 28, 12, 20);
              graphics.fillStyle(0xDAA520, 1);
              for (let i = 0; i < 5; i++) {
                for (let j = 0; j < 3; j++) {
                  graphics.fillRect(26 + j * 5, 15 + i * 6, 4, 5);
                }
              }
              graphics.fillStyle(0x228B22, 1);
              graphics.fillRect(20, 10, 4, 15);
              graphics.fillRect(40, 10, 4, 12);
            } else if (cropType === 'watermelon') {
              graphics.fillStyle(0x228B22, 1);
              graphics.fillEllipse(32, 32, 22, 18);
              graphics.fillStyle(0x32CD32, 0.7);
              for (let i = 0; i < 4; i++) {
                graphics.fillRect(18 + i * 8, 28, 3, 10);
              }
              graphics.fillStyle(0x8B4513, 1);
              graphics.fillRect(30, 14, 4, 10);
            } else if (cropType === 'sunflower') {
              graphics.fillStyle(0x8B4513, 1);
              graphics.fillRect(30, 25, 4, 20);
              graphics.fillStyle(0xFFD700, 1);
              for (let i = 0; i < 10; i++) {
                const angle = (i / 10) * Math.PI * 2;
                const x = 32 + Math.cos(angle) * 16;
                const y = 20 + Math.sin(angle) * 14;
                graphics.fillEllipse(x, y, 8, 5);
              }
              graphics.fillStyle(0x8B4513, 1);
              graphics.fillCircle(32, 20, 10);
              graphics.fillStyle(0x228B22, 1);
              graphics.fillEllipse(22, 35, 10, 6);
            } else if (cropType === 'pumpkin') {
              graphics.fillStyle(0xFF8C00, 1);
              graphics.fillEllipse(32, 30, 20, 18);
              graphics.fillStyle(0xD2691E, 0.6);
              for (let i = 0; i < 5; i++) {
                graphics.fillRect(18 + i * 7, 18, 2, 24);
              }
              graphics.fillStyle(0x228B22, 1);
              graphics.fillRect(30, 10, 4, 10);
              graphics.fillEllipse(38, 14, 8, 5);
            } else if (cropType === 'carrot') {
              graphics.fillStyle(0xFF8C00, 1);
              graphics.beginPath();
              graphics.moveTo(32, 15);
              graphics.lineTo(24, 45);
              graphics.lineTo(40, 45);
              graphics.closePath();
              graphics.fill();
              graphics.fillStyle(0xFFD700, 0.4);
              graphics.fillRect(28, 25, 3, 15);
              graphics.fillStyle(0x228B22, 1);
              graphics.fillRect(28, 8, 3, 10);
              graphics.fillRect(33, 6, 3, 12);
            } else if (cropType === 'ginseng') {
              graphics.fillStyle(0xDAA520, 1);
              graphics.fillRect(28, 20, 8, 25);
              graphics.fillStyle(0x8B4513, 0.7);
              for (let i = 0; i < 3; i++) {
                graphics.fillRect(20, 25 + i * 8, 6, 4);
                graphics.fillRect(38, 28 + i * 7, 6, 4);
              }
              graphics.fillStyle(0xDC143C, 1);
              graphics.fillEllipse(32, 15, 10, 8);
              graphics.fillStyle(0xFF69B4, 0.6);
              graphics.fillEllipse(32, 15, 6, 5);
            } else if (cropType === 'radish') {
              graphics.fillStyle(0xFFFFFF, 1);
              graphics.beginPath();
              graphics.moveTo(32, 20);
              graphics.lineTo(22, 48);
              graphics.lineTo(42, 48);
              graphics.closePath();
              graphics.fill();
              graphics.fillStyle(0xE0FFFF, 0.5);
              graphics.fillRect(28, 28, 8, 15);
              graphics.fillStyle(0x228B22, 1);
              graphics.fillRect(26, 8, 4, 15);
              graphics.fillRect(32, 6, 4, 17);
              graphics.fillRect(38, 10, 3, 13);
            } else if (cropType === 'cabbage') {
              graphics.fillStyle(0xF0FFF0, 1);
              graphics.fillCircle(32, 32, 18);
              graphics.fillStyle(0x98FB98, 0.7);
              for (let i = 0; i < 4; i++) {
                graphics.fillEllipse(32, 25 + i * 5, 14 - i * 2, 10 - i * 2);
              }
              graphics.fillStyle(0x228B22, 1);
              graphics.fillRect(28, 10, 4, 10);
              graphics.fillEllipse(32, 10, 12, 6);
            } else if (cropType === 'snowLotus') {
              graphics.fillStyle(0xFFFFFF, 1);
              for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const x = 32 + Math.cos(angle) * 18;
                const y = 25 + Math.sin(angle) * 15;
                graphics.fillEllipse(x, y, 12, 7);
              }
              graphics.fillStyle(0xADD8E6, 0.8);
              for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const x = 32 + Math.cos(angle) * 12;
                const y = 25 + Math.sin(angle) * 10;
                graphics.fillEllipse(x, y, 8, 5);
              }
              graphics.fillStyle(0xE0FFFF, 1);
              graphics.fillCircle(32, 25, 8);
              graphics.fillStyle(0x87CEEB, 1);
              graphics.fillRect(30, 38, 4, 15);
            } else {
              graphics.fillCircle(32, 28, 16);
            }
            break;
        }

        graphics.generateTexture(textureKey, 64, 64);
      }
    }

    graphics.destroy();
  }

  preload(): void {
    this.createProgressBar();

    this.load.image('placeholder', 'assets/placeholder.png');
    
    this.generateTextures();

    this.load.on('progress', (value: number) => {
      this.updateProgressBar(value);
    });

    this.load.on('fileprogress', (file: Phaser.Loader.File) => {
      this.assetText.setText('Loading asset: ' + file.key);
    });

    this.load.on('complete', () => {
      this.progressBar.destroy();
      this.progressBox.destroy();
      this.loadingText.destroy();
      this.percentText.destroy();
      this.assetText.destroy();
    });
  }

  create(): void {
    this.scene.start('FarmScene');
  }

  private createProgressBar(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222222, 0.8);
    this.progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    this.progressBar = this.add.graphics();

    this.loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 50,
      text: 'Loading...',
      style: {
        font: '20px monospace',
        color: '#ffffff'
      }
    });
    this.loadingText.setOrigin(0.5, 0.5);

    this.percentText = this.make.text({
      x: width / 2,
      y: height / 2,
      text: '0%',
      style: {
        font: '18px monospace',
        color: '#ffffff'
      }
    });
    this.percentText.setOrigin(0.5, 0.5);

    this.assetText = this.make.text({
      x: width / 2,
      y: height / 2 + 50,
      text: '',
      style: {
        font: '18px monospace',
        color: '#ffffff'
      }
    });
    this.assetText.setOrigin(0.5, 0.5);
  }

  private updateProgressBar(value: number): void {
    this.progressBar.clear();
    this.progressBar.fillStyle(0xffffff, 1);
    this.progressBar.fillRect(
      this.cameras.main.width / 2 - 150,
      this.cameras.main.height / 2 - 15,
      300 * value,
      30
    );

    this.percentText.setText(Math.round(value * 100) + '%');
  }
}

export default BootScene;
export { BootScene };
