import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, CheckCircle, XCircle, Stethoscope, User } from 'lucide-react';

const API_URL = import.meta.env.MODE === 'development' ? 'http://localhost:3005/api' : '/api';

const SessionFinalizeModal = ({ slot, scheduledPatients, onClose, onSave }) => {
    const [selectedPatient, setSelectedPatient] = useState(
        scheduledPatients.length === 1 ? scheduledPatients[0] : null
    );
    const [professionals, setProfessionals] = useState([]);
    const [treatments, setTreatments] = useState([]);
    const [selectedKine, setSelectedKine] = useState('');
    const [selectedTreatment, setSelectedTreatment] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [notasExtra, setNotasExtra] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        Promise.all([
            axios.get(`${API_URL}/professionals`),
            axios.get(`${API_URL}/treatments`)
        ]).then(([resPro, resTreat]) => {
            setProfessionals(resPro.data || []);
            setTreatments(resTreat.data || []);
        }).catch(err => console.error('Error cargando datos:', err));
    }, []);

    const handleSave = async (estado) => {
        if (!selectedPatient) { alert('Seleccioná un paciente.'); return; }
        if (!selectedKine) { alert('Seleccioná el kinesiólogo que atendió.'); return; }

        const kineNombre = professionals.find(p => String(p.id) === String(selectedKine))?.nombre || selectedKine;
        const treatNombre = treatments.find(t => String(t.id) === String(selectedTreatment))?.nombre || '';
        const obsCompletas = [
            observaciones,
            notasExtra ? `📌 Nota extra: ${notasExtra}` : ''
        ].filter(Boolean).join('\n');

        setSaving(true);
        try {
            const sessionId = selectedPatient.sessionId;
            if (sessionId) {
                await axios.put(`${API_URL}/sessions/${sessionId}`, {
                    estado,
                    tratamiento_id: selectedTreatment || null,
                    observaciones: obsCompletas,
                    kinesiologo_nombre_snapshot: kineNombre,
                });
            } else {
                await axios.post(`${API_URL}/sessions`, {
                    paciente_id: selectedPatient.id,
                    fecha: slot.fecha || new Date().toISOString().split('T')[0],
                    hora: slot.id,
                    estado,
                    tratamiento_id: selectedTreatment || null,
                    observaciones: obsCompletas,
                    kinesiologo_nombre_snapshot: kineNombre,
                });
            }
            onSave();
        } catch (err) {
            console.error('Error guardando:', err);
            alert('Error al guardar. Reintentá.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.88)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
            <div className="premium-card glass-panel" style={{
                width: '580px', maxHeight: '90vh', overflowY: 'auto',
                padding: '35px', borderTop: '4px solid var(--primary)'
            }}>
                {/* Título */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                            <Stethoscope color="var(--primary)" size={22} />
                            <h2 style={{ fontSize: '1.4rem' }}>Registrar Atención</h2>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            🕐 Horario: <strong style={{ color: 'white' }}>{slot.time || slot.id}</strong>
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>
                        <X color="var(--text-muted)" size={24} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                    {/* Paciente */}
                    <div>
                        <label style={labelStyle}>👤 PACIENTE</label>
                        <select
                            value={selectedPatient?.id || ''}
                            onChange={e => setSelectedPatient(scheduledPatients.find(p => String(p.id) === e.target.value) || null)}
                            style={selectStyle}>
                            <option value="">— Seleccionar paciente —</option>
                            {scheduledPatients.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>
                            ))}
                        </select>
                    </div>

                    {/* Kinesiólogo */}
                    <div>
                        <label style={labelStyle}>🩺 KINESIÓLOGO QUE ATENDIÓ</label>
                        <select
                            value={selectedKine}
                            onChange={e => setSelectedKine(e.target.value)}
                            style={{ ...selectStyle, borderColor: selectedKine ? 'var(--primary)' : 'var(--border)' }}>
                            <option value="">— Seleccionar kinesiólogo —</option>
                            {professionals.map(pro => (
                                <option key={pro.id} value={pro.id}>
                                    {pro.nombre}{pro.matricula ? ` (MP ${pro.matricula})` : ''}
                                </option>
                            ))}
                        </select>
                        {professionals.length === 0 && (
                            <p style={warnStyle}>⚠️ No hay kinesiólogos cargados. Ir a Configuración.</p>
                        )}
                    </div>

                    {/* Tratamiento */}
                    <div>
                        <label style={labelStyle}>💊 TRATAMIENTO APLICADO</label>
                        <select
                            value={selectedTreatment}
                            onChange={e => setSelectedTreatment(e.target.value)}
                            style={selectStyle}>
                            <option value="">— Sin tratamiento específico —</option>
                            {treatments.map(t => (
                                <option key={t.id} value={t.id}>{t.nombre}</option>
                            ))}
                        </select>
                        {treatments.length === 0 && (
                            <p style={warnStyle}>⚠️ Sin tratamientos cargados. Ir a Configuración.</p>
                        )}
                    </div>

                    {/* Observaciones de sesión */}
                    <div>
                        <label style={labelStyle}>📝 EVOLUCIÓN / OBSERVACIONES</label>
                        <textarea
                            placeholder="Descripción de la sesión, evolución del paciente..."
                            value={observaciones}
                            onChange={e => setObservaciones(e.target.value)}
                            rows={3}
                            style={textareaStyle}
                        />
                    </div>

                    {/* Notas Extra */}
                    <div>
                        <label style={labelStyle}>📌 NOTAS EXTRA (dolor, reacción, indicaciones al paciente...)</label>
                        <textarea
                            placeholder="Ej: muy dolorido, no toleró el ultrasonido, se le indicó reposo..."
                            value={notasExtra}
                            onChange={e => setNotasExtra(e.target.value)}
                            rows={2}
                            style={{ ...textareaStyle, borderColor: notasExtra ? '#ffea00' : 'var(--border)' }}
                        />
                    </div>

                    {/* Botones de Estado */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                        <button
                            onClick={() => handleSave('asistió')}
                            disabled={saving}
                            style={{
                                ...btnStyle,
                                background: 'linear-gradient(135deg, #00e676, #00b248)',
                                opacity: saving ? 0.7 : 1
                            }}>
                            <CheckCircle size={20} />
                            {saving ? 'Guardando...' : 'ASISTIÓ ✅'}
                        </button>
                        <button
                            onClick={() => handleSave('no asistió')}
                            disabled={saving}
                            style={{
                                ...btnStyle,
                                background: 'linear-gradient(135deg, #ff5252, #c62828)',
                                opacity: saving ? 0.7 : 1
                            }}>
                            <XCircle size={20} />
                            {saving ? 'Guardando...' : 'NO ASISTIÓ ❌'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Estilos reutilizables
const labelStyle = {
    fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.5px',
    color: 'var(--text-muted)', display: 'block', marginBottom: '8px'
};
const selectStyle = {
    width: '100%', padding: '13px 16px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.07)', color: 'white',
    border: '1px solid var(--border)', fontSize: '0.95rem',
    cursor: 'pointer', outline: 'none'
};
const textareaStyle = {
    width: '100%', padding: '12px 16px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.05)', color: 'white',
    border: '1px solid var(--border)', resize: 'vertical',
    fontFamily: 'inherit', fontSize: '0.9rem',
    boxSizing: 'border-box', outline: 'none'
};
const btnStyle = {
    padding: '16px', borderRadius: '12px', fontWeight: '700',
    fontSize: '0.95rem', cursor: 'pointer', border: 'none',
    color: 'white', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: '8px'
};
const warnStyle = {
    fontSize: '0.75rem', color: '#ffea00', marginTop: '5px'
};

export default SessionFinalizeModal;
