// app/properties/PropertiesProvider.tsx
'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { Property } from '../lib/action/getPublicData';

interface PropertiesContextType {
  properties: Property[];
  cities: string[];
  propertyTypes: string[];
}

const PropertiesContext = createContext<PropertiesContextType | undefined>(undefined);

interface PropertiesProviderProps {
  properties: Property[];
  cities: string[];
  propertyTypes: string[];
  children: ReactNode;
}

const PropertiesProvider: React.FC<PropertiesProviderProps> = ({ 
  properties, 
  cities,
  propertyTypes,
  children 
}) => {
  const contextValue: PropertiesContextType = {
    properties,
    cities,
    propertyTypes
  };

  return (
    <PropertiesContext.Provider value={contextValue}>
      {children}
    </PropertiesContext.Provider>
  );
};

// Custom hook a context használatához
export const useProperties = (): PropertiesContextType => {
  const context = useContext(PropertiesContext);
  if (context === undefined) {
    throw new Error('useProperties must be used within a PropertiesProvider');
  }
  return context;
};

export default PropertiesProvider;