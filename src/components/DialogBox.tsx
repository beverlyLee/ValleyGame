import React, { useEffect, useCallback } from 'react';
import { gameStore } from '../store/useGameStore';

interface DialogBoxProps {
  visible: boolean;
  speaker: string;
  content: string;
  onClose: () => void;
}

const DialogBox: React.FC<DialogBoxProps> = ({ visible, speaker, content, onClose }) => {
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (visible && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, handleClose]);

  if (!visible) return null;

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <span className="dialog-speaker">{speaker}</span>
        </div>
        <div className="dialog-content">
          <p>{content}</p>
        </div>
        <div className="dialog-footer">
          <span className="dialog-hint">按 空格/回车/Esc 关闭</span>
        </div>
      </div>
    </div>
  );
};

const DialogBoxContainer: React.FC = () => {
  const [state, setState] = React.useState({
    visible: false,
    speaker: '',
    content: ''
  });

  useEffect(() => {
    const unsubscribe = gameStore.subscribe((newState) => {
      setState({
        visible: newState.dialogVisible,
        speaker: newState.dialogSpeaker,
        content: newState.dialogContent
      });
    });

    return unsubscribe;
  }, []);

  const handleClose = () => {
    gameStore.getState().hideDialog();
  };

  return (
    <DialogBox
      visible={state.visible}
      speaker={state.speaker}
      content={state.content}
      onClose={handleClose}
    />
  );
};

export default DialogBoxContainer;
export { DialogBox };
