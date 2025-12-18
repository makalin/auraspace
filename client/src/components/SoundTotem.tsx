import { useRef, useMemo, useEffect } from 'react';
import { useSphere } from '@react-three/cannon';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import * as Tone from 'tone';

const SCALES: { [key: string]: string[] } = {
    Pentatonic: ["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5"],
    Major: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
    Minor: ["C4", "D4", "Eb4", "F4", "G4", "Ab4", "Bb4", "C5"],
    Dorian: ["C4", "D4", "Eb4", "F4", "G4", "A4", "Bb4", "C5"],
    blues: ["C4", "Eb4", "F4", "F#4", "G4", "Bb4", "C5"],
    lydian: ["C4", "D4", "E4", "F#4", "G4", "A4", "B4", "C5"],
    Chromatic: ["C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4"],
    // Bass scales (octave lower)
    PentatonicBass: ["C2", "D2", "E2", "G2", "A2", "C3"],
    MajorBass: ["C2", "D2", "E2", "F2", "G2", "A2", "B2", "C3"]
};

// Helper to determine step interval based on type
const getMusicalInterval = (type: string) => {
    switch (type) {
        case 'kick': return '4n'; // Quarter note
        case 'bass': return '1m'; // Full measure
        case 'hihat': return '8n'; // Eighth note
        case 'synth':
        default:
            const opts = ['4n', '8n', '2n'];
            return opts[Math.floor(Math.random() * opts.length)];
    }
}

// Instrument Factory - Connects to a robust Gain Node instead of flaky Panner3D
const createInstrument = (type: string, outputNode: Tone.ToneAudioNode) => {
    let instrument: any;

    switch (type) {
        case 'bass':
            instrument = new Tone.FMSynth({
                harmonicity: 3,
                modulationIndex: 10,
                detune: 0,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.01, decay: 0.5, sustain: 1, release: 0.5 },
                modulation: { type: 'square' },
                modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 }
            }).connect(outputNode);
            break;
        case 'kick':
            instrument = new Tone.MembraneSynth({
                pitchDecay: 0.05,
                octaves: 10,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
            }).connect(outputNode);
            break;
        case 'hihat':
            instrument = new Tone.MetalSynth({
                envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
                harmonicity: 5.1,
                modulationIndex: 32,
                resonance: 4000,
                octaves: 1.5
            }).connect(outputNode);
            // MetalSynth usually works with defaults. 
            break;
        case 'synth':
        default:
            instrument = new Tone.AMSynth({
                harmonicity: 2.5,
                oscillator: { type: 'fatsawtooth' },
                envelope: { attack: 0.1, decay: 0.2, sustain: 1.0, release: 0.5 },
                modulation: { type: 'square' },
                modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 }
            }).connect(outputNode);
            break;
    }
    return instrument;
};

