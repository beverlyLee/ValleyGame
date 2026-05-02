import HUD from './components/HUD';
import DialogBoxContainer from './components/DialogBox';
import ShopModalContainer from './components/ShopModal';
import BlacksmithModalContainer from './components/BlacksmithModal';
import './App.css';

function App() {
  return (
    <div className="app">
      <HUD />
      <DialogBoxContainer />
      <ShopModalContainer />
      <BlacksmithModalContainer />
    </div>
  );
}

export default App;
