import { useState, Suspense, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import * as Tone from 'tone';
import Experience from './Experience';
import Overlay from './components/Overlay';
import './index.css';

function App() {
  const [started, setStarted] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([0, 0, 0]);
  const [playerRot, setPlayerRot] = useState(0);
  const [totems, setTotems] = useState<any[]>([]);

  // Tool State
  const [selectedTool, setSelectedTool] = useState('place');
  const [selectedType, setSelectedType] = useState('synth');

  const [settings, setSettings] = useState({
    volume: -5,
    scale: 'Pentatonic',
    totemSize: 0.2,
    maxTotems: 10,
    gravity: -9.8,
    bpm: 120
  });

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') return;

      switch (e.key) {
        case '1': setSelectedTool('place'); setSelectedType('synth'); break;
        case '2': setSelectedTool('place'); setSelectedType('bass'); break;
        case '3': setSelectedTool('place'); setSelectedType('kick'); break;
        case '4': setSelectedTool('place'); setSelectedType('hihat'); break;
        case '5': setSelectedTool('delete'); break;
        case 'Escape': setSelectedTool('place'); break;
        case ' ': // Spacebar Pulse
          setSettings(prev => ({ ...prev, gravity: 5 })); // Invert gravity
          setTimeout(() => {
            setSettings(prev => ({ ...prev, gravity: -9.8 })); // Restore
          }, 500);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update BPM & Ensure Transport is running
  useEffect(() => {
    if (Tone.Transport) {
      Tone.Transport.bpm.value = settings.bpm || 120;
      if (Tone.Transport.state !== 'started') {
        Tone.Transport.start();
      }
    }
  }, [settings.bpm]);

  const handleSave = () => {
    const data = JSON.stringify(totems);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'auraspace-room.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data)) {
        // We need to pass this down to Experience to sync with server
        // For now, we'll just set local state, but Experience needs to react to it
        // Ideally, Experience exposes a method or we trigger a socket event here
        // But since socket is inside Experience, we might need to pass a "loadTrigger" prop
        // OR better: pass the loaded data to Experience to handle via a prop change
        // Let's use a ref or effect in Experience. 
        // ACTUALLY: Experience has `setTotems` via socket events.
        // We should probably emit 'clear-all' and then 'create-totem' for each.
        // But we don't have socket access here.
        // Let's passed `loadedTotems` prop to Experience.
        setLoadedTotems(data);
      }
    } catch (e) {
      console.error("Failed to load JSON", e);
    }
  };

  const [loadedTotems, setLoadedTotems] = useState<any[] | null>(null);

  const handleStart = async () => {
    console.log("Start button clicked");
    try {
      await Tone.start();
      Tone.Transport.start();
      console.log('Audio Context Started');
    } catch (e) {
      console.error('Tone.start() failed:', e);
    }
    setStarted(true);
  };

  const handleDemo = async () => {
    console.log("Demo button clicked");
    try {
      await Tone.start();
      Tone.Transport.start();
    } catch (e) {
      console.error(e)
    }
    setDemoMode(true);
    setStarted(true);
  }

  const handlePlayerMove = useCallback((pos: [number, number, number], rot: number) => {
    setPlayerPos(pos);
    setPlayerRot(rot);
  }, []);

  return (
    <>
      {!started && (
        <div className="start-screen">
          <h1 className="title" style={{ fontSize: '4rem', marginBottom: '1rem' }}>AuraSpace</h1>
          <p style={{ color: '#888', maxWidth: '400px', textAlign: 'center' }}>
            Experience sound as a physical dimension.
            Headphones recommended.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button className="start-btn" onClick={handleStart} style={{ pointerEvents: 'auto', zIndex: 2000 }}>
              Enter the Void
            </button>
            <button className="start-btn" onClick={handleDemo} style={{ filter: 'grayscale(1)', opacity: 0.8, pointerEvents: 'auto', zIndex: 2000 }}>
              Demo Mode
            </button>
          </div>
        </div>
      )}

      {/* Crosshair Removed for Tabletop Mode */}

      {started && (
        <Overlay
          onSettingsChange={setSettings}
          totems={totems}
          playerPos={playerPos}
          playerRot={playerRot}
          selectedTool={selectedTool}
          onSelectTool={setSelectedTool}
          selectedType={selectedType}
          onSelectType={setSelectedType}
          onSave={handleSave}
          onLoad={handleLoad}
        />
      )}

      <div id="canvas-container" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, cursor: started ? 'auto' : 'default' }}>
        <Canvas
          camera={{ fov: 45, position: [10, 12, 10] }} // Isometric Angle
          dpr={1} // Force 1x resolution for performance
        >
          <Suspense fallback={null}>
            <Experience
              started={started}
              demoMode={demoMode}
              settings={settings}
              onPlayerMove={handlePlayerMove}
              onTotemsUpdate={setTotems}
              selectedTool={selectedTool}
              selectedType={selectedType}
              loadedTotems={loadedTotems}
              onLoadedProcessed={() => setLoadedTotems(null)}
            />
          </Suspense>
        </Canvas>
      </div>

      <Loader />
    </>
  );
}

export default App;
