import React, { createContext, useContext, useEffect, useState } from 'react';

const VehicleContext = createContext(null);

export const VehicleProvider = ({ children }) => {
    const [vehicles, setVehicles] = useState([]);

    useEffect(() => {
        const fetchVehicles = async () => {
            const response = await fetch('/api/vehicles');
            const data = await response.json();
            setVehicles(data);
        };

        fetchVehicles();
    }, []);

    return (
        <VehicleContext.Provider value={{ vehicles }}>
            {children}
        </VehicleContext.Provider>
    );
};

export const useVehicles = () => {
    return useContext(VehicleContext);
};