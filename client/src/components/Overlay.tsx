import { useState, useEffect } from 'react';
import { TOTEM_TYPES, THEMES } from '../constants';
import * as Tone from 'tone';
import { useTheme } from './ThemeContext';

interface OverlayProps {
    onSettingsChange: (settings: any) => void;
    totems: Array<{ id: string, position: [number, number, number], type?: string }>;
    playerPos: [number, number, number];
    playerRot: number;
    selectedTool: string;
    onSelectTool: (tool: string) => void;
    selectedType: string;
    onSelectType: (type: string) => void;
    onSave: () => void;
    onLoad: (data: string) => void;
}

export default function Overlay({
    onSettingsChange,
    totems,
    playerPos,
    playerRot,
    selectedTool,
    onSelectTool,
    selectedType,
    onSelectType,
    onSave,
    onLoad
}: OverlayProps) {
    const { theme, setTheme, themeName } = useTheme();
    const [settings, setSettings] = useState({
        volume: -2,
        scale: 'Pentatonic',
        totemSize: 0.2,
        maxTotems: 20,
        gravity: -9.8, // Default gravity
        bpm: 120
    });

    const [showHelp, setShowHelp] = useState(false);
    const [showAbout, setShowAbout] = useState(false);

    const handleChange = (key: string, value: any) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        onSettingsChange(newSettings);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (ev.target?.result) {
                onLoad(ev.target.result as string);
            }
        };
        reader.readAsText(file);
    };

    const [audioSuspended, setAudioSuspended] = useState(false);
    useEffect(() => {
        const interval = setInterval(() => {
            if (Tone.context.state === 'suspended') {
                setAudioSuspended(true);
            } else {
                setAudioSuspended(false);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const [transportState, setTransportState] = useState(Tone.Transport.state);

    // Sync UI with Tone
    useEffect(() => {
        const interval = setInterval(() => {
            setTransportState(Tone.Transport.state);
        }, 200);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', color: 'white', fontFamily: 'monospace', zIndex: 10 }}>

            {audioSuspended && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'auto', zIndex: 9999 }}>
                    <button
                        onClick={() => Tone.start()}
                        style={{ padding: '20px', fontSize: '24px', background: 'red', color: 'white', border: '5px solid white', cursor: 'pointer', borderRadius: '10px' }}
                    >
                        CLICK TO UNMUTE AUDIO
                    </button>
                </div>
            )}



            {/* POPUPS */}
            {showHelp && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    background: theme.uiBg, backdropFilter: 'blur(10px)',
                    padding: '20px', borderRadius: '16px', border: `1px solid ${theme.grid}`,
                    pointerEvents: 'auto', maxWidth: '400px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#00f0ff' }}>Instructions</h3>
                    <ul style={{ paddingLeft: '20px', lineHeight: '1.5' }}>
                        <li><strong>WASD</strong>: Move around</li>
                        <li><strong>SPACE</strong>: Jump</li>
                        <li><strong>CLICK</strong>: Place a Sound Totem</li>
                        <li><strong>ESC</strong>: Unlock Mouse / Show Cursor</li>
                    </ul>
                    <p>Explore the void and create your own soundscape.</p>
                    <button onClick={() => setShowHelp(false)} style={{ marginTop: '10px', width: '100%', padding: '8px', background: '#00f0ff', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
                </div>
            )}

            {showAbout && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.9)', padding: '20px', borderRadius: '8px', border: '1px solid #00f0ff', pointerEvents: 'auto', maxWidth: '400px' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#00f0ff' }}>About AuraSpace</h3>
                    <p>AuraSpace is a spatial audio experiment. Every object you place emits a unique tone that changes based on your position and scale settings.</p>
                    <p style={{ fontSize: '0.8em', color: '#aaa' }}>v1.0.0 - Built with React & Three.js</p>
                    <button onClick={() => setShowAbout(false)} style={{ marginTop: '10px', width: '100%', padding: '8px', background: '#00f0ff', color: 'black', border: 'none', cursor: 'pointer' }}>Close</button>
                </div>
            )}

            {/* HEADER - Updated to Glass */}
            <div style={{ position: 'absolute', top: 20, left: 20, pointerEvents: 'none' }}>
                <h3 style={{
                    margin: '0', color: 'white', fontSize: '2rem', fontWeight: 'bold',
                    textShadow: '0 0 10px rgba(0,240,255,0.5)', letterSpacing: '2px'
                }}>
                    AuraSpace
                </h3>
                <div style={{ fontSize: '0.8em', color: '#aaa', marginTop: '5px' }}>
                    Objects: {totems.length} / {settings.maxTotems}
                </div>
            </div>

            {/* TOP RIGHT MENU */}
            <div style={{ position: 'absolute', top: 20, right: 20, pointerEvents: 'auto', display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowHelp(!showHelp)} style={{
                    background: theme.uiBg, backdropFilter: 'blur(5px)', color: 'white',
                    border: `1px solid ${theme.grid}`, borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', transition: 'all 0.2s'
                }}>Help</button>

                {/* Vision Mock */}
                <button onClick={() => alert("Vision Analysis module connected. Upload functionality coming in Phase 2.")} style={{
                    background: theme.uiBg, backdropFilter: 'blur(5px)', color: '#00f0ff',
                    border: `1px solid ${theme.grid}`, borderRadius: '8px', padding: '8px 16px', cursor: 'pointer'
                }}>Vision</button>
            </div>

            {/* MINIMAP */}
            <div style={{ position: 'absolute', bottom: 20, right: 20, width: '200px', height: '200px', background: 'rgba(0,0,0,0.8)', borderRadius: '50%', border: '2px solid #333', overflow: 'hidden' }}>
                {/* Center (Player Arrow) */}
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    width: '0', height: '0',
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderBottom: '10px solid white',
                    transform: 'translate(-50%, -50%)', zIndex: 10
                }} />

                {/* Totems */}
                {totems.map(t => {
                    // Rel position
                    const dx = t.position[0] - playerPos[0];
                    const dz = t.position[2] - playerPos[2]; // Z is forward/back

                    // Rotate by negative player rotation to orient map "Heading Up"
                    const cos = Math.cos(playerRot);
                    const sin = Math.sin(playerRot);
                    const rx = dx * cos - dz * sin;
                    const rz = dx * sin + dz * cos;

                    // Scale: 200px map represents 40 units? 
                    const mapScale = 5;
                    const mx = 100 + rx * mapScale;
                    const my = 100 + rz * mapScale;

                    if (!Number.isFinite(mx) || !Number.isFinite(my) || mx < 0 || mx > 200 || my < 0 || my > 200) return null;

                    return (
                        <div key={t.id} style={{
                            position: 'absolute',
                            left: mx,
                            top: my,
                            width: '4px',
                            height: '4px',
                            background: t.type ? (Object.values(TOTEM_TYPES).find(type => type.id === t.type)?.color || '#00f0ff') : '#00f0ff',
                            borderRadius: '50%',
                            transform: 'translate(-50%, -50%)'
                        }} />
                    )
                })}
            </div>

            {/* SETTINGS PANEL - Glass */}
            <div style={{
                position: 'absolute', bottom: 20, left: 20,
                background: theme.uiBg, backdropFilter: 'blur(10px)',
                padding: '20px', borderRadius: '16px', pointerEvents: 'auto',
                border: `1px solid ${theme.grid}`, boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
            }}>
                <h4 style={{ margin: '0 0 15px 0', borderBottom: `1px solid ${theme.grid}`, paddingBottom: '5px' }}>SETTINGS</h4>

                <div style={{ marginBottom: '12px' }}>
                    <button
                        onClick={() => {
                            import('tone').then(Tone => {
                                const osc = new Tone.Oscillator(440, "sine").toDestination().start();
                                osc.stop("+0.5");
                                alert(`Testing Audio... Context: ${Tone.context.state} Transport: ${Tone.Transport.state}`);
                            });
                        }}
                        style={{ width: '100%', padding: '5px', background: '#444', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                        TEST AUDIO (Beep)
                    </button>
                </div>

                <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: '#ccc' }}>Volume</label>
                    <input type="range" min="-30" max="0" step="1" value={settings.volume} onChange={e => handleChange('volume', parseInt(e.target.value))} style={{ width: '100%' }} />
                </div>

                <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: '#ccc' }}>BPM: {settings.bpm || 120}</label>
                    <input type="range" min="60" max="180" step="1" value={settings.bpm || 120} onChange={e => handleChange('bpm', parseInt(e.target.value))} style={{ width: '100%' }} />
                </div>

                <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: '#ccc' }}>Gravity: {settings.gravity}</label>
                    <input type="range" min="-20" max="5" step="0.5" value={settings.gravity} onChange={e => handleChange('gravity', parseFloat(e.target.value))} style={{ width: '100%' }} />
                </div>

                <div style={{ marginBottom: '8px' }}>
                    <label>Scale</label>
                    <select value={settings.scale} onChange={e => handleChange('scale', e.target.value)} style={{ background: theme.grid, color: 'white', border: 'none', marginLeft: '10px' }}>
                        <option value="Pentatonic">Pentatonic</option>
                        <option value="Chromatic">Chromatic</option>
                        <option value="Major">Major</option>
                        <option value="Minor">Minor</option>
                        <option value="Dorian">Dorian</option>
                        <option value="blues">Blues</option>
                        <option value="lydian">Lydian</option>
                    </select>
                </div>

                <div style={{ marginBottom: '8px' }}>
                    <label>Theme</label>
                    <select value={themeName} onChange={e => setTheme(e.target.value as any)} style={{ background: theme.grid, color: 'white', border: 'none', marginLeft: '10px' }}>
                        {Object.keys(THEMES).map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '8px' }}>
                    <label>Max Orbs: {settings.maxTotems}</label>
                    <br />
                    <input type="range" min="1" max="50" value={settings.maxTotems} onChange={e => handleChange('maxTotems', parseInt(e.target.value))} />
                </div>

                <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #444', display: 'flex', gap: '5px' }}>
                    <button onClick={onSave} style={{ flex: 1, background: '#333', color: '#00f0ff', border: '1px solid #555', cursor: 'pointer', padding: '5px' }}>Save</button>
                    <label style={{ flex: 1, background: '#333', color: '#00f0ff', border: '1px solid #555', cursor: 'pointer', padding: '5px', textAlign: 'center', display: 'inline-block' }}>
                        Load
                        <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
                    </label>
                </div>
            </div>

            {/* TOOLBAR - Glass */}
            <div style={{
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                background: theme.uiBg, backdropFilter: 'blur(10px)',
                padding: '10px 20px',
                borderRadius: '20px',
                pointerEvents: 'auto',
                display: 'flex',
                gap: '15px',
                border: `1px solid ${theme.grid}`,
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                {/* Transport Control */}
                <button
                    onClick={() => {
                        if (Tone.Transport.state === 'started') {
                            Tone.Transport.pause();
                        } else {
                            Tone.Transport.start();
                        }
                        setTransportState(Tone.Transport.state); // Instant update
                    }}
                    style={{
                        padding: '5px 20px',
                        background: transportState === 'started' ? '#444' : '#222',
                        border: `1px solid ${transportState === 'started' ? '#0f0' : '#fff'}`,
                        borderRadius: '20px',
                        color: transportState === 'started' ? '#0f0' : '#fff',
                        fontSize: '10px',
                        letterSpacing: '1px',
                        cursor: 'pointer',
                        marginBottom: '5px',
                        minWidth: '100px'
                    }}
                >
                    {transportState === 'started' ? '⏸ PAUSE SEQUENCE' : '▶ PLAY SEQUENCE'}
                </button>

                {/* Current Tool Display */}
                <div style={{ fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>
                    {selectedTool === 'delete' ? 'DELETE MODE' : `Selected: ${selectedType.toUpperCase()}`}
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                    {Object.values(TOTEM_TYPES).map((type) => (
                        <button
                            key={type.id}
                            onClick={() => { onSelectTool('place'); onSelectType(type.id); }}
                            style={{
                                width: '50px',
                                height: '50px',
                                background: selectedTool === 'place' && selectedType === type.id ? theme.grid : 'transparent',
                                border: `2px solid ${type.color}`,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                color: 'white',
                                fontSize: '10px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: selectedTool === 'place' && selectedType === type.id ? `0 0 15px ${type.color}` : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ width: '12px', height: '12px', background: type.color, borderRadius: '50%', marginBottom: '4px' }} />
                            {type.label.split(' ')[0]}
                        </button>
                    ))}

                    <div style={{ width: '1px', background: theme.grid, margin: '0 5px' }} />

                    <button
                        onClick={() => onSelectTool('delete')}
                        style={{
                            width: '50px',
                            height: '50px',
                            background: selectedTool === 'delete' ? theme.grid : 'transparent',
                            border: '2px solid #ff4444',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            color: '#ff4444',
                            fontSize: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: selectedTool === 'delete' ? `0 0 15px #ff4444` : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        DELETE
                    </button>
                </div>
            </div>
        </div>
    );
}
