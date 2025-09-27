// app/properties/layout.tsx
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

// Egyszerűsített Layout - nincs szükség PropertiesProvider-re
// Mivel minden adat server-side kerül lekérésre
const PropertiesLayout: React.FC<LayoutProps> = async ({ children }) => {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
};

export default PropertiesLayout;