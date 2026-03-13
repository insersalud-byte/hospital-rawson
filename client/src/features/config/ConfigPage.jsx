import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, UserPlus, Activity, Briefcase, CheckCircle, Trash2, Download } from 'lucide-react';

const API_URL = import.meta.env.MODE === 'development' ? 'http://localhost:3005/api' : '/api';

const ConfigPage = () => {
    const [professionals, setProfessionals] = useState([]);
    const [pathologies, setPathologies] = useState([]);
    const [treatments, setTreatments] = useState([]);
    const [newPro, setNewPro] = useState({ nombre: '', matricula: '', especialidad: '' });
    const [newPath, setNewPath] = useState('');
    const [newTreatment, setNewTreatment] = useState('');
    const [savedMsg, setSavedMsg] = useState('');

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const [resPro, resPath, resTreat] = await Promise.all([
                axios.get(`${API_URL}/professionals`),
                axios.get(`${API_URL}/pathologies`),
                axios.get(`${API_URL}/treatments`),
            ]);
            setProfessionals(resPro.data || []);
            setPathologies(resPath.data || []);
            setTreatments(resTreat.data || []);
        } catch (err) {
            console.error('Error cargando configuración:', err);
        }
    };

    const showSuccess = (msg) => {
        setSavedMsg(msg);
        setTimeout(() => setSavedMsg(''), 3000);
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
                                <Trash2 size={16} color="var(--error)" style={{ cursor: 'not-allowed', opacity: 0.4 }} />
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
                                border: '1px solid var(--primary)', color: 'var(--primary)'
                            }}>
                                {p.nombre}
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
                                display: 'flex', alignItems: 'center', gap: '8px'
                            }}>
                                <Briefcase size={14} color="var(--primary)" /> {t.nombre}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfigPage;
