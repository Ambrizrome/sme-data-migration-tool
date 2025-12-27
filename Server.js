require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Configuración de MySQL
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Crear pool de conexiones MySQL
const pool = mysql.createPool(dbConfig);

// --- FUNCIONES DE INICIALIZACIÓN DE TABLAS ---

// 1. Configurar tabla Empleados (Sin romper la estructura existente)
const setupEmpleadosTable = async () => {
  try {
    // Intentamos crear la tabla solo si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS empleados (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255),
        IdEmpleado VARCHAR(50) NOT NULL,
        rfc VARCHAR(13),
        nss VARCHAR(20),
        puesto VARCHAR(100),
        fechaIngreso DATE,
        sueldo DECIMAL(10, 2),
        horas INT,
        UNIQUE KEY unique_id_empleado (IdEmpleado)
      )
    `);
    console.log("Tabla 'empleados' verificada/lista.");
  } catch (err) {
    console.error("Error al verificar tabla empleados:", err.message);
  }
};

// 2. Crear tabla Nominas con la relación correcta (FK hacia empleados.id)
const createNominasTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Nominas (
        IdNomina INT AUTO_INCREMENT PRIMARY KEY,
        id_empleado_interno INT NOT NULL, 
        IdEmpleadoCredencial VARCHAR(50), 
        IdDepartamento VARCHAR(100),
        Supervisor VARCHAR(255),
        Dias_Trabajados DECIMAL(5, 2),
        TotalPercepciones DECIMAL(10, 2),
        TotalDeducciones DECIMAL(10, 2),
        TotalNetoPagado DECIMAL(10, 2),
        fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fechaInicioPeriodo DATE,
        fechaFinPeriodo DATE,
        
        -- Relación Sólida: Apunta al ID único autoincrementable de empleados
        CONSTRAINT fk_empleado_nomina 
        FOREIGN KEY (id_empleado_interno) REFERENCES empleados(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
      )
    `);
    console.log("Tabla 'Nominas' verificada/lista (Relación FK correcta).");
  } catch (err) {
    // Si el error es que la tabla ya existe pero está mal definida, podrías necesitar borrarla manualmente una vez
    console.error("Error al crear tabla Nominas:", err.message);
  }
};

// Función maestra de conexión
const testConnection = async () => {
  try {
    console.log("Intentando conectar a MySQL...");
    console.log("Configuración:", {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database ? dbConfig.database : "NO CONFIGURADO"
    });
    
    const connection = await pool.getConnection();
    console.log(`Conectado a MySQL: ${dbConfig.database || 'Base de datos no especificada'}`);
    connection.release();
    
    // Inicializar tablas en orden (Empleados primero, luego Nóminas)
    await setupEmpleadosTable();
    await createNominasTable();
    
  } catch (err) {
    console.error("Error de conexión a Base de Datos:", err.message);
    console.error("Verifica que:");
    console.error("   1. MySQL esté corriendo en el puerto 3306");
    console.error("   2. El archivo .env exista en la carpeta backend/");
    console.error("   3. Las credenciales en .env sean correctas");
    console.error("   4. La base de datos especificada exista en MySQL");
  }
};

// Inicializar BD
testConnection();

// Servir archivos estáticos del frontend
const path = require("path");
app.use(express.static(path.join(__dirname, "../frontend")));

// --- ENDPOINTS ---

// Ruta raíz - información del servidor
app.get("/", (req, res) => {
  res.json({
    message: "Servidor de Nóminas funcionando correctamente",
    endpoints: [
      "GET /api/employees - Listar empleados",
      "POST /api/employees - Guardar empleados",
      "DELETE /api/employees/:id - Eliminar empleado",
      "GET /api/nominas - Listar nóminas",
      "POST /api/nominas - Guardar nómina"
    ],
    frontend: "Abre index.html desde la carpeta frontend o accede directamente al archivo"
  });
});

