import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import axios from 'axios';
import CustomSelect from './components/ui/CustomSelect';
import Layout from './components/Layout';
import PatientList from './features/patients/PatientList';
import AgendaCalendar from './features/agenda/AgendaCalendar';
import StatsDashboard from './features/statistics/StatsDashboard';
import ConfigPage from './features/config/ConfigPage';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import './styles/Global.css';

const API_URL = import.meta.env.MODE === 'development' ? 'http://localhost:3005/api' : '/api';

// ─── Dashboard Admin ──────────────────────────────────────────────────────────
const SLOTS_MANANA = ['08:00', '08:45', '09:30', '10:15', '11:00', '11:45'];
const SLOTS_TARDE  = ['14:00', '14:45', '15:30', '16:15', '17:00', '17:45'];

const calcFreeSlots = (daySessions) => {
    let manana = 0, tarde = 0;
    SLOTS_MANANA.forEach(slot => {
        const used = daySessions.filter(s => (s.hora || '').substring(0, 5) === slot).length;
        manana += Math.max(0, 2 - used);
    });
    SLOTS_TARDE.forEach(slot => {
        const used = daySessions.filter(s => (s.hora || '').substring(0, 5) === slot).length;
        tarde += Math.max(0, 2 - used);
    });
    return { manana, tarde };
};

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [sesionesHoy, setSesionesHoy] = useState(0);
    const [libresManana, setLibresManana] = useState(0);
    const [libresTarde, setLibresTarde] = useState(0);
    const [proxDia, setProxDia] = useState(null);
    const [patients, setPatients] = useState([]);
    const [sessions, setSessions] = useState([]);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resSes, resPat] = await Promise.all([
                axios.get(`${API_URL}/sessions`),
                axios.get(`${API_URL}/patients`)
            ]);
            const allSessions = resSes.data || [];
            const allPatients = resPat.data || [];
            setSessions(allSessions);
            setPatients(allPatients);

            const todayStr = new Date().toISOString().split('T')[0];
            const todaySess = allSessions.filter(s => s.fecha === todayStr && s.estado === 'programado');
            setSesionesHoy(todaySess.length);

            const { manana, tarde } = calcFreeSlots(todaySess);
            setLibresManana(manana);
            setLibresTarde(tarde);

            if (manana + tarde === 0) {
                let found = null;
                for (let i = 1; i <= 14; i++) {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    if (d.getDay() === 0) continue; // skip Sunday
                    const dStr = d.toISOString().split('T')[0];
                    const dSess = allSessions.filter(s => s.fecha === dStr && s.estado === 'programado');
                    const { manana: m, tarde: t } = calcFreeSlots(dSess);
                    if (m + t > 0) { found = { fecha: d, manana: m, tarde: t }; break; }
                }
                setProxDia(found);
            } else {
                setProxDia(null);
            }
        } catch (err) {
            console.error('Dashboard error:', err);
        } finally {
            setLoading(false);
        }
    };

    const deletablePatients = patients.filter(p =>
        !sessions.some(s => String(s.paciente_id) === String(p.id) && s.estado === 'asistió')
    );
    const totalLibresHoy = libresManana + libresTarde;

    if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>⏳ Cargando panel...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

            {/* Fila 1: Header + stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px' }}>
                <div className="premium-card vibrant-gradient" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '36px' }}>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Hospital Rawson</h1>
                    <p style={{ fontSize: '1rem', opacity: 0.9 }}>Servicio de Kinesiología</p>
                    <p style={{ fontSize: '0.82rem', opacity: 0.7, marginTop: '8px', textTransform: 'capitalize' }}>
                        {format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })}
                    </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <StatCard title="Sesiones Hoy" value={sesionesHoy} color="var(--primary)" />
                    <StatCard title="Total Pacientes" value={patients.length} color="var(--success)" />
                    <StatCard title="Cupos Libres Hoy" value={totalLibresHoy} color={totalLibresHoy > 0 ? 'var(--accent)' : '#ff5252'} />
                    <StatCard title="Sin Atender" value={deletablePatients.length} color="var(--warning)" />
                </div>
            </div>

            {/* Fila 2: Cupos mañana / tarde / próximo día */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '18px' }}>
                <div className="premium-card glass-panel" style={{ textAlign: 'center', borderTop: `4px solid ${libresManana > 0 ? '#00e5ff' : '#ff5252'}` }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.73rem', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '10px' }}>☀️ CUPOS MAÑANA — HOY</p>
                    <p style={{ fontSize: '2.6rem', fontWeight: '800', color: libresManana > 0 ? '#00e5ff' : '#ff5252', lineHeight: 1 }}>{libresManana}</p>
                    <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '6px' }}>08:00 – 12:45 hs</p>
                </div>
                <div className="premium-card glass-panel" style={{ textAlign: 'center', borderTop: `4px solid ${libresTarde > 0 ? '#00e5ff' : '#ff5252'}` }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.73rem', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '10px' }}>🌙 CUPOS TARDE — HOY</p>
                    <p style={{ fontSize: '2.6rem', fontWeight: '800', color: libresTarde > 0 ? '#00e5ff' : '#ff5252', lineHeight: 1 }}>{libresTarde}</p>
                    <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '6px' }}>14:00 – 17:45 hs</p>
                </div>
                <div className="premium-card glass-panel" style={{ textAlign: 'center', borderTop: '4px solid var(--primary)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.73rem', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '10px' }}>📅 PRÓXIMO DÍA DISPONIBLE</p>
                    {totalLibresHoy > 0 ? (
                        <>
                            <p style={{ fontSize: '1.1rem', fontWeight: '800', color: '#00e676' }}>HOY</p>
                            <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '6px' }}>Hay cupos disponibles hoy</p>
                        </>
                    ) : proxDia ? (
                        <>
                            <p style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'capitalize' }}>
                                {format(proxDia.fecha, "EEEE d/MM", { locale: es })}
                            </p>
                            <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                                {proxDia.manana > 0 ? `☀️ ${proxDia.manana} mañana` : ''}
                                {proxDia.manana > 0 && proxDia.tarde > 0 ? ' · ' : ''}
                                {proxDia.tarde > 0 ? `🌙 ${proxDia.tarde} tarde` : ''}
                            </p>
                        </>
                    ) : (
                        <p style={{ fontSize: '0.88rem', fontWeight: '700', color: '#ff5252', marginTop: '6px' }}>Sin cupos en 14 días</p>
                    )}
                </div>
            </div>

        </div>
    );
};

const StatCard = ({ title, value, color }) => (
    <div className="premium-card glass-panel" style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '700', letterSpacing: '0.3px' }}>{title}</h3>
        <p style={{ fontSize: '2rem', fontWeight: '800', color }}>{value}</p>
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

        if (String(password).trim() === String(kine.matricula).trim()) {
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

                <h2 style={{ fontSize: '1.9rem', letterSpacing: '-0.5px', marginBottom: '6px' }}>Hospital Rawson (v3.2)</h2>
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
                        <CustomSelect
                            value={selectedKineId}
                            onChange={e => setSelectedKineId(e.target.value)}
                            options={professionals.map(p => ({ value: p.id, label: p.nombre }))}
                            placeholder="— Seleccioná tu nombre —"
                            style={{ width: '100%' }}
                        />
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
