export const TOTEM_TYPES = {
    SYNTH: {
        id: 'synth',
        label: 'Lead Synth',
        color: '#00f0ff',
        description: 'Classic sawtooth lead with reverb'
    },
    BASS: {
        id: 'bass',
        label: 'Deep Bass',
        color: '#ff0055',
        description: 'Heavy FM bass for the low end'
    },
    KICK: {
        id: 'kick',
        label: 'Kick Drum',
        color: '#ffaa00',
        description: 'Punchy membrane kick'
    },
    HIHAT: {
        id: 'hihat',
        label: 'Hi-Hat',
        color: '#ffff00',
        description: 'Metallic noise burst'
    }
} as const;

export type TotemType = keyof typeof TOTEM_TYPES;

export const THEMES = {
    Dark: {
        id: 'Dark',
        background: '#050505',
        fog: '#050505',
        floor: '#111111',
        grid: '#333333',
        uiBg: 'rgba(0, 0, 0, 0.6)'
    },
    Light: {
        id: 'Light',
        background: '#f0f0f0',
        fog: '#ffffff',
        floor: '#e0e0e0',
        grid: '#cccccc',
        uiBg: 'rgba(0, 0, 0, 0.4)'
    },
    Midnight: {
        id: 'Midnight',
        background: '#020b1a',
        fog: '#051025',
        floor: '#030c1f',
        grid: '#1a3c6b',
        uiBg: 'rgba(2, 11, 26, 0.6)'
    },
    Cyber: {
        id: 'Cyber',
        background: '#0d0221',
        fog: '#150435',
        floor: '#1a0540',
        grid: '#ff00ff',
        uiBg: 'rgba(45, 0, 60, 0.6)'
    }
} as const;

export type ThemeName = keyof typeof THEMES;

