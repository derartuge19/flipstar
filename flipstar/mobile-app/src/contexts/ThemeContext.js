import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [colors, setColors] = useState({
    bg: '#0D0D0D',
    cardBg: '#1A1A1A',
    text: '#FFFFFF',
    textSecondary: '#999999',
    border: '#262626',
    primary: '#F9E08B',
    primaryDark: '#C8B56A',
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B'
  });

  const value = {
    colors,
    setColors
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
