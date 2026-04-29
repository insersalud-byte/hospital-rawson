import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { MessageCircle, Calendar, Pencil, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import CustomSelect from '../../components/ui/CustomSelect';

const API_URL = import.meta.env.MODE === 'development' ? 'http://localhost:3005/api' : '/api';

// ─── Feriados y asuetos (MM-DD recurrentes) ───────────────────────────────────
const FERIADOS_FIJOS = [
    '01-01', '03-24', '04-02', '05-01', '05-24', '05-25', '06-20', '07-09', '10-12', '11-20', '12-08', '12-25',
];

const labelStyle = { fontSize: '0.73rem', fontWeight: '700', letterSpacing: '0.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '7px' };

// ─── Mini Calendario Multi-Selección ─────────────────────────────────────────
export const MultiDateCalendar = ({ selectedDates, onToggleDate, existingSessionsByDate = {}, toSuspendIds = new Set(), onToggleSuspendDate }) => {
    const [viewMonth, setViewMonth] = useState(new Date());
    const today = startOfDay(new Date());

    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(viewMonth),
        end: endOfMonth(viewMonth)
    });

    const firstDayOfWeek = (getDay(startOfMonth(viewMonth)) + 6) % 7; // Lun=0
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const hasExisting = Object.keys(existingSessionsByDate).length > 0;

    return (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '16px', border: '1px solid var(--border)' }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '6px' }}>
                {dayNames.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600', padding: '3px' }}>
                        {d}
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
                {daysInMonth.map(day => {
                    const fechaStr = format(day, 'yyyy-MM-dd');
                    const fechaMD = format(day, 'MM-dd');
                    const sessions = existingSessionsByDate[fechaStr] || [];
                    const hasSessions = sessions.length > 0;
                    const allSuspended = hasSessions && sessions.every(s => toSuspendIds.has(String(s.id)));
                    const isSelected = selectedDates.some(d => isSameDay(d, day));
                    const isPast = isBefore(day, today);
                    const isToday = isSameDay(day, today);
                    const dayOfWeek = getDay(day);
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const isFeriado = FERIADOS_FIJOS.includes(fechaMD);
                    const isNonWorkday = isWeekend || isFeriado;
                    const isClickable = hasSessions || (!isPast && !isNonWorkday);

                    let bg;
                    if (hasSessions && allSuspended) {
                        bg = 'linear-gradient(135deg, #ff6b35, #cc4400)';
                    } else if (hasSessions) {
                        bg = 'linear-gradient(135deg, var(--primary), #0055aa)';
                    } else if (isSelected) {
                        bg = 'linear-gradient(135deg, #00e676, #00b248)';
                    } else if (isNonWorkday) {
                        bg = 'linear-gradient(135deg, #8b0000, #c0392b)';
                    } else {
                        bg = isPast ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)';
                    }

                    const handleClick = () => {
                        if (hasSessions && onToggleSuspendDate) {
                            onToggleSuspendDate(fechaStr);
                        } else if (!isPast && !isNonWorkday) {
                            onToggleDate(day);
                        }
                    };

                    return (
                        <button
                            type="button"
                            key={day.toISOString()}
                            onClick={handleClick}
                            disabled={!isClickable}
                            style={{
                                padding: '7px 3px 5px', borderRadius: '8px', textAlign: 'center',
                                fontSize: '0.82rem', fontWeight: (hasSessions || isSelected) ? '700' : '400',
                                border: isToday ? '2px solid #ffea00' : 'none',
                                cursor: isClickable ? 'pointer' : 'not-allowed',
                                opacity: (isPast && !hasSessions && !isNonWorkday) ? 0.3 : 1,
                                background: bg,
                                color: 'white',
                                transition: 'all 0.15s',
                                position: 'relative',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'
                            }}>
                            {format(day, 'd')}
                            {hasSessions && (
                                <div style={{
                                    width: '4px', height: '4px', borderRadius: '50%',
                                    background: allSuspended ? '#ffea00' : 'rgba(255,255,255,0.85)'
                                }} />
                            )}
                        </button>
                    );
                })}
            </div>

            <div style={{ marginTop: '10px', display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'linear-gradient(135deg,#8b0000,#c0392b)', display: 'inline-block' }} /> Feriado / Finde
                </span>
                {hasExisting && <>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--primary)', display: 'inline-block' }} /> Turno
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#ff6b35', display: 'inline-block' }} /> Suspender
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#00e676', display: 'inline-block' }} /> Nuevo
                    </span>
                </>}
            </div>
        </div>
    );
};

