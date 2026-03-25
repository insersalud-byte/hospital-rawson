import React, { useState, useRef, useEffect } from 'react';

/**
 * CustomSelect - Un dropdown estilizado que reemplaza al <select> nativo
 * para asegurar un fondo oscuro consistente en todos los navegadores.
 */
const CustomSelect = ({ value, onChange, options, placeholder = 'Seleccionar...', style = {} }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Cerrar el menú si se hace click afuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => String(opt.value) === String(value));

    const containerStyle = {
        position: 'relative',
        width: '100%',
        fontFamily: 'inherit',
        ...style
    };

    const headerStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#111318',
        border: '1px solid ' + (isOpen ? 'var(--primary)' : 'var(--border)'),
        borderRadius: '12px',
        padding: '12px 16px',
        cursor: 'pointer',
        fontSize: '0.95rem',
        transition: 'all 0.2s ease',
        userSelect: 'none',
        color: selectedOption ? 'white' : 'var(--text-muted)',
    };

    const listStyle = {
        position: 'absolute',
        top: 'calc(100% + 5px)',
        left: 0,
        width: '100%',
        background: '#111318',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
        zIndex: 9999,
        maxHeight: '220px',
        overflowY: 'auto',
        overflowX: 'hidden'
    };

    const itemStyle = (isSel, isHover) => ({
        padding: '11px 16px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        transition: 'all 0.2s ease',
        background: isSel ? 'var(--primary)' : (isHover ? 'rgba(255,255,255,0.06)' : 'transparent'),
        color: isSel ? 'white' : 'var(--text-main)',
    });

    return (
        <div ref={dropdownRef} style={containerStyle}>
            <div onClick={() => setIsOpen(!isOpen)} style={headerStyle}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <span style={{ 
                    fontSize: '0.7rem',
                    transition: 'transform 0.3s ease',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    opacity: 0.6,
                    marginLeft: '10px'
                }}>
                    ▼
                </span>
            </div>

            {isOpen && (
                <div style={listStyle} className="custom-scrollbar">
                    {options.length === 0 ? (
                        <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin opciones</div>
                    ) : (
                        options.map((opt) => (
                            <OptionItem 
                                key={opt.value} 
                                opt={opt} 
                                isSelected={String(opt.value) === String(value)}
                                onClick={(val) => {
                                    onChange({ target: { value: val } });
                                    setIsOpen(false);
                                }}
                                itemStyle={itemStyle}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

const OptionItem = ({ opt, isSelected, onClick, itemStyle }) => {
    const [isHover, setIsHover] = useState(false);
    return (
        <div 
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => setIsHover(false)}
            onClick={() => onClick(opt.value)}
            style={itemStyle(isSelected, isHover)}
        >
            {opt.label}
        </div>
    );
};

export default CustomSelect;
