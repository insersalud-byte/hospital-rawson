import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import axios from 'axios';
import Layout from './components/Layout';
import PatientList from './features/patients/PatientList';
import AgendaCalendar from './features/agenda/AgendaCalendar';
import StatsDashboard from './features/statistics/StatsDashboard';
import ConfigPage from './features/config/ConfigPage';
import './styles/Global.css';

const API_URL = import.meta.env.MODE === 'development' ? 'http://localhost:3005/api' : '/api';

// ─── Dashboard Admin ──────────────────────────────────────────────────────────
const Dashboard = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        <div className="premium-card vibrant-gradient" style={{ height: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px' }}>
            <h1 style={{ fontSize: '2.2rem', marginBottom: '10px' }}>Panel de Control (V5 - Eliminar Kinesiólogo)</h1>
            <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>Gestión clínica — Hospital Rawson Kinesiología.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <StatCard title="Pacientes Activos" value="—" color="var(--success)" />
            <StatCard title="Sesiones Hoy" value="—" color="var(--primary)" />
            <StatCard title="Cupos Libres" value="—" color="var(--accent)" />
            <StatCard title="Pendientes WA" value="—" color="var(--warning)" />
        </div>
    </div>
);

const StatCard = ({ title, value, color }) => (
    <div className="premium-card glass-panel" style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>{title}</h3>
        <p style={{ fontSize: '1.9rem', fontWeight: 'bold', color }}>{value}</p>
    </div>
);

// ─── Pantalla de Login ─────────────────────────────────────────────────────────
const Login = () => {
    const { login, user } = useAuth();
    const [professionals, setProfessionals] = useState([]);
    const [selectedKineId, setSelectedKineId] = useState('');
    const [step, setStep] = useState('inicio'); // 'inicio' | 'admin_pass' | 'kine' | 'kine_pass'
    const [password, setPassword] = useState('');

    useEffect(() => {
        axios.get(`${API_URL}/professionals`)
            .then(res => setProfessionals(res.data || []))
            .catch(() => setProfessionals([]));
    }, []);

    if (user) return <Navigate to="/" />;

    const handleAdminLogin = () => {
        if (password === '2123') {
            login({ id: 1, nombre: 'Administrador', role: 'ADMIN' });
        } else {
            alert('Contraseña de administrador incorrecta.');
        }
    };

    const handleKineLogin = () => {
        const kine = professionals.find(p => String(p.id) === String(selectedKineId));
        if (!kine) { alert('Seleccioná tu nombre de la lista.'); return; }

        if (password === kine.matricula) {
            login({ id: kine.id, nombre: kine.nombre, matricula: kine.matricula, role: 'KINESIOLOGO' });
        } else {
            alert('Matrícula incorrecta para este profesional.');
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--background)', padding: '20px'
        }}>
            <div className="premium-card glass-panel" style={{
                width: '100%', maxWidth: '440px', textAlign: 'center', padding: '45px 40px',
                border: '1px solid var(--primary)'
            }}>
                {/* Logo/Icono */}
                <div className="vibrant-gradient" style={{
                    width: '70px', height: '70px', borderRadius: '20px',
                    margin: '0 auto 22px', boxShadow: '0 0 25px rgba(0, 136, 204, 0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2rem'
                }}>🏥</div>

                <h2 style={{ fontSize: '1.9rem', letterSpacing: '-0.5px', marginBottom: '6px' }}>Hospital Rawson</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '36px', fontSize: '0.95rem' }}>
                    Servicio de Kinesiología
                </p>

                {step === 'inicio' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <button
                            className="vibrant-gradient"
                            style={loginBtnStyle}
                            onClick={() => { setStep('admin_pass'); setPassword(''); }}>
                            🔑 ENTRAR COMO ADMINISTRADOR
                        </button>
                        <button
                            style={{ ...loginBtnStyle, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)' }}
                            onClick={() => { setStep('kine'); setPassword(''); }}>
                            🩺 ENTRAR COMO KINESIÓLOGO
                        </button>
                    </div>
                )}

                {step === 'admin_pass' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '5px' }}>
                            Ingresá la clave de administrador:
                        </p>
                        <input
                            type="password"
                            placeholder="Clave Admin (Ej: 2123)"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                            style={{
                                width: '100%', padding: '14px 16px', borderRadius: '12px', boxSizing: 'border-box',
                                background: 'rgba(255,255,255,0.08)', color: 'white',
                                border: '1px solid var(--primary)', fontSize: '1rem', outline: 'none'
                            }}
                        />
                        <button
                            className="vibrant-gradient"
                            style={loginBtnStyle}
                            onClick={handleAdminLogin}>
                            ✅ INGRESAR
                        </button>
                        <button
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
                            onClick={() => setStep('inicio')}>
                            ← Volver
                        </button>
                    </div>
                )}

                {step === 'kine' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '5px' }}>
                            Seleccioná tu nombre para identificar tus atenciones:
                        </p>
                        <select
                            value={selectedKineId}
                            onChange={e => setSelectedKineId(e.target.value)}
                            style={{
                                width: '100%', padding: '14px 16px', borderRadius: '12px',
                                background: '#111318', color: 'white',
                                border: '1px solid var(--primary)', fontSize: '1rem', cursor: 'pointer'
                            }}>
                            <option value="">— Seleccioná tu nombre —</option>
                            {professionals.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.nombre}
                                </option>
                            ))}
                        </select>
                        {professionals.length === 0 && (
                            <p style={{ color: '#ffea00', fontSize: '0.8rem' }}>
                                ⚠️ No hay kinesiólogos cargados. Pedile al Administrador que los configure.
                            </p>
                        )}
                        <button
                            className="vibrant-gradient"
                            style={{ ...loginBtnStyle, opacity: !selectedKineId ? 0.5 : 1, cursor: !selectedKineId ? 'not-allowed' : 'pointer' }}
                            onClick={() => {
                                if (selectedKineId) { setStep('kine_pass'); setPassword(''); }
                            }}>
                            → CONTINUAR
                        </button>
                        <button
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
                            onClick={() => setStep('inicio')}>
                            ← Volver
                        </button>
                    </div>
                )}

                {step === 'kine_pass' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '5px' }}>
                            Ingresá tu matrícula para confirmar identidad:
                        </p>
                        <input
                            type="password"
                            placeholder="Número de Matrícula"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleKineLogin()}
                            style={{
                                width: '100%', padding: '14px 16px', borderRadius: '12px', boxSizing: 'border-box',
                                background: 'rgba(255,255,255,0.08)', color: 'white',
                                border: '1px solid var(--primary)', fontSize: '1rem', outline: 'none'
                            }}
                        />
                        <button
                            className="vibrant-gradient"
                            style={loginBtnStyle}
                            onClick={handleKineLogin}>
                            ✅ INGRESAR
                        </button>
                        <button
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
                            onClick={() => setStep('kine')}>
                            ← Cambiar kinesiólogo
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const loginBtnStyle = {
    padding: '17px', borderRadius: '14px', fontWeight: '700',
    fontSize: '1rem', cursor: 'pointer', border: 'none', color: 'white'
};

// ─── Ruta Protegida ────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/login" />;
    return <Layout>{children}</Layout>;
};

// ─── App ───────────────────────────────────────────────────────────────────────
function App() {
    return (
        <Router basename="/">
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/agenda" element={<ProtectedRoute><AgendaCalendar /></ProtectedRoute>} />
                    <Route path="/pacientes" element={<ProtectedRoute><PatientList /></ProtectedRoute>} />
                    <Route path="/estadisticas" element={<ProtectedRoute><StatsDashboard /></ProtectedRoute>} />
                    <Route path="/configuracion" element={<ProtectedRoute><ConfigPage /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;
