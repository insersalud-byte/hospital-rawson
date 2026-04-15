import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Download, Filter, FileText, Database } from 'lucide-react';

const API_URL = import.meta.env.MODE === 'development' ? 'http://localhost:3005/api' : '/api';
const COLORS = ['#0088cc', '#00e676', '#ffea00', '#ff5252', '#9c27b0', '#ff9800'];

const StatsDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('mes'); // 'dia', 'mes', 'año', 'historico'
    const [customDate, setCustomDate] = useState(new Date());

    useEffect(() => {
        fetchStats();
    }, [filterType, customDate]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            let start, end;
            const now = customDate;

            if (filterType === 'dia') {
                start = format(startOfDay(now), 'yyyy-MM-dd');
                end = format(endOfDay(now), 'yyyy-MM-dd');
            } else if (filterType === 'mes') {
                start = format(startOfMonth(now), 'yyyy-MM-dd');
                end = format(endOfMonth(now), 'yyyy-MM-dd');
            } else if (filterType === 'año') {
                start = format(startOfYear(now), 'yyyy-MM-dd');
                end = format(endOfYear(now), 'yyyy-MM-dd');
            }

            const url = filterType === 'historico'
                ? `${API_URL}/stats`
                : `${API_URL}/stats?start=${start}&end=${end}`;

            const res = await axios.get(url);
            setStats(res.data);
        } catch (err) {
            console.error("Error cargando estadísticas", err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleBackup = async () => {
        try {
            const [resPatients, resSessions] = await Promise.all([
                axios.get(`${API_URL}/patients`),
                axios.get(`${API_URL}/sessions`)
            ]);
            
            const patients = resPatients.data || [];
            const sessions = resSessions.data || [];

            // Generar CSV (compatible con Excel)
            let csvContent = "\ufeff"; // BOM para que Excel detecte UTF-8
            csvContent += "--- PACIENTES ---\n";
            csvContent += "ID;Apellido;Nombre;DNI;HC;WhatsApp;Estado;Patologia;Medico;Institucion;Resumen HC;Observaciones\n";
            patients.forEach(p => {
                const row = [
                    p.id,
                    p.apellido || '',
                    p.nombre || '',
                    p.dni || '',
                    p.historia_clinica || '',
                    p.whatsapp || '',
                    p.estado_paciente || '',
                    p.patologia || '',
                    p.medico_derivante_nombre || '',
                    p.medico_derivante_institucion || '',
                    (p.resumen_hc || '').replace(/[;\n\r]/g, ' '),
                    (p.observaciones || '').replace(/[;\n\r]/g, ' ')
                ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(";");
                csvContent += row + "\n";
            });

            csvContent += "\n--- SESIONES ---\n";
            csvContent += "ID;Paciente;Fecha;Hora;Estado;Kinesiologo;Tratamientos;Observaciones\n";
            sessions.forEach(s => {
                const pat = patients.find(p => String(p.id) === String(s.paciente_id));
                const patientName = pat ? `${pat.apellido} ${pat.nombre}` : 'Desconocido';
                const row = [
                    s.id,
                    patientName,
                    s.fecha,
                    s.hora,
                    s.estado || 'programado',
                    s.kinesiologo_nombre_snapshot || '',
                    (s.tratamientos_texto || '').replace(/[;\n\r]/g, ' '),
                    (s.observaciones || '').replace(/[;\n\r]/g, ' ')
                ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(";");
                csvContent += row + "\n";
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `backup_hospital_rawson_${format(new Date(), 'yyyy-MM-dd')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Error en backup:", err);
            alert("Error al generar el backup.");
        }
    };

    if (loading && !stats) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando Informe Analítico...</div>;
    if (!stats) return <div style={{ padding: '40px', textAlign: 'center' }}>No hay datos suficientes para mostrar estadísticas.</div>;

    // Preparar Data para Gráficos
    const kineData = Object.keys(stats.kinesiologos || {}).map(name => ({ name, sesiones: stats.kinesiologos[name] })).sort((a, b) => b.sesiones - a.sesiones);
    const treatData = Object.keys(stats.tratamientos || {}).map(name => ({ name, usos: stats.tratamientos[name] })).sort((a, b) => b.usos - a.usos);
    const patholData = Object.keys(stats.patologias || {}).map(name => ({ name, casos: stats.patologias[name] })).sort((a, b) => b.casos - a.casos);
    const medicosData = Object.keys(stats.medicos || {}).map(name => ({ name, derivaciones: stats.medicos[name] })).sort((a, b) => b.derivaciones - a.derivaciones);
    const instData = Object.keys(stats.instituciones || {}).map(name => ({ name, derivaciones: stats.instituciones[name] })).sort((a, b) => b.derivaciones - a.derivaciones);

    const pieAsistencias = [
        { name: 'Asistió', value: stats.asistencias?.asistio || 0 },
        { name: 'No Asistió', value: stats.asistencias?.no_asistio || 0 },
    ];

    const formatFilterDate = () => {
        if (filterType === 'historico') return 'Histórico Global';
        if (filterType === 'dia') return format(customDate, "EEEE d 'de' MMMM, yyyy", { locale: es });
        if (filterType === 'mes') return format(customDate, "MMMM yyyy", { locale: es });
        if (filterType === 'año') return format(customDate, "yyyy", { locale: es });
    };

    return (
        <div className="stats-container print-area">
            {/* Header de Impresión Profesional (Solo visible al imprimir) */}
            <div className="print-header" style={{ display: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
                    <div style={{ width: '60px', height: '60px', background: '#0088cc', borderRadius: '12px' }}></div>
                    <div>
                        <h1 style={{ fontSize: '2.2rem', marginBottom: '4px', color: '#0088cc', fontWeight: '800' }}>Hospital Dr. Guillermo Rawson</h1>
                        <p style={{ fontSize: '1.1rem', color: '#666', fontWeight: '600' }}>Servicio de Kinesiología y Fisioterapia</p>
                    </div>
                </div>
                <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', color: '#333', borderBottom: '3px solid #0088cc', paddingBottom: '12px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Informe Estadístico Analítico
                </h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', padding: '15px', background: '#f8f9fa', borderRadius: '10px', border: '1px solid #eee' }}>
                    <p style={{ margin: 0, color: '#444' }}><strong>Período del Informe:</strong> <span style={{ textTransform: 'capitalize' }}>{formatFilterDate()}</span></p>
                    <p style={{ margin: 0, color: '#444' }}><strong>Fecha de Emisión:</strong> {format(new Date(), "d 'de' MMMM, yyyy HH:mm", { locale: es })}</p>
                </div>
            </div>

            {/* Header y Filtros (No se imprimen los botones) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={24} color="var(--primary)" /> Informe Analítico
                    </h2>
                    <p style={{ color: 'var(--text-muted)' }}>Métricas e indicadores globales del sistema.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleBackup} className="glass-panel" style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
                        borderRadius: '12px', fontWeight: '700', border: '1px solid var(--primary)', cursor: 'pointer', color: 'var(--primary)'
                    }}>
                        <Database size={18} /> GENERAR BACKUP EXCEL
                    </button>
                    <button onClick={handlePrint} className="vibrant-gradient" style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
                        borderRadius: '12px', fontWeight: '700', border: 'none', cursor: 'pointer', color: 'white'
                    }}>
                        <Download size={18} /> IMPRIMIR / PDF
                    </button>
                </div>
            </div>

            {/* Panel de Filtros */}
            <div className="premium-card glass-panel no-print" style={{ display: 'flex', gap: '15px', padding: '15px 20px', marginBottom: '30px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: '700' }}>
                    <Filter size={18} /> Filtrar Rango:
                </span>

                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px' }}>
                    {['dia', 'mes', 'año', 'historico'].map(t => (
                        <button key={t} onClick={() => setFilterType(t)} style={{
                            padding: '8px 16px', borderRadius: '8px', fontWeight: '600', textTransform: 'capitalize', border: 'none', cursor: 'pointer',
                            background: filterType === t ? 'var(--primary)' : 'transparent',
                            color: filterType === t ? 'white' : 'var(--text-muted)'
                        }}>
                            {t}
                        </button>
                    ))}
                </div>

                {filterType !== 'historico' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
                        <Calendar size={18} color="var(--text-muted)" />
                        <input
                            type="date"
                            value={format(customDate, 'yyyy-MM-dd')}
                            onChange={e => setCustomDate(new Date(e.target.value + 'T12:00:00'))}
                            style={{
                                padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)',
                                background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none'
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Título de Impresión (No se muestra en pantalla) */}
            <div className="report-period-title no-print" style={{ marginBottom: '25px', paddingBottom: '15px', borderBottom: '2px solid var(--primary)' }}>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--primary)', textTransform: 'capitalize' }}>
                    Período del Informe: {formatFilterDate()}
                </h3>
            </div>

            {/* Tarjetas Superiores - Métricas Clave */}
            <div className="stats-grid-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <StatMetric title="Total Sesiones Atendidas" value={stats.asistencias?.asistio || 0} color="#00e676" />
                <StatMetric title="Inasistencias / Ausencias" value={stats.asistencias?.no_asistio || 0} color="#ff5252" />
                <StatMetric title="Pacientes Atendidos (Periodo)" value={stats.asistencias?.pacientes_atendidos || 0} color="#ffea00" />
                <StatMetric title="Total Sesiones Programadas" value={stats.asistencias?.total_sesiones || 0} color="var(--primary)" />
            </div>

            {/* Gráficos de Resumen */}
            <div className="stats-grid-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                {/* Asistencias Pie */}
                <div className="premium-card glass-panel chart-container" style={{ height: '360px' }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '1.05rem' }}>Ratio de Asistencia (Asistencias vs Ausencias)</h3>
                    <div style={{ height: '280px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieAsistencias} innerRadius={65} outerRadius={95} paddingAngle={5} dataKey="value" label isAnimationActive={false}>
                                    {pieAsistencias.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? '#00e676' : '#ff5252'} />)}
                                </Pie>
                                <RechartsTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="premium-card glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '30px' }}>
                    <h3 style={{ marginBottom: '15px', color: 'var(--primary)' }}>Resumen del Período</h3>
                    <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                        Este informe refleja la actividad del servicio basada en las firmas digitales de los pacientes y el registro de ausentismo.
                        El ratio de asistencia permite evaluar el compromiso de los pacientes con su tratamiento.
                    </p>
                </div>
            </div>

            {/* Tablas de Detalle */}
            <div className="stats-grid-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                {/* Patologías */}
                <div className="premium-card glass-panel">
                    <h3 style={{ marginBottom: '20px', fontSize: '1.05rem', color: '#ffea00' }}>🔬 Top Patologías / Diagnósticos</h3>
                    <DataTable data={patholData} column1="Patología" column2="Casos" dataKey1="name" dataKey2="casos" emptyMsg="No hay patologías registradas en este período." />
                </div>

                {/* Tratamientos */}
                <div className="premium-card glass-panel">
                    <h3 style={{ marginBottom: '20px', fontSize: '1.05rem', color: '#00e5ff' }}>💊 Tratamientos Aplicados</h3>
                    <DataTable data={treatData} column1="Tratamiento" column2="Usos" dataKey1="name" dataKey2="usos" emptyMsg="No hay tratamientos aplicados en este período." />
                </div>
            </div>

            <div className="stats-grid-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                {/* Médicos Derivantes */}
                <div className="premium-card glass-panel">
                    <h3 style={{ marginBottom: '20px', fontSize: '1.05rem', color: '#9c27b0' }}>👨‍⚕️ Derivaciones por Médico</h3>
                    <DataTable data={medicosData} column1="Médico Derivante" column2="Pacientes" dataKey1="name" dataKey2="derivaciones" emptyMsg="No hay derivaciones médicas en este período." />
                </div>

                {/* Instituciones */}
                <div className="premium-card glass-panel">
                    <h3 style={{ marginBottom: '20px', fontSize: '1.05rem', color: '#ff9800' }}>🏥 Instituciones de Origen</h3>
                    <DataTable data={instData} column1="Institución / Clínica" column2="Pacientes" dataKey1="name" dataKey2="derivaciones" emptyMsg="No hay instituciones origen en este período." />
                </div>
            </div>

            {/* Estilos para impresión mejorados - SOLUCIÓN RADICAL PARA PÁGINA EN BLANCO */}
            <style>{`
                @media print {
                    @page { margin: 1cm; size: A4 portrait; }
                    
                    /* Desactivar efectos visuales que rompen el motor de impresión */
                    * { 
                        filter: none !important; 
                        backdrop-filter: none !important; 
                        -webkit-backdrop-filter: none !important; 
                        box-shadow: none !important; 
                        text-shadow: none !important;
                        transition: none !important;
                        animation: none !important;
                    }

                    html, body {
                        background: white !important;
                        color: black !important;
                        width: 100%;
                        height: auto !important;
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    #root, .layout-container {
                        display: block !important;
                        height: auto !important;
                        min-height: 0 !important;
                        overflow: visible !important;
                        background: white !important;
                    }

                    /* Ocultar elementos innecesarios */
                    aside, nav, header, footer, .no-print, .user-profile, .logo { 
                        display: none !important; 
                        visibility: hidden !important;
                    }
                    
                    /* Forzar que el main ocupe todo el espacio */
                    main { 
                        display: block !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                        position: relative !important;
                    }

                    .stats-container {
                        display: block !important;
                        width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: white !important;
                    }

                    .print-header { 
                        display: block !important; 
                        margin-bottom: 25px; 
                        visibility: visible !important;
                    }
                    
                    .stats-grid-metrics { 
                        display: flex !important;
                        justify-content: space-between !important;
                        gap: 15px !important;
                        margin-bottom: 20px !important;
                    }

                    .stats-grid-metrics > div {
                        flex: 1 !important;
                    }

                    .stats-grid-two { 
                        display: block !important;
                        width: 100% !important;
                    }
                    
                    .premium-card, .glass-panel { 
                        background: white !important; 
                        border: 1px solid #eee !important; 
                        color: black !important;
                        page-break-inside: avoid !important;
                        margin-bottom: 20px !important;
                        padding: 15px !important;
                        border-radius: 4px !important;
                        display: block !important;
                    }

                    .chart-container {
                        height: 350px !important;
                        min-height: 350px !important;
                        border: 1px solid #f0f0f0 !important;
                    }

                    .recharts-responsive-container {
                        width: 100% !important;
                        height: 280px !important;
                        display: block !important;
                    }
                    
                    h1, h2, h3, h4, p, span, td, th { 
                        color: black !important; 
                    }

                    .report-period-title h3 { color: #0088cc !important; }

                    .recharts-text { fill: black !important; font-size: 10px !important; }
                    .recharts-cartesian-grid-line { stroke: #f0f0f0 !important; }
                    
                    table { width: 100% !important; border-collapse: collapse !important; border: 1px solid #eee !important; }
                    table th { 
                        border-bottom: 2px solid #0088cc !important; 
                        background: #fcfcfc !important;
                        padding: 8px !important;
                        font-size: 0.9rem;
                    }
                    table td { 
                        border-bottom: 1px solid #f0f0f0 !important; 
                        padding: 8px !important;
                        font-size: 0.85rem !important;
                    }
                }
            `}</style>
        </div>
    );
};

const StatMetric = ({ title, value, color }) => (
    <div className="premium-card glass-panel" style={{ padding: '20px', textAlign: 'center', borderTop: `4px solid ${color}` }}>
        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h4>
        <p style={{ fontSize: '2.4rem', fontWeight: '800', color }}>{value}</p>
    </div>
);

const DataTable = ({ data, column1, column2, dataKey1, dataKey2, emptyMsg }) => {
    if (!data || data.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>{emptyMsg}</p>;

    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
            <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 10px' }}>{column1}</th>
                    <th style={{ padding: '12px 10px', textAlign: 'right' }}>{column2}</th>
                </tr>
            </thead>
            <tbody>
                {data.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px 10px', fontWeight: '600' }}>{row[dataKey1]}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--primary)', fontWeight: '700' }}>{row[dataKey2]}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default StatsDashboard;
