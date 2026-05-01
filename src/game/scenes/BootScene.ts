import * as Phaser from 'phaser';

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
