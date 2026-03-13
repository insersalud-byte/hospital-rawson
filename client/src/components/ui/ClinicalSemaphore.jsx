import React from 'react';
import { AlertCircle } from 'lucide-react';

const ClinicalSemaphore = ({ lostSessionsCount }) => {
    let status = 'normal'; // Verde
    let color = 'var(--success)';
    let label = 'Seguimiento Normal';
    let icon = null;

    if (lostSessionsCount === 2) {
        status = 'warning'; // Amarillo
        color = 'var(--warning)';
        label = 'Alerta: 2 inasistencias';
        icon = <AlertCircle size={16} />;
    } else if (lostSessionsCount >= 3) {
        status = 'critical'; // Rojo
        color = 'var(--error)';
        label = 'CRÍTICO: Probable abandono';
        icon = <AlertCircle size={16} />;
    }

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            borderRadius: '20px',
            background: `${color}22`,
            color: color,
            fontSize: '0.8rem',
            fontWeight: '600',
            border: `1px solid ${color}44`
        }}>
            {icon}
            <span>{label}</span>
        </div>
    );
};

export default ClinicalSemaphore;
