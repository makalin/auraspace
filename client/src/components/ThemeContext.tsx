import React, { createContext, useState, useContext } from 'react';
import { THEMES, type ThemeName } from '../constants';

type Theme = typeof THEMES[ThemeName];

interface ThemeContextType {
    theme: Theme;
    themeName: ThemeName;
    setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: THEMES.Dark,
    themeName: 'Dark',
    setTheme: () => { }
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [themeName, setTheme] = useState<ThemeName>('Dark');

    const value = {
        theme: THEMES[themeName],
        themeName,
        setTheme
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
