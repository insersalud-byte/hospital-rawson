import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Download, Filter, FileText } from 'lucide-react';

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
            {/* Header y Filtros (No se imprimen los botones) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={24} color="var(--primary)" /> Informe Analítico
                    </h2>
                    <p style={{ color: 'var(--text-muted)' }}>Métricas e indicadores globales del sistema.</p>
                </div>
                <button onClick={handlePrint} className="vibrant-gradient" style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
                    borderRadius: '12px', fontWeight: '700', border: 'none', cursor: 'pointer', color: 'white'
                }}>
                    <Download size={18} /> IMPRIMIR / PDF
                </button>
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

            {/* Título de Impresión (Solo visible al imprimir o en pantalla como cabecera del cuadro) */}
            <div style={{ marginBottom: '25px', paddingBottom: '15px', borderBottom: '2px solid var(--primary)' }}>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--primary)', textTransform: 'capitalize' }}>
                    Período: {formatFilterDate()}
                </h3>
            </div>

            {/* Tarjetas Superiores */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <StatMetric title="Total Sesiones Atendidas" value={stats.asistencias?.asistio || 0} color="#00e676" />
                <StatMetric title="Ausentismo (Inasistencias)" value={stats.asistencias?.no_asistio || 0} color="#ff5252" />
                <StatMetric title="Total Pacientes Período" value={stats.asistencias?.total || 0} color="var(--primary)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                {/* Asistencias Pie */}
                <div className="premium-card glass-panel" style={{ height: '360px' }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '1.05rem' }}>Ratio de Asistencia</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <PieChart>
                            <Pie data={pieAsistencias} innerRadius={65} outerRadius={95} paddingAngle={5} dataKey="value" label>
                                {pieAsistencias.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? '#00e676' : '#ff5252'} />)}
                            </Pie>
                            <RechartsTooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '8px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Kinesiólogos Bar */}
                <div className="premium-card glass-panel" style={{ height: '360px' }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '1.05rem' }}>Sesiones Atendidas por Kinesiólogo</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={kineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="name" stroke="#888" fontSize={12} />
                            <YAxis stroke="#888" fontSize={12} allowDecimals={false} />
                            <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#111', border: 'none', borderRadius: '8px' }} />
                            <Bar dataKey="sesiones" fill="url(#colorKine)" radius={[6, 6, 0, 0]} />
                            <defs>
                                <linearGradient id="colorKine" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0088cc" stopOpacity={0.9} />
                                    <stop offset="95%" stopColor="#0088cc" stopOpacity={0.4} />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
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

            {/* Estilos para impresión */}
            <style>{`
                @media print {
                    body { background: white !important; color: black !important; }
                    .no-print { display: none !important; }
                    .premium-card, .glass-panel { 
                        background: white !important; 
                        border: 1px solid #ddd !important; 
                        box-shadow: none !important;
                        color: black !important;
                        page-break-inside: avoid;
                        margin-bottom: 20px;
                    }
                    * { color: black !important; text-shadow: none !important; }
                    .recharts-text { fill: black !important; }
                    table th { color: black !important; border-bottom: 2px solid #ccc !important; }
                    table td { border-bottom: 1px solid #eee !important; }
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
