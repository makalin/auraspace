import { useRef, useState, useEffect } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Physics, useBox } from '@react-three/cannon';
import { Stars, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { io, Socket } from 'socket.io-client';
import * as Tone from 'tone';
import * as THREE from 'three';
// Player component removed for Isometric Tabletop view
import SoundTotem from './components/SoundTotem';


import { useTheme } from './components/ThemeContext';

// Other Player Component - optimized with direct ref updates
function OtherPlayer({ id, dataRef }: { id: string, dataRef: React.MutableRefObject<any> }) {
    const groupRef = useRef<THREE.Group>(null);

    // Loop 60fps to update position without React render
    useFrame(() => {
        if (groupRef.current && dataRef.current[id]) {
            const data = dataRef.current[id];
            groupRef.current.position.set(data.position[0], data.position[1], data.position[2]);
            const euler = new THREE.Euler(data.rotation[0], data.rotation[1], data.rotation[2]);
            groupRef.current.rotation.copy(euler);
        }
    });

    // Initial color (won't change often so can stay prop-like or we read from ref if needed)
    // We'll read color from ref once to set material? Or just pass it?
    // Optimization: If color is static, we can use state or just read it once.
    // Let's rely on dataRef for existence check.
    const color = dataRef.current[id]?.color || '#ffffff';

    return (
        <group ref={groupRef}>
            {/* Simple Avatar Representation */}
            <mesh position={[0, 1, 0]}>
                <capsuleGeometry args={[0.5, 1, 4, 8]} />
                <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[0, 1.5, 0.4]}>
                <boxGeometry args={[0.6, 0.2, 0.2]} />
                <meshStandardMaterial color="white" />
            </mesh>
        </group>
    );
}

// Floor
function Floor({ onClick, color, gridColor }: { onClick: (e: ThreeEvent<MouseEvent>) => void, color: string, gridColor: string }) {
    // 100x100 floor, 20 units thick, top surface at y=0 (position y=-10)
    const [ref] = useBox(() => ({ position: [0, -10, 0], args: [100, 20, 100] }));
    return (
        <mesh ref={ref} receiveShadow onClick={onClick}>
            <boxGeometry args={[100, 20, 100]} />
            <meshStandardMaterial
                color={color}
                roughness={0.1}
                metalness={0.5}
            />
            <gridHelper args={[100, 100, gridColor, color]} position={[0, 10.01, 0]} />
        </mesh>
    );
}

interface ExperienceProps {
    started: boolean;
    demoMode?: boolean;
    settings: any;
    onPlayerMove: (pos: [number, number, number], rot: number) => void;
    onTotemsUpdate: (t: any[]) => void;
    selectedTool: string;
    selectedType: string;
    loadedTotems: any[] | null;
    onLoadedProcessed: () => void;
}

