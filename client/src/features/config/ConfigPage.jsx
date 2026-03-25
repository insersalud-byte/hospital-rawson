import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, UserPlus, Activity, Briefcase, CheckCircle, Trash2, Download, Users, Lock, Calendar, Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const API_URL = import.meta.env.MODE === 'development' ? 'http://localhost:3005/api' : '/api';

const ConfigPage = () => {
    const [professionals, setProfessionals] = useState([]);
    const [pathologies, setPathologies] = useState([]);
    const [treatments, setTreatments] = useState([]);
    const [patients, setPatients] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [newPro, setNewPro] = useState({ nombre: '', matricula: '', especialidad: '' });
    const [newPath, setNewPath] = useState('');
    const [newTreatment, setNewTreatment] = useState('');
    const [savedMsg, setSavedMsg] = useState('');
    const [patientSearch, setPatientSearch] = useState('');
    const [sessionSearch, setSessionSearch] = useState('');

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const [resPro, resPath, resTreat, resPat, resSes] = await Promise.all([
                axios.get(`${API_URL}/professionals`),
                axios.get(`${API_URL}/pathologies`),
                axios.get(`${API_URL}/treatments`),
                axios.get(`${API_URL}/patients`),
                axios.get(`${API_URL}/sessions`),
            ]);
            setProfessionals(resPro.data || []);
            setPathologies(resPath.data || []);
            setTreatments(resTreat.data || []);
            setPatients(resPat.data || []);
            setSessions(resSes.data || []);
        } catch (err) {
            console.error('Error cargando configuración:', err);
        }
    };

    const showSuccess = (msg) => {
        setSavedMsg(msg);
        setTimeout(() => setSavedMsg(''), 3000);
    };

    const deleteProfessional = async (id, nombre) => {
        if (!window.confirm(`¿Estás seguro que querés eliminar permanentemente al kinesiólogo ${nombre}?`)) return;
        try {
            await axios.delete(`${API_URL}/professionals/${id}`);
            await fetchConfig();
            showSuccess('✅ Kinesiólogo eliminado');
        } catch (err) {
            console.error('Error eliminando kinesiólogo:', err);
            const msg = err.response?.data?.error || err.message || 'Error desconocido';
            alert(`Error al eliminar kinesiólogo: ${msg}`);
        }
    };

    const addProfessional = async () => {
        if (!newPro.nombre.trim()) return;
        try {
            await axios.post(`${API_URL}/professionals`, { ...newPro, id: Date.now() });
            setNewPro({ nombre: '', matricula: '', especialidad: '' });
            await fetchConfig();
            showSuccess('✅ Kinesiólogo guardado correctamente');
        } catch (err) {
            console.error('Error guardando kinesiólogo:', err);
            const msg = err.response?.data?.error || err.message || 'Error desconocido';
            alert(`Error al guardar kinesiólogo: ${msg}`);
        }
    };

    const addPathology = async () => {
        if (!newPath.trim()) return;
        try {
            await axios.post(`${API_URL}/pathologies`, { nombre: newPath.trim(), id: Date.now() });
            setNewPath('');
            await fetchConfig();
            showSuccess('✅ Patología guardada correctamente');
        } catch (err) {
            console.error('Error guardando patología:', err);
            const msg = err.response?.data?.error || err.message || 'Error desconocido';
            alert(`Error al guardar patología: ${msg}`);
        }
    };

    const deletePathology = async (id, nombre) => {
        if (!window.confirm(`¿Estás seguro que querés eliminar la patología "${nombre}"?`)) return;
        try {
            await axios.delete(`${API_URL}/pathologies/${id}`);
            await fetchConfig();
            showSuccess('✅ Patología eliminada');
        } catch (err) {
            console.error('Error eliminando patología:', err);
            const msg = err.response?.data?.error || err.message || 'Error desconocido';
            alert(`Error al eliminar patología: ${msg}`);
        }
    };

    const deleteTreatment = async (id, nombre) => {
        if (!window.confirm(`¿Estás seguro que querés eliminar el tratamiento "${nombre}"?`)) return;
        try {
            await axios.delete(`${API_URL}/treatments/${id}`);
            await fetchConfig();
            showSuccess('✅ Tratamiento eliminado');
        } catch (err) {
            console.error('Error eliminando tratamiento:', err);
            const msg = err.response?.data?.error || err.message || 'Error desconocido';
            alert(`Error al eliminar tratamiento: ${msg}`);
        }
    };

    const deletePatient = async (id, nombre) => {
        if (!window.confirm(`¿Eliminar al paciente ${nombre}? Se borrarán también sus turnos pendientes.`)) return;
        try {
            await axios.delete(`${API_URL}/patients/${id}`);
            await fetchConfig();
            showSuccess('✅ Paciente eliminado');
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Error desconocido';
            alert(`No se pudo eliminar: ${msg}`);
        }
    };

    const deleteSession = async (id) => {
        if (!window.confirm('¿Eliminar este turno?')) return;
        try {
            await axios.delete(`${API_URL}/sessions/${id}`);
            await fetchConfig();
            showSuccess('✅ Turno eliminado');
        } catch (err) {
            alert('Error al eliminar el turno.');
        }
    };

    const addTreatment = async () => {
        if (!newTreatment.trim()) return;
        try {
            await axios.post(`${API_URL}/treatments`, { nombre: newTreatment.trim(), id: Date.now() });
            setNewTreatment('');
            await fetchConfig();
            showSuccess('✅ Tratamiento guardado correctamente');
        } catch (err) {
            console.error('Error guardando tratamiento:', err);
            const msg = err.response?.data?.error || err.message || 'Error desconocido';
            alert(`Error al guardar tratamiento: ${msg}`);
        }
    };

    const handleDownloadBackup = async () => {
        try {
            const [resPatients, resSessions] = await Promise.all([
                axios.get(`${API_URL}/patients`),
                axios.get(`${API_URL}/sessions`)
            ]);

            let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
            csvContent += "ID_Sesion,Fecha,Hora,Estado,Historia_Clinica,Paciente,Patologia,Medico_Derivante,Tratamiento,Kinesiologo,Observaciones\n";

            const sessionsData = resSessions.data || [];
            const patientsData = resPatients.data || [];

            sessionsData.forEach(session => {
                const pat = patientsData.find(p => String(p.id) === String(session.paciente_id)) || {};
                const row = [
                    session.id,
                    session.fecha,
                    session.hora,
                    session.estado,
                    pat.historia_clinica || '',
                    `"${(pat.nombre || '')} ${(pat.apellido || '')}"`,
                    `"${(pat.patologia || '')}"`,
                    `"${(pat.medico_derivante_nombre || '')}"`,
                    `"${(session.tratamiento_nombre || '')}"`,
                    `"${(session.kinesiologo_nombre_snapshot || '')}"`,
                    `"${(session.observaciones || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
                ];
                csvContent += row.join(";") + "\n"; // ; es mejor detectado en Excel en español
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Backup_Hospital_Rawson_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Error descargando backup:', err);
            alert('Error generando el archivo de backup.');
        }
    };

    return (
        <div className="config-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
                <h2 style={{ fontSize: '1.5rem' }}>Configuración del Servicio</h2>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {savedMsg && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'rgba(0, 230, 118, 0.15)', color: '#00e676',
                            padding: '10px 20px', borderRadius: '10px',
                            border: '1px solid #00e676', fontWeight: '600', fontSize: '0.9rem'
                        }}>
                            <CheckCircle size={16} /> {savedMsg}
                        </div>
                    )}

                    <button onClick={handleDownloadBackup} className="vibrant-gradient" style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px',
                        borderRadius: '10px', fontWeight: '700', border: 'border: 1px solid var(--primary)',
                        cursor: 'pointer', color: 'white', fontSize: '0.95rem'
                    }}>
                        <Download size={18} /> Descargar Backup Excel
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>

                {/* Kinesiólogos */}
                <div className="premium-card glass-panel">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <Briefcase color="var(--primary)" />
                        <h3>Kinesiólogos del Staff</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                        <input
                            placeholder="Nombre Completo"
                            value={newPro.nombre}
                            onChange={e => setNewPro({ ...newPro, nombre: e.target.value })}
                            style={{ flex: 2 }}
                            onKeyDown={e => e.key === 'Enter' && addProfessional()}
                        />
                        <input
                            placeholder="Mat."
                            value={newPro.matricula}
                            onChange={e => setNewPro({ ...newPro, matricula: e.target.value })}
                            style={{ flex: 1 }}
                            onKeyDown={e => e.key === 'Enter' && addProfessional()}
                        />
                        <button onClick={addProfessional} className="vibrant-gradient"
                            style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', color: 'white' }}>
                            <UserPlus size={18} />
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {professionals.length === 0 && (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Sin kinesiólogos cargados aún.</p>
                        )}
                        {professionals.map(pro => (
                            <div key={pro.id} style={{
                                display: 'flex', justifyContent: 'space-between', padding: '12px 16px',
                                background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid var(--border)'
                            }}>
                                <div>
                                    <span style={{ fontWeight: '600' }}>{pro.nombre}</span>
                                    {pro.matricula && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}> — Mat. {pro.matricula}</span>}
                                </div>
                                <Trash2 size={16} color="var(--error)" style={{ cursor: 'pointer' }} onClick={() => deleteProfessional(pro.id, pro.nombre)} title="Eliminar kinesiólogo" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Patologías */}
                <div className="premium-card glass-panel">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <Activity color="var(--primary)" />
                        <h3>Catálogo de Patologías</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                        <input
                            placeholder="Nueva Patología (ej: Lumbalgia)"
                            style={{ flex: 1 }}
                            value={newPath}
                            onChange={e => setNewPath(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addPathology()}
                        />
                        <button onClick={addPathology} className="vibrant-gradient"
                            style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', color: 'white' }}>
                            <Save size={18} />
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {pathologies.length === 0 && (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Sin patologías cargadas aún.</p>
                        )}
                        {pathologies.map(p => (
                            <div key={p.id} style={{
                                padding: '7px 14px', background: 'rgba(0,136,204,0.12)',
                                borderRadius: '20px', fontSize: '0.85rem',
                                border: '1px solid var(--primary)', color: 'var(--primary)',
                                display: 'flex', alignItems: 'center', gap: '8px'
                            }}>
                                {p.nombre}
                                <Trash2 size={13} color="var(--error)" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => deletePathology(p.id, p.nombre)} title="Eliminar patología" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tratamientos - ancho completo */}
                <div className="premium-card glass-panel" style={{ gridColumn: 'span 2' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <Briefcase color="var(--primary)" />
                        <h3>Catálogo de Tratamientos</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                        <input
                            placeholder="Nuevo Tratamiento (ej: Magnetoterapia, Ultrasonido, RPG...)"
                            style={{ flex: 1 }}
                            value={newTreatment}
                            onChange={e => setNewTreatment(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addTreatment()}
                        />
                        <button onClick={addTreatment} className="vibrant-gradient"
                            style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: '700', border: 'none', cursor: 'pointer', color: 'white' }}>
                            Agregar al Catálogo
                        </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                        {treatments.length === 0 && (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Sin tratamientos cargados aún.</p>
                        )}
                        {treatments.map(t => (
                            <div key={t.id} style={{
                                padding: '12px 18px', background: 'rgba(0,136,204,0.08)',
                                borderRadius: '12px', fontSize: '0.9rem',
                                border: '1px solid var(--primary)',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                justifyContent: 'space-between'
                            }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Briefcase size={14} color="var(--primary)" /> {t.nombre}
                                </span>
                                <Trash2 size={14} color="var(--error)" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => deleteTreatment(t.id, t.nombre)} title="Eliminar tratamiento" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Papelera de Pacientes ── */}
            <div className="premium-card glass-panel" style={{ marginTop: '25px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <Users color="var(--error)" />
                    <h3>Papelera de Pacientes</h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                        — Solo se pueden eliminar pacientes que nunca fueron atendidos
                    </span>
                </div>

                {/* Buscador */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px' }}>
                    <Search size={16} color="var(--text-muted)" />
                    <input
                        type="text"
                        placeholder="Buscar paciente por nombre o apellido..."
                        value={patientSearch}
                        onChange={e => setPatientSearch(e.target.value)}
                        style={{ background: 'none', border: 'none', color: 'white', flex: 1, outline: 'none', fontSize: '0.9rem' }}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px', maxHeight: '380px', overflowY: 'auto' }}>
                    {patients.length === 0 && (
                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>Sin pacientes registrados.</p>
                    )}
                    {patients
                        .filter(p => `${p.nombre} ${p.apellido}`.toLowerCase().includes(patientSearch.toLowerCase()))
                        .map(p => {
                            const attended = sessions.some(s => String(s.paciente_id) === String(p.id) && s.estado === 'asistió');
                            return (
                                <div key={p.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px 14px', borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                                    opacity: attended ? 0.55 : 1
                                }}>
                                    <div>
                                        <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{p.nombre} {p.apellido}</span>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>HC: {p.historia_clinica || '—'}</p>
                                    </div>
                                    {attended
                                        ? <Lock size={16} color="var(--text-muted)" title="Paciente con sesiones atendidas — no se puede eliminar" />
                                        : <Trash2 size={16} color="var(--error)" style={{ cursor: 'pointer', flexShrink: 0 }}
                                            onClick={() => deletePatient(p.id, `${p.nombre} ${p.apellido}`)}
                                            title="Eliminar paciente" />
                                    }
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* ── Gestión de Turnos ── */}
            <div className="premium-card glass-panel" style={{ marginTop: '25px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <Calendar color="var(--primary)" />
                    <h3>Gestión de Turnos</h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                        — Podés eliminar cualquier turno programado
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px' }}>
                    <Search size={16} color="var(--text-muted)" />
                    <input
                        type="text"
                        placeholder="Buscar por paciente, fecha (ej: 2025-03)..."
                        value={sessionSearch}
                        onChange={e => setSessionSearch(e.target.value)}
                        style={{ background: 'none', border: 'none', color: 'white', flex: 1, outline: 'none', fontSize: '0.9rem' }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
                    {sessions.length === 0 && (
                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>Sin turnos registrados.</p>
                    )}
                    {sessions
                        .filter(s => {
                            const fullName = `${s.nombre || ''} ${s.apellido || ''}`.toLowerCase();
                            const q = sessionSearch.toLowerCase();
                            return fullName.includes(q) || (s.fecha || '').includes(q);
                        })
                        .sort((a, b) => {
                            if (a.fecha !== b.fecha) return a.fecha > b.fecha ? -1 : 1;
                            return (a.hora || '') > (b.hora || '') ? -1 : 1;
                        })
                        .map(s => {
                            const estadoColor = s.estado === 'asistió' ? '#00e676' : s.estado === 'no asistió' ? '#ff5252' : 'var(--primary)';
                            return (
                                <div key={s.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px 16px', borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                                    borderLeft: `4px solid ${estadoColor}`
                                }}>
                                    <div style={{ display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: '700', fontSize: '0.88rem', minWidth: '90px' }}>
                                            {s.fecha ? format(new Date(s.fecha + 'T00:00:00'), 'd/MM/yyyy', { locale: es }) : '—'}
                                        </span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', minWidth: '50px' }}>🕐 {s.hora || '—'}</span>
                                        <span style={{ fontSize: '0.9rem' }}>{s.nombre} {s.apellido}</span>
                                        <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', background: `${estadoColor}22`, color: estadoColor, border: `1px solid ${estadoColor}` }}>
                                            {s.estado || 'programado'}
                                        </span>
                                    </div>
                                    <Trash2 size={15} color="var(--error)" style={{ cursor: 'pointer', flexShrink: 0, marginLeft: '12px' }}
                                        onClick={() => deleteSession(s.id)}
                                        title="Eliminar turno" />
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
};

export default ConfigPage;
