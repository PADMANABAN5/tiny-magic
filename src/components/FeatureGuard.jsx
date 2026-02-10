import React from 'react';
import { useFeatures } from './FeatureContext';
import { Navigate } from 'react-router-dom';

const FeatureGuard = ({ feature, fallback = null, redirectTo = null, children }) => {
    const { isFeatureEnabled } = useFeatures();

    if (!isFeatureEnabled(feature)) {
        if (redirectTo) {
            return <Navigate to={redirectTo} replace />;
        }
        return fallback;
    }

    return children;
};

export default FeatureGuard;
