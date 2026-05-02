import React, { useState, useEffect } from 'react';
import { gameStore } from '../store/useGameStore';

const LevelUpNotification: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [newLevel, setNewLevel] = useState(1);
  const [unlockedSkillName, setUnlockedSkillName] = useState<string | null>(null);
  const [unlockedSkillDescription, setUnlockedSkillDescription] = useState<string | null>(null);
  const [unlockedSkillIcon, setUnlockedSkillIcon] = useState<string | null>(null);
  const [animationPhase, setAnimationPhase] = useState<'entering' | 'idle' | 'exiting'>('entering');

  useEffect(() => {
    const unsubscribe = gameStore.subscribe((state) => {
      if (state.levelUpNotificationVisible && !visible) {
        setVisible(true);
        setNewLevel(state.newLevel);
        setUnlockedSkillName(state.unlockedSkillName);
        setUnlockedSkillDescription(state.unlockedSkillDescription);
        setUnlockedSkillIcon(state.unlockedSkillIcon);
        setAnimationPhase('entering');
        
        setTimeout(() => setAnimationPhase('idle'), 500);
        
        const timer = setTimeout(() => {
          handleClose();
        }, 4000);
        
        return () => clearTimeout(timer);
      }
    });
    return unsubscribe;
  }, [visible]);

  const handleClose = () => {
    setAnimationPhase('exiting');
    setTimeout(() => {
      setVisible(false);
      gameStore.getState().hideLevelUpNotification();
    }, 300);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (visible) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible]);

  if (!visible) return null;

  const hasUnlockedSkill = unlockedSkillName !== null;

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        cursor: 'pointer',
        opacity: animationPhase === 'entering' ? 0 : animationPhase === 'exiting' ? 0 : 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          transform: animationPhase === 'entering' 
            ? 'scale(0.5) translateY(50px)' 
            : animationPhase === 'exiting' 
              ? 'scale(1.2) translateY(-50px)' 
              : 'scale(1) translateY(0)',
          transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div
          style={{
            fontSize: '80px',
            marginBottom: '20px',
            animation: 'pulse 1s ease-in-out infinite',
          }}
        >
          {hasUnlockedSkill ? unlockedSkillIcon : '⭐'}
        </div>

        <div
          style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#FFD700',
            textShadow: '0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.5)',
            marginBottom: '10px',
          }}
        >
          升级了！
        </div>

        <div
          style={{
            fontSize: '72px',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: 'none',
            marginBottom: '30px',
          }}
        >
          Lv. {newLevel}
        </div>

        {hasUnlockedSkill && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(46, 204, 113, 0.2) 0%, rgba(52, 152, 219, 0.2) 100%)',
              border: '2px solid rgba(46, 204, 113, 0.5)',
              borderRadius: '16px',
              padding: '25px 40px',
              maxWidth: '400px',
              margin: '0 auto',
              animation: 'slideUp 0.5s ease-out 0.3s both',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                color: '#2ECC71',
                fontWeight: 'bold',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '2px',
              }}
            >
              🎉 新技能解锁！
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#FFFFFF',
                marginBottom: '10px',
              }}
            >
              {unlockedSkillName}
            </div>
            <div
              style={{
                fontSize: '16px',
                color: '#B0B0B0',
                lineHeight: '1.6',
              }}
            >
              {unlockedSkillDescription}
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: '40px',
            fontSize: '14px',
            color: '#7F8C8D',
            animation: 'fadeIn 1s ease-in 1s both',
          }}
        >
          按任意键或点击屏幕继续
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const LevelUpNotificationContainer: React.FC = () => {
  return <LevelUpNotification />;
};

export default LevelUpNotificationContainer;
export { LevelUpNotification };
