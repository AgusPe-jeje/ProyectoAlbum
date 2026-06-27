/* ========================================================================
   📦 REQUERIMIENTOS, CONFIGURACIONES INICIALES Y CACHÉ
   ======================================================================== */
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); 
const path = require('path');
const BITACORAS_SALA_CACHE = {};

const app = express();

const jwt = require('jsonwebtoken'); 
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_super_segura_para_la_arena';

// ✨ Clave para leer la IP real del cliente detrás del proxy de Render
app.set('trust proxy', true);

// ✨ Render asigna el puerto dinámicamente; si no encuentra, usa el 3000
const PORT = process.env.PORT || 3000;

// Habilitamos CORS y JSON arriba de todo para que los middlewares lean el body sin problemas
app.use(cors());
app.use(express.json());

// Genera un código de 6 caracteres únicos para las salas
function generarCodigoSala() {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let resultado = '';
    for (let i = 0; i < 6; i++) {
        resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return resultado;
}

/* ========================================================================
   🛡️ MIDDLEWARE CORE: VERIFICACIÓN DE TOKEN JWT
   ======================================================================== */
const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
        return res.status(401).json({ ok: false, error: "🔒 Acceso denegado. Iniciá sesión en la Arena." });
    }

    try {
        const verificado = jwt.verify(token, JWT_SECRET);
        req.usuarioLogueado = verificado; // Guardamos id y username descifrados en la petición
        next();
    } catch (err) {
        return res.status(403).json({ ok: false, error: "❌ Sesión inválida o expirada. Volvé a loguearte." });
    }
};

/* ========================================================================
   🛠️ MIDDLEWARE: MODO MANTENIMIENTO / ACCESO SELECTIVO TESTERS
   ======================================================================== */
const MODO_MANTENIMIENTO = true; 
const TESTERS_PERMITIDOS = ["aguspe", "evevea"]; 

app.use((req, res, next) => {
    if (!MODO_MANTENIMIENTO) {
        return next();
    }

    // A. Permitimos descargar los archivos estáticos para que cargue la interfaz visual
    if (req.method === 'GET' && (req.path === '/' || req.path.endsWith('.html') || req.path.endsWith('.css') || req.path.endsWith('.js') || req.path.endsWith('.png') || req.path.endsWith('.jpg'))) {
        return next();
    }

    // B. Filtro estricto para las rutas de autenticación (Login)
    if (req.path.startsWith('/api/login')) {
        const { username } = req.body;
        
        if (username && TESTERS_PERMITIDOS.includes(username.trim().toLowerCase())) {
            return next();
        }
        
        return res.status(503).json({ 
            error: "🚧 La Arena está en mantenimiento por reformas de infraestructura. ¡Volvé más tarde, pa! 🏗️" 
        });
    }

    // Bloqueamos el registro por completo en mantenimiento
    if (req.path.startsWith('/api/registro')) {
        return res.status(503).json({ 
            error: "🚧 La Arena está en mantenimiento. El registro de nuevas cuentas está cerrado por el momento." 
        });
    }

    // C. Si la petición viene de adentro (APIs internas), dejamos pasar
    next();
});

// Carpeta estática asignada después del filtro de mantenimiento
app.use(express.static(path.join(__dirname)));

/* ========================================================================
   📦 CONFIGURACIÓN, INICIALIZACIÓN Y CARGA DE BASE DE DATOS (NEON)
   ======================================================================== */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } 
});

pool.query('SELECT NOW()', (err, res) => {
    if (err) console.error('❌ Error de conexión a Neon:', err.message);
    else console.log('📦 Conectado con éxito a PostgreSQL en Neon.');
});

async function inicializarTablas() {
    try {
        // 1. Tabla de Usuarios
        await pool.query(`CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password TEXT NOT NULL,
            monedas INTEGER DEFAULT 200,
            puntos_ranking INTEGER DEFAULT 0,
            ultimo_tiro_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            tiros_hoy INTEGER DEFAULT 10,
            ip_registro VARCHAR(45) DEFAULT '',
            ultimo_giro_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            timbas_hoy INTEGER DEFAULT 10,
            copas_mundiales INTEGER DEFAULT 0, 
            ultima_timba_mundial TIMESTAMP WITH TIME ZONE DEFAULT NULL
        )`);

        // 2. Tabla de Jugadores
        await pool.query(`CREATE TABLE IF NOT EXISTS jugadores (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(100) UNIQUE NOT NULL,
            pais VARCHAR(50) NOT NULL,
            bandera VARCHAR(10) NOT NULL,
            posicion VARCHAR(50) NOT NULL,
            foto TEXT NOT NULL,
            rareza VARCHAR(20) NOT NULL
        )`);

        // 3. Tabla de Progreso (Álbum)
        await pool.query(`CREATE TABLE IF NOT EXISTS usuario_progreso (
            usuario_id INTEGER REFERENCES usuarios(id),
            jugador_id INTEGER REFERENCES jugadores(id),
            cantidad INTEGER DEFAULT 1,
            PRIMARY KEY (usuario_id, jugador_id)
        )`);

        // 4. Tabla del Mercado P2P
        await pool.query(`CREATE TABLE IF NOT EXISTS mercado_pases (
            id SERIAL PRIMARY KEY,
            vendedor_id INTEGER REFERENCES usuarios(id),
            jugador_id INTEGER REFERENCES jugadores(id),
            precio_oro INTEGER NOT NULL,
            fecha_publicacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`);

        // 5. Tabla de las Salas Multijugador
        await pool.query(`CREATE TABLE IF NOT EXISTS mundial_salas (
            id SERIAL PRIMARY KEY,
            codigo_sala VARCHAR(10) UNIQUE NOT NULL,
            creador_id INTEGER REFERENCES usuarios(id),
            tipo_apuesta VARCHAR(20) DEFAULT 'amistoso',
            apuesta_oro INTEGER DEFAULT 0,
            pozo_total INTEGER DEFAULT 0,
            estado VARCHAR(20) DEFAULT 'esperando'
        )`);

        // 6. Tabla de Participantes en Salas
        await pool.query(`CREATE TABLE IF NOT EXISTS sala_participantes (
            id SERIAL PRIMARY KEY,
            sala_id INTEGER REFERENCES mundial_salas(id) ON DELETE CASCADE,
            usuario_id INTEGER REFERENCES usuarios(id),
            seleccion VARCHAR(50) NOT NULL,
            jugador_ids INTEGER[] NOT NULL
        )`);

        // 7. Tabla de Apuestas en la Quiniela
        await pool.query(`CREATE TABLE IF NOT EXISTS quiniela_apuestas (
            id SERIAL PRIMARY KEY,
            usuario_id INTEGER REFERENCES usuarios(id),
            monto_apostado INTEGER NOT NULL,
            predicciones JSONB NOT NULL,
            ganada BOOLEAN NOT NULL,
            premio_entregado INTEGER DEFAULT 0,
            fecha_jugada TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`);

        const checkJugadores = await pool.query("SELECT COUNT(*) as count FROM jugadores");
        if (parseInt(checkJugadores.rows[0].count) === 0) {
            // 📝 Lista vacía para que le agregues tus jugadores cuando quieras, Momito
            const granListaJugadores = [
                // Ejemplo: ["Lionel Messi", "Argentina", "🇦🇷", "Delantero", "url_foto", "legendaria"]
            ];

            for (const j of granListaJugadores) {
                await pool.query(
                    `INSERT INTO jugadores (nombre, pais, bandera, posicion, foto, rareza) 
                     VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (nombre) DO NOTHING`,
                    [j[0], j[1], j[2], j[3], j[4], j[5]]
                );
            }
            console.log(`✅ Estructuras inicializadas. ${granListaJugadores.length} jugadores cargados de forma inicial.`);
        }
    } catch (err) {
        console.error("❌ Error al inicializar estructuras en Neon:", err.message);
    }
}

inicializarTablas();

/* ========================================================================
   👤 ENDPOINTS DE AUTENTICACIÓN Y SISTEMA DE USUARIOS
   ======================================================================== */
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
         const userCheck = await pool.query("SELECT * FROM usuarios WHERE username = $1", [username.trim().toLowerCase()]);
         
         if (userCheck.rows.length === 0) {
              return res.status(400).json({ error: "❌ El usuario no existe. ¡Registrate primero!" });
         }

         const user = userCheck.rows[0];
         if (user.password === password) {
              console.log(`🔑 [LOGIN] El usuario "${username.toUpperCase()}" ingresó a la Arena.`);
              
              const token = jwt.sign(
                  { id: user.id, username: user.username }, 
                  JWT_SECRET, 
                  { expiresIn: '24h' }
              );

              return res.json({ 
                  mensaje: "Login exitoso", 
                  usuario: user,
                  token: token 
              });
         } else {
              return res.status(400).json({ error: "❌ Contraseña incorrecta." });
         }
    } catch (err) {
         return res.status(500).json({ error: "Error interno en el login." });
    }
});

