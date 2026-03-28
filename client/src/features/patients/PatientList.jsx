import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Plus, Search, Phone, Hospital, MessageCircle, Calendar, ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react';
import ClinicalSemaphore from '../../components/ui/ClinicalSemaphore';
import CustomSelect from '../../components/ui/CustomSelect';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

const API_URL = import.meta.env.MODE === 'development' ? 'http://localhost:3005/api' : '/api';

const horariosSlotsList = [
    '08:00', '08:45', '09:30', '10:15', '11:00', '11:45',
    '14:00', '14:45', '15:30', '16:15', '17:00', '17:45'
];

// ─── Historial del Paciente (Componente Expansible) ───────────────────────────
const PatientHistory = ({ patient }) => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`${API_URL}/sessions/patient/${patient.id}`)
            .then(res => setSessions(Array.isArray(res.data) ? res.data : []))
            .catch(() => setSessions([]))
            .finally(() => setLoading(false));
    }, [patient.id]);

    if (loading) return <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>⏳ Cargando historial...</p>;

    const asistidas = sessions.filter(s => s.estado === 'asistió');
    const hoy = startOfDay(new Date());
    const faltantes = sessions.filter(s => s.estado === 'programado' && (new Date(s.fecha + 'T00:00:00') >= hoy));
    const faltadas = sessions.filter(s => s.estado === 'no asistió');

    // Obtener todos los nombres de tratamientos únicos
    const tratamientos = [...new Set(asistidas.flatMap(s =>
        (s.tratamientos_texto || s.tratamiento_nombre || '').split(',').map(t => t.trim()).filter(Boolean)
    ))];

    return (
        <div style={{ marginTop: '15px', padding: '15px', background: '#243b5e', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.2)', fontSize: '0.85rem', color: 'white' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '10px' }}>📊 RESUMEN DE TRATAMIENTO</h4>

            {/* Patología siempre visible */}
            {patient.patologia && (
                <div style={{ marginBottom: '12px', padding: '8px 12px', background: 'rgba(0,136,204,0.1)', borderRadius: '8px', border: '1px solid var(--primary)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '2px' }}>DIAGNÓSTICO / PATOLOGÍA</p>
                    <p style={{ fontWeight: '700', fontSize: '0.88rem', color: 'white' }}>🔬 {patient.patologia}</p>
                </div>
            )}

            {/* Sin sesiones */}
            {sessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '14px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p style={{ fontSize: '1.5rem', marginBottom: '6px' }}>🕐</p>
                    <p style={{ fontWeight: '700', color: 'white', fontSize: '0.88rem', marginBottom: '4px' }}>Sin sesiones registradas</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>El paciente aún no fue atendido ni tiene turnos asignados.</p>
                </div>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.06)', padding: '8px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '4px' }}>DADAS</p>
                            <p style={{ fontSize: '1.2rem', fontWeight: '800', color: '#00e676' }}>{asistidas.length}</p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.06)', padding: '8px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '4px' }}>FALTÓ</p>
                            <p style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ff5252' }}>{faltadas.length}</p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.06)', padding: '8px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '4px' }}>PRÓXIMAS</p>
                            <p style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary)' }}>{faltantes.length}</p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.06)', padding: '8px', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '4px' }}>HISTORIAL</p>
                            <p style={{ fontSize: '1.2rem', fontWeight: '800', color: 'white' }}>{sessions.length}</p>
                        </div>
                    </div>

                    {tratamientos.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '6px' }}>TRATAMIENTOS RECIBIDOS:</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                {tratamientos.map((t, idx) => (
                                    <span key={idx} style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(0,136,204,0.15)', border: '1px solid var(--primary)', fontSize: '0.73rem', color: 'white' }}>{t}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {asistidas.length > 0 && (
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '6px' }}>📝 ÚLTIMAS EVOLUCIONES:</p>
                            {asistidas.slice(0, 3).map((s, idx) => s.observaciones && (
                                <div key={idx} style={{ padding: '8px', fontSize: '0.78rem', borderLeft: '3px solid var(--primary)', background: 'rgba(255,255,255,0.04)', marginBottom: '6px', borderRadius: '0 6px 6px 0' }}>
                                    <strong>{s.fecha ? format(new Date(s.fecha + 'T00:00:00'), 'd/MM') : '—'}:</strong> {s.observaciones.substring(0, 100)}{s.observaciones.length > 100 ? '...' : ''}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// ─── Mini Calendario Multi-Selección ─────────────────────────────────────────
// selectedDates: Array de Date
const MultiDateCalendar = ({ selectedDates, onToggleDate }) => {
    const [viewMonth, setViewMonth] = useState(new Date());
    const today = startOfDay(new Date());

    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(viewMonth),
        end: endOfMonth(viewMonth)
    });

    const firstDayOfWeek = (getDay(startOfMonth(viewMonth)) + 6) % 7; // Lun=0
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    return (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '16px', border: '1px solid var(--border)' }}>
            {/* Header mes */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <button type="button" onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', padding: '4px' }}>
                    <ChevronLeft size={18} />
                </button>
                <span style={{ fontWeight: '600', fontSize: '0.95rem', textTransform: 'capitalize' }}>
                    {format(viewMonth, 'MMMM yyyy', { locale: es })}
                </span>
                <button type="button" onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', padding: '4px' }}>
                    <ChevronRight size={18} />
                </button>
            </div>

            {/* Nombres días */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '6px' }}>
                {dayNames.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600', padding: '3px' }}>
                        {d}
                    </div>
                ))}
            </div>

            {/* Días */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
                {daysInMonth.map(day => {
                    const isSelected = selectedDates.some(d => isSameDay(d, day));
                    const isPast = isBefore(day, today);
                    const isToday = isSameDay(day, today);

                    return (
                        <button
                            type="button"
                            key={day.toISOString()}
                            onClick={() => !isPast && onToggleDate(day)}
                            disabled={isPast}
                            style={{
                                padding: '7px 3px', borderRadius: '8px', textAlign: 'center',
                                fontSize: '0.82rem', fontWeight: isSelected ? '700' : '400',
                                border: isToday ? '2px solid var(--primary)' : 'none',
                                cursor: isPast ? 'not-allowed' : 'pointer',
                                opacity: isPast ? 0.3 : 1,
                                background: isSelected
                                    ? 'linear-gradient(135deg, var(--primary), #0055aa)'
                                    : 'rgba(255,255,255,0.04)',
                                color: isSelected ? 'white' : isPast ? 'var(--text-muted)' : 'white',
                                transition: 'all 0.15s'
                            }}>
                            {format(day, 'd')}
                        </button>
                    );
                })}
            </div>

            {/* Resumen de días seleccionados */}
            {selectedDates.length > 0 && (
                <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[...selectedDates].sort((a, b) => a - b).map(d => (
                        <span key={d.toISOString()} style={{ padding: '4px 10px', background: 'rgba(0,136,204,0.15)', border: '1px solid var(--primary)', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600', textTransform: 'capitalize' }}>
                            📅 {format(d, "EEE d/MM", { locale: es })}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Lista de Pacientes ───────────────────────────────────────────────────────
const PatientList = () => {
    const { isAdmin } = useAuth();
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [patientToEdit, setPatientToEdit] = useState(null);

    useEffect(() => { fetchPatients(); }, []);

    const fetchPatients = async () => {
        try {
            const res = await axios.get(`${API_URL}/patients`);
            setPatients(Array.isArray(res.data) ? res.data : []);
        } catch (err) { console.error('Error cargando pacientes:', err); }
    };

    const filteredPatients = patients.filter(p =>
        `${p.nombre} ${p.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(p.historia_clinica || '').includes(searchTerm)
    );

    const deletePatient = async (id, nombre) => {
        if (!window.confirm(`¿Eliminar a ${nombre}? Se borrarán sus turnos pendientes.`)) return;
        try {
            await axios.post(`${API_URL}/patients`, { _action: 'delete', id });
            await fetchPatients();
        } catch (err) {
            console.error('Error al eliminar paciente:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Error desconocido al intentar eliminar';
            alert(`⚠️ FALLO AL ELIMINAR:\n\n${errorMsg}`);
        }
    };

    const openWhatsApp = (patient) => {
        if (!patient.whatsapp) { alert('Este paciente no tiene WhatsApp cargado.'); return; }
        const num = patient.whatsapp.replace(/\D/g, '');
        const msg = encodeURIComponent(`¡Hola ${patient.nombre}! 👋 Te recordamos desde Hospital Rawson Kinesiología. Ante cualquier duda no dudes en contactarnos. ¡Te esperamos! 🏥`);
        window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
    };

    const [expandedHistoryId, setExpandedHistoryId] = useState(null);

    return (
        <div className="patients-container">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <h2 style={{ fontSize: '1.4rem' }}>Registro de Pacientes</h2>
                        {expandedHistoryId && (
                            <button onClick={() => setExpandedHistoryId(null)} 
                                style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', fontSize: '0.75rem', cursor: 'pointer' }}>
                                Cerrar Historiales
                            </button>
                        )}
                    </div>
                    {isAdmin && (
                        <button onClick={() => { setPatientToEdit(null); setShowForm(true); }} className="vibrant-gradient"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', border: 'none', cursor: 'pointer', color: 'white' }}>
                            <Plus size={18} /> Nuevo Paciente
                        </button>
                    )}
                </div>

                <div className="search-bar premium-card" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--primary)', borderRadius: '14px' }}>
                    <Search size={22} color="var(--primary)" />
                    <input
                        type="text" placeholder="Buscar paciente por Nombre, Apellido o Historia Clínica..."
                        style={{ border: 'none', background: 'none', width: '100%', color: 'white', fontSize: '1.1rem', outline: 'none' }}
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '18px' }}>
                {filteredPatients.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', paddingTop: '30px' }}>
                        Sin pacientes registrados aún.
                    </p>
                )}
                {filteredPatients.map(patient => (
                    <div key={patient.id} className="premium-card glass-panel"
                        style={{ borderLeft: `4px solid ${patient.estado_paciente === 'activo' ? 'var(--success)' : 'var(--text-muted)'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div>
                                <h3 style={{ fontSize: '1.05rem', marginBottom: '3px' }}>{patient.nombre} {patient.apellido}</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>HC: {patient.historia_clinica}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <button onClick={() => setExpandedHistoryId(expandedHistoryId === patient.id ? null : patient.id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: expandedHistoryId === patient.id ? 'var(--primary)' : 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', color: 'white', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                                    title="Ver historial y estadísticas">
                                    📋 Historial
                                </button>
                                {isAdmin && (
                                    <>
                                        <button onClick={() => deletePatient(patient.id, `${patient.nombre} ${patient.apellido}`)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,82,82,0.1)', border: '1px solid #ff5252', color: '#ff5252', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                                            title="Eliminar paciente">
                                            <Trash2 size={14} />
                                        </button>
                                        <button onClick={() => { setPatientToEdit(patient); setShowForm(true); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', color: 'white', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                                            title="Modificar Paciente">
                                            <Edit size={14} /> Modificar
                                        </button>
                                        <button onClick={() => { setPatientToEdit(patient); setShowForm(true); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,136,204,0.15)', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                                            title="Agregar nuevas sesiones a este paciente">
                                            <Calendar size={14} /> Nuevas Sesiones
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.87rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <Phone size={13} color="var(--primary)" /> <span>{patient.telefono || 'Sin teléfono'}</span>
                            </div>
                            {patient.medico_derivante_nombre && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                    <Hospital size={13} color="var(--primary)" /> <span>Derivado: {patient.medico_derivante_nombre}</span>
                                </div>
                            )}
                        </div>

                        {expandedHistoryId === patient.id && <PatientHistory patient={patient} />}

                        {patient.whatsapp && (
                            <button onClick={() => openWhatsApp(patient)} style={{
                                marginTop: '12px', width: '100%', padding: '8px', borderRadius: '8px',
                                background: 'rgba(37,211,102,0.12)', border: '1px solid #25d366',
                                color: '#25d366', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                            }}>
                                <MessageCircle size={14} /> Enviar WhatsApp
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {showForm && <PatientForm onClose={() => { setShowForm(false); setPatientToEdit(null); }} onSave={fetchPatients} patientToEdit={patientToEdit} />}
        </div>
    );
};

// ─── Formulario Nuevo Paciente ────────────────────────────────────────────────
const PatientForm = ({ onClose, onSave, patientToEdit }) => {
    const [formData, setFormData] = useState({
        nombre: patientToEdit?.nombre || '', apellido: patientToEdit?.apellido || '',
        historia_clinica: patientToEdit?.historia_clinica || '', telefono: patientToEdit?.telefono || '',
        whatsapp: patientToEdit?.whatsapp || '', estado_paciente: patientToEdit?.estado_paciente || 'activo',
        medico_derivante_nombre: patientToEdit?.medico_derivante_nombre || '', medico_derivante_institucion: patientToEdit?.medico_derivante_institucion || '',
        observaciones: patientToEdit?.observaciones || '', patologia: patientToEdit?.patologia || '',
    });
    const [pathologies, setPathologies] = useState([]);
    const [selectedDates, setSelectedDates] = useState([]);
    const [horaTurno, setHoraTurno] = useState('08:00');
    const [saving, setSaving] = useState(false);
    const [savedOk, setSavedOk] = useState(false);
    const [waLink, setWaLink] = useState(null);

    useEffect(() => {
        axios.get(`${API_URL}/pathologies`)
            .then(res => setPathologies(res.data || []))
            .catch(() => { });
    }, []);

    const toggleDate = (day) => {
        setSelectedDates(prev => {
            const exists = prev.some(d => isSameDay(d, day));
            if (exists) return prev.filter(d => !isSameDay(d, day));
            return [...prev, day].sort((a, b) => a - b);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const isEditing = !!patientToEdit;

        if (!isEditing && selectedDates.length === 0) {
            alert('Seleccioná al menos un día en el calendario.');
            return;
        }
        setSaving(true);
        try {
            const patientId = isEditing ? patientToEdit.id : Date.now();

            await axios.post(`${API_URL}/patients`, { ...formData, id: patientId, created_at: patientToEdit?.created_at });

            let sesionesNuevas = 0;
            if (selectedDates.length > 0) {
                const sesiones = selectedDates.map(d => ({
                    paciente_id: patientId,
                    fecha: format(d, 'yyyy-MM-dd'),
                    hora: horaTurno,
                    estado: 'programado'
                }));
                await axios.post(`${API_URL}/sessions/batch`, { sesiones });
                sesionesNuevas = sesiones.length;
            }

            if (formData.whatsapp && (!isEditing || sesionesNuevas > 0)) {
                const num = formData.whatsapp.replace(/\D/g, '');
                if (sesionesNuevas > 0) {
                    const turnosTexto = selectedDates
                        .map(d => `📅 ${format(d, "EEEE d/MM", { locale: es })} a las ${horaTurno} hs`)
                        .join('\n');
                    const mensaje = `¡Hola ${formData.nombre}! 👋 Te confirmamos tus turnos de Kinesiología en Hospital Rawson:\n\n${turnosTexto}\n\nTotal: ${sesionesNuevas} sesión${sesionesNuevas !== 1 ? 'es' : ''} programada${sesionesNuevas !== 1 ? 's' : ''}.\n\nAnte cualquier duda contactanos. ¡Te esperamos! 🏥`;
                    setWaLink(`https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`);
                }
            }

            if (!isEditing || sesionesNuevas > 0) {
                setSavedOk(true);
            } else {
                // Solo edición de datos
                onSave();
                onClose();
            }
        } catch (err) {
            console.error('Error guardando:', err);
            const msg = err.response?.data?.error || err.message || 'Error desconocido';
            alert(`Error al guardar: ${msg}. Verificá la conexión o contactá a soporte.`);
        } finally {
            setSaving(false);
        }
    };

    const field = (key, placeholder, type = 'text') => (
        <input type={type} placeholder={placeholder} value={formData[key]}
            onChange={e => setFormData({ ...formData, [key]: e.target.value })}
            style={{ width: '100%', boxSizing: 'border-box' }}
        />
    );

    return createPortal(
        <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, background: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '15px'
        }}>
            <div style={{
                width: '100%', maxWidth: '700px', maxHeight: '92vh',
                overflowY: 'auto', padding: '30px',
                background: '#243b5e', border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '20px',
                borderTop: savedOk ? '4px solid #00e676' : '4px solid var(--primary)'
            }}>
                {savedOk ? (
                    // ── Pantalla de éxito ──
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '15px' }}>✅</div>
                        <h2 style={{ fontSize: '1.5rem', color: '#00e676', marginBottom: '8px' }}>Paciente registrado</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '6px' }}>
                            <strong>{formData.nombre} {formData.apellido}</strong> — {selectedDates.length} sesión{selectedDates.length !== 1 ? 'es' : ''} programada{selectedDates.length !== 1 ? 's' : ''}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', margin: '15px 0 20px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                            {selectedDates.map((d, i) => (
                                <span key={i}>📅 {format(d, "EEEE d/MM/yyyy", { locale: es })} — {horaTurno} hs</span>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {waLink && (
                                <a href={waLink} target="_blank" rel="noreferrer" style={{
                                    padding: '12px 24px', borderRadius: '12px',
                                    background: '#25d366', color: 'white', fontWeight: '700',
                                    textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px'
                                }}>
                                    <MessageCircle size={18} /> Enviar WhatsApp ✉️
                                </a>
                            )}
                            <button onClick={onClose} style={{
                                padding: '12px 24px', borderRadius: '12px',
                                background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)',
                                color: 'white', cursor: 'pointer', fontWeight: '600'
                            }}>Cerrar</button>
                        </div>
                    </div>
                ) : (
                    // ── Formulario ──
                    <>
                        <h2 style={{ fontSize: '1.3rem', marginBottom: '22px' }}>{patientToEdit ? '✏️ Modificar Paciente' : '📋 Registrar Paciente y Turnos'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                                {field('nombre', 'Nombre *')}
                                {field('apellido', 'Apellido *')}
                                {field('historia_clinica', 'Historia Clínica *')}
                                {field('telefono', 'Teléfono')}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(37,211,102,0.07)', borderRadius: '10px', padding: '0 10px', border: '1px solid #25d366', gridColumn: 'span 2' }}>
                                    <MessageCircle size={16} color="#25d366" />
                                    <input
                                        type="tel"
                                        placeholder="WhatsApp (ej: 5492804123456 con código de área)"
                                        value={formData.whatsapp}
                                        onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                                        style={{ flex: 1, background: 'none', border: 'none', color: 'white', padding: '12px 0', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            {/* Patología */}
                            <div style={{ marginBottom: '18px' }}>
                                <label style={labelStyle}>DIAGNÓSTICO / PATOLOGÍA</label>
                                <CustomSelect 
                                    value={formData.patologia} 
                                    onChange={e => setFormData({ ...formData, patologia: e.target.value })}
                                    options={pathologies.map(p => ({ value: p.nombre, label: p.nombre }))}
                                    placeholder="— Sin patología asignada —"
                                />
                            </div>

                            {/* Derivación */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                                <div>
                                    <label style={labelStyle}>MÉDICO DERIVANTE</label>
                                    {field('medico_derivante_nombre', 'Nombre del médico')}
                                </div>
                                <div>
                                    <label style={labelStyle}>INSTITUCIÓN</label>
                                    {field('medico_derivante_institucion', 'Hospital / Centro')}
                                </div>
                            </div>

                            {/* Calendario + Horario */}
                            <div style={{ marginBottom: '18px', background: 'rgba(0,136,204,0.06)', borderRadius: '14px', padding: '18px', border: '1px solid var(--primary)' }}>
                                <h4 style={{ color: 'var(--primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                    <Calendar size={17} /> SELECCIONAR DÍAS DE SESIÓN
                                </h4>

                                <MultiDateCalendar selectedDates={selectedDates} onToggleDate={toggleDate} />

                                {/* Selector de hora único para todos los días */}
                                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '12px 16px', border: '1px solid var(--primary)' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)', whiteSpace: 'nowrap' }}>🕐 HORARIO PARA TODOS LOS DÍAS:</span>
                                    <select
                                        value={horaTurno}
                                        onChange={e => setHoraTurno(e.target.value)}
                                        style={{ background: '#111318', color: 'white', border: '1px solid var(--primary)', borderRadius: '8px', padding: '8px 12px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', flex: 1 }}>
                                        {horariosSlotsList.map(h => (
                                            <option key={h} value={h}>{h} hs</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="submit" disabled={saving} className="vibrant-gradient"
                                    style={{ flex: 1, padding: '15px', borderRadius: '12px', fontWeight: '700', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', color: 'white', opacity: saving ? 0.7 : 1 }}>
                                    {saving ? '⏳ Guardando...' : `✅ GUARDAR Y AGENDAR${selectedDates.length > 0 ? ` (${selectedDates.length} sesión${selectedDates.length !== 1 ? 'es' : ''})` : ''}`}
                                </button>
                                <button type="button" onClick={onClose}
                                    style={{ padding: '15px 22px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', cursor: 'pointer' }}>
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    , document.body);
};

const labelStyle = { fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '7px' };
const selectStyle = { width: '100%', padding: '12px 14px', borderRadius: '10px', background: '#111318', color: 'white', border: '1px solid var(--border)', fontSize: '0.93rem', cursor: 'pointer', boxSizing: 'border-box' };

export default PatientList;
