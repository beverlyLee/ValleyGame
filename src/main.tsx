import { createRoot } from 'react-dom/client';
import * as Phaser from 'phaser';
import './index.css';
import App from './App.tsx';
import GameConfig from './game/config/GameConfig';

const initGame = () => {
  return new Phaser.Game(GameConfig);
};

document.addEventListener('DOMContentLoaded', () => {
  createRoot(document.getElementById('app')!).render(<App />);
  
  initGame();
});
