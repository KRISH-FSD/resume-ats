import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [isLightMode, setIsLightMode] = useState(() => {
        return localStorage.getItem("theme") === "light";
    });

    useEffect(() => {
        if (isLightMode) {
            document.body.classList.add("light-mode");
            localStorage.setItem("theme", "light");
        } else {
            document.body.classList.remove("light-mode");
            localStorage.setItem("theme", "dark");
        }
    }, [isLightMode]);

    const toggleTheme = () => {
        setIsLightMode(prev => !prev);
    };

    return (
        <ThemeContext.Provider value={{ isLightMode, toggleTheme, setIsLightMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
