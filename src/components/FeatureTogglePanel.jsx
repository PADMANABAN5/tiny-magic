import React from 'react';
import { useFeatures } from './FeatureContext';
import { Form, Card } from 'react-bootstrap';
import { Settings, ToggleLeft } from 'lucide-react';

const FeatureTogglePanel = () => {
    const { features, toggleFeature } = useFeatures();

    const formatLabel = (key) => {
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <Card className="shadow-sm border-0 rounded-3 mb-4">
            <Card.Body>
                <div className="d-flex align-items-center mb-3">
                    <ToggleLeft className="text-primary me-2" size={24} />
                    <h5 className="card-title fw-bold mb-0 text-dark">Feature Toggles (Local Control)</h5>
                </div>
                <Card.Text className="text-secondary small mb-3">
                    Manage feature availability for this browser session.
                    Note: These settings currently persist only in local storage.
                </Card.Text>
                <div className="d-flex flex-wrap gap-4">
                    {Object.keys(features).map((featureKey) => (
                        <Form.Check
                            type="switch"
                            id={`feature-${featureKey}`}
                            key={featureKey}
                            label={formatLabel(featureKey)}
                            checked={features[featureKey]}
                            onChange={() => toggleFeature(featureKey)}
                            className="fs-6 user-select-none"
                            style={{ cursor: 'pointer' }}
                        />
                    ))}
                </div>
            </Card.Body>
        </Card>
    );
};

export default FeatureTogglePanel;
