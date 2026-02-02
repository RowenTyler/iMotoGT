"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  // Add other vehicle properties as needed
}

interface VehicleContextType {
  vehicles: Vehicle[];
  loadVehicles: () => Promise<void>;
  loading: boolean;
}

const VehicleContext = createContext<VehicleContextType | null>(null);

export const VehicleProvider = ({ children }: { children: React.ReactNode }) => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(false);

    const loadVehicles = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/vehicles');
            const data = await response.json();
            setVehicles(data);
        } catch (error) {
            console.error('Failed to fetch vehicles:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadVehicles();
    }, []);

    return (
        <VehicleContext.Provider value={{ vehicles, loadVehicles, loading }}>
            {children}
        </VehicleContext.Provider>
    );
};

export const useVehicleContext = () => {
    const context = useContext(VehicleContext);
    if (!context) {
        throw new Error('useVehicleContext must be used within a VehicleProvider');
    }
    return context;
};