// GET: Listar empleados
app.get("/api/employees", async (req, res) => {
  try {
    console.log("Recibida petición GET /api/employees");
    const [rows] = await pool.query("SELECT * FROM empleados ORDER BY id DESC");
    console.log(`Empleados encontrados: ${rows.length}`);
    res.json(rows);
  } catch (err) {
    console.error("Error al listar empleados:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Función auxiliar para calcular datos de nómina
const calcularDatosNomina = (emp) => {
  const sueldoBruto = Number(emp.sueldo) || 0;
  const horas = Number(emp.horas) || 160; // Default 160 horas mensuales si no se especifica
  const diasTrabajados = horas > 0 ? Math.round((horas / 8) * 100) / 100 : 20; // Default 20 días
  
  // Calcular deducciones (ISR 25%, IMSS 13%)
  const isr = sueldoBruto * 0.25;
  const imss = sueldoBruto * 0.13;
  const totalDeducciones = isr + imss;
  const totalNetoPagado = sueldoBruto - totalDeducciones;
  
  // Generar IdDepartamento basado en el puesto
  const puesto = emp.puesto || 'General';
  const idDepartamento = `DEP-${puesto.substring(0, 3).toUpperCase()}`;
  
  // Supervisor por defecto o basado en el puesto
  const supervisor = puesto.includes('Jr') || puesto.includes('Junior') 
    ? 'Supervisor de Desarrollo' 
    : puesto.includes('Senior') || puesto.includes('Sr')
    ? 'Gerente de Área'
    : 'Supervisor General';
  
  // Fechas del período (mes actual)
  const hoy = new Date();
  const fechaInicioPeriodo = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const fechaFinPeriodo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  
  return {
    IdDepartamento: idDepartamento,
    Supervisor: supervisor,
    Dias_Trabajados: diasTrabajados,
    TotalPercepciones: sueldoBruto,
    TotalDeducciones: totalDeducciones,
    TotalNetoPagado: totalNetoPagado,
    fechaInicioPeriodo: fechaInicioPeriodo.toISOString().split('T')[0],
    fechaFinPeriodo: fechaFinPeriodo.toISOString().split('T')[0]
  };
};

// POST: Guardar empleados
app.post("/api/employees", async (req, res) => {
  try {
    console.log("Recibida petición POST /api/employees");
    console.log("Body recibido:", JSON.stringify(req.body, null, 2));
    
    const { employees } = req.body;
    if (!employees || !Array.isArray(employees)) {
      console.error("Error: Se espera un array 'employees'");
      return res.status(400).json({ error: "Se espera un array 'employees'" });
    }

    console.log(`Total de empleados recibidos: ${employees.length}`);

    const queryEmpleado = `
      INSERT INTO empleados (nombre, IdEmpleado, rfc, nss, puesto, fechaIngreso, sueldo, horas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      nombre=VALUES(nombre), sueldo=VALUES(sueldo), puesto=VALUES(puesto)
    `;

    const queryNomina = `
      INSERT INTO Nominas (
        id_empleado_interno, IdEmpleadoCredencial, IdDepartamento, Supervisor, 
        Dias_Trabajados, TotalPercepciones, TotalDeducciones, TotalNetoPagado,
        fechaInicioPeriodo, fechaFinPeriodo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    let procesados = 0;
    let nominasCreadas = 0;
    let omitidos = 0;
    const errores = [];

    for (const emp of employees) {
        // Generar IdEmpleado si no existe
        if (!emp.IdEmpleado) {
          // Generar un ID único basado en el nombre o un timestamp
          emp.IdEmpleado = `EMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          console.log(`Empleado sin IdEmpleado, generado: ${emp.IdEmpleado} para ${emp.nombre}`);
        }

        try {
          // 1. Guardar o actualizar empleado
          const [result] = await pool.query(queryEmpleado, [
              emp.nombre || null, 
              emp.IdEmpleado, 
              emp.rfc || null, 
              emp.nss || null, 
              emp.puesto || null, 
              emp.fechaIngreso || null, 
              emp.sueldo || 0, 
              emp.horas || 0
          ]);
          
          let idInternoEmpleado;
          
          if (result.insertId) {
            // Nuevo empleado insertado
            idInternoEmpleado = result.insertId;
            procesados++;
            console.log(`Empleado guardado: ${emp.IdEmpleado} - ${emp.nombre} (ID interno: ${idInternoEmpleado})`);
          } else {
            // Empleado actualizado (ON DUPLICATE KEY UPDATE)
            // Necesitamos obtener el ID interno del empleado existente
            const [empRows] = await pool.query("SELECT id FROM empleados WHERE IdEmpleado = ?", [emp.IdEmpleado]);
            if (empRows.length > 0) {
              idInternoEmpleado = empRows[0].id;
              procesados++;
              console.log(`ℹEmpleado actualizado: ${emp.IdEmpleado} - ${emp.nombre} (ID interno: ${idInternoEmpleado})`);
            } else {
              throw new Error("No se pudo obtener el ID interno del empleado");
            }
          }

          // 2. Crear nómina automáticamente para el empleado
          try {
            const datosNomina = calcularDatosNomina(emp);
            
            await pool.query(queryNomina, [
              idInternoEmpleado,           // FK: id_empleado_interno
              emp.IdEmpleado,              // IdEmpleadoCredencial
              datosNomina.IdDepartamento,
              datosNomina.Supervisor,
              datosNomina.Dias_Trabajados,
              datosNomina.TotalPercepciones,
              datosNomina.TotalDeducciones,
              datosNomina.TotalNetoPagado,
              datosNomina.fechaInicioPeriodo,
              datosNomina.fechaFinPeriodo
            ]);
            
            nominasCreadas++;
            console.log(`Nómina creada automáticamente para: ${emp.nombre} (FK: ${idInternoEmpleado})`);
          } catch (nominaErr) {
            console.error(`Error al crear nómina para ${emp.nombre}:`, nominaErr.message);
            // No fallamos el proceso completo si falla la nómina
          }
          
        } catch (err) {
          omitidos++;
          errores.push({ empleado: emp.nombre || emp.IdEmpleado, error: err.message });
          console.error(`Error al guardar empleado ${emp.IdEmpleado}:`, err.message);
        }
    }

    console.log(`Resumen: ${procesados} empleados procesados, ${nominasCreadas} nóminas creadas, ${omitidos} omitidos`);
    
    if (errores.length > 0) {
      console.error("Errores encontrados:", errores);
    }

    res.json({ 
      message: "Empleados procesados correctamente",
      procesados,
      nominasCreadas,
      omitidos,
      errores: errores.length > 0 ? errores : undefined
    });
  } catch (err) {
    console.error("Error general al guardar empleados:", err);
    res.status(500).json({ error: "Error al guardar empleados", details: err.message });
  }
});

// DELETE: Eliminar empleado
app.delete("/api/employees/:id", async (req, res) => {
  try {
    const { id } = req.params;
    // Borrar por ID interno o por IdEmpleado (Credencial)
    const [result] = await pool.query("DELETE FROM empleados WHERE id = ? OR IdEmpleado = ?", [id, id]);
    
    if (result.affectedRows === 0) return res.status(404).json({ error: "Empleado no encontrado" });
    res.json({ message: "Empleado eliminado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Guardar Nómina (OPTIMIZADO)
app.post("/api/nominas", async (req, res) => {
  try {
    const { 
      IdEmpleado, // Este es el string (ej: "EMP001") que viene del frontend
      IdDepartamento, Supervisor, Dias_Trabajados, 
      TotalPercepciones, TotalDeducciones, TotalNetoPagado 
    } = req.body;

    if (!IdEmpleado) return res.status(400).json({ error: "IdEmpleado es requerido" });

    // 1. BUSCAR EL ID INTERNO (PK) DEL EMPLEADO
    const [empRows] = await pool.query("SELECT id FROM empleados WHERE IdEmpleado = ?", [IdEmpleado]);
    
    if (empRows.length === 0) {
      return res.status(404).json({ error: `El empleado con ID ${IdEmpleado} no existe en la base de datos.` });
    }

    const idInterno = empRows[0].id; // Este es el ID numérico real (PK)

    // 2. INSERTAR LA NÓMINA USANDO EL ID INTERNO
    const insertQuery = `
      INSERT INTO Nominas (
        id_empleado_interno, IdEmpleadoCredencial, IdDepartamento, Supervisor, 
        Dias_Trabajados, TotalPercepciones, TotalDeducciones, TotalNetoPagado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await pool.query(insertQuery, [
      idInterno, IdEmpleado, IdDepartamento, Supervisor, 
      Dias_Trabajados, TotalPercepciones, TotalDeducciones, TotalNetoPagado
    ]);

    res.json({ message: "Nómina guardada exitosamente" });

  } catch (err) {
    console.error("Error al guardar nómina:", err.message);
    res.status(500).json({ error: "Error al guardar nómina", details: err.message });
  }
});

// GET: Obtener Nóminas (con JOIN para traer datos del empleado)
app.get("/api/nominas", async (req, res) => {
  try {
    // Hacemos un JOIN para que aunque guardamos el ID numérico, tú veas el nombre y datos del empleado
    const query = `
      SELECT n.*, e.nombre, e.puesto 
      FROM Nominas n
      JOIN empleados e ON n.id_empleado_interno = e.id
      ORDER BY n.IdNomina DESC
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`\nServidor corriendo en http://localhost:${PORT}`);
});