export default function SoundTotem({
    position,
    type = 'synth',
    settings,
    onClick
}: {
    position: [number, number, number],
    type?: string,
    settings: any,
    onClick?: () => void
}) {
    const [ref] = useSphere(() => ({ mass: 1, position, args: [0.2], linearDamping: 0.5, angularDamping: 0.5 }));
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);

    // Audio State
    const audio = useMemo(() => {
        // Replacement: Use Gain Node instead of Panner3D for robustness
        const gain = new Tone.Gain(0.5).toDestination();
        const synth = createInstrument(type, gain);

        // Random index for note selection (persistent for this totem)
        const noteIndex = Math.floor(Math.random() * 100);
        const interval = getMusicalInterval(type);

        return { synth, gain, noteIndex, interval };
    }, [type]);

    // Keep settings in a ref so Audio Loop can see current value without re-running effect
    const settingsRef = useRef(settings);
    useEffect(() => { settingsRef.current = settings; }, [settings]);

    useEffect(() => {
        console.log(`SoundTotem (${type}) Loop Init. Interval:`, audio.interval);

        const loop = new Tone.Loop(time => {
            const currentSettings = settingsRef.current;
            // console.log(`Triggering ${type} at ${time}`); 

            // Logic for specific types
            if (type === 'kick') {
                audio.synth.triggerAttackRelease("C1", "8n", time);
                return;
            }

            if (type === 'hihat') {
                // Note, Duration, Time, Velocity
                // Use a high pitch for hihat, short duration
                audio.synth.triggerAttackRelease("C6", "32n", time, Math.random() * 0.5 + 0.5);
                return;
            }

            // Melodic instruments
            const scaleName = currentSettings?.scale || 'Pentatonic';
            // Use bass scale for bass
            const finalScaleName = (type === 'bass' && !scaleName.includes('Bass')) ? 'PentatonicBass' : scaleName;

            const scale = SCALES[finalScaleName] || SCALES.Pentatonic;
            const note = scale[audio.noteIndex % scale.length];

            if (note && time) {
                audio.synth.triggerAttackRelease(note, "8n", time);
            }
        }, audio.interval).start(0);

        return () => {
            loop.dispose();
        };
    }, [audio]);

    // cleanup on unmount for audio nodes
    // cleanup on unmount for audio nodes
    useEffect(() => {
        return () => {
            audio.synth.dispose();
            audio.gain.dispose();
        }
    }, [audio]);

    // Manual Spatial Audio Calculation
    const { camera } = useThree();

    useFrame((state) => {
        if (ref.current) {
            // Visual Pulse
            const t = state.clock.getElapsedTime();
            const scale = 1 + Math.sin(t * 2) * 0.1;
            // Apply size setting
            const baseSize = settings.totemSize || 0.2;
            ref.current.scale.setScalar(scale * (baseSize / 0.2)); // Scale relative to default 0.2

            // --- MANUAL AUDIO SPATIALIZATION ---
            const totemPos = ref.current.position;

            // Validate physics position
            if (Number.isFinite(totemPos.x) && Number.isFinite(totemPos.y) && Number.isFinite(totemPos.z)) {
                const dist = camera.position.distanceTo(totemPos);

                if (Number.isFinite(dist)) {
                    // Attenuate Volume properly with Distance
                    // Simple linear falloff: 1.0 at 0m, 0.0 at 20m
                    const maxDist = 20;
                    let vol = 1 - (dist / maxDist);
                    if (vol < 0) vol = 0;

                    // Apply global volume setting as a multiplier
                    // Boost: Increase base gain (settings.volume) significantly.
                    // If -5db -> 0.5. Let's add a +5db boost to everything.
                    const boost = 5;
                    const globalGain = Tone.dbToGain((settings.volume ?? -5) + boost);

                    // Final gain = Distance * Global
                    const finalGain = vol * globalGain;

                    if (Number.isFinite(finalGain)) {
                        audio.gain.gain.rampTo(finalGain, 0.1);
                    }
                }

                // REMOVED: Stereo Panning (Panner3D is flaky)
                // We rely purely on volume for distance cues.
            }
        }

        if (materialRef.current) {
            const t = state.clock.getElapsedTime();
            materialRef.current.emissiveIntensity = 0.5 + Math.sin(t * 2) * 0.5;
        }
    });

    // Get color from imported constants or map locally
    // For now we map strictly to make it self contained or use the prop passed if we had the constant
    const getColor = (t: string) => {
        switch (t) {
            case 'bass': return '#ff0055';
            case 'kick': return '#ffaa00';
            case 'hihat': return '#ffff00';
            case 'synth': default: return '#00f0ff';
        }
    };
    const c = getColor(type);

    const handleManualTrigger = (e: any) => {
        e.stopPropagation();

        // Always trigger sound visually/audibly
        // Note: We need to determine note/duration similar to loop
        const note = "C4"; // Default
        audio.synth.triggerAttackRelease(note, "8n");

        if (materialRef.current) {
            materialRef.current.emissiveIntensity = 2; // Flash bright
        }

        // Pass to parent (for delete logic etc)
        onClick?.();
    };

    return (
        <mesh ref={ref as any} onClick={handleManualTrigger}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial ref={materialRef} color={c} emissive={c} roughness={0.1} metalness={0.8} />
            <pointLight distance={3} intensity={2} color={c} />
        </mesh>
    );
}
