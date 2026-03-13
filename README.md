# Hospital Rawson - Servicio de Kinesiología y Fisioterapia

Aplicación de uso interno para la gestión de pacientes, agenda clínica y persistencia en Excel.

## 🚀 Inicio Rápido

### 1. Servidor (Backend & Excel)
```bash
cd server
npm install
node index.js
```
El servidor corre en el puerto `3001` y gestiona el archivo `db/hospital_rawson_kinesiologia.xlsx`.

### 2. Cliente (Frontend)
```bash
cd client
npm install
npm run dev
```
La aplicación estará disponible en `http://localhost:5173`.

---

## 🛠️ Reglas del Sistema
- **Agenda**: Slots fijos de 45 minutos. Capacidad máxima de 2 pacientes por kinesiólogo por slot.
- **Persistencia**: Todos los datos se guardan en el Excel acumulativo. Se genera un backup automático en cada guardado.
- **Roles**: 
  - **ADMIN**: Control total, gestión de maestros, estadísticas y recuperación de sesiones.
  - **KINESIÓLOGO**: Gestión operativa de agenda y sesiones diarias.

---

## 🧉 Santi Master Orchestrator
Este sistema está bajo la supervisión de **Santi Master**, asegurando la integridad de los datos y la eficiencia operativa del Hospital Rawson.
