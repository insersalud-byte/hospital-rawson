import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { format, addMinutes, startOfDay, setHours, setMinutes, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, Users, Timer, Trash2, FileText, Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PatientForm, SummaryHCModal } from '../patients/PatientForm';

const API_URL = import.meta.env.MODE === 'development' ? 'http://localhost:3005/api' : '/api';

// ─── Historial + Panel de Atención ────────────────────────────────────────────
const PatientPanel = ({ patient: initialPatient, onClose, onSaved }) => {
    const { user } = useAuth();
    const [patient, setPatient] = useState(initialPatient);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [mode, setMode] = useState('history'); // 'history' | 'atender'
    const [treatments, setTreatments] = useState([]);
    const [selectedTreatments, setSelectedTreatments] = useState(new Set());
    const [observaciones, setObservaciones] = useState('');
    const [notasExtra, setNotasExtra] = useState('');
    const [saving, setSaving] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showSummaryModal, setShowSummaryModal] = useState(false);

    // Timer de 45 min
    const [timerActive, setTimerActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(45 * 60); // segundos
    const timerRef = useRef(null);
    const dialogRef = useRef(null);

    useEffect(() => { dialogRef.current?.showModal(); }, []);

    useEffect(() => {
        axios.get(`${API_URL}/sessions/patient/${patient.id}`)
            .then(res => setHistory(Array.isArray(res.data) ? res.data : []))
            .catch(() => setHistory([]))
            .finally(() => setLoadingHistory(false));
        axios.get(`${API_URL}/treatments`)
            .then(res => setTreatments(Array.isArray(res.data) ? res.data : []))
            .catch(() => setTreatments([]));
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
                await axios.post(`${API_URL}/sessions`, {
                    _action: 'update',
                    id: sessionId,
                    estado,
                    tratamiento_id: selectedTreatments.size > 0 ? [...selectedTreatments][0] : null,
                    observaciones: obsCompleta,
                    kinesiologo_nombre_snapshot: user?.nombre || 'Kinesiólogo',
                    tratamientos_texto: selectedTreatments.size > 0
                        ? [...selectedTreatments].map(id => treatments.find(t => String(t.id) === String(id))?.nombre).filter(Boolean).join(', ')
                        : null,
                });
            } else {
                await axios.post(`${API_URL}/sessions`, {
                    paciente_id: patient.id,
                    fecha: new Date().toISOString().split('T')[0],
                    hora: patient.hora || '08:00',
                    estado,
                    tratamiento_id: selectedTreatments.size > 0 ? [...selectedTreatments][0] : null,
                    observaciones: obsCompleta,
                    kinesiologo_nombre_snapshot: user?.nombre || 'Kinesiólogo',
                    tratamientos_texto: selectedTreatments.size > 0
                        ? [...selectedTreatments].map(id => treatments.find(t => String(t.id) === String(id))?.nombre).filter(Boolean).join(', ')
                        : null,
                });
            }
            onSaved();
            onClose();
        } catch (err) {
            console.error('Error guardando:', err);
            const msg = err.response?.data?.error || err.message || 'Error desconocido';
            alert(`Error al guardar: ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTurno = async (sessionId) => {
        const idToDelete = sessionId || patient.sessionId;
        if (!idToDelete) return;
        if (!window.confirm(`¿Estás seguro que querés ELIMINAR este turno?`)) return;
        setSaving(true);
        try {
            await axios.delete(`${API_URL}/sessions/${idToDelete}`);
            onSaved();
            onClose?.();
        } catch (err) {
            console.error('Error eliminando turno:', err);
            const msg = err.response?.data?.error || err.message || 'Error desconocido';
            alert(`Error al eliminar turno: ${msg}`);
            setSaving(false);
        }
    };

    const estadoColor = (estado) => {
        if (estado === 'asistió') return '#00e676';
        if (estado === 'no asistió') return '#ff5252';
        return 'var(--text-muted)';
    };

    return (
        <dialog ref={dialogRef} onCancel={e => { e.preventDefault(); if (!saving) onClose(); }}
            style={{ margin: 'auto', padding: 0, border: 'none', background: 'transparent',
                     width: '720px', maxWidth: 'calc(100vw - 20px)', maxHeight: '90vh',
                     overflowY: 'auto', borderRadius: '20px' }}>
            <div style={{
                background: '#1a3a5c',
                border: '2px solid #4488cc',
                borderTop: '4px solid #0088cc',
                borderRadius: '20px',
                color: 'white'
            }}>
                {/* Header */}
                <div style={{ padding: '22px 28px', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ fontSize: '1.3rem', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                👤 {patient.nombre} {patient.apellido}
                                <button 
                                    onClick={() => setShowEditForm(true)}
                                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', color: 'white', padding: '5px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    title="Editar Datos del Paciente"
                                >
                                    <Pencil size={14} />
                                </button>
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                HC: {patient.historia_clinica || '—'} · DNI: {patient.dni || 'Sin DNI'}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {patient.sessionId && (
                                <button onClick={() => handleDeleteTurno(patient.sessionId)} disabled={saving} style={{
                                    background: 'rgba(255,82,82,0.1)', border: '1px solid #ff5252', color: '#ff5252',
                                    padding: '8px 14px', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer',
                                    fontWeight: '600', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px'
                                }} title="Eliminar este turno">
                                    🗑️ Eliminar Turno
                                </button>
                            )}
                            <button onClick={onClose} style={{
                                background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border)',
                                color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer'
                            }}>✕ Cerrar</button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button onClick={() => setMode('history')} style={{
                            padding: '8px 16px', borderRadius: '20px', fontWeight: '600', fontSize: '0.85rem',
                            border: 'none', cursor: 'pointer',
                            background: mode === 'history' ? 'var(--primary)' : 'rgba(255,255,255,0.07)',
                            color: 'white'
                        }}>📋 Historial</button>
                        <button onClick={() => setMode('atender')} style={{
                            padding: '8px 16px', borderRadius: '20px', fontWeight: '600', fontSize: '0.85rem',
                            border: 'none', cursor: 'pointer',
                            background: mode === 'atender' ? '#00e676' : 'rgba(255,255,255,0.07)',
                            color: mode === 'atender' ? '#000' : 'white'
                        }}>🩺 Atender</button>
                        <button onClick={() => setMode('resumen_hc')} style={{
                            padding: '8px 16px', borderRadius: '20px', fontWeight: '600', fontSize: '0.85rem',
                            border: 'none', cursor: 'pointer',
                            background: mode === 'resumen_hc' ? '#ff9800' : 'rgba(255,255,255,0.07)',
                            color: 'white', display: 'flex', alignItems: 'center', gap: '6px'
                        }}>📄 Resumen H.C.</button>
                        <button
                            onClick={() => { setMode('resumen_hc'); setShowSummaryModal(true); }}
                            title="Editar Resumen H.C."
                            style={{
                                padding: '8px 16px', borderRadius: '20px', fontWeight: '700', fontSize: '0.85rem',
                                border: '2px solid #ff9800', cursor: 'pointer',
                                background: 'rgba(255,152,0,0.22)',
                                color: '#ff9800', display: 'flex', alignItems: 'center', gap: '7px',
                                boxShadow: '0 0 8px rgba(255,152,0,0.3)'
                            }}
                        ><Pencil size={15} /> ✏ Editar H.C.</button>
                    </div>
                </div>

                {/* Contenido */}
                <div style={{ padding: '20px 28px' }}>

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

                    {/* ── RESUMEN H.C. (LECTURA) ── */}
                    {mode === 'resumen_hc' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Resumen Inicial */}
                            <div style={{ padding: '20px', background: 'rgba(255,152,0,0.1)', borderRadius: '15px', border: '1px solid #ff9800' }}>
                                <h4 style={{ color: '#ff9800', marginBottom: '10px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FileText size={18} /> RESUMEN INICIAL / DATOS CARGADOS
                                    </div>
                                    <button 
                                        onClick={() => setShowSummaryModal(true)}
                                        style={{ background: 'rgba(255,152,0,0.2)', border: '1px solid #ff9800', color: 'white', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '700' }}
                                    >
                                        <Pencil size={12} /> EDITAR RESUMEN
                                    </button>
                                </h4>
                                <div style={{ fontSize: '1.05rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', color: '#eee' }}>
                                    {patient.resumen_hc || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Sin resumen inicial cargado en administración de pacientes.</span>}
                                </div>
                            </div>

                            {/* Evoluciones históricas */}
                            <div>
                                <h4 style={{ color: 'var(--primary)', marginBottom: '15px', fontSize: '0.95rem', paddingLeft: '5px' }}>
                                    📈 EVOLUCIONES POR SESIÓN (ORDEN CRONOLÓGICO)
                                </h4>
                                {loadingHistory && <p style={{ color: 'var(--text-muted)' }}>Cargando evoluciones...</p>}
                                {!loadingHistory && history.filter(s => s.estado === 'asistió' && s.observaciones).length === 0 && (
                                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '5px' }}>Aún no hay evoluciones registradas en las sesiones.</p>
                                )}
                                {!loadingHistory && history
                                    .filter(s => s.estado === 'asistió' && s.observaciones)
                                    .sort((a,b) => new Date(a.fecha + 'T' + a.hora) - new Date(b.fecha + 'T' + b.hora))
                                    .map((s, i) => (
                                        <div key={i} style={{
                                            padding: '15px', marginBottom: '12px',
                                            background: 'rgba(255,255,255,0.03)',
                                            borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)',
                                            borderLeft: '4px solid var(--primary)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem' }}>
                                                <span style={{ fontWeight: '800', color: 'var(--primary)' }}>
                                                    📅 {format(new Date(s.fecha + 'T00:00:00'), "d 'de' MMMM, yyyy", { locale: es })}
                                                </span>
                                                <span style={{ color: 'var(--text-muted)' }}>
                                                    🩺 {s.kinesiologo_nombre_snapshot || '—'}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.92rem', lineHeight: '1.5', color: '#ddd', whiteSpace: 'pre-wrap' }}>
                                                {s.observaciones}
                                            </div>
                                            {s.tratamiento_nombre && (
                                                <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600', opacity: 0.8 }}>
                                                    Tratamiento: {s.tratamiento_nombre}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
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

                            {/* Tratamientos (Multi-select) */}
                            <div>
                                <label style={labelStyle}>💊 TRATAMIENTOS APLICADOS (seleccioná uno o varios)</label>
                                {treatments.length === 0 && <p style={warnStyle}>⚠️ Sin tratamientos. Pedile al Admin que los cargue.</p>}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                                    {treatments.map(t => {
                                        const isSelected = selectedTreatments.has(String(t.id));
                                        return (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedTreatments(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(String(t.id))) next.delete(String(t.id));
                                                        else next.add(String(t.id));
                                                        return next;
                                                    });
                                                }}
                                                style={{
                                                    padding: '8px 16px',
                                                    borderRadius: '20px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    border: isSelected ? '2px solid #00e676' : '1px solid var(--border)',
                                                    background: isSelected ? 'rgba(0,230,118,0.15)' : 'rgba(255,255,255,0.05)',
                                                    color: isSelected ? '#00e676' : 'var(--text-muted)',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                {isSelected ? '✅' : '○'} {t.nombre}
                                            </button>
                                        );
                                    })}
                                </div>
                                {selectedTreatments.size > 0 && (
                                    <p style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: '8px', fontWeight: '600' }}>
                                        {selectedTreatments.size} tratamiento{selectedTreatments.size !== 1 ? 's' : ''} seleccionado{selectedTreatments.size !== 1 ? 's' : ''}
                                    </p>
                                )}
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

                {showEditForm && (
                    <PatientForm 
                        patientToEdit={patient}
                        onClose={() => setShowEditForm(false)}
                        onSave={() => {
                            setShowEditForm(false);
                            onSaved(); // Refrescar agenda
                        }}
                    />
                )}

                {showSummaryModal && (
                    <SummaryHCModal 
                        patient={patient}
                        mode="edit"
                        onClose={() => setShowSummaryModal(false)}
                        onSave={() => {
                            setShowSummaryModal(false);
                            // Actualizar localmente el resumen sin cerrar el panel del paciente
                            axios.get(`${API_URL}/patients`)
                                .then(res => {
                                    const p = (Array.isArray(res.data) ? res.data : []).find(p => p.id === patient.id);
                                    if (p) setPatient(p);
                                })
                                .catch(() => { });
                            // NO llamamos onSaved() para que el panel no se cierre
                        }}
                    />
                )}
            </div>
        </dialog>
    );
};

// Estilos compartidos
const labelStyle = { fontSize: '0.73rem', fontWeight: '700', letterSpacing: '0.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '7px' };
const selectStyle = { width: '100%', padding: '13px 14px', borderRadius: '10px', background: '#111318', color: 'white', border: '1px solid var(--border)', fontSize: '0.93rem', cursor: 'pointer' };
const textareaStyle = { width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.88rem', boxSizing: 'border-box' };
const btnStyle = { padding: '15px', borderRadius: '12px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' };
const warnStyle = { fontSize: '0.73rem', color: '#ffea00', marginTop: '5px' };

// ─── Modal Próximos Turnos (Almanaque) ───────────────────────────────────────────────────
const UpcomingAppointmentsModal = ({ onClose }) => {
    const [upcoming, setUpcoming] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
    const [selectedDay, setSelectedDay] = useState(null);
    const [patientToEdit, setPatientToEdit] = useState(null);
    const [summaryPatient, setSummaryPatient] = useState(null);

    const [sessionCounts, setSessionCounts] = useState({});

    const fetchSessions = () => {
        setLoading(true);
        axios.get(`${API_URL}/sessions`)
            .then(res => {
                const all = Array.isArray(res.data) ? res.data : [];
                const now = new Date();
                const today = startOfDay(now);
                const list = all
                    .filter(s => s.estado === 'programado' && new Date(s.fecha + 'T00:00:00') >= today)
                    .sort((a,b) => new Date(a.fecha + 'T' + a.hora) - new Date(b.fecha + 'T' + b.hora));
                setUpcoming(list);
                // Contar sesiones (asistió + no asistió) por paciente
                const counts = {};
                all.forEach(s => {
                    if (s.paciente_id) {
                        const pid = String(s.paciente_id);
                        if (!counts[pid]) counts[pid] = { assisted: 0, missed: 0 };
                        if (s.estado === 'asistió') counts[pid].assisted++;
                        else if (s.estado === 'no asistió') counts[pid].missed++;
                    }
                });
                setSessionCounts(counts);
            })
            .catch(() => setUpcoming([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    const handleDeleteTurno = async (sessionId) => {
        if (!window.confirm(`¿Estás seguro que querés ELIMINAR este turno? Esta acción no se puede deshacer.`)) return;
        setSaving(true);
        try {
            await axios.delete(`${API_URL}/sessions/${sessionId}`);
            fetchSessions();
        } catch (err) {
            console.error('Error eliminando turno:', err);
            const msg = err.response?.data?.error || err.message || 'Error desconocido';
            alert(`Error al eliminar turno: ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    // Funciones del calendario
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Comienza en lunes
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const dateFormat = "d";
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const getAppointmentsForDay = (day) => {
        return upcoming.filter(s => isSameDay(parseISO(s.fecha), day));
    };

    const renderTurns = () => {
        if (!selectedDay) return (
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📅</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Seleccioná un día en el almanaque para ver los turnos.</p>
            </div>
        );
        
        const dayAppointments = getAppointmentsForDay(selectedDay);
        if (dayAppointments.length === 0) return (
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🈳</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay turnos agendados para este día.</p>
            </div>
        );

        const morning = dayAppointments.filter(s => parseInt(s.hora.split(':')[0], 10) < 13);
        const afternoon = dayAppointments.filter(s => parseInt(s.hora.split(':')[0], 10) >= 13);

        const renderTurnItem = (s, idx) => (
            <div key={idx} style={{
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '10px',
                marginBottom: '8px',
                borderLeft: '3px solid var(--primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'background 0.15s',
            }}>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    👤 {s.nombre} {s.apellido}
                    <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: '800', 
                        background: (sessionCounts[String(s.paciente_id)]?.missed >= 2) ? 'rgba(255,82,82,0.25)' : 'rgba(0,136,204,0.25)', 
                        color: (sessionCounts[String(s.paciente_id)]?.missed >= 2) ? '#ff5252' : 'var(--primary)', 
                        minWidth: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%', 
                        border: (sessionCounts[String(s.paciente_id)]?.missed >= 2) ? '1px solid rgba(255,82,82,0.4)' : '1px solid rgba(0,136,204,0.4)' 
                    }}>
                        {(sessionCounts[String(s.paciente_id)]?.assisted || 0) + (sessionCounts[String(s.paciente_id)]?.missed || 0)}
                    </span>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => setSummaryPatient(s)} style={{
                        background: 'rgba(255,165,0,0.15)', border: 'none', color: '#ffa500',
                        padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }} title="Resumen H.C.">
                        <FileText size={14} />
                    </button>
                    <button onClick={() => setPatientToEdit(s)} style={{
                        background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white',
                        padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }} title="Editar Paciente">
                        <Pencil size={14} />
                    </button>
                    <span style={{
                        color: 'var(--primary)', fontWeight: '700', fontSize: '0.85rem',
                        background: 'rgba(0,136,204,0.15)', padding: '3px 10px', borderRadius: '20px'
                    }}>🕐 {s.hora}</span>
                    <button onClick={() => handleDeleteTurno(s.id)} style={{
                        background: 'rgba(255,82,82,0.1)', border: 'none', color: '#ff5252',
                        padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }} title="Borrar Turno">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        );

        return (
            <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, paddingRight: '5px' }}>
                {/* Mañana */}
                <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                    <h4 style={{ color: '#ffb74d', fontSize: '0.95rem', margin: 0 }}>☀️ Mañana</h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(255,183,77,0.1)', border: '1px solid rgba(255,183,77,0.3)', padding: '2px 8px', borderRadius: '10px' }}>{morning.length} pacientes</span>
                </div>
                {morning.length === 0
                    ? <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px', fontStyle: 'italic' }}>Sin turnos</p>
                    : morning.map(renderTurnItem)
                }

                {/* Tarde */}
                <div style={{ marginTop: '18px', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                    <h4 style={{ color: '#90caf9', fontSize: '0.95rem', margin: 0 }}>🌙 Tarde</h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(144,202,249,0.1)', border: '1px solid rgba(144,202,249,0.3)', padding: '2px 8px', borderRadius: '10px' }}>{afternoon.length} pacientes</span>
                </div>
                {afternoon.length === 0
                    ? <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin turnos</p>
                    : afternoon.map(renderTurnItem)
                }
            </div>
        );
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px', boxSizing: 'border-box' }} onClick={onClose}>
            <div style={{ width: '100%', maxWidth: '850px', height: '80vh', display: 'flex', flexDirection: 'column', background: '#1a3050', border: '2px solid #4488cc', borderRadius: '20px', color: 'white' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <h3 style={{ fontSize: '1.2rem' }}>📅 Almanaque de Turnos</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
                </div>
                
                <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    {/* Izquierda: Almanaque */}
                    <div style={{ flex: '1 1 350px', padding: '20px', borderRight: '1px solid rgba(255,255,255,0.15)', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <button onClick={prevMonth} className="glass-panel" style={{ padding: '6px 12px', borderRadius: '10px', cursor: 'pointer', border: 'none', color: 'white', background: 'rgba(255,255,255,0.1)' }}>◀</button>
                            <div style={{ fontWeight: '700', fontSize: '1.1rem', textTransform: 'capitalize' }}>
                                {format(currentMonth, 'MMMM yyyy', { locale: es })}
                            </div>
                            <button onClick={nextMonth} className="glass-panel" style={{ padding: '6px 12px', borderRadius: '10px', cursor: 'pointer', border: 'none', color: 'white', background: 'rgba(255,255,255,0.1)' }}>▶</button>
                        </div>
                        
                        {/* Cabecera Días */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '10px', fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map(d => <div key={d}>{d}</div>)}
                        </div>
                        
                        {/* Grilla Días */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                            {days.map((day) => {
                                const isCurrentMonth = isSameMonth(day, monthStart);
                                const isSelected = selectedDay && isSameDay(day, selectedDay);
                                const dayAppts = getAppointmentsForDay(day);
                                const dayApptCount = dayAppts.length;
                                const isToday = isSameDay(day, new Date());
                                return (
                                    <div 
                                        key={day.toString()} 
                                        onClick={() => setSelectedDay(isSelected ? null : day)}
                                        style={{ 
                                            padding: '10px 4px 8px', 
                                            textAlign: 'center', 
                                            cursor: 'pointer',
                                            borderRadius: '10px',
                                            border: isSelected ? '2px solid #00e676' : isToday ? '1px solid var(--primary)' : '1px solid var(--border)',
                                            background: isSelected ? 'rgba(0,230,118,0.15)' : dayApptCount > 0 ? 'rgba(0,136,204,0.1)' : 'rgba(255,255,255,0.02)',
                                            color: !isCurrentMonth ? 'rgba(255,255,255,0.25)' : 'white',
                                            position: 'relative',
                                            transition: 'all 0.18s',
                                            boxShadow: isSelected ? '0 0 0 2px rgba(0,230,118,0.3)' : 'none',
                                        }}
                                    >
                                        <span style={{ fontSize: '0.88rem', fontWeight: isSelected ? '800' : isToday ? '800' : '500', color: isToday && !isSelected ? 'var(--primary)' : undefined }}>{format(day, dateFormat)}</span>
                                        {isToday && <div style={{ width: '5px', height: '5px', background: 'var(--primary)', borderRadius: '50%', margin: '3px auto 0' }} />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    {/* Derecha: Turnos del día */}
                    <div style={{ flex: '1 1 350px', padding: '20px', background: 'rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', textTransform: 'capitalize', color: selectedDay ? 'white' : 'var(--text-muted)' }}>
                                {selectedDay ? format(selectedDay, "EEEE d 'de' MMMM", { locale: es }) : 'Detalle del Día'}
                            </h3>
                            {selectedDay && (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    {getAppointmentsForDay(selectedDay).length} turno{getAppointmentsForDay(selectedDay).length !== 1 ? 's' : ''} programado{getAppointmentsForDay(selectedDay).length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        {loading ? <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Cargando turnos...</p> : renderTurns()}
                    </div>
                </div>

                <div style={{ padding: '15px', borderTop: '1px solid rgba(255,255,255,0.15)', textAlign: 'center', flexShrink: 0 }}>
                    <button onClick={onClose} className="vibrant-gradient" style={{ padding: '12px 35px', borderRadius: '12px', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer', letterSpacing: '1px' }}>CERRAR</button>
                </div>

                {patientToEdit && (
                    <PatientForm 
                        patientToEdit={patientToEdit}
                        onClose={() => setPatientToEdit(null)}
                        onSave={() => {
                            setPatientToEdit(null);
                            fetchSessions();
                        }}
                    />
                )}

                {summaryPatient && (
                    <SummaryHCModal 
                        patient={summaryPatient}
                        mode="edit"
                        onClose={() => setSummaryPatient(null)}
                        onSave={() => {
                            setSummaryPatient(null);
                            fetchSessions();
                        }}
                    />
                )}
            </div>
        </div>
    );
};

// ─── Agenda Principal ─────────────────────────────────────────────────────────
const AgendaCalendar = () => {
    const { isAdmin } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [appointments, setAppointments] = useState({});
    const [loading, setLoading] = useState(true);
    const [activePatient, setActivePatient] = useState(null);
    const [showUpcoming, setShowUpcoming] = useState(false);

    useEffect(() => { fetchAgendaData(); }, [currentDate]);

    const fetchAgendaData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [resPatients, resSessions] = await Promise.all([
                axios.get(`${API_URL}/patients`),
                axios.get(`${API_URL}/sessions`)
            ]);
            const dateStr = format(currentDate, 'yyyy-MM-dd');
            const validSlots = new Set(['08:00','08:45','09:30','10:15','11:00','11:45','12:30','13:15','14:00','14:45','15:30','16:15','17:00','17:45']);

            const allSessions = Array.isArray(resSessions.data) ? resSessions.data : [];

            // Contar asistencias y faltas por paciente
            const sessionData = {};
            allSessions.forEach(s => {
                if (s.paciente_id) {
                    const pid = String(s.paciente_id);
                    if (!sessionData[pid]) sessionData[pid] = { assisted: 0, missed: 0 };
                    if (s.estado === 'asistió') sessionData[pid].assisted++;
                    else if (s.estado === 'no asistió') sessionData[pid].missed++;
                }
            });

            // Incluir todos los estados (programado, asistió, no asistió) para que no desaparezcan al atenderlos
            const daySessions = allSessions.filter(s =>
                s.fecha === dateStr && s.paciente_id && (s.estado === 'programado' || s.estado === 'asistió' || s.estado === 'no asistió')
            );

            const newApt = {};
            daySessions.forEach(session => {
                const horaFull = session.hora || '08:00';
                const hora = horaFull.substring(0, 5);
                if (!validSlots.has(hora)) return;
                const patient = (Array.isArray(resPatients.data) ? resPatients.data : []).find(p => String(p.id) === String(session.paciente_id));
                if (!patient) return;

                // Buscar el siguiente slot libre (sin restricción de cupo)
                let count = 0;
                while (newApt[`${hora}-${count}`]) { count++; }

                newApt[`${hora}-${count}`] = { 
                    ...patient, 
                    sessionId: session.id, 
                    hora, 
                    estado: session.estado, 
                    sessionCount: sessionData[String(patient.id)]?.assisted || 0,
                    missedCount: sessionData[String(patient.id)]?.missed || 0 
                };
            });
            setAppointments(newApt);
        } catch (err) {
            console.error("Error cargando agenda:", err);
        } finally {
            if (!silent) setLoading(false);
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

    const getSlotPatients = (hora) => {
        const list = [];
        let i = 0;
        while (appointments[`${hora}-${i}`]) {
            list.push(appointments[`${hora}-${i}`]);
            i++;
        }
        return list;
    };
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
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button onClick={() => setShowUpcoming(true)} className="glass-panel" style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '10px', fontSize: '0.85rem', cursor: 'pointer', border: '1px solid var(--primary)', color: 'var(--primary)', fontWeight: '700' }}>
                        📅 VER PRÓXIMOS TURNOS
                    </button>
                    <div className="glass-panel" style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '10px', fontSize: '0.88rem' }}>
                        <Users size={16} color="var(--primary)" />
                        <strong style={{ color: 'var(--primary)' }}>{totalHoy}</strong> paciente{totalHoy !== 1 ? 's' : ''} hoy
                    </div>
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
                                    : patients.map((p, i) => {
                                        const isAttended = p.estado === 'asistió';
                                        const isMissed = p.estado === 'no asistió';
                                        
                                        return (
                                            <button key={i} onClick={e => { e.stopPropagation(); setActivePatient(p); }}
                                                className={isAttended || isMissed ? "" : "vibrant-gradient"}
                                                style={{
                                                    padding: '7px 16px', borderRadius: '20px', fontWeight: '600',
                                                    fontSize: '0.85rem', border: isAttended ? '2px solid #00e676' : isMissed ? '2px solid #ff5252' : 'none',
                                                    cursor: 'pointer', color: 'white', outline: 'none',
                                                    background: isAttended ? 'rgba(0,230,118,0.15)' : isMissed ? 'rgba(255,82,82,0.15)' : undefined,
                                                    opacity: isAttended || isMissed ? 0.8 : 1,
                                                    display: 'flex', alignItems: 'center', gap: '5px'
                                                }}>
                                                {isAttended ? '✅ ' : isMissed ? '❌ ' : '👤 '}
                                                {p.nombre} {p.apellido}
                                                <span style={{ 
                                                    marginLeft: '6px', 
                                                    fontSize: '0.78rem', 
                                                    fontWeight: '800', 
                                                    background: (p.missedCount >= 2) ? 'rgba(255,82,82,0.4)' : 'rgba(255,255,255,0.25)', 
                                                    color: (p.missedCount >= 2) ? '#ff5252' : 'white',
                                                    minWidth: '22px',
                                                    height: '22px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '50%',
                                                    border: (p.missedCount >= 2) ? '1px solid #ff5252' : 'none'
                                                }}>
                                                    {(p.sessionCount || 0) + (p.missedCount || 0)}
                                                </span>
                                            </button>
                                        );
                                    })}
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
                    onSaved={() => { fetchAgendaData(true); setActivePatient(null); }}
                />
            )}

            {showUpcoming && (
                <UpcomingAppointmentsModal onClose={() => setShowUpcoming(false)} />
            )}
        </div>
    );
};

export default AgendaCalendar;
