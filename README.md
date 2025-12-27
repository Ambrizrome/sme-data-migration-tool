# sme-data-migration-tool
JavaScript app for automating Excel-to-MySQL data ingestion for SME HR records.
# Sistema de Digitalización de Nóminas

Sistema web para la gestión de empleados y digitalización de nóminas con frontend y backend separados.

## Estructura del Proyecto

```
PruebaProyectoNomina/
├── backend/           # Servidor Node.js con Express y SQLite
│   ├── Server.js     # Servidor principal
│   └── package.json  # Dependencias del backend
├── frontend/         # Interfaz web
│   └── index.html    # Aplicación web principal
├── .gitignore       # Archivos a ignorar en Git
└── README.md        # Este archivo
```

## Características

- **Frontend**: Interfaz web moderna con Tailwind CSS
- **Backend**: API REST con Express.js y MySQL
- **Funcionalidades**:
  - Carga de archivos Excel (.xls, .xlsx)
  - Edición de datos de empleados
  - Generación de PDFs individuales y masivos
  - Almacenamiento en base de datos MySQL
  - Búsqueda y filtrado de empleados

## Instalación y Uso

### Backend

1. Navegar a la carpeta backend:
   ```bash
   cd backend
   ```
   Configurar correctamente el archivo .env


2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Ejecutar el servidor:
   ```bash
   npm start
   # o para desarrollo con auto-reload:
   npm run dev
   ```

El servidor estará disponible en `http://localhost:3001`

### Frontend

1. Una vez corriendo el servidor ingresará a
`http://localhost:3001`

## API Endpoints

- `POST /api/employees` - Guardar empleados en la base de datos
- `GET /api/employees` - Obtener lista de empleados

## Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3 (Tailwind), JavaScript (Vanilla)
- **Backend**: Node.js, Express.js, SQLite3
- **Librerías**: SheetJS (Excel), jsPDF (PDFs), Tailwind CSS

## Base de Datos

El sistema utiliza MySQL con la siguiente estructura:

```sql
CREATE TABLE empleados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT,
  rfc TEXT,
  nss TEXT,
  puesto TEXT,
  fechaIngreso TEXT,
  sueldo REAL,
  horas INTEGER
);
```
Los datos de los empleado serán reflejados en MySQL

## Desarrollo

Para desarrollo, se recomienda usar `nodemon` para auto-reload del servidor:

```bash
npm run dev
```
#sme-data-migration-tool
