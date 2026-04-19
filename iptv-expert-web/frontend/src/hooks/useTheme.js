import { useState, useEffect, useCallback } from 'react';

const THEME_VARS = {
    default: {
        '--color-primary': '108 92 231',
        '--color-background': '0 0 0',
        '--color-surface': '30 30 30',
        '--color-surface-light': '45 45 45',
        '--color-neon-blue': '63 94 240',
        '--color-neon-blue-light': '109 140 255',
        '--color-neon-purple': '122 77 240',
        '--color-neon-purple-light': '183 125 255',
        '--color-white': '255 255 255',
        '--color-black': '0 0 0',
    },
    red: {
        '--color-primary': '231 76 60',
        '--color-background': '10 0 0',
        '--color-surface': '35 10 10',
        '--color-surface-light': '55 20 20',
        '--color-neon-blue': '231 76 60',
        '--color-neon-blue-light': '255 120 100',
        '--color-neon-purple': '200 30 30',
        '--color-neon-purple-light': '231 76 60',
        '--color-white': '255 255 255',
        '--color-black': '10 0 0',
    },
    green: {
        '--color-primary': '32 191 107',
        '--color-background': '0 10 5',
        '--color-surface': '10 30 20',
        '--color-surface-light': '20 50 33',
        '--color-neon-blue': '32 191 107',
        '--color-neon-blue-light': '88 214 141',
        '--color-neon-purple': '15 160 80',
        '--color-neon-purple-light': '32 191 107',
        '--color-white': '255 255 255',
        '--color-black': '0 10 5',
    },
    white: {
        '--color-primary': '108 92 231',
        '--color-background': '243 244 246',
        '--color-surface': '255 255 255',
        '--color-surface-light': '229 231 235',
        '--color-neon-blue': '63 94 240',
        '--color-neon-blue-light': '109 140 255',
        '--color-neon-purple': '122 77 240',
        '--color-neon-purple-light': '183 125 255',
        '--color-white': '15 15 20',
        '--color-black': '243 244 246',
    },
};

export function applyTheme(themeId) {
    const vars = THEME_VARS[themeId] || THEME_VARS.default;
    const root = document.documentElement;

    // 1. Seta as variáveis CSS (funciona para as cores mapeadas no tailwind.config.js)
    Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));

    // 2. Seta o data-theme (o index.css tem regras !important para bg-body/neon-container)
    root.setAttribute('data-theme', themeId);
}

export function useTheme() {
    const [theme, setTheme] = useState(() => localStorage.getItem('iptv_theme') || 'default');

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const changeTheme = useCallback((id) => {
        localStorage.setItem('iptv_theme', id);
        setTheme(id);
    }, []);

    return { theme, changeTheme };
}
