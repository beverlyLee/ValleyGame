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

  preload(): void {
    this.createProgressBar();

    this.load.image('placeholder', 'assets/placeholder.png');

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
