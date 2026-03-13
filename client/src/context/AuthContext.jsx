import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const ROLES = {
    ADMIN: 'ADMIN',
    KINESIOLOGO: 'KINESIOLOGO'
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulated auth check - in a hospital environment, usually there's a simple login
        const savedUser = localStorage.getItem('hospital_rawson_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        setUser(userData);
        localStorage.setItem('hospital_rawson_user', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('hospital_rawson_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === ROLES.ADMIN, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
