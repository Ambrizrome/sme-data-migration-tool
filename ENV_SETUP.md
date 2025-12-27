# Configuración de Variables de Entorno

Para conectar el proyecto a MySQL Workbench, necesitas crear un archivo `.env` en la carpeta `backend/` con la siguiente estructura:

## Pasos:

1. Crea un archivo llamado `.env` en la carpeta `backend/`

2. Agrega las siguientes variables con tus credenciales de MySQL:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=tu_usuario_mysql
DB_PASSWORD=tu_contraseña_mysql
DB_DATABASE=nombre_de_tu_base_de_datos

# Puerto del servidor (opcional)
PORT=3001
```

## Ejemplo:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=mi_password123
DB_DATABASE=DataBase
PORT=3001
```

## Notas importantes:

- Asegúrate de que la base de datos ya exista en MySQL, o crea una nueva desde MySQL Workbench
- El nombre de la base de datos debe coincidir exactamente con el valor de `DB_DATABASE`
- El servidor creará automáticamente la tabla `empleados` si no existe

## Después de crear el .env:

1. Instala las nuevas dependencias:
   ```bash
   cd backend
   npm install
   ```

2. Inicia el servidor:
   ```bash
   npm start
   ```

Si todo está configurado correctamente, verás el mensaje: "Conectado a MySQL correctamente"