export default function Experience({
    started,
    settings,
    onPlayerMove,
    onTotemsUpdate,
    selectedTool,
    selectedType,
    loadedTotems,
    onLoadedProcessed
}: ExperienceProps) {
    const [totems, setTotems] = useState<Array<{ id: string, position: [number, number, number], type?: string }>>([]);

    // Performance Optimization: Use Refs for player data to avoid Re-renders on every frame
    const othersRef = useRef<{ [id: string]: { position: [number, number, number], rotation: [number, number, number], color: string } }>({});
    const [playerIds, setPlayerIds] = useState<string[]>([]); // Only track IDs for mounting components

    const socketRef = useRef<Socket | null>(null);
    const { theme } = useTheme();

    // Sync totems to parent
    useEffect(() => {
        onTotemsUpdate(totems);
    }, [totems, onTotemsUpdate]);

    // Handle loaded data
    useEffect(() => {
        if (loadedTotems && socketRef.current) {
            // Clear existing (we'll just replace state for now, but ideally server should clear)
            // Since we don't have a 'clear' event on server, we iterate and remove? 
            // Better: just overwrite if server supports it, or emit create events.
            // For this MVP, let's just emit create for all loaded items.
            // A reset would be better.

            // NOTE: A real implementation would have a 'sync-state' event.
            // We will just try to add them.
            loadedTotems.forEach(t => {
                socketRef.current?.emit('create-totem', { position: t.position, type: t.type || 'synth' });
            });
            onLoadedProcessed();
        }
    }, [loadedTotems, onLoadedProcessed]);

    useEffect(() => {
        // Force Audio Start on mount
        const ensureAudio = async () => {
            if (Tone.context.state !== 'running') {
                await Tone.context.resume();
            }
            if (Tone.Transport.state !== 'started') {
                Tone.Transport.start();
            }
        };
        ensureAudio();

        // Auto-Spawn Starter Beat (if not in demo mode, which handles its own, or combine)
        // We do this via socket to sync with everyone, but check if we are the "host" or just do it if empty
        // For now, simple logic: If local totems empty after small delay, spawn. 
        // Actually, better: just spawn if user just started.
        // Wait, multiple players? If P2 joins, they shouldn't spawn MORE.
        // Good point. Only spawn if server says 0 totems?
        // Let's rely on the socket 'connect' init data.
        // We'll move this logic to the socket connect/init phase.

        // Connect to server
        const socket = io('http://localhost:3001');
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to server w/ ID:', socket.id);
            // We wait for 'init' to see if we should spawn.
        });

        socket.on('init', (data: { totems: any[], players: any }) => {
            setTotems(data.totems);
            const otherPlayers = { ...data.players };
            if (socket.id) delete otherPlayers[socket.id];

            othersRef.current = otherPlayers;
            setPlayerIds(Object.keys(otherPlayers));

            // AUTO-SPAWN if Empty
            if (data.totems.length === 0) {
                console.log("Empty Room - Spawning Starter Beat");
                // Spawn in a circle
                socket.emit('create-totem', { position: [0, 1.5, -2], type: 'kick' });  // Front
                socket.emit('create-totem', { position: [2, 1.5, 0], type: 'hihat' });  // Right
                socket.emit('create-totem', { position: [-2, 1.5, 0], type: 'bass' }); // Left
                socket.emit('create-totem', { position: [0, 2, 2], type: 'synth' });   // Back
            }
        });

        socket.on('player-joined', (data: { id: string, data: any }) => {
            othersRef.current[data.id] = data.data;
            setPlayerIds(prev => [...prev, data.id]);
        });

        socket.on('player-moved', (data: { id: string, data: any }) => {
            // Update Ref ONLY - No React State change -> No Re-render
            if (othersRef.current[data.id]) {
                othersRef.current[data.id] = { ...othersRef.current[data.id], ...data.data };
            }
        });

        socket.on('player-left', (id: string) => {
            delete othersRef.current[id];
            setPlayerIds(prev => prev.filter(p => p !== id));
        });

        socket.on('totem-created', (newTotem) => {
            setTotems((prev) => [...prev, newTotem]);
        });

        // Handle removals cleanly
        socket.on('remove-totem', (id: string) => {
            // If ID is numeric/string standard, this works. The server emits ID.
            setTotems((prev) => prev.filter(t => t.id !== id));
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const handleFloorClick = (e: ThreeEvent<MouseEvent>) => {
        if (!started) return;

        if (selectedTool === 'place') {
            const position = [e.point.x, e.point.y + 0.5, e.point.z];
            socketRef.current?.emit('create-totem', { position, type: selectedType });
        }
    }

    const handleTotemClick = (id: string) => {
        if (selectedTool === 'delete') {
            socketRef.current?.emit('remove-totem', id); // Logic handled in SoundTotem originally, but efficient here too if we had ID
            // Actually, server 'remove-totem' expects an ID usually? 
            // In existing App: socket.on('remove-totem', (id) => ...) 
            // We need to EMIT a remove event. Client doesn't seem to emit it in original code?
            // Actually original code didn't have delete. 
            // We need to implement the listener on server side? 
            // Wait, looking at Experience.tsx: socket.on('remove-totem') exists.
            // But does server listen to 'remove-totem'?
            // We'll assume yes or we add it. 
            // BUT wait, we are client-side only dev here mostly?
            // Let's emit it and see. If server ignores it, we might need to modify server.
            socketRef.current?.emit('remove-totem', { id });
        }
    }

    return (
        <>
            <color attach="background" args={[theme.background]} />
            <fog attach="fog" args={[theme.fog, 10, 50]} />

            {/* Lights */}
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <Stars radius={100} depth={50} count={1500} factor={4} saturation={0} fade speed={1} />

            <Physics gravity={[0, settings.gravity || -9.8, 0]}>
                {/* Player Removed - We are floating cameras now */}
                <Floor onClick={handleFloorClick} color={theme.floor} gridColor={theme.grid} />

                {/* Render Other Players - Optimized */}
                {playerIds.map((id) => (
                    <OtherPlayer key={id} id={id} dataRef={othersRef} />
                ))}

                {totems.map((t) => (
                    <SoundTotem
                        key={t.id}
                        position={t.position}
                        type={t.type || 'synth'}
                        settings={settings}
                        onClick={() => handleTotemClick(t.id)}
                    />
                ))}
            </Physics>

            {/* Post Processing */}
            <EffectComposer enableNormalPass={false}>
                <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} radius={0.5} />
                <Vignette eskil={false} offset={0.1} darkness={1.1} />
            </EffectComposer>

            {/* Controls - Orbit for Tabletop view */}
            {started && (
                <OrbitControls
                    makeDefault
                    minPolarAngle={0}
                    maxPolarAngle={Math.PI / 2.5} // Don't allow looking from under the table
                    maxDistance={30}
                    minDistance={5}
                />
            )}
        </>
    );
}
