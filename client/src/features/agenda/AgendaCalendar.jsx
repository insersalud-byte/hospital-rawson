import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { format, addMinutes, startOfDay, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, Users, Timer } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.MODE === 'development' ? 'http://localhost:3005/api' : '/api';

// ─── Historial + Panel de Atención ────────────────────────────────────────────
const PatientPanel = ({ patient, onClose, onSaved }) => {
    const { user } = useAuth();
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [mode, setMode] = useState('history'); // 'history' | 'atender'
    const [treatments, setTreatments] = useState([]);
    const [selectedTreatment, setSelectedTreatment] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [notasExtra, setNotasExtra] = useState('');
    const [saving, setSaving] = useState(false);

    // Timer de 45 min
    const [timerActive, setTimerActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(45 * 60); // segundos
    const timerRef = useRef(null);

    useEffect(() => {
        axios.get(`${API_URL}/sessions/patient/${patient.id}`)
            .then(res => setHistory(res.data || []))
            .catch(() => setHistory([]))
            .finally(() => setLoadingHistory(false));
        axios.get(`${API_URL}/treatments`)
            .then(res => setTreatments(res.data || []))
            .catch(() => { });
    }, [patient.id]);

    // Timer countdown
    useEffect(() => {
        if (timerActive && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(t => {
                    if (t <= 1) {
                        clearInterval(timerRef.current);
                        setTimerActive(false);
                        alert(`⏰ ¡Se acabaron los 45 minutos de la sesión de ${patient.nombre} ${patient.apellido}!`);
                        return 0;
                    }
                    return t - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [timerActive]);

    const startTimer = () => {
        setTimeLeft(45 * 60);
        setTimerActive(true);
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const timerColor = timeLeft < 300 ? '#ff5252' : timeLeft < 600 ? '#ffea00' : '#00e676';

    const handleSave = async (estado) => {
        setSaving(true);
        clearInterval(timerRef.current);
        setTimerActive(false);
        const obsCompleta = [
            observaciones,
            notasExtra ? `📌 Nota extra: ${notasExtra}` : ''
        ].filter(Boolean).join('\n');

        try {
            const sessionId = patient.sessionId;
            if (sessionId) {
                await axios.put(`${API_URL}/sessions/${sessionId}`, {
                    estado,
                    tratamiento_id: selectedTreatment || null,
                    observaciones: obsCompleta,
                    kinesiologo_nombre_snapshot: user?.nombre || 'Kinesiólogo',
                });
            } else {
                await axios.post(`${API_URL}/sessions`, {
                    paciente_id: patient.id,
                    fecha: new Date().toISOString().split('T')[0],
                    hora: patient.hora || '08:00',
                    estado,
                    tratamiento_id: selectedTreatment || null,
                    observaciones: obsCompleta,
                    kinesiologo_nombre_snapshot: user?.nombre || 'Kinesiólogo',
                });
            }
            onSaved();
            onClose();
        } catch (err) {
            console.error('Error guardando:', err);
            alert('Error al guardar. Reintentá.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTurno = async () => {
        if (!window.confirm(`¿Estás seguro que querés CANCELAR y eliminar el turno de ${patient.nombre} a las ${patient.hora}?`)) return;
        setSaving(true);
        try {
            await axios.delete(`${API_URL}/sessions/${patient.sessionId}`);
            onSaved();
            onClose();
        } catch (err) {
            console.error('Error cancelando turno:', err);
            alert('Error al cancelar. Por favor reintentá.');
            setSaving(false);
        }
    };

    const estadoColor = (estado) => {
        if (estado === 'asistió') return '#00e676';
        if (estado === 'no asistió') return '#ff5252';
        return 'var(--text-muted)';
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '15px'
        }}>
            <div className="premium-card glass-panel" style={{
                width: '100%', maxWidth: '640px', maxHeight: '90vh',
                display: 'flex', flexDirection: 'column',
                borderTop: '4px solid var(--primary)'
            }}>
                {/* Header */}
                <div style={{ padding: '22px 28px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ fontSize: '1.3rem', marginBottom: '3px' }}>
                                👤 {patient.nombre} {patient.apellido}
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                HC: {patient.historia_clinica || '—'} · {patient.telefono || 'Sin teléfono'}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {user?.role === 'ADMIN' && patient.sessionId && (
                                <button onClick={handleDeleteTurno} disabled={saving} style={{
                                    background: 'rgba(255,82,82,0.1)', border: '1px solid #ff5252', color: '#ff5252',
                                    padding: '8px 14px', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer',
                                    fontWeight: '600', fontSize: '0.85rem'
                                }} title="Eliminar este turno (Solo Admin)">
                                    🗑️ Cancelar Turno
                                </button>
                            )}
                            <button onClick={onClose} style={{
                                background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border)',
                                color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer'
                            }}>✕ Cerrar</button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                        <button onClick={() => setMode('history')} style={{
                            padding: '8px 18px', borderRadius: '20px', fontWeight: '600', fontSize: '0.85rem',
                            border: 'none', cursor: 'pointer',
                            background: mode === 'history' ? 'var(--primary)' : 'rgba(255,255,255,0.07)',
                            color: 'white'
                        }}>📋 Historial</button>
                        <button onClick={() => setMode('atender')} style={{
                            padding: '8px 18px', borderRadius: '20px', fontWeight: '600', fontSize: '0.85rem',
                            border: 'none', cursor: 'pointer',
                            background: mode === 'atender' ? '#00e676' : 'rgba(255,255,255,0.07)',
                            color: mode === 'atender' ? '#000' : 'white'
                        }}>🩺 Atender</button>
                    </div>
                </div>

                {/* Contenido */}
                <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px' }}>

                    {/* ── HISTORIAL ── */}
                    {mode === 'history' && (
                        <>
                            {loadingHistory && <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>}
                            {!loadingHistory && history.length === 0 && (
                                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', marginTop: '30px' }}>
                                    Sin sesiones registradas todavía.
                                </p>
                            )}
                            {!loadingHistory && history.map((s, i) => (
                                <div key={i} style={{
                                    padding: '14px 16px', marginBottom: '10px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '12px', border: '1px solid var(--border)',
                                    borderLeft: `4px solid ${estadoColor(s.estado)}`
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontWeight: '700' }}>
                                            {s.fecha ? format(new Date(s.fecha + 'T00:00:00'), "EEEE d/MM/yy", { locale: es }) : '—'}
                                            <span style={{ color: 'var(--text-muted)', fontWeight: '400', marginLeft: '8px', fontSize: '0.85rem' }}>
                                                🕐 {s.hora}
                                            </span>
                                        </span>
                                        <span style={{
                                            padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700',
                                            background: `${estadoColor(s.estado)}22`, color: estadoColor(s.estado),
                                            border: `1px solid ${estadoColor(s.estado)}`
                                        }}>
                                            {s.estado || 'programado'}
                                        </span>
                                    </div>
                                    {s.tratamiento_nombre && (
                                        <p style={{ fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '3px' }}>
                                            💊 {s.tratamiento_nombre}
                                        </p>
                                    )}
                                    {s.kinesiologo_nombre_snapshot && (
                                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                                            👤 Atendido por: {s.kinesiologo_nombre_snapshot}
                                        </p>
                                    )}
                                    {s.observaciones && (
                                        <p style={{
                                            fontSize: '0.83rem', color: '#ccc', marginTop: '8px',
                                            fontStyle: 'italic', background: 'rgba(255,255,255,0.04)',
                                            padding: '8px 12px', borderRadius: '8px', whiteSpace: 'pre-line'
                                        }}>
                                            📝 {s.observaciones}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </>
                    )}

                    {/* ── ATENDER ── */}
                    {mode === 'atender' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                            {/* Timer */}
                            <div style={{
                                textAlign: 'center', padding: '16px', borderRadius: '14px',
                                background: 'rgba(255,255,255,0.04)', border: `2px solid ${timerColor}`
                            }}>
                                <div style={{ fontSize: '2.8rem', fontWeight: '800', color: timerColor, fontVariantNumeric: 'tabular-nums' }}>
                                    ⏱ {formatTime(timeLeft)}
                                </div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '10px' }}>
                                    {timerActive ? 'Sesión en curso...' : 'Presioná INICIAR para arrancar el cronómetro de 45 min'}
                                </p>
                                {!timerActive && (
                                    <button onClick={startTimer} style={{
                                        padding: '8px 22px', borderRadius: '20px', border: 'none',
                                        background: '#00e676', color: '#000', fontWeight: '700', cursor: 'pointer'
                                    }}>
                                        ▶ INICIAR SESIÓN
                                    </button>
                                )}
                                {timerActive && (
                                    <button onClick={() => { clearInterval(timerRef.current); setTimerActive(false); }} style={{
                                        padding: '8px 22px', borderRadius: '20px', border: 'none',
                                        background: '#ff5252', color: 'white', fontWeight: '700', cursor: 'pointer'
                                    }}>
                                        ⏸ Pausar
                                    </button>
                                )}
                            </div>

                            {/* Tratamiento */}
                            <div>
                                <label style={labelStyle}>💊 TRATAMIENTO APLICADO</label>
                                <select value={selectedTreatment} onChange={e => setSelectedTreatment(e.target.value)} style={selectStyle}>
                                    <option value="">— Sin tratamiento específico —</option>
                                    {treatments.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                </select>
                                {treatments.length === 0 && <p style={warnStyle}>⚠️ Sin tratamientos. Pedile al Admin que los cargue.</p>}
                            </div>

                            {/* Observaciones */}
                            <div>
                                <label style={labelStyle}>📝 EVOLUCIÓN / OBSERVACIONES DE LA SESIÓN</label>
                                <textarea
                                    placeholder="Evolución del paciente, ejercicios realizados..."
                                    value={observaciones} onChange={e => setObservaciones(e.target.value)}
                                    rows={3} style={textareaStyle}
                                />
                            </div>

                            {/* Notas Extra */}
                            <div>
                                <label style={labelStyle}>📌 NOTAS EXTRA (dolor, reacción, indicaciones...)</label>
                                <textarea
                                    placeholder="Ej: muy dolorido, no toleró el ultrasonido, se indica reposo..."
                                    value={notasExtra} onChange={e => setNotasExtra(e.target.value)}
                                    rows={2} style={{ ...textareaStyle, borderColor: notasExtra ? '#ffea00' : 'var(--border)' }}
                                />
                            </div>

                            {/* Kinesiólogo (solo info, ya logeado) */}
                            <div style={{
                                padding: '10px 16px', background: 'rgba(0,136,204,0.1)',
                                borderRadius: '10px', border: '1px solid var(--primary)',
                                fontSize: '0.88rem', color: 'var(--primary)'
                            }}>
                                🩺 Registrando como: <strong>{user?.nombre}</strong>
                                {user?.matricula && <span style={{ color: 'var(--text-muted)' }}> — MP {user.matricula}</span>}
                            </div>

                            {/* Botones finales */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <button
                                    onClick={() => handleSave('asistió')} disabled={saving}
                                    style={{ ...btnStyle, background: 'linear-gradient(135deg,#00e676,#00b248)', opacity: saving ? 0.7 : 1 }}>
                                    ✅ {saving ? 'Guardando...' : 'TERMINAR · ASISTIÓ'}
                                </button>
                                <button
                                    onClick={() => handleSave('no asistió')} disabled={saving}
                                    style={{ ...btnStyle, background: 'linear-gradient(135deg,#ff5252,#c62828)', opacity: saving ? 0.7 : 1 }}>
                                    ❌ {saving ? 'Guardando...' : 'NO ASISTIÓ'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Estilos compartidos
const labelStyle = { fontSize: '0.73rem', fontWeight: '700', letterSpacing: '0.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '7px' };
const selectStyle = { width: '100%', padding: '13px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.07)', color: 'white', border: '1px solid var(--border)', fontSize: '0.93rem', cursor: 'pointer' };
const textareaStyle = { width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.88rem', boxSizing: 'border-box' };
const btnStyle = { padding: '15px', borderRadius: '12px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' };
const warnStyle = { fontSize: '0.73rem', color: '#ffea00', marginTop: '5px' };

// ─── Agenda Principal ─────────────────────────────────────────────────────────
const AgendaCalendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [appointments, setAppointments] = useState({});
    const [loading, setLoading] = useState(true);
    const [activePatient, setActivePatient] = useState(null);

    useEffect(() => { fetchAgendaData(); }, [currentDate]);

    const fetchAgendaData = async () => {
        setLoading(true);
        try {
            const [resPatients, resSessions] = await Promise.all([
                axios.get(`${API_URL}/patients`),
                axios.get(`${API_URL}/sessions`)
            ]);
            const dateStr = format(currentDate, 'yyyy-MM-dd');
            const daySessions = (resSessions.data || []).filter(s => s.fecha === dateStr && s.estado === 'programado');
            const newApt = {};
            daySessions.forEach(session => {
                const horaFull = session.hora || '08:00';
                const hora = horaFull.substring(0, 5); // Ensure HH:mm format
                const patient = (resPatients.data || []).find(p => String(p.id) === String(session.paciente_id));
                const count = Object.keys(newApt).filter(k => k.startsWith(`${hora}-`)).length;
                if (patient && count < 10) { // Allow more than 2 if needed, but slots only show 2
                    newApt[`${hora}-${count}`] = { ...patient, sessionId: session.id, hora };
                }
            });
            setAppointments(newApt);
        } catch (err) {
            console.error("Error cargando agenda:", err);
        } finally {
            setLoading(false);
        }
    };

    const generateSlots = () => {
        const slots = [];
        let cur = setMinutes(setHours(startOfDay(currentDate), 8), 0);
        const end = setHours(startOfDay(currentDate), 18);
        while (cur < end) {
            const hora = format(cur, 'HH:mm');
            slots.push({ id: hora, time: `${hora} - ${format(addMinutes(cur, 45), 'HH:mm')}` });
            cur = addMinutes(cur, 45);
        }
        return slots;
    };

    const getSlotPatients = (hora) => [0, 1].map(i => appointments[`${hora}-${i}`]).filter(Boolean);
    const totalHoy = [...new Set(Object.values(appointments).map(p => p.id))].length;

    if (loading) return (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Cargando agenda...</div>
    );

    return (
        <div className="agenda-container">
            {/* Header fecha */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h2 style={{ fontSize: '1.4rem', textTransform: 'capitalize' }}>
                        {format(currentDate, 'EEEE d de MMMM', { locale: es })}
                    </h2>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <button className="glass-panel" style={{ padding: '7px', cursor: 'pointer', borderRadius: '7px' }}
                            onClick={() => setCurrentDate(addMinutes(currentDate, -1440))}><ChevronLeft size={17} /></button>
                        <button className="glass-panel" style={{ padding: '7px 13px', cursor: 'pointer', borderRadius: '7px', fontSize: '0.83rem' }}
                            onClick={() => setCurrentDate(new Date())}>Hoy</button>
                        <button className="glass-panel" style={{ padding: '7px', cursor: 'pointer', borderRadius: '7px' }}
                            onClick={() => setCurrentDate(addMinutes(currentDate, 1440))}><ChevronRight size={17} /></button>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '10px', fontSize: '0.88rem' }}>
                    <Users size={16} color="var(--primary)" />
                    <strong style={{ color: 'var(--primary)' }}>{totalHoy}</strong> paciente{totalHoy !== 1 ? 's' : ''} hoy
                </div>
            </div>

            {/* Slots */}
            <div style={{ display: 'grid', gap: '10px' }}>
                {generateSlots().map(slot => {
                    const patients = getSlotPatients(slot.id);
                    const ocupado = patients.length > 0;
                    return (
                        <div key={slot.id} className="premium-card glass-panel" style={{
                            display: 'flex', alignItems: 'center', gap: '18px', padding: '13px 22px',
                            borderLeft: ocupado ? '5px solid var(--primary)' : '1px solid var(--border)'
                        }}>
                            {/* Hora */}
                            <span style={{ minWidth: '65px', fontWeight: '700', fontSize: '1.1rem', color: ocupado ? 'white' : 'var(--text-muted)' }}>
                                {slot.id}
                            </span>

                            {/* Pacientes — clic abre panel */}
                            <div style={{ flex: 1, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {!ocupado
                                    ? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.88rem' }}>Sin pacientes</span>
                                    : patients.map((p, i) => (
                                        <button key={i} onClick={() => setActivePatient(p)}
                                            className="vibrant-gradient"
                                            style={{ padding: '7px 16px', borderRadius: '20px', fontWeight: '600', fontSize: '0.85rem', border: 'none', cursor: 'pointer', color: 'white' }}>
                                            👤 {p.nombre} {p.apellido}
                                        </button>
                                    ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Panel de paciente activo */}
            {activePatient && (
                <PatientPanel
                    patient={activePatient}
                    onClose={() => setActivePatient(null)}
                    onSaved={() => { fetchAgendaData(); setActivePatient(null); }}
                />
            )}
        </div>
    );
};

export default AgendaCalendar;