// ─── Modal Resumen H.C. ──────────────────────────────────────────────────────
export const SummaryHCModal = ({ patient, mode, onClose, onSave }) => {
    const [summary, setSummary] = useState(patient.resumen_hc || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.post(`${API_URL}/patients`, { 
                ...patient, 
                resumen_hc: summary 
            });
            onSave();
            onClose();
        } catch (err) {
            console.error('Error guardando resumen HC:', err);
            alert('Error al guardar el resumen.');
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }} onClick={onClose}>
            <div className="premium-card glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '30px', borderTop: '4px solid var(--primary)', position: 'relative' }} onClick={e => e.stopPropagation()}>
                <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem' }}>
                    {mode === 'edit' ? <Pencil size={20} color="var(--primary)" /> : <Eye size={20} color="var(--primary)" />}
                    {mode === 'edit' ? 'Editar Resumen H.C.' : 'Resumen Historia Clínica'}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>Paciente: <strong style={{color: 'white'}}>{patient.nombre} {patient.apellido}</strong></p>
                
                {mode === 'edit' ? (
                    <textarea 
                        autoFocus
                        value={summary}
                        onChange={e => setSummary(e.target.value)}
                        placeholder="Escriba aquí el resumen de la historia clínica..."
                        style={{ width: '100%', minHeight: '300px', padding: '15px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--border)', fontSize: '1rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                    />
                ) : (
                    <div style={{ width: '100%', minHeight: '200px', maxHeight: '500px', overflowY: 'auto', padding: '20px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', color: '#eee', border: '1px solid var(--border)', fontSize: '1.05rem', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                        {summary || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No hay un resumen cargado para este paciente.</span>}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '30px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Cerrar</button>
                    {mode === 'edit' && (
                        <button onClick={handleSave} disabled={saving} className="vibrant-gradient" style={{ padding: '10px 25px', borderRadius: '10px', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                            {saving ? 'Guardando...' : 'GUARDAR RESUMEN'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    , document.body);
};

// ─── Formulario Nuevo Paciente ────────────────────────────────────────────────
export const PatientForm = ({ onClose, onSave, patientToEdit, existingDoctors = [], existingInstitutions = [] }) => {
    const [formData, setFormData] = useState({
        nombre: patientToEdit?.nombre || '', apellido: patientToEdit?.apellido || '',
        historia_clinica: patientToEdit?.historia_clinica || '', dni: patientToEdit?.dni || '',
        whatsapp: patientToEdit?.whatsapp || '', estado_paciente: patientToEdit?.estado_paciente || 'activo',
        medico_derivante_nombre: patientToEdit?.medico_derivante_nombre || '', medico_derivante_institucion: patientToEdit?.medico_derivante_institucion || '',
        observaciones: patientToEdit?.observaciones || '', patologia: patientToEdit?.patologia || '',
        resumen_hc: patientToEdit?.resumen_hc || '',
    });
    const [pathologies, setPathologies] = useState([]);
    const [selectedDates, setSelectedDates] = useState([]);
    const [horaTurno, setHoraTurno] = useState('08:00');
    const [saving, setSaving] = useState(false);
    const [savedOk, setSavedOk] = useState(false);
    const [waLink, setWaLink] = useState(null);
    const [existingSessions, setExistingSessions] = useState([]);
    const [toSuspend, setToSuspend] = useState(new Set());

    useEffect(() => {
        axios.get(`${API_URL}/pathologies`)
            .then(res => setPathologies(res.data || []))
            .catch(() => { });
    }, []);

    useEffect(() => {
        if (!patientToEdit) return;
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        axios.get(`${API_URL}/sessions/patient/${patientToEdit.id}`)
            .then(res => {
                const future = (Array.isArray(res.data) ? res.data : [])
                    .filter(s => s.estado === 'programado' && s.fecha >= todayStr);
                setExistingSessions(future);
            })
            .catch(() => setExistingSessions([]));
    }, [patientToEdit?.id]);

    const existingSessionsByDate = {};
    existingSessions.forEach(s => {
        if (!existingSessionsByDate[s.fecha]) existingSessionsByDate[s.fecha] = [];
        existingSessionsByDate[s.fecha].push(s);
    });

    const toggleSuspendDate = (fechaStr) => {
        const sessions = existingSessionsByDate[fechaStr] || [];
        const ids = sessions.map(s => String(s.id));
        const allMarked = ids.every(id => toSuspend.has(id));
        setToSuspend(prev => {
            const next = new Set(prev);
            if (allMarked) { ids.forEach(id => next.delete(id)); } 
            else { ids.forEach(id => next.add(id)); }
            return next;
        });
    };

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

        // Confirmación explícita antes de suspender sesiones
        if (toSuspend.size > 0) {
            const fechasSuspender = [...toSuspend].map(id => {
                for (const [fecha, sessions] of Object.entries(existingSessionsByDate)) {
                    if (sessions.some(s => String(s.id) === String(id))) return fecha;
                }
                return null;
            }).filter(Boolean);
            const listaFechas = [...new Set(fechasSuspender)].join(', ');
            const confirmar = window.confirm(
                `⚠️ ATENCIÓN: Vas a SUSPENDER ${toSuspend.size} sesión${toSuspend.size !== 1 ? 'es' : ''} existente${toSuspend.size !== 1 ? 's' : ''}.\n\nFechas afectadas: ${listaFechas}\n\nEstas sesiones NO aparecerán más en la agenda.\n¿Estás seguro?`
            );
            if (!confirmar) return;
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

            if (toSuspend.size > 0) {
                await Promise.all([...toSuspend].map(id =>
                    axios.post(`${API_URL}/sessions`, { _action: 'update', id, estado: 'suspendido' })
                ));
            }

            if (formData.whatsapp && (!isEditing || sesionesNuevas > 0)) {
                const num = formData.whatsapp.replace(/\D/g, '');
                if (sesionesNuevas > 0) {
                    const horaInt = parseInt(horaTurno.split(':')[0], 10);
                    const indicacionPresencia = horaInt < 13 ? '7:30' : '14:30';
                    const turnosTexto = selectedDates
                        .map(d => `📅 ${format(d, "EEEE d/MM", { locale: es })} a las ${indicacionPresencia} hs`)
                        .join('\n');
                    const mensaje = `¡Hola ${formData.nombre}! 👋 Te confirmamos tus turnos de Kinesiología en Hospital Rawson:\n\n${turnosTexto}\n\n*Por favor presentarse a las ${indicacionPresencia} hs.*\n\nTotal: ${sesionesNuevas} sesión${sesionesNuevas !== 1 ? 'es' : ''} programada${sesionesNuevas !== 1 ? 's' : ''}.\n\nAnte cualquier duda contactanos. ¡Te esperamos! 🏥\n\nPOR FAVOR PRESENTARSE 5 MINUTOS ANTES.\nNOTA: AUSENTE SIN AVISO NO SE RECUPERA LA SESION. SOLO SE ACEPTA 2 INASISTENCIAS SINO PIERDE LA TOTALIDAD DE LOS TURNOS.`;
                    setWaLink(`https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`);
                }
            }

            if (!isEditing || sesionesNuevas > 0 || toSuspend.size > 0) {
                setSavedOk(true);
            } else {
                onSave();
                onClose();
            }
        } catch (err) {
            console.error('Error guardando:', err);
            alert(`Error al guardar: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const field = (key, placeholder, type = 'text', listId = null) => (
        <input 
            type={type} 
            placeholder={placeholder} 
            value={formData[key]}
            onChange={e => setFormData({ ...formData, [key]: e.target.value })}
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)', outline: 'none' }}
            list={listId}
        />
    );

    return createPortal(
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '15px' }}>
            <div style={{ width: '100%', maxWidth: '700px', maxHeight: '92vh', overflowY: 'auto', padding: '30px', background: '#243b5e', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '20px', borderTop: savedOk ? '4px solid #00e676' : '4px solid var(--primary)' }}>
                {savedOk ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '15px' }}>✅</div>
                        <h2 style={{ fontSize: '1.5rem', color: '#00e676', marginBottom: '8px' }}>{patientToEdit ? 'Cambios guardados' : 'Paciente registrado'}</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '6px' }}><strong>{formData.nombre} {formData.apellido}</strong></p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '20px' }}>
                            {waLink && (
                                <a href={waLink} target="_blank" rel="noreferrer" style={{ padding: '12px 24px', borderRadius: '12px', background: '#25d366', color: 'white', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <MessageCircle size={18} /> WhatsApp ✉️
                                </a>
                            )}
                            <button onClick={onClose} style={{ padding: '12px 24px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Cerrar</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <h2 style={{ fontSize: '1.3rem', marginBottom: '22px' }}>{patientToEdit ? '✏️ Modificar Paciente' : '📋 Registrar Paciente y Turnos'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                                {field('nombre', 'Nombre *')}
                                {field('apellido', 'Apellido *')}
                                {field('historia_clinica', 'Historia Clínica *')}
                                {field('dni', 'DNI')}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(37,211,102,0.07)', borderRadius: '10px', padding: '0 10px', border: '1px solid #25d366', gridColumn: 'span 2' }}>
                                    <MessageCircle size={16} color="#25d366" />
                                    <input type="tel" placeholder="WhatsApp (ej: 5492804123456)" value={formData.whatsapp} onChange={e => setFormData({ ...formData, whatsapp: e.target.value })} style={{ flex: 1, background: 'none', border: 'none', color: 'white', padding: '12px 0', outline: 'none' }} />
                                </div>
                            </div>
                            <div style={{ marginBottom: '18px' }}>
                                <label style={labelStyle}>DIAGNÓSTICO / PATOLOGÍA</label>
                                <CustomSelect value={formData.patologia} onChange={e => setFormData({ ...formData, patologia: e.target.value })} options={pathologies.map(p => ({ value: p.nombre, label: p.nombre }))} placeholder="— Sin patología asignada —" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                                <div>
                                    <label style={labelStyle}>MÉDICO DERIVANTE</label>
                                    {field('medico_derivante_nombre', 'Nombre del médico', 'text', 'doctors-list')}
                                    <datalist id="doctors-list">{existingDoctors.map((doc, idx) => <option key={idx} value={doc} />)}</datalist>
                                </div>
                                <div>
                                    <label style={labelStyle}>INSTITUCIÓN</label>
                                    {field('medico_derivante_institucion', 'Hospital / Centro', 'text', 'institutions-list')}
                                    <datalist id="institutions-list">{existingInstitutions.map((inst, idx) => <option key={idx} value={inst} />)}</datalist>
                                </div>
                            </div>

                            <div style={{ marginBottom: '18px' }}>
                                <label style={labelStyle}>RESUMEN HISTORIA CLÍNICA (INICIAL)</label>
                                <textarea 
                                    placeholder="Ingrese un resumen de la historia clínica o datos iniciales importantes..." 
                                    value={formData.resumen_hc}
                                    onChange={e => setFormData({ ...formData, resumen_hc: e.target.value })}
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)', outline: 'none', minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }}
                                />
                            </div>
                            <div style={{ marginBottom: '18px', background: 'rgba(0,136,204,0.06)', borderRadius: '14px', padding: '18px', border: '1px solid var(--primary)' }}>
                                <h4 style={{ color: 'var(--primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '7px' }}><Calendar size={17} /> SELECCIONAR DÍAS DE SESIÓN</h4>
                                    <MultiDateCalendar selectedDates={selectedDates} onToggleDate={toggleDate} existingSessionsByDate={existingSessionsByDate} toSuspendIds={toSuspend} onToggleSuspendDate={toggleSuspendDate} />
                                {toSuspend.size > 0 && (
                                    <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(255,107,53,0.15)', borderRadius: '10px', border: '2px solid #ff6b35', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                                        <span style={{ fontSize: '0.85rem', color: '#ff9060', fontWeight: '700' }}>
                                            {toSuspend.size} sesión{toSuspend.size !== 1 ? 'es' : ''} marcada{toSuspend.size !== 1 ? 's' : ''} para SUSPENDER. Hacé click en la fecha naranja para desmarcar.
                                        </span>
                                    </div>
                                )}
                                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '12px 16px', border: '1px solid var(--primary)' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)', whiteSpace: 'nowrap' }}>🕐 HORARIO:</span>
                                    <select value={horaTurno} onChange={e => setHoraTurno(e.target.value)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '0.9rem', cursor: 'pointer', outline: 'none' }}>
                                        {['08:00', '08:45', '09:30', '10:15', '11:00', '11:45', '12:30', '13:15', '14:00', '14:45', '15:30', '16:15', '17:00', '17:45'].map(h => <option key={h} value={h} style={{ background: '#1a1a1c' }}>{h} hs</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
                                <button type="button" onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'white', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
                                <button type="submit" disabled={saving} className="vibrant-gradient" style={{ flex: 2, padding: '14px', borderRadius: '12px', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Guardando...' : patientToEdit ? 'GUARDAR CAMBIOS' : 'REGISTRAR PACIENTE'}</button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    , document.body);
};
