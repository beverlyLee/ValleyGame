import HUD from './components/HUD';
import DialogBoxContainer from './components/DialogBox';
import ShopModalContainer from './components/ShopModal';
import BlacksmithModalContainer from './components/BlacksmithModal';
import SkillTreeContainer from './components/SkillTree';
import LevelUpNotificationContainer from './components/LevelUpNotification';
import QuestBoardContainer from './components/QuestBoard';
import CropSelectionModalContainer from './components/CropSelectionModal';
import InventoryModalContainer from './components/InventoryModal';
import './App.css';

function App() {
  return (
    <div className="app">
      <HUD />
      <DialogBoxContainer />
      <ShopModalContainer />
      <BlacksmithModalContainer />
      <SkillTreeContainer />
      <LevelUpNotificationContainer />
      <QuestBoardContainer />
      <CropSelectionModalContainer />
      <InventoryModalContainer />
    </div>
  );
}

export default App;
