import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, BarChart3, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/Global.css';

const Layout = ({ children }) => {
    const { user, logout, isAdmin } = useAuth();

    return (
        <div className="layout-container" style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0c' }}>
            {/* Sidebar */}
            <aside className="glass-panel" style={{ width: '280px', padding: '30px', margin: '20px', display: 'flex', flexDirection: 'column' }}>
                <div className="logo" style={{ marginBottom: '50px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="vibrant-gradient" style={{ width: '40px', height: '40px', borderRadius: '10px' }}></div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: '700', letterSpacing: '1px' }}>RAWSON KINE</h2>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <SidebarLink to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />
                    <SidebarLink to="/agenda" icon={<Calendar size={20} />} label="Agenda" />
                    <SidebarLink to="/pacientes" icon={<Users size={20} />} label="Pacientes" />
                    {isAdmin && <SidebarLink to="/estadisticas" icon={<BarChart3 size={20} />} label="Estadísticas" />}
                    {isAdmin && <SidebarLink to="/configuracion" icon={<Settings size={20} />} label="Configuración" />}
                </nav>

                <div className="user-profile" style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                        <div style={{ padding: '8px', background: 'var(--primary)', borderRadius: '50%', color: 'white' }}>{user?.nombre?.[0] || 'U'}</div>
                        <div>
                            <p style={{ fontSize: '0.9rem', fontWeight: '600' }}>{user?.nombre}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.role}</p>
                        </div>
                    </div>
                    <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--error)', background: 'none' }}>
                        <LogOut size={18} /> <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                {children}
            </main>
        </div>
    );
};

const SidebarLink = ({ to, icon, label }) => (
    <NavLink
        to={to}
        style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '12px',
            textDecoration: 'none',
            color: isActive ? 'white' : 'var(--text-muted)',
            background: isActive ? 'var(--primary)' : 'transparent',
            transition: 'all 0.3s ease'
        })}
    >
        {icon}
        <span>{label}</span>
    </NavLink>
);

export default Layout;
