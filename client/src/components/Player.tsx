import { useEffect, useRef } from 'react';
import { useBox } from '@react-three/cannon';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as Tone from 'tone';

const SPEED = 10;
const JUMP_FORCE = 5;

export default function Player({ onMove }: { onMove?: (pos: [number, number, number], rot: number) => void }) {
    const { camera } = useThree();
    const [ref, api] = useBox(() => ({
        mass: 1,
        type: 'Dynamic',
        position: [0, 50, 0], // Spawn VERY high to prevent floor clipping
        args: [1, 2, 1],
        fixedRotation: true,
        linearDamping: 0.5
    }));

    // Movement state
    const velocity = useRef([0, 0, 0]);
    useEffect(() => api.velocity.subscribe((v) => (velocity.current = v)), [api.velocity]);

    const pos = useRef<[number, number, number]>([0, 0, 0]);
    useEffect(() => api.position.subscribe((p) => (pos.current = p)), [api.position]);

    // Keys
    const keys = useRef<{ [key: string]: boolean }>({});

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
        const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    useFrame((state) => {
        if (!ref.current) return;

        // Auto-respawn if fallen
        if (pos.current[1] < -50) {
            console.log("Player fell out of world, respawning...");
            api.position.set(0, 50, 0);
            api.velocity.set(0, 0, 0);
        }

        // Notify parent of movement (for Minimap)
        if (onMove) onMove(pos.current, camera.rotation.y);

        // Sync camera to player physics body
        camera.position.set(pos.current[0], pos.current[1] + 1, pos.current[2]);

        // Calculate movement direction relative to camera (ignoring pitch)
        const frontVector = new THREE.Vector3(
            0,
            0,
            Number(keys.current['ArrowDown'] || keys.current['KeyS']) - Number(keys.current['ArrowUp'] || keys.current['KeyW'])
        );
        const sideVector = new THREE.Vector3(
            Number(keys.current['ArrowLeft'] || keys.current['KeyA']) - Number(keys.current['ArrowRight'] || keys.current['KeyD']),
            0,
            0
        );

        const direction = new THREE.Vector3();
        direction.subVectors(frontVector, sideVector).normalize().multiplyScalar(SPEED);

        // Apply only Yaw (Y-axis rotation) to move relative to camera view but stay flat on ground
        const euler = new THREE.Euler(0, camera.rotation.y, 0);
        direction.applyEuler(euler);

        api.velocity.set(direction.x, velocity.current[1], direction.z);

        // Jump
        if (keys.current['Space'] && Math.abs(velocity.current[1]) < 0.05) {
            api.velocity.set(velocity.current[0], JUMP_FORCE, velocity.current[2]);
        }

        // --- AUDIO LISTENER UPDATE ---
        // Even with manual audio, good to keep Listener updated for any other potential audio sources
        const listenerY = Math.max(pos.current[1], 0);

        if (Number.isFinite(pos.current[0])) Tone.Listener.positionX.value = pos.current[0];
        if (Number.isFinite(listenerY)) Tone.Listener.positionY.value = listenerY;
        if (Number.isFinite(pos.current[2])) Tone.Listener.positionZ.value = pos.current[2];

        // Listener orientation 
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

        if (Number.isFinite(forward.x)) Tone.Listener.forwardX.value = forward.x;
        if (Number.isFinite(forward.y)) Tone.Listener.forwardY.value = forward.y;
        if (Number.isFinite(forward.z)) Tone.Listener.forwardZ.value = forward.z;

        if (Number.isFinite(up.x)) Tone.Listener.upX.value = up.x;
        if (Number.isFinite(up.y)) Tone.Listener.upY.value = up.y;
        if (Number.isFinite(up.z)) Tone.Listener.upZ.value = up.z;
    });

    return (
        <mesh ref={ref} /> // Invisible physics representation
    );
}