app.post('/api/registro', async (req, res) => {
    const { username, password } = req.body;
    const ipCliente = req.ip;

    if (!username || username.trim().length > 14) {
        return res.status(400).json({ error: "❌ El nombre de usuario no puede tener más de 14 caracteres." });
    }
    try {
        const userCheck = await pool.query("SELECT * FROM usuarios WHERE username = $1", [username.trim().toLowerCase()]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: "❌ Ese nombre de usuario ya está ocupado." });
        }

        if (ipCliente && ipCliente !== '::1' && ipCliente !== '127.0.0.1') {
            const ipCheck = await pool.query("SELECT * FROM usuarios WHERE ip_registro = $1", [ipCliente]);
            if (ipCheck.rows.length > 0) {
                return res.status(400).json({ error: "❌ Límite excedido: Ya se creó una cuenta desde esta conexión a Internet." });
            }
        }

        const nuevoUsuario = await pool.query(
            "INSERT INTO usuarios (username, password, ip_registro) VALUES ($1, $2, $3) RETURNING *", 
            [username.trim().toLowerCase(), password, ipCliente]
        );
        console.log(`✨ [REGISTRO] Nuevo usuario creado: "${username.toUpperCase()}" desde la IP: ${ipCliente}`);
        return res.json({ mensaje: "Registrado con éxito", usuario: nuevoUsuario.rows[0] });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.post('/api/logout', (req, res) => {
    const { username } = req.body;
    if (username) {
        console.log(`🚪 [LOGOUT] El usuario "${username.toUpperCase()}" salió de la Arena.`);
    }
    res.json({ success: true, mensaje: "Sesión cerrada en servidor" });
});

app.post('/api/actualizar-progreso', verificarToken, async (req, res) => {
    const usuario_id = req.usuarioLogueado.id;
    const { monedas, puntos } = req.body;

    try {
        await pool.query(
            `UPDATE usuarios SET monedas = monedas + $1, puntos_ranking = puntos_ranking + $2 WHERE id = $3`, 
            [monedas, puntos, usuario_id]
        );
        const result = await pool.query("SELECT monedas, puntos_ranking FROM usuarios WHERE id = $1", [usuario_id]);
        return res.json({ datos: result.rows[0] });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/* ========================================================================
   📖 ENDPOINTS DEL ÁLBUM PANINI Y TIENDA DE COFRES
   ======================================================================== */
app.get('/api/album/:usuarioId', async (req, res) => {
    const usuarioId = req.params.usuarioId;
    const query = `
        SELECT j.*, COALESCE(up.cantidad, 0) as obtenido 
        FROM jugadores j
        LEFT JOIN usuario_progreso up ON j.id = up.jugador_id AND up.usuario_id = $1
        ORDER BY j.pais ASC, j.id ASC
    `;
    try {
        const result = await pool.query(query, [usuarioId]);
        return res.json({ album: result.rows });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.post('/api/comprar-sobre', verificarToken, async (req, res) => {
    const { tipoCofre } = req.body; 
    const usuario_id = req.usuarioLogueado.id;

    let costo = 250;
    let probLegendaria = 0.015; 
    let probEpica = 0.10;       
    let probRara = 0.25;        

    if (tipoCofre === 'plata') {
        costo = 100;
        probLegendaria = 0.001; 
        probEpica = 0.03;       
        probRara = 0.15;    
    } 
    else if (tipoCofre === 'legendario') {
        costo = 500;
        probLegendaria = 0.08;  
        probEpica = 0.30;       
        probRara = 0.40;    
    }

    try {
        const userCheck = await pool.query("SELECT monedas FROM usuarios WHERE id = $1", [usuario_id]);
        if (userCheck.rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
        
        const usuario = userCheck.rows[0];
        if (usuario.monedas < costo) return res.json({ error_oro: true, mensaje: "🪙 No tenés suficiente Oro." });

        const jugadoresCheck = await pool.query("SELECT * FROM jugadores");
        const todosLosJugadores = jugadoresCheck.rows;
        if (todosLosJugadores.length === 0) return res.status(400).json({ error: "No hay jugadores en la DB" });

        let sobreAbierto = [];
        for (let i = 0; i < 5; i++) {
            let rand = Math.random();
            let rarezaElegida = 'comun';

            if (rand < probLegendaria) {
                rarezaElegida = 'legendaria';
            } else if (rand < probLegendaria + probEpica) {
                rarezaElegida = 'epica';
            } else if (rand < probLegendaria + probEpica + probRara) {
                rarezaElegida = 'rara'; 
            }

            let poolFiltrado = todosLosJugadores.filter(j => j.rareza === rarezaElegida);
            
            if (poolFiltrado.length === 0) {
                poolFiltrado = todosLosJugadores.filter(j => j.rareza === 'comun');
            }
            
            let elegido = poolFiltrado[Math.floor(Math.random() * poolFiltrado.length)];
            sobreAbierto.push({ ...elegido });
        }

        const nuevoOro = usuario.monedas - costo;
        await pool.query("UPDATE usuarios SET monedas = $1 WHERE id = $2", [nuevoOro, usuario_id]);

        // Guardado usando EXCLUDED para evitar bugs en Postgres
        for (let jugador of sobreAbierto) {
            const resProg = await pool.query(
                `INSERT INTO usuario_progreso (usuario_id, jugador_id, cantidad) VALUES ($1, $2, 1)
                 ON CONFLICT (usuario_id, jugador_id) DO UPDATE SET cantidad = usuario_progreso.cantidad + EXCLUDED.cantidad
                 RETURNING cantidad`,
                [usuario_id, jugador.id]
            );
            jugador.obtenido = resProg.rows[0].cantidad;
        }

        return res.json({ success: true, sobre: sobreAbierto, monedas: nuevoOro });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/* ========================================================================
   ⚽ MODULE DE PENALES (SISTEMA DE ENERGÍA POR HORA)
   ======================================================================== */
const MAX_TIROS = 10;
const MILISEGUNDOS_POR_TIRO = 6 * 60 * 1000; 

function calcularTirosActuales(usuario) {
    const ahora = new Date();
    
    if (!usuario.ultimo_tiro_timestamp) {
        return { tirosActuales: MAX_TIROS, tiempoParaSiguiente: 0 };
    }

    const ultimoTiro = new Date(usuario.ultimo_tiro_timestamp);
    const tiempoTranscurrido = ahora - ultimoTiro;

    const tirosRegenerados = Math.floor(tiempoTranscurrido / MILISEGUNDOS_POR_TIRO);
    let tirosActuales = usuario.tiros_hoy + tirosRegenerados;

    if (tirosActuales >= MAX_TIROS) {
        return { tirosActuales: MAX_TIROS, tiempoParaSiguiente: 0 };
    }

    const tiempoConsumidoEnEsteTiro = tiempoTranscurrido % MILISEGUNDOS_POR_TIRO;
    const tiempoParaSiguiente = MILISEGUNDOS_POR_TIRO - tiempoConsumidoEnEsteTiro;

    return { tirosActuales, tiempoParaSiguiente };
}

app.get('/api/tiros-restantes/:usuarioId', async (req, res) => {
    const usuarioId = req.params.usuarioId;
    try {
        const result = await pool.query("SELECT ultimo_tiro_timestamp, tiros_hoy FROM usuarios WHERE id = $1", [usuarioId]);
        if (result.rows.length === 0) return res.json({ tiros: MAX_TIROS, siguienteIn: 0 });

        const { tirosActuales, tiempoParaSiguiente } = calcularTirosActuales(result.rows[0]);
        return res.json({ tiros: tirosActuales, siguienteIn: tiempoParaSiguiente });
    } catch (err) {
        return res.json({ tiros: MAX_TIROS, siguienteIn: 0 });
    }
});

app.post('/api/jugar-penal', verificarToken, async (req, res) => {
    const usuario_id = req.usuarioLogueado.id;
    const { gano } = req.body;
    const ahora = new Date();

    try {
        const result = await pool.query("SELECT monedas, puntos_ranking, ultimo_tiro_timestamp, tiros_hoy FROM usuarios WHERE id = $1", [usuario_id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });

        const usuario = result.rows[0];
        let { tirosActuales } = calcularTirosActuales(usuario);

        if (tirosActuales <= 0) {
            return res.json({ 
                error_limite: true, 
                mensaje: "❌ ¡Te quedaste sin energía! Esperá a que se recupere un tiro. ⏱️" 
            });
        }

        const nuevosTirosGuardados = tirosActuales - 1;
        
        let monedasGanadas = gano ? 100 : 0;
        let puntosGanados = gano ? 15 : 0;
        const nuevasMonedas = usuario.monedas + monedasGanadas;
        const nuevosPuntos = usuario.puntos_ranking + puntosGanados;

        await pool.query(
            `UPDATE usuarios SET monedas = $1, puntos_ranking = $2, ultimo_tiro_timestamp = $3, tiros_hoy = $4 WHERE id = $5`,
            [nuevasMonedas, nuevosPuntos, ahora, nuevosTirosGuardados, usuario_id]
        );
        
        const tiempoActualizado = nuevosTirosGuardados >= MAX_TIROS ? 0 : MILISEGUNDOS_POR_TIRO;

        return res.json({
            success: true,
            tiros_restantes: nuevosTirosGuardados,
            siguienteIn: tiempoActualizado,
            datos: { monedas: nuevasMonedas, puntos_ranking: nuevosPuntos }
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.get('/api/ranking', async (req, res) => {
    const query = `
        SELECT username, puntos_ranking 
        FROM usuarios 
        ORDER BY puntos_ranking DESC 
        LIMIT 10
    `;
    try {
        const result = await pool.query(query);
        return res.json({ ranking: result.rows });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.get('/api/ranking-mundiales', async (req, res) => {
    const query = `
        SELECT username, copas_mundiales 
        FROM usuarios 
        WHERE copas_mundiales > 0
        ORDER BY copas_mundiales DESC, puntos_ranking DESC 
        LIMIT 10
    `;
    try {
        const result = await pool.query(query);
        return res.json({ ranking: result.rows });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/* ========================================================================
   🎰 CONFIGURACIÓN Y LÓGICA CORE DE LA TIMBA
   ======================================================================== */
const MAX_TIMBAS = 10; 
const MILISEGUNDOS_POR_TIMBA = 6 * 60 * 1000; 

function calcularTimbasActuales(usuario) {
    const ahora = new Date();
    
    if (!usuario.ultimo_giro_timestamp) {
        return { timbasActuales: MAX_TIMBAS, tiempoParaSiguienteTimba: 0 };
    }

    const ultimoGiro = new Date(usuario.ultimo_giro_timestamp);
    const tiempoTranscurrido = ahora - ultimoGiro;

    const timbasRegeneradas = Math.floor(tiempoTranscurrido / MILISEGUNDOS_POR_TIMBA);
    let timbasActuales = usuario.timbas_hoy + timbasRegeneradas;

    if (timbasActuales >= MAX_TIMBAS) {
        return { timbasActuales: MAX_TIMBAS, tiempoParaSiguienteTimba: 0 };
    }

    const tiempoConsumidoEnEsteGiro = tiempoTranscurrido % MILISEGUNDOS_POR_TIMBA;
    const tiempoParaSiguienteTimba = MILISEGUNDOS_POR_TIMBA - tiempoConsumidoEnEsteGiro;

    return { timbasActuales, tiempoParaSiguienteTimba };
}

const apuestasActivasServidor = {};

function generarGolesServidor() {
    const r = Math.random();
    if (r < 0.25) return 0;
    if (r < 0.55) return 1;
    if (r < 0.80) return 2;
    if (r < 0.93) return 3;
    return Math.floor(Math.random() * 3) + 4;
}

app.get('/api/timbas-restantes/:usuarioId', async (req, res) => {
    const usuarioId = req.params.usuarioId;
    try {
        const result = await pool.query("SELECT ultimo_giro_timestamp, timbas_hoy FROM usuarios WHERE id = $1", [usuarioId]);
        if (result.rows.length === 0) return res.json({ timbas: MAX_TIMBAS, siguienteIn: 0 });

        const { timbasActuales, tiempoParaSiguienteTimba } = calcularTimbasActuales(result.rows[0]);
        return res.json({ timbas: timbasActuales, siguienteIn: tiempoParaSiguienteTimba });
    } catch (err) {
        return res.json({ timbas: MAX_TIMBAS, siguienteIn: 0 });
    }
});

app.post('/api/timba/preparar', verificarToken, async (req, res) => { 
    const usuario_id = req.usuarioLogueado.id;
    const { tipoApuesta, montoApuesta, jugadorIdApostado } = req.body;

    try {
        const userCheck = await pool.query("SELECT monedas, ultimo_giro_timestamp, timbas_hoy FROM usuarios WHERE id = $1", [usuario_id]);
        if (userCheck.rows.length === 0) return res.status(404).json({ ok: false, mensaje: "Usuario no encontrado" });

        const usuario = userCheck.rows[0];

        if (tipoApuesta === "monedas") {
            if (usuario.monedas < montoApuesta || montoApuesta <= 0) {
                return res.json({ ok: false, error_oro: true, mensaje: "🪙 No tenés suficiente Oro para bancar esa apuesta." });
            }
        } else {
            const progCheck = await pool.query(
                "SELECT cantidad FROM usuario_progreso WHERE usuario_id = $1 AND jugador_id = $2",
                [usuario_id, jugadorIdApostado]
            );
            if (progCheck.rows.length === 0 || progCheck.rows[0].cantidad <= 1) {
                return res.json({ ok: false, mensaje: "❌ No tenés stock de repetidas de ese cromo para apostar." });
            }
        }

        let { timbasActuales } = calcularTimbasActuales(usuario);

        if (timbasActuales <= 0) {
            return res.json({ 
                ok: false,
                error_limite: true, 
                mensaje: "❌ ¡Te quedaste sin energía para apostar! Esperá a que recargue el cronómetro de la banca. ⏱️" 
            });
        }

        const nuevasTimbasGuardadas = timbasActuales - 1;
        const ahora = new Date();

        await pool.query(
            `UPDATE usuarios SET ultimo_giro_timestamp = $1, timbas_hoy = $2 WHERE id = $3`,
            [ahora, nuevasTimbasGuardadas, usuario_id]
        );

        const golesLReal = generarGolesServidor();
        const golesVReal = generarGolesServidor();
        const signoReal = golesLReal > golesVReal ? 'L' : (golesLReal < golesVReal ? 'V' : 'E');

        const combinacionesUsadas = new Set();
        combinacionesUsadas.add(`${golesLReal}-${golesVReal}`);

        const poolOpciones = [
            { label: `${golesLReal} - ${golesVReal}`, tipo: 'exacto' }
        ];

        for (let i = 0; i < 2; i++) {
            let glSigno = generarGolesServidor(); let gvSigno = generarGolesServidor();
            let combo = `${glSigno}-${gvSigno}`;
            let signoOpc = glSigno > gvSigno ? 'L' : (glSigno < gvSigno ? 'V' : 'E');
            let intentos = 0;
            while ((combinacionesUsadas.has(combo) || signoOpc !== signoReal) && intentos < 30) {
                glSigno = generarGolesServidor(); gvSigno = generarGolesServidor();
                if (intentos > 15) {
                    if (signoReal === 'L') { glSigno = golesLReal + 1; gvSigno = golesVReal; }
                    else if (signoReal === 'V') { glSigno = golesLReal; gvSigno = golesVReal + 1; }
                    else { glSigno = golesLReal + 1; gvSigno = golesVReal + 1; }
                }
                combo = `${glSigno}-${gvSigno}`; signoOpc = glSigno > gvSigno ? 'L' : (glSigno < gvSigno ? 'V' : 'E'); intentos++;
            }
            combinacionesUsadas.add(combo); poolOpciones.push({ label: `${glSigno} - ${gvSigno}`, tipo: 'signo' });
        }

        for (let i = 0; i < 3; i++) {
            let glErr = generarGolesServidor(); let gvErr = generarGolesServidor();
            let combo = `${glErr}-${gvErr}`;
            let signoOpc = glErr > gvErr ? 'L' : (glErr < gvErr ? 'V' : 'E');
            let intentos = 0;
            while ((combinacionesUsadas.has(combo) || signoOpc === signoReal) && intentos < 30) {
                glErr = generarGolesServidor(); gvErr = generarGolesServidor();
                if (intentos > 15) {
                    if (signoReal === 'L' || signoReal === 'E') { glErr = 0; gvErr = i + 1; } 
                    else { glErr = i + 1; gvErr = 0; }
                }
                combo = `${glErr}-${gvErr}`; signoOpc = glErr > gvErr ? 'L' : (glErr < gvErr ? 'V' : 'E'); intentos++;
            }
            combinacionesUsadas.add(combo); poolOpciones.push({ label: `${glErr} - ${gvErr}`, tipo: 'error' });
        }

        const poolParaCliente = poolOpciones.map((opc, index) => ({
            idOpcion: index,
            label: opc.label
        })).sort(() => Math.random() - 0.5);

        apuestasActivasServidor[usuario_id] = {
            golesLReal,
            golesVReal,
            tipoApuesta,
            montoApuesta,
            jugadorIdApostado,
            mapeoOpciones: poolOpciones
        };

        const tiempoActualizado = nuevasTimbasGuardadas >= MAX_TIMBAS ? 0 : MILISEGUNDOS_POR_TIMBA;
        res.json({ 
            ok: true, 
            opciones: poolParaCliente,
            timbas_restantes: nuevasTimbasGuardadas,
            siguienteIn: tiempoActualizado
        });

    } catch (err) {
        return res.status(500).json({ ok: false, mensaje: "Error en el servidor al preparar." });
    }
});

app.post('/api/timba/procesar', verificarToken, async (req, res) => {
    const usuario_id = req.usuarioLogueado.id;
    const { idOpcionElegida } = req.body;
    const apuesta = apuestasActivasServidor[usuario_id];

    if (!apuesta) {
        return res.status(400).json({ ok: false, mensaje: "No hay una apuesta activa preparada." });
    }

    const { golesLReal, golesVReal, tipoApuesta, montoApuesta, jugadorIdApostado, mapeoOpciones } = apuesta;
    const opcionReal = mapeoOpciones[idOpcionElegida];

    let balanceMonedas = 0;
    let puntosAsignados = 0;
    let mensajeResultado = "";

    try {
        if (tipoApuesta === "monedas") {
            if (opcionReal.tipo === 'exacto') {
                balanceMonedas = montoApuesta * 3; puntosAsignados = 20;
                mensajeResultado = `¡QUÉ ANIMAL! Acertaste el resultado exacto (${golesLReal}-${golesVReal}).\nGanaste: ${montoApuesta * 3} monedas.`;
            } else if (opcionReal.tipo === 'signo') {
                balanceMonedas = Math.round(montoApuesta * 0.5);
                mensajeResultado = `¡BIEN AHÍ! Acertaste el ganador (${opcionReal.label}). El resultado fue ${golesLReal}-${golesVReal}.\nGanaste: ${balanceMonedas} monedas.`;
            } else {
                balanceMonedas = -montoApuesta;
                mensajeResultado = `¡ERRASTE! El partido terminó ${golesLReal}-${golesVReal} y elegiste ${opcionReal.label}.\nPerdiste: ${montoApuesta} monedas.`;
            }

            await pool.query(
                `UPDATE usuarios SET monedas = monedas + $1, puntos_ranking = puntos_ranking + $2 WHERE id = $3`, 
                [balanceMonedas, puntosAsignados, usuario_id]
            );

        } else {
            const cardQuery = await pool.query("SELECT nombre, rareza FROM jugadores WHERE id = $1", [jugadorIdApostado]);
            const cromoApostado = cardQuery.rows[0];
            const rarezaOriginal = cromoApostado.rareza.toLowerCase();

            if (opcionReal.tipo === 'exacto' || opcionReal.tipo === 'signo') {
                
                if (rarezaOriginal === "legendaria") {
                    let oroPremio = opcionReal.tipo === 'exacto' ? 2500 : 1000;
                    puntosAsignados = opcionReal.tipo === 'exacto' ? 40 : 20;

                    await pool.query("UPDATE usuario_progreso SET cantidad = cantidad - 1 WHERE usuario_id = $1 AND jugador_id = $2", [usuario_id, jugadorIdApostado]);
                    await pool.query("UPDATE usuarios SET monedas = monedas + $1, puntos_ranking = puntos_ranking + $2 WHERE id = $3", [oroPremio, puntosAsignados, usuario_id]);

                    if (opcionReal.tipo === 'exacto') {
                        mensajeResultado = `👑 ¡DIOS SANTO PE! Apostaste a ${cromoApostado.nombre.toUpperCase()} Legendario y la clavaste al ángulo (${golesLReal}-${golesVReal}).\n\n💰 ¡LA CASA TE PAGA 🪙2.500 MONEDAS!`;
                    } else {
                        mensajeResultado = `💰 ¡BIEN AHÍ! Acertaste el ganador con tu Legendario (${golesLReal}-${golesVReal}).\n\n🎁 ¡Te llevás 🪙1.000 monedas!`;
                    }

                } else {
                    await pool.query("UPDATE usuario_progreso SET cantidad = cantidad - 1 WHERE usuario_id = $1 AND jugador_id = $2", [usuario_id, jugadorIdApostado]);
                    
                    let rarezaPremio = rarezaOriginal; 

                    if (opcionReal.tipo === 'exacto') {
                        if (rarezaOriginal === "comun") rarezaPremio = "rara";
                        else if (rarezaOriginal === "rara") rarezaPremio = "epica";
                        else if (rarezaOriginal === "epica") rarezaPremio = "legendaria";
                    }

                    const poolPremio = await pool.query("SELECT id, nombre, rareza FROM jugadores WHERE rareza = $1 ORDER BY RANDOM() LIMIT 1", [rarezaPremio]);
                    const cromoGanado = poolPremio.rows[0];

                    // Corregido con EXCLUDED para Postgres
                    await pool.query(
                        `INSERT INTO usuario_progreso (usuario_id, jugador_id, cantidad) VALUES ($1, $2, 1)
                         ON CONFLICT (usuario_id, jugador_id) DO UPDATE SET cantidad = usuario_progreso.cantidad + EXCLUDED.cantidad`,
                        [usuario_id, cromoGanado.id]
                    );

                    puntosAsignados = opcionReal.tipo === 'exacto' ? 30 : 15;
                    await pool.query("UPDATE usuarios SET puntos_ranking = puntos_ranking + $1 WHERE id = $2", [puntosAsignados, usuario_id]);

                    if (opcionReal.tipo === 'exacto') {
                        mensajeResultado = `🔥 ¡PRO DISPARO! Acertaste el exacto (${golesLReal}-${golesVReal}).\n🎁 ¡EVOLUCIÓN! Te ganaste un cromo SUPERIOR: ${cromoGanado.nombre.toUpperCase()} [${cromoGanado.rareza.toUpperCase()}]`;
                    } else {
                        mensajeResultado = `⚽ ¡GOOOL! Acertaste el ganador. El partido terminó ${golesLReal}-${golesVReal}.\n🃏 La banca te devuelve otro cromo: ${cromoGanado.nombre.toUpperCase()} [${cromoGanado.rareza.toUpperCase()}]`;
                    }
                }

            } else {
                await pool.query("UPDATE usuario_progreso SET cantidad = cantidad - 1 WHERE usuario_id = $1 AND jugador_id = $2", [usuario_id, jugadorIdApostado]);
                mensajeResultado = `❌ ¡CROMO PERDIDO! El partido terminó ${golesLReal}-${golesVReal} y tu opción fue ${opcionReal.label}.\nPerdiste 1 copia de ${cromoApostado.nombre.toUpperCase()}.`;
            }
        }

        const userCheck = await pool.query("SELECT monedas, puntos_ranking FROM usuarios WHERE id = $1", [usuario_id]);
        delete apuestasActivasServidor[usuario_id];

        return res.json({
            ok: true,
            mensajeResultado,
            golesLReal,
            golesVReal,
            datos: userCheck.rows[0]
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ ok: false, mensaje: "Error en DB al procesar." });
    }
});

/* ========================================================================
   ⚽ GENERADOR DE INCIDENCIAS PARA EL FIXTURE
   ======================================================================== */
const generarIncidenciasPartido = (golesL, golesV, tuPais, rival) => {
    let eventos = {};
    
    eventos[45] = "⏳ ENTRETIEMPO: Los equipos van a los vestuarios. ¡Momento de la charla técnica!";

    const minsPeligro = [15, 28, 62, 78, 87];
    const textosPeligro = [
        `🧤 ¡Mano a mano agónico! El arquero salva en la línea de gol.`,
        `🟥 ¡Tarjeta Roja! Un defensor se va expulsado por juego brusco.`,
        `⚠️ ¡Tiro libre peligroso en la puerta del área! Pasa rozando el palo.`,
        `⚡ ¡Contraataque letal comandado por las tácticas del DT! El estadio es un hervidero.`,
        `🥅 ¡Al palo! El remate rebota en el travesaño y se salva el arco.`
    ];

    minsPeligro.forEach((min, idx) => {
        if (Math.random() < 0.6) { 
            eventos[min] = textosPeligro[idx];
        }
    });

    return eventos;
};

/* ========================================================================
   🏆 MÓDULO MINIMUNDIAL (SINGLE PLAYER / BOTS / COOLDOWNS)
   ======================================================================== */
const COOLDOWN_MUNDIAL_MS = 3 * 60 * 60 * 1000; 

const VALOR_STATS_RAREZA = {
    'comun': 60,
    'especial': 68,
    'rara': 75,
    'epica': 85,
    'legendaria': 96
};

function mezclarArray(arr) {
    return arr.sort(() => Math.random() - 0.5);
}

const SELECCIONES_BOTS = [
    "Francia", "Brasil", "Alemania", "España", "Italia", "Inglaterra", 
    "Países Bajos", "Portugal", "Uruguay", "Croacia", "Bélgica", "Marruecos", 
    "Japón", "Senegal", "Estados Unidos", "Colombia", "México", "Argentina",
    "Ecuador", "Perú", "Chile", "Paraguay", "Venezuela", "Canadá", "Costa Rica",
    "Nigeria", "Egipto", "Argelia", "Túnez", "Ghana", "Corea del Sur", "Australia",
    "Arabia Saudita", "Irán", "Suiza", "Dinamarca", "Suecia", "Polonia", "Ucrania", "Austria"
];

app.get('/api/mundial/estado/:usuarioId', async (req, res) => {
    const usuarioId = req.params.usuarioId;
    try {
        const userCheck = await pool.query("SELECT copas_mundiales, ultima_timba_mundial FROM usuarios WHERE id = $1", [usuarioId]);
        if (userCheck.rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });

        const user = userCheck.rows[0];
        const ahora = new Date();
        let tiempoRestante = 0;

        if (user.ultima_timba_mundial) {
            const ultimaVez = new Date(user.ultima_timba_mundial);
            const transcurrido = ahora - ultimaVez;
            if (transcurrido < COOLDOWN_MUNDIAL_MS) {
                tiempoRestante = COOLDOWN_MUNDIAL_MS - transcurrido;
            }
        }

        return res.json({
            copas: user.copas_mundiales,
            siguienteIn: tiempoRestante
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.post('/api/mundial/preparar', verificarToken, async (req, res) => {
    const usuario_id = req.usuarioLogueado.id;
    try {
        const userCheck = await pool.query("SELECT monedas, ultima_timba_mundial FROM usuarios WHERE id = $1", [usuario_id]);
        if (userCheck.rows.length === 0) return res.status(404).json({ ok: false, mensaje: "Usuario inválido." });

        if (userCheck.rows[0].ultima_timba_mundial) {
            const transcurrido = new Date() - new Date(userCheck.rows[0].ultima_timba_mundial);
            if (transcurrido < COOLDOWN_MUNDIAL_MS) {
                return res.json({ ok: false, elVestuarioEstaCerrado: true, mensaje: `⏳ Vestuario cerrado. Debés esperar a que se cumpla el tiempo.` });
            }
        }

        if (userCheck.rows[0].monedas < 1500) {
            return res.json({ ok: false, mensaje: "🪙 No tenés suficiente Oro. La inscripción al MiniMundial cuesta 1.500 monedas." });
        }

        const paisesValidosQuery = await pool.query(`
            SELECT j.pais 
            FROM usuario_progreso up 
            JOIN jugadores j ON up.jugador_id = j.id 
            WHERE up.usuario_id = $1 AND up.cantidad > 0 
            GROUP BY j.pais 
            HAVING COUNT(j.id) >= 3
        `, [usuario_id]);

        const paisesCandidatos = paisesValidosQuery.rows.map(r => r.pais);

        if (paisesCandidatos.length === 0) {
            return res.json({ ok: false, mensaje: "❌ Requisito insuficiente: Necesitás tener al menos 3 jugadores de un mismo país desbloqueados para poder inscribirte." });
        }

        const nuevoOro = userCheck.rows[0].monedas - 1500;
        await pool.query(
            "UPDATE usuarios SET monedas = $1, ultima_timba_mundial = NOW() WHERE id = $2", 
            [nuevoOro, usuario_id]
        );

        const ternaFiltrada = mezclarArray([...paisesCandidatos]).slice(0, 3);
        
        let rivalClasificacion = SELECCIONES_BOTS[Math.floor(Math.random() * SELECCIONES_BOTS.length)];
        while (ternaFiltrada.includes(rivalClasificacion)) {
            rivalClasificacion = SELECCIONES_BOTS[Math.floor(Math.random() * SELECCIONES_BOTS.length)];
        }

        return res.json({
            ok: true,
            terna: ternaFiltrada,
            rivalClasificacion: rivalClasificacion,
            monedasActualizadas: nuevoOro
        });
        
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

app.post('/api/mundial/jugar', verificarToken, async (req, res) => {
    const usuario_id = req.usuarioLogueado.id;
    const { seleccionElegida, rivalClasificacion, jugadorIds } = req.body;

    if (!jugadorIds || jugadorIds.length !== 3) {
        return res.status(400).json({ ok: false, mensaje: "Debés alinear exactamente 3 jugadores." });
    }

    try {
        const jCheck = await pool.query(
            "SELECT j.rareza FROM usuario_progreso up JOIN jugadores j ON up.jugador_id = j.id WHERE up.usuario_id = $1 AND up.jugador_id = ANY($2) AND up.cantidad > 0",
            [usuario_id, jugadorIds]
        );

        if (jCheck.rows.length !== 3) {
            return res.json({ ok: false, mensaje: "❌ Uno o más jugadores seleccionados no están disponibles." });
        }

        const sumaStats = jCheck.rows.reduce((acc, row) => acc + VALOR_STATS_RAREZA[row.rareza.toLowerCase()], 0);
        const promedio = sumaStats / 3;
        
        let estrellas = 1;
        if (promedio >= 90) estrellas = 5;
        else if (promedio >= 79) estrellas = 4;
        else if (promedio >= 70) estrellas = 3;
        else if (promedio >= 62) estrellas = 2;

        let chanceVictoria = 0.10; 

        if (estrellas === 2) chanceVictoria = 0.25;
        else if (estrellas === 3) chanceVictoria = 0.48;
        else if (estrellas === 4) chanceVictoria = 0.70;
        else if (estrellas === 5) chanceVictoria = 0.88;

        let botsDisponibles = SELECCIONES_BOTS.filter(s => s !== seleccionElegida);
        botsDisponibles = mezclarArray(botsDisponibles);

        const rivalGrupo1 = botsDisponibles[0];
        const rivalGrupo2 = botsDisponibles[1];
        const rivalGrupo3 = botsDisponibles[2];
        const integrantesGrupo = [seleccionElegida, rivalGrupo1, rivalGrupo2, rivalGrupo3];

        let bitacoraGrupo = [];
        
        function simularMatchCompleto(eq1, eq2, esUsuario) {
            let g1 = Math.floor(Math.random() * 3);
            let g2 = Math.floor(Math.random() * 3);
            if (esUsuario) {
                if (Math.random() <= chanceVictoria && g1 <= g2) g1 = g2 + Math.floor(Math.random() * 2) + 1;
                else if (Math.random() > chanceVictoria && g2 <= g1) g2 = g1 + Math.floor(Math.random() * 2) + 1;
            }
            return { goles1: g1, goles2: g2 };
        }

        // Simular Fase de Grupos
        let f1_m1 = simularMatchCompleto(seleccionElegida, rivalGrupo1, true);
        let f1_m2 = simularMatchCompleto(rivalGrupo2, rivalGrupo3, false);
        bitacoraGrupo.push({ 
            fecha: 1, local: seleccionElegida, visitante: rivalGrupo1, gL: f1_m1.goles1, gV: f1_m1.goles2, 
            botL: rivalGrupo2, botV: rivalGrupo3, gBL: f1_m2.goles1, gBV: f1_m2.goles2,
            incidencias: generarIncidenciasPartido(seleccionElegida, rivalGrupo1)
        });

        let f2_m1 = simularMatchCompleto(seleccionElegida, rivalGrupo2, true);
        let f2_m2 = simularMatchCompleto(rivalGrupo1, rivalGrupo3, false);
        bitacoraGrupo.push({ 
            fecha: 2, local: seleccionElegida, visitante: rivalGrupo2, gL: f2_m1.goles1, gV: f2_m1.goles2, 
            botL: rivalGrupo1, botV: rivalGrupo3, gBL: f2_m2.goles1, gBV: f2_m2.goles2,
            incidencias: generarIncidenciasPartido(seleccionElegida, rivalGrupo2)
        });

        let f3_m1 = simularMatchCompleto(seleccionElegida, rivalGrupo3, true);
        let f3_m2 = simularMatchCompleto(rivalGrupo1, rivalGrupo2, false);
        bitacoraGrupo.push({ 
            fecha: 3, local: seleccionElegida, visitante: rivalGrupo3, gL: f3_m1.goles1, gV: f3_m1.goles2, 
            botL: rivalGrupo1, botV: rivalGrupo2, gBL: f3_m2.goles1, gBV: f3_m2.goles2,
            incidencias: generarIncidenciasPartido(seleccionElegida, rivalGrupo3)
        });

        let tablaPuntos = {};
        integrantesGrupo.forEach(p => { tablaPuntos[p] = { pais: p, pts: 0, gf: 0, gc: 0 }; });

        function acumular(loc, vis, gl, gv) {
            tablaPuntos[loc].gf += gl; tablaPuntos[loc].gc += gv;
            tablaPuntos[vis].gf += gv; tablaPuntos[vis].gc += gl;
            if (gl > gv) tablaPuntos[loc].pts += 3;
            else if (gl < gv) tablaPuntos[vis].pts += 3;
            else { tablaPuntos[loc].pts += 1; tablaPuntos[vis].pts += 1; }
        }

        bitacoraGrupo.forEach(f => {
            acumular(f.local, f.visitante, f.gL, f.gV);
            acumular(f.botL, f.botV, f.gBL, f.gBV);
        });

        let tablaOrdenada = Object.values(tablaPuntos).sort((a,b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            return (b.gf - b.gc) - (a.gf - a.gc);
        });

        let posicionUsuario = tablaOrdenada.findIndex(r => r.pais === seleccionElegida) + 1;
        let clasificaALlaves = posicionUsuario <= 2; 

        // Play-offs
        let bitacoraPlayoffs = [];
        let campeon = false;
        let faseAlcanzada = "Fase de Grupos";

        if (clasificaALlaves) {
            faseAlcanzada = "Octavos de Final";
            const llaves = [
                { ronda: "Octavos de Final", rival: botsDisponibles[3], penalizacion: 0 },
                { ronda: "Cuartos de Final", rival: botsDisponibles[4], penalizacion: 0.08 },
                { ronda: "Semifinal", rival: botsDisponibles[5], penalizacion: 0.16 },
                { ronda: "Gran Final del Mundo", rival: botsDisponibles[6], penalizacion: 0.24 }
            ];

            campeon = true;
            for (let llave of llaves) {
                faseAlcanzada = llave.ronda;
                const chanceRondaReal = Math.max(0.10, chanceVictoria - llave.penalizacion);

                if (Math.random() <= chanceRondaReal) {
                    bitacoraPlayoffs.push({ 
                        ronda: llave.ronda, rival: llave.rival, resultado: "Ganaste ✅",
                        incidencias: generarIncidenciasPartido(seleccionElegida, llave.rival)
                    });
                } else {
                    campeon = false;
                    bitacoraPlayoffs.push({ 
                        ronda: llave.ronda, rival: llave.rival, resultado: "Perdiste ❌",
                        incidencias: generarIncidenciasPartido(seleccionElegida, llave.rival)
                    });
                    break;
                }
            }
        }

        const ahora = new Date();

        if (campeon) {
            await pool.query(
                "UPDATE usuarios SET monedas = monedas + 5000, copas_mundiales = copas_mundiales + 1, puntos_ranking = puntos_ranking + 50, ultima_timba_mundial = $1 WHERE id = $2",
                [ahora, usuario_id]
            );
        } else {
            await pool.query(
                "UPDATE usuarios SET ultima_timba_mundial = $1 WHERE id = $2", 
                [ahora, usuario_id]
            );
        }

        const userFinal = await pool.query("SELECT monedas, puntos_ranking, copas_mundiales FROM usuarios WHERE id = $1", [usuario_id]);

        return res.json({
            ok: true,
            progreso: {
                ganoClasificacion: true,
                integrantesGrupo, 
                bitacoraGrupo,     
                clasifco: clasificaALlaves, 
                clasifico: clasificaALlaves,
                posicionFinalGrupo: posicionUsuario,
                campeon: campeon,
                faseAlcanzada: faseAlcanzada,
                bitacoraPlayoffs
            },
            datosActualizados: userFinal.rows[0]
        });

    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

/* ========================================================================
   ⚽ DRAFT MULTIJUGADOR (PREPARACIÓN SIN COMPROMISO DE COOLDOWN)
   ======================================================================== */
app.post('/api/multijugador/preparar-draft', verificarToken, async (req, res) => {
    const usuario_id = req.usuarioLogueado.id;
    try {
        const userCheck = await pool.query("SELECT id FROM usuarios WHERE id = $1", [usuario_id]);
        if (userCheck.rows.length === 0) return res.status(404).json({ ok: false, mensaje: "Usuario inválido." });

        const paisesValidosQuery = await pool.query(`
            SELECT j.pais 
            FROM usuario_progreso up 
            JOIN jugadores j ON up.jugador_id = j.id 
            WHERE up.usuario_id = $1 AND up.cantidad > 0 
            GROUP BY j.pais 
            HAVING COUNT(j.id) >= 3
        `, [usuario_id]);

        const paisesCandidatos = paisesValidosQuery.rows.map(r => r.pais);

        if (paisesCandidatos.length === 0) {
            return res.json({ ok: false, mensaje: "❌ Requisito insuficiente: Necesitás tener al menos 3 jugadores de un mismo país desbloqueados para participar." });
        }

        const ternaFiltrada = mezclarArray([...paisesCandidatos]).slice(0, 3);

        return res.json({
            ok: true,
            terna: ternaFiltrada
        });
        
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

/* ========================================================================
   🏆 MÓDULO MULTIJUGADOR REFORMADO (ENTRADA GRATUITA - COBRO AL INICIAR)
   ======================================================================== */
app.post('/api/multijugador/crear', verificarToken, async (req, res) => {
    const usuario_id = req.usuarioLogueado.id;
    const { seleccion, jugador_ids, tipo_apuesta, apuesta_oro } = req.body;

    if (!jugador_ids || jugador_ids.length !== 3) {
        return res.json({ ok: false, mensaje: "❌ Debés seleccionar 3 jugadores para tu plantel." });
    }

    const codigo_sala = Math.random().toString(36).substring(2, 8).toUpperCase();
    const modalidad = tipo_apuesta ? tipo_apuesta.toLowerCase() : 'amistoso';
    const montoApuesta = parseInt(apuesta_oro) || 0;

    try {
        const userCheck = await pool.query("SELECT username FROM usuarios WHERE id = $1", [usuario_id]);
        if (userCheck.rows.length === 0) return res.status(404).json({ ok: false, mensaje: "Usuario inválido." });

        const insertSalaQuery = `
            INSERT INTO mundial_salas (codigo_sala, creador_id, tipo_apuesta, apuesta_oro, pozo_total, estado)
            VALUES ($1, $2, $3, $4, 0, 'esperando')
            RETURNING id;
        `;
        const salaResult = await pool.query(insertSalaQuery, [codigo_sala, usuario_id, modalidad, montoApuesta]);
        const sala_id = salaResult.rows[0].id;

        const insertParticipanteQuery = `
            INSERT INTO sala_participantes (sala_id, usuario_id, seleccion, jugador_ids)
            VALUES ($1, $2, $3, $4);
        `;
        
        // ✨ Corregido: Se pasa el array directo nativo, pg de Node lo mapea solo
        await pool.query(insertParticipanteQuery, [sala_id, usuario_id, seleccion, jugador_ids]);

        return res.json({
            ok: true,
            sala_id: sala_id,
            codigo_sala: codigo_sala,
            mensaje: "Sala creada con éxito. Ya podés pasar el código a tu rival."
        });

    } catch (error) {
        console.error("❌ ERROR AL CREAR SALA:", error.message);
        return res.status(500).json({ ok: false, mensaje: "Error de Base de Datos al abrir la sala." });
    }
});

app.get('/api/multijugador/consultar-sala/:codigo', async (req, res) => {
    const { codigo } = req.params;
    try {
        const salaCheck = await pool.query(
            "SELECT tipo_apuesta, apuesta_oro, estado FROM mundial_salas WHERE codigo_sala = $1", 
            [codigo.toUpperCase()]
        );
        if (salaCheck.rows.length === 0) return res.json({ ok: false, mensaje: "❌ La sala no existe." });
        
        const sala = salaCheck.rows[0];
        return res.json({
            ok: true,
            tipo_apuesta: sala.tipo_apuesta ? sala.tipo_apuesta.toLowerCase() : 'amistoso',
            apuesta_oro: sala.apuesta_oro,
            estado: sala.estado
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ ok: false, error: err.message });
    }
});

app.post('/api/multijugador/unirse', verificarToken, async (req, res) => {
    const usuario_id = req.usuarioLogueado.id;
    const { codigo_sala, seleccion, jugador_ids } = req.body;

    if (!codigo_sala) return res.json({ ok: false, mensaje: "❌ Falta el código de la sala." });
    if (!jugador_ids || jugador_ids.length !== 3) return res.json({ ok: false, mensaje: "❌ Debés seleccionar 3 jugadores." });

    try {
        const salaCheck = await pool.query(
            "SELECT id, estado FROM mundial_salas WHERE codigo_sala = $1", 
            [codigo_sala.toUpperCase()]
        );
        if (salaCheck.rows.length === 0) return res.json({ ok: false, mensaje: "❌ La sala no existe." });
        const sala = salaCheck.rows[0];

        if (sala.estado !== 'esperando') return res.json({ ok: false, mensaje: "🚫 Sala cerrada." });

        const seleccionCheck = await pool.query(
            "SELECT id FROM sala_participantes WHERE sala_id = $1 AND UPPER(seleccion) = $2", 
            [sala.id, seleccion.toUpperCase()]
        );
        if (seleccionCheck.rows.length > 0) return res.json({ ok: false, mensaje: `La selección de ${seleccion.toUpperCase()} ya está ocupada.` });

        await pool.query(
            `INSERT INTO sala_participantes (sala_id, usuario_id, seleccion, jugador_ids) VALUES ($1, $2, $3, $4)`,
            [sala.id, usuario_id, seleccion, jugador_ids]
        );

        return res.json({
            ok: true,
            mensaje: "⚽ ¡Te uniste con éxito! Esperando que el host inicie el fixture...",
            sala_id: sala.id
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ ok: false, error: err.message });
    }
});

app.get('/api/multijugador/sala/:codigo', async (req, res) => {
    const { codigo } = req.params;
    try {
        const salaQuery = await pool.query(
            "SELECT id, creador_id, tipo_apuesta, apuesta_oro, pozo_total, estado FROM mundial_salas WHERE codigo_sala = $1",
            [codigo.toUpperCase()]
        );
        if (salaQuery.rows.length === 0) return res.json({ ok: false, mensaje: "La sala no existe." });
        const sala = salaQuery.rows[0];

        const participantesQuery = await pool.query(
            `SELECT sp.usuario_id, u.username, sp.seleccion 
             FROM sala_participantes sp
             JOIN usuarios u ON sp.usuario_id = u.id
             WHERE sp.sala_id = $1`, [sala.id]
        );

        return res.json({
            ok: true,
            sala_id: sala.id,
            creador_id: sala.creador_id,
            tipo_apuesta: sala.tipo_apuesta,
            apuesta_oro: sala.apuesta_oro,
            pozo_total: sala.pozo_total,
            estado: sala.estado,
            participantes: participantesQuery.rows
        });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});

/* ========================================================================
   💥 SIMULACIÓN Y PROCESAMIENTO EXCLUSIVO DE LLAVES MULTIJUGADOR
   ======================================================================== */
function simularPartidoEliminatorio(equipo1, equipo2) {
    let g1 = Math.floor(Math.random() * 4);
    let g2 = Math.floor(Math.random() * 4);
    let fueAPenales = false;
    let penales1 = 0; let penales2 = 0;
    let ganador;

    if (g1 > g2) ganador = equipo1;
    else if (g2 > g1) ganador = equipo2;
    else {
        fueAPenales = true;
        while (penales1 === penales2) {
            penales1 = Math.floor(Math.random() * 5) + 1;
            penales2 = Math.floor(Math.random() * 5) + 1;
        }
        ganador = (penales1 > penales2) ? equipo1 : equipo2;
    }

    return {
        local: equipo1, visitante: equipo2,
        golesL: g1, golesV: g2,
        penalesL: fueAPenales ? penales1 : null, penalesV: fueAPenales ? penales2 : null,
        definicionPenales: fueAPenales, ganador: ganador
    };
}

app.post('/api/multijugador/jugar', verificarToken, async (req, res) => {
    // 🛡️ REPARADO: Capturamos cualquier variante de ID que pueda traer tu objeto descifrado
    const usuario_id = req.usuarioLogueado?.id || req.usuarioLogueado?.usuario_id;
    const { sala_id, codigo_sala } = req.body;
    
    try {
        // 🔄 INTENTO 1: Buscamos la sala por el ID numérico
        let salaQuery = await pool.query("SELECT * FROM mundial_salas WHERE id = $1", [sala_id]);
        
        // 🔄 INTENTO 2: Si no vino un ID válido, buscamos por el código de 6 letras (ej: 'T3HLIY')
        if (salaQuery.rows.length === 0 && codigo_sala) {
            salaQuery = await pool.query("SELECT * FROM mundial_salas WHERE codigo_sala = $1", [codigo_sala.toUpperCase()]);
        }
        
        if (salaQuery.rows.length === 0) {
            return res.json({ ok: false, mensaje: "❌ Sala no encontrada en los registros de la Arena." });
        }
        
        const sala = salaQuery.rows[0];
        const sala_id_real = sala.id; // Nos aseguramos de tener el ID real de la base de datos

        // 🕵️‍♂️ EL CHIVATO REVELADOR:
        const idDelCreadorEnBase = parseInt(sala.creador_id);
        const idTuyaIdentificada = parseInt(usuario_id);

        if (idDelCreadorEnBase !== idTuyaIdentificada) { 
            // 🚨 Te va a cantar exactamente los dos números en la alerta visual del juego
            return res.json({ 
                ok: false, 
                mensaje: `⛔ Error de Dueño: El creador en Neon es el ID [${idDelCreadorEnBase}], pero tu token descifró el ID [${idTuyaIdentificada}].` 
            }); 
        }
        
        if (sala.estado !== 'esperando') {
            return res.json({ ok: false, mensaje: "🚫 Sala cerrada o ya simulada." });
        }

        // Buscamos los participantes usando el ID real verificado
        const participantesQuery = await pool.query(
            `SELECT sp.usuario_id, u.username, sp.seleccion 
             FROM sala_participantes sp
             JOIN usuarios u ON sp.usuario_id = u.id
             WHERE sp.sala_id = $1`, [sala_id_real]
        );
        
        let competidores = participantesQuery.rows.map(p => ({
            id: p.usuario_id,
            username: p.username,
            seleccion: p.seleccion,
            esBot: false
        }));

        if (competidores.length < 2) {
            return res.json({ ok: false, mensaje: "❌ Se necesitan al menos 2 jugadores reales en el lobby." });
        }

        const idHost = sala.creador_id;
        const idInvitado = competidores.find(c => c.id !== idHost).id;
        const modalidadSala = sala.tipo_apuesta ? sala.tipo_apuesta.toLowerCase() : 'amistoso';
        const arancelOro = sala.apuesta_oro || 0;

        if (modalidadSala === 'oro') {
            const chequearMonedas = await pool.query("SELECT id, monedas FROM usuarios WHERE id IN ($1, $2)", [idHost, idInvitado]);
            const oroHost = chequearMonedas.rows.find(r => r.id === idHost)?.monedas || 0;
            const oroInvitado = chequearMonedas.rows.find(r => r.id === idInvitado)?.monedas || 0;

            if (oroHost < arancelOro) {
                return res.json({ ok: false, mensaje: "❌ Suspensión por Fondos: Vos (el Host) ya no tenés el Oro suficiente." });
            }
            if (oroInvitado < arancelOro) {
                return res.json({ ok: false, mensaje: "❌ Suspensión por Fondos: El rival invitado se quedó sin Oro suficiente." });
            }

            await pool.query("UPDATE usuarios SET monedas = monedas - $1 WHERE id = $2", [arancelOro, idHost]);
            await pool.query("UPDATE usuarios SET monedas = monedas - $1 WHERE id = $2", [arancelOro, idInvitado]);
            
            sala.pozo_total = arancelOro * 2;
            await pool.query("UPDATE mundial_salas SET pozo_total = $1 WHERE id = $2", [sala.pozo_total, sala_id_real]);

        } else if (modalidadSala === 'carta') {
            const repetidasHost = await pool.query("SELECT jugador_id FROM usuario_progreso WHERE usuario_id = $1 AND cantidad > 1 LIMIT 1", [idHost]);
            const repetidasInvitado = await pool.query("SELECT jugador_id FROM usuario_progreso WHERE usuario_id = $1 AND cantidad > 1 LIMIT 1", [idInvitado]);

            if (repetidasHost.rows.length === 0) {
                return res.json({ ok: false, mensaje: "❌ Suspensión por Inventario: Ya no contás con cartas repetidas." });
            }
            if (repetidasInvitado.rows.length === 0) {
                return res.json({ ok: false, mensaje: "❌ Suspensión por Inventario: Tu rival no posee cartas repetidas." });
            }

            await pool.query("UPDATE usuario_progreso SET cantidad = cantidad - 1 WHERE usuario_id = $1 AND jugador_id = $2", [idHost, repetidasHost.rows[0].jugador_id]);
            await pool.query("UPDATE usuario_progreso SET cantidad = cantidad - 1 WHERE usuario_id = $1 AND jugador_id = $2", [idInvitado, repetidasInvitado.rows[0].jugador_id]);
        }

        const PAISES_BOTS_BACKUP = ["ALEMANIA", "ITALIA", "ESPAÑA", "INGLATERRA", "PORTUGAL", "HOLANDA", "URUGUAY", "MÉXICO"];
        let botIdx = 0;
        while (competidores.length < 8) {
            let paisBot = PAISES_BOTS_BACKUP[botIdx % PAISES_BOTS_BACKUP.length];
            let yaExiste = competidores.some(c => c.seleccion.toUpperCase() === paisBot.toUpperCase());
            if (!yaExiste) {
                competidores.push({ id: null, username: `🤖 Bot ${paisBot}`, seleccion: paisBot, esBot: true });
            }
            botIdx++;
        }

        let listaMezclada = mezclarArray([...competidores]);
        let grillaTorneo = new Array(8);
        
        for (let competidor of listaMezclada) {
            let posAleatoria = Math.floor(Math.random() * 8);
            while (grillaTorneo[posAleatoria] !== undefined) {
                posAleatoria = (posAleatoria + 1) % 8;
            }
            grillaTorneo[posAleatoria] = competidor;
        }

        let bitacoraPartidosPlana = [];

        // Cuartos
        let ganadoresCuartos = new Array(4);
        let numeroPartido = 1;
        for (let i = 0; i < 8; i += 2) {
            let cruce = simularPartidoEliminatorio(grillaTorneo[i], grillaTorneo[i+1]);
            bitacoraPartidosPlana.push({
                ronda: `Cuartos de Final (${numeroPartido}/4)`,
                local: cruce.local.seleccion,
                visitante: cruce.visitante.seleccion,
                golesLocal: cruce.golesL,
                golesVisitante: cruce.golesV,
                penalesLocal: cruce.penalesL,
                penalesVisitante: cruce.penalesV,
                definicionPenales: cruce.definicionPenales,
                ganadorUsername: cruce.ganador.username,
                incidencias: generarIncidenciasPartido(cruce.local.seleccion, cruce.visitante.seleccion) 
            });
            ganadoresCuartos[numeroPartido - 1] = cruce.ganador;
            numeroPartido++;
        }

        // Semis
        let numeroSemi = 1;
        let ganadoresSemis = [];
        for (let i = 0; i < 4; i += 2) {
            let cruce = simularPartidoEliminatorio(ganadoresCuartos[i], ganadoresCuartos[i+1]);
            bitacoraPartidosPlana.push({
                ronda: `Semifinal (${numeroSemi}/2)`,
                local: cruce.local.seleccion,
                visitante: cruce.visitante.seleccion,
                golesLocal: cruce.golesL,
                golesVisitante: cruce.golesV,
                penalesLocal: cruce.penalesL,
                penalesVisitante: cruce.penalesV,
                definicionPenales: cruce.definicionPenales,
                ganadorUsername: cruce.ganador.username,
                incidencias: generarIncidenciasPartido(cruce.local.seleccion, cruce.visitante.seleccion)
            });
            ganadoresSemis.push(cruce.ganador);
            numeroSemi++;
        }

        // Final
        let finalCruce = simularPartidoEliminatorio(ganadoresSemis[0], ganadoresSemis[1]);
        const campeonMundial = finalCruce.ganador;
        
        bitacoraPartidosPlana.push({
            ronda: "Gran Final",
            local: finalCruce.local.seleccion,
            visitante: finalCruce.visitante.seleccion,
            golesLocal: finalCruce.golesL,
            golesVisitante: finalCruce.golesV,
            penalesLocal: finalCruce.penalesL,
            penalesVisitante: finalCruce.penalesV,
            definicionPenales: finalCruce.definicionPenales,
            ganadorUsername: finalCruce.ganador.username,
            incidencias: generarIncidenciasPartido(finalCruce.local.seleccion, finalCruce.visitante.seleccion)
        });

        let datosPremio = { 
            ganoBot: true, 
            ganador_username: campeonMundial.username, 
            pozo: sala.pozo_total, 
            tipo_apuesta: sala.tipo_apuesta,
            nombreCartaPremio: null 
        };
        
        if (!campeonMundial.esBot) {
            datosPremio.ganoBot = false;

            if (modalidadSala === 'oro') {
                await pool.query("UPDATE usuarios SET monedas = monedas + $1 WHERE id = $2", [sala.pozo_total, campeonMundial.id]);
            } else if (modalidadSala === 'carta') {
                const lootPremio = await pool.query("SELECT id, nombre, rareza FROM jugadores WHERE rareza IN ('epica', 'legendaria') ORDER BY RANDOM() LIMIT 1");
                const cartaRecompensa = lootPremio.rows[0];
                
                await pool.query(
                    `INSERT INTO usuario_progreso (usuario_id, jugador_id, cantidad) VALUES ($1, $2, 1) 
                     ON CONFLICT (usuario_id, jugador_id) DO UPDATE SET cantidad = usuario_progreso.cantidad + EXCLUDED.cantidad`,
                    [campeonMundial.id, cartaRecompensa.id]
                );
                
                datosPremio.nombreCartaPremio = `${cartaRecompensa.nombre} (${cartaRecompensa.rareza.toUpperCase()})`;
            }
        }

        await pool.query("UPDATE mundial_salas SET estado = 'finalizado' WHERE id = $1", [sala_id_real]);

        BITACORAS_SALA_CACHE[sala_id_real] = { bitacora: bitacoraPartidosPlana, premio: datosPremio };

        return res.json({ ok: true, bitacora: bitacoraPartidosPlana, premio: datosPremio });

    } catch (err) {
        console.error("❌ Error en simulación:", err);
        return res.status(500).json({ ok: false, error: err.message });
    }
});

app.get('/api/multijugador/resultado-invitado/:sala_id', async (req, res) => {
    const { sala_id } = req.params;
    try {
        const salaQuery = await pool.query("SELECT estado, tipo_apuesta, pozo_total FROM mundial_salas WHERE id = $1", [sala_id]);
        if (salaQuery.rows.length === 0) return res.json({ ok: false, mensaje: "Sala no encontrada." });
        
        const sala = salaQuery.rows[0];
        const datosCache = BITACORAS_SALA_CACHE[sala_id];
        if (datosCache) {
            return res.json({
                ok: true,
                bitacora: datosCache.bitacora,
                prize: datosCache.premio,
                premio: datosCache.premio
            });
        }

        if (sala.estado === 'finalizado') {
            return res.json({
                ok: true,
                bitacora: [
                    { ronda: "Torneo Concluido", local: "Arena Online", visitante: "Estadio", golesLocal: 0, golesVisitante: 0, ganadorUsername: "Finalizado" }
                ],
                premio: { ganoBot: false, ganador_username: "Completado", pozo: sala.pozo_total, tipo_apuesta: sala.tipo_apuesta }
            });
        }

        return res.json({ ok: false, mensaje: "⏳ Esperando el procesamiento del silbatazo inicial del host..." });

    } catch (err) {
        console.error("❌ Error en consulta espejo de invitado:", err);
        return res.status(500).json({ ok: false, error: err.message });
    }
});

/* ========================================================================
   🃏 BOT COMERCIANTE MUTADO: ESCALERA DE RAREZAS + EVENTOS ULTRA RAROS
   ======================================================================== */
app.post('/api/album/comerciar-bot', verificarToken, async (req, res) => {
    const usuario_id = req.usuarioLogueado.id;
    const { jugadorIdsASacar } = req.body; 

    if (!jugadorIdsASacar || jugadorIdsASacar.length !== 3) {
        return res.status(400).json({ ok: false, mensaje: "El Bot exige exactamente 3 cartas para el trato." });
    }

    try {
        const conteoSolicitado = {};
        jugadorIdsASacar.forEach(id => {
            conteoSolicitado[id] = (conteoSolicitado[id] || 0) + 1;
        });

        const cartasInfo = await pool.query(
            `SELECT up.jugador_id, up.cantidad, j.rareza 
             FROM usuario_progreso up 
             JOIN jugadores j ON up.jugador_id = j.id 
             WHERE up.usuario_id = $1 AND up.jugador_id = ANY($2)`,
            [usuario_id, jugadorIdsASacar]
        );

        if (cartasInfo.rows.length === 0) {
            return res.json({ ok: false, mensaje: "❌ No se encontraron los cromos seleccionados en tu inventario." });
        }

        for (let row of cartasInfo.rows) {
            const pedidas = conteoSolicitado[row.jugador_id];
            if (row.cantidad - pedidas < 1) {
                return res.json({ ok: false, mensaje: "❌ No tenés repetidas suficientes de alguno de los jugadores elegidos." });
            }
        }

        const rarezaBase = cartasInfo.rows[0].rareza.toLowerCase();
        const todasIgualRareza = cartasInfo.rows.every(row => row.rareza.toLowerCase() === rarezaBase);

        if (!todasIgualRareza) {
            return res.json({ ok: false, mensaje: "❌ El Bot exige que las 3 cartas sacrificadas sean de la misma rareza para calcular el escalón." });
        }

        let rarezaRecompensa = "rara"; 
        if (rarezaBase === "rara") rarezaRecompensa = "epica";
        else if (rarezaBase === "epica") rarezaRecompensa = "legendaria";
        else if (rarezaBase === "legendaria") rarezaRecompensa = "legendaria"; 

        for (let jId of jugadorIdsASacar) {
            await pool.query(
                "UPDATE usuario_progreso SET cantidad = cantidad - 1 WHERE usuario_id = $1 AND jugador_id = $2",
                [usuario_id, jId]
            );
        }

        const lootBot = await pool.query(
            "SELECT id, nombre, rareza FROM jugadores WHERE rareza = $1 ORDER BY RANDOM() LIMIT 1",
            [rarezaRecompensa]
        );
        const cartaPremio = lootBot.rows[0];

        // Corregido con EXCLUDED
        await pool.query(
            `INSERT INTO usuario_progreso (usuario_id, jugador_id, cantidad) VALUES ($1, $2, 1) 
             ON CONFLICT (usuario_id, jugador_id) DO UPDATE SET cantidad = usuario_progreso.cantidad + EXCLUDED.cantidad`,
            [usuario_id, cartaPremio.id]
        );

        let eventoActivado = null;
        const esElite = (rarezaBase === "epica" || rarezaBase === "legendaria");

        if (esElite && Math.random() <= 0.08) { 
            const dadosEvento = Math.random();

            if (dadosEvento < 0.50) {
                await pool.query("UPDATE usuarios SET tiros_hoy = 10 WHERE id = $1", [usuario_id]);
                eventoActivado = "⚡ ¡EL BOT SE COPÓ! Te recargó los tiros: Volvés a tener 10 penales disponibles al toque.";
            } else {
                await pool.query(
                    "UPDATE usuarios SET ultima_timba_mundial = NOW() - INTERVAL '4 hours' WHERE id = $1", 
                    [usuario_id]
                );
                eventoActivado = "⏳ ¡CONTRABANDO TÁCTICO! El Bot alteró los papeles del vestuario. ¡Podés jugar el Mundial de vuelta YA!";
            }
        }

        return res.json({
            ok: true,
            mensaje: `🤝 ¡Trato hecho! Cambiaste 3 cartas de tipo [${rarezaBase.toUpperCase()}] por un escalón superior.`,
            cartaGanada: {
                id: cartaPremio.id,
                nombre: cartaPremio.nombre,
                rareza: cartaPremio.rareza.toUpperCase()
            },
            eventoEspecial: eventoActivado 
        });

    } catch (err) {
        console.error("❌ Error en Mercado Bot Mutado:", err);
        return res.status(500).json({ ok: false, error: err.message });
    }
});

/* ========================================================================
   💸 ENGINE MERCADO DE PASES INTER-JUGADORES (P2P)
   ======================================================================== */
app.post('/api/mercado/publicar', verificarToken, async (req, res) => {
    const usuario_id = req.usuarioLogueado.id;
    const { jugador_id, precio } = req.body;

    try {
        const checkStock = await pool.query(
            "SELECT cantidad FROM usuario_progreso WHERE usuario_id = $1 AND jugador_id = $2",
            [usuario_id, jugador_id]
        );

        if (checkStock.rows.length === 0 || checkStock.rows[0].cantidad <= 1) {
            return res.json({ ok: false, mensaje: "❌ No tenés copias repetidas suficientes de esta carta para vender." });
        }

        await pool.query(
            "UPDATE usuario_progreso SET cantidad = cantidad - 1 WHERE usuario_id = $1 AND jugador_id = $2",
            [usuario_id, jugador_id]
        );

        await pool.query(
            "INSERT INTO mercado_pases (vendedor_id, jugador_id, precio_oro) VALUES ($1, $2, $3)",
            [usuario_id, jugador_id, precio]
        );

        return res.json({ ok: true, mensaje: "Carta publicada con éxito." });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ ok: false, error: err.message });
    }
});

app.get('/api/mercado/ofertas', async (req, res) => {
    try {
        const ofertas = await pool.query(
            `SELECT m.id, m.precio_oro, m.vendedor_id, j.nombre, j.rareza, j.bandera, u.username AS nombre_vendedor,
                    EXTRACT(EPOCH FROM (m.fecha_publicacion + INTERVAL '1 day' - NOW())) AS segundos_restantes
             FROM mercado_pases m
             JOIN jugadores j ON m.jugador_id = j.id
             JOIN usuarios u ON m.vendedor_id = u.id
             WHERE m.fecha_publicacion >= NOW() - INTERVAL '1 day'
             ORDER BY m.fecha_publicacion DESC`
        );
        return res.json({ ok: true, ofertas: ofertas.rows });
    } catch (err) {
        console.error("❌ Error en GET ofertas mercado:", err);
        return res.json({ ok: false, error: err.message, mensaje: "Error al sincronizar con Neon." });
    }
});

// Limpiador automático del Mercado P2P
setInterval(async () => {
    console.log("🧹 Revisando vitrinas del mercado para limpiar pases vencidos...");
    try {
        const vencidas = await pool.query(
            "SELECT id, vendedor_id, jugador_id FROM mercado_pases WHERE fecha_publicacion < NOW() - INTERVAL '1 day'"
        );

        if (vencidas.rows.length > 0) {
            console.log(`📦 Encontradas ${vencidas.rows.length} ofertas vencidas. Devolviendo cromos...`);
            for (let oferta of vencidas.rows) {
                // Corregido con EXCLUDED
                await pool.query(
                    `INSERT INTO usuario_progreso (usuario_id, jugador_id, cantidad) VALUES ($1, $2, 1)
                     ON CONFLICT (usuario_id, jugador_id) DO UPDATE SET cantidad = usuario_progreso.cantidad + EXCLUDED.cantidad`,
                    [oferta.vendedor_id, oferta.jugador_id]
                );
                await pool.query("DELETE FROM mercado_pases WHERE id = $1", [oferta.id]);
            }
            console.log("✅ Devolución y limpieza completada.");
        }
    } catch (err) {
        console.error("❌ Error crítico en el limpiador del mercado:", err.message);
    }
}, 15 * 60 * 1000); 

app.post('/api/mercado/comprar', verificarToken, async (req, res) => {
    const usuario_id = req.usuarioLogueado.id;
    const { oferta_id } = req.body; 

    try {
        const buscarOferta = await pool.query(
            "SELECT vendedor_id, jugador_id, precio_oro FROM mercado_pases WHERE id = $1",
            [oferta_id]
        );

        if (buscarOferta.rows.length === 0) {
            return res.json({ ok: false, mensaje: "❌ La oferta ya no está disponible en el mercado." });
        }

        const { vendedor_id, jugador_id, precio_oro } = buscarOferta.rows[0];

        if (parseInt(vendedor_id) === usuario_id) {
            return res.json({ ok: false, mensaje: "❌ No podés comprar tu propia publicación." });
        }

        const checkOro = await pool.query("SELECT monedas FROM usuarios WHERE id = $1", [usuario_id]);
        if (checkOro.rows.length === 0 || checkOro.rows[0].monedas < precio_oro) {
            return res.json({ ok: false, mensaje: "❌ No tenés suficiente Oro en tu cuenta para este fichaje." });
        }

        await pool.query("UPDATE usuarios SET monedas = monedas - $1 WHERE id = $2", [precio_oro, usuario_id]);
        await pool.query("UPDATE usuarios SET monedas = monedas + $1 WHERE id = $2", [precio_oro, vendedor_id]);

        // Corregido con EXCLUDED
        await pool.query(
            `INSERT INTO usuario_progreso (usuario_id, jugador_id, cantidad) VALUES ($1, $2, 1)
             ON CONFLICT (usuario_id, jugador_id) DO UPDATE SET cantidad = usuario_progreso.cantidad + EXCLUDED.cantidad`,
            [usuario_id, jugador_id]
        );

        await pool.query("DELETE FROM mercado_pases WHERE id = $1", [oferta_id]);

        const infoJugador = await pool.query("SELECT nombre FROM jugadores WHERE id = $1", [jugador_id]);
        const checkOroNuevo = await pool.query("SELECT monedas FROM usuarios WHERE id = $1", [usuario_id]);

        return res.json({ 
            ok: true, 
            jugador: infoJugador.rows[0].nombre,
            nuevoOro: checkOroNuevo.rows[0].monedas 
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ ok: false, error: err.message });
    }
});

/* ========================================================================
   🎰 ENGINE QUINIELA COMBINADA (ROTATIVA Y ATÓMICA)
   ======================================================================== */
const BANCO_PARTIDOS_QUINIELA = [
    { local: "BOCA", visitante: "RIVER", emoji: "🔥" },
    { local: "REAL MADRID", visitante: "BARCELONA", emoji: "👑" },
    { local: "MANCHESTER CITY", visitante: "ARSENAL", emoji: "🦈" },
    { local: "RACING", visitante: "INDEPENDIENTE", emoji: "🎓" },
    { local: "MILAN", visitante: "INTER", emoji: "⚔️" },
    { local: "FLAMENGO", visitante: "PALMEIRAS", emoji: "🇧🇷" },
    { local: "LIVERPOOL", visitante: "MAN. UNITED", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    { local: "HURACÁN", visitante: "SAN LORENZO", emoji: "🎈" },
    { local: "BAYERN MUNICH", visitante: "DORTMUND", emoji: "🇩🇪" },
    { local: "JUVENTUS", visitante: "ROMA", emoji: "🇮🇹" }
];

let partidosActivosQuiniela = [];

function rotarFixtureQuiniela() {
    const copia = [...BANCO_PARTIDOS_QUINIELA];
    const mezclados = copia.sort(() => 0.5 - Math.random());
    partidosActivosQuiniela = mezclados.slice(0, 3);
}

// Genera la terna inicial al prender el servidor
rotarFixtureQuiniela();

app.get('/api/timba/quiniela/partidos', (req, res) => {
    res.json({ ok: true, partidos: partidosActivosQuiniela });
});

app.post('/api/timba/quiniela', verificarToken, async (req, res) => {
    const usuario_id = req.usuarioLogueado.id;
    let { monto, elecciones } = req.body;

    try {
        monto = parseInt(monto);

        if (!monto || monto < 50) {
            return res.json({ ok: false, mensaje: "⚠️ El monto mínimo para la boleta es de 50 de Oro." });
        }

        const checkUser = await pool.query("SELECT monedas, ultimo_giro_timestamp, timbas_hoy FROM usuarios WHERE id = $1", [usuario_id]);
        if (checkUser.rows.length === 0) {
            return res.json({ ok: false, mensaje: "❌ Usuario no encontrado." });
        }

        const usuario = checkUser.rows[0];

        if (usuario.monedas < monto) {
            return res.json({ ok: false, mensaje: "❌ No tenés suficiente Oro in tu cuenta para esta jugada." });
        }

        let { timbasActuales } = calcularTimbasActuales(usuario);

        if (timbasActuales <= 0) {
            return res.json({ 
                ok: false, 
                mensaje: "❌ ¡Te quedaste sin energía para apostar en la quiniela! Esperá a que recargue el cronómetro. ⏱️" 
            });
        }

        const nuevasTimbasGuardadas = timbasActuales - 1;
        const ahora = new Date();

        // Guardamos una copia exacta de los partidos con los que el usuario jugó esta boleta
        // antes de tirarlos a la basura y rotar la cartelera
        const partidosDeEstaBoleta = [...partidosActivosQuiniela];

        await pool.query(
            `UPDATE usuarios SET monedas = monedas - $1, ultimo_giro_timestamp = $2, timbas_hoy = $3 WHERE id = $4`,
            [monto, ahora, nuevasTimbasGuardadas, usuario_id]
        );

        const opciones = ['L', 'E', 'V'];
        const reales = {
            p1: opciones[Math.floor(Math.random() * 3)],
            p2: opciones[Math.floor(Math.random() * 3)],
            p3: opciones[Math.floor(Math.random() * 3)]
        };

        const boletaGanadora = (elecciones.p1 === reales.p1 && elecciones.p2 === reales.p2 && elecciones.p3 === reales.p3);
        let premio = 0;
        let mensaje = "";

        if (boletaGanadora) {
            premio = monto * 10;
            await pool.query("UPDATE usuarios SET monedas = monedas + $1 WHERE id = $2", [premio, usuario_id]);
            mensaje = `🔥 ¡QUINIELA DE ORO PERFECTA! Acertaste los 3 partidos y ganaste 🪙${premio}.`;
        } else {
            mensaje = "❌ Boleta perdedora. Fallaste en el pronóstico combinado.";
        }

        await pool.query(
            "INSERT INTO quiniela_apuestas (usuario_id, monto_apostado, predicciones, ganada, premio_entregado) VALUES ($1, $2, $3, $4, $5)",
            [usuario_id, monto, JSON.stringify(elecciones), boletaGanadora, premio]
        );

        const checkOroFinal = await pool.query("SELECT monedas FROM usuarios WHERE id = $1", [usuario_id]);

        // 🔥 LA SOLUCIÓN: Forzamos la rotación inmediata acá en el servidor.
        // La próxima consulta que haga el frontend va a encontrar una terna nuevita de la tartera.
        rotarFixtureQuiniela();

        return res.json({
            ok: true,
            ganó: boletaGanadora,
            mensaje: mensaje,
            resultadosReales: reales,
            partidosSimulados: partidosDeEstaBoleta, // Le mandamos los que corresponden a la jugada real
            nuevoOro: checkOroFinal.rows[0].monedas
        });

    } catch (err) {
        console.error("❌ Error en la quiniela:", err);
        return res.status(500).json({ ok: false, error: err.message });
    }
});

/* ========================================================================
   🚨 CONFIGURACIÓN Y ENDPOINT SEGURO DE ANUNCIOS GLOBAL
   ======================================================================== */
const CONFIG_ANUNCIO_SERVIDOR = {
    activo: true,       
    tipo: "video",      
    titulo: "¡ACTUALIZACIÓN DE TEMPORADA!",
    texto: "Prendete a los nuevos torneos en vivo. Calibramos el MiniMundial para que sea más justo y lanzamos el Mercado P2P.",
    urlImagen: "https://albumpe.onrender.com/assets/novedad.png", 
    urlVideo: "https://www.youtube.com/embed/6DTWH9kYAiY",
    
    informe: {
        version: "v2.4.1-Arena",
        fecha: "Junio 2026",
        cambios: [
            "🏆 **Mini-Mundial Atómico:** Inscripciones gratuitas en el Draft. El Oro o cartas repetidas se debitan en Neon recién al presionar 'Iniciar'.",
            "💸 **Mercado de Pases P2P:** Vitrina internacional activa. Las ofertas duran 24 horas y devuelven el cromo automáticamente si nadie compra.",
            "⏱️ **Reloj de Expiración:** Añadido temporizador visual en las tarjetas de fichajes con alerta roja en la última hora de oferta.",
            "🛡️ **Blindaje de ID:** Limpieza y parseo de strings corruptos (:1) en las solicitudes de red de la Arena."
        ]
    }
};

app.get('/api/anuncio-actual', (req, res) => {
    return res.json(CONFIG_ANUNCIO_SERVIDOR);
});

/* ========================================================================
   🚀 INICIALIZACIÓN DEL SERVIDOR
   ======================================================================== */
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor en la Nube / Red Local activo en puerto ${PORT}`);
});
