
import React, { createContext, useContext, useState, useEffect } from 'react';

const FeatureContext = createContext();

const defaultFeatures = {
    maintenance_mode: false,
    practice_mode: true,
    practice_history: true,
    voice_mode: true,
};

export const FeatureProvider = ({ children }) => {
    const [features, setFeatures] = useState(() => {
        try {
            const storedFeatures = localStorage.getItem('feature_flags');
            return storedFeatures ? { ...defaultFeatures, ...JSON.parse(storedFeatures) } : defaultFeatures;
        } catch (error) {
            console.error("Failed to load feature flags from localStorage:", error);
            return defaultFeatures;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('feature_flags', JSON.stringify(features));
        } catch (error) {
            console.error("Failed to save feature flags to localStorage:", error);
        }
    }, [features]);

    const toggleFeature = (featureName) => {
        setFeatures((prev) => ({
            ...prev,
            [featureName]: !prev[featureName],
        }));
    };

    const isFeatureEnabled = (featureName) => {
        return features[featureName] ?? false;
    };

    return (
        <FeatureContext.Provider value={{ features, toggleFeature, isFeatureEnabled }}>
            {children}
        </FeatureContext.Provider>
    );
};

export const useFeatures = () => {
    const context = useContext(FeatureContext);
    if (!context) {
        throw new Error('useFeatures must be used within a FeatureProvider');
    }
    return context;
};
