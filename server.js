// server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jugadoresMundial = require('./jugadoresData'); // Traemos la data externa

const app = express();
app.use(cors());
app.use(express.json());

// Conexión segura a la base de datos (Usa variable de entorno)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Inicialización asíncrona de las tablas y los datos
(async () => {
    try {
        await pool.query('SELECT NOW()');
        console.log('✅ Conectado con éxito a PostgreSQL en la nube');
        await inicializarBaseDeDatos();
    } catch (err) {
        console.error('❌ Error al conectar o inicializar la base de datos:', err);
    }
})();

async function inicializarBaseDeDatos() {
    try {
        // Estructura de tablas relacionales
        await pool.query(`CREATE TABLE IF NOT EXISTS jugadores (
            id SERIAL PRIMARY KEY,
            nombre TEXT,
            pais TEXT,
            bandera TEXT,
            posicion TEXT,
            foto TEXT,
            rareza TEXT DEFAULT 'comun'
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE,
            password TEXT
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS usuario_progreso (
            usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id),
            monedas INTEGER DEFAULT 100,
            sobres INTEGER DEFAULT 3
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS ranking (
            usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id),
            puntos INTEGER DEFAULT 0
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS album_usuario (
            usuario_id INTEGER REFERENCES usuarios(id),
            jugador_id INTEGER REFERENCES jugadores(id),
            cantidad INTEGER DEFAULT 1,
            PRIMARY KEY (usuario_id, jugador_id)
        )`);

        // Población controlada (Solo si está vacía)
        const checkJugadores = await pool.query("SELECT COUNT(*) AS total FROM jugadores");
        if (parseInt(checkJugadores.rows[0].total) === 0) {
            for (const j of jugadoresMundial) {
                await pool.query(
                    "INSERT INTO jugadores (nombre, pais, bandera, posicion, foto, rareza) VALUES ($1, $2, $3, $4, $5, $6)",
                    [j[0], j[1], j[2], j[3], j[4], j[5] || 'comun']
                );
            }
            console.log("🌱 Base de datos poblada con jugadores iniciales.");
        }
    } catch (error) {
        console.error("❌ Error inicializando las tablas de la BD:", error);
    }
}

function obtenerRarezaAleatoria(tipo) {
    const r = Math.random() * 100;
    const tipoLimpio = (tipo || 'estandar').toLowerCase().trim();

    if (tipoLimpio === 'oro elite' || tipoLimpio === 'elite') {
        if (r < 15) return 'legendaria';
        if (r < 55) return 'epica';
        return 'rara';
    } else if (tipoLimpio === 'premium') {
        if (r < 7) return 'legendaria';
        if (r < 27) return 'epica';
        if (r < 75) return 'rara';
        return 'comun';
    } else {
        if (r < 1.5) return 'legendaria';
        if (r < 8) return 'epica';
        if (r < 35) return 'rara';
        return 'comun';
    }
}

// ==========================================
// ENDPOINTS DE AUTENTICACIÓN
// ==========================================

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Faltan datos" });

    try {
        const nuevoUsuario = await pool.query(
            'INSERT INTO usuarios (username, password) VALUES ($1, $2) RETURNING id',
            [username, password]
        );
        const nuevoUsuarioId = nuevoUsuario.rows[0].id;

        await pool.query('INSERT INTO usuario_progreso (usuario_id, monedas, sobres) VALUES ($1, 100, 3)', [nuevoUsuarioId]);
        await pool.query('INSERT INTO ranking (usuario_id, puntos) VALUES ($1, 0)', [nuevoUsuarioId]);

        res.json({ mensaje: "Usuario registrado con éxito", usuario_id: nuevoUsuarioId });
    } catch (err) {
        if (err.message.includes("unique") || err.message.includes("duplicate")) {
            return res.status(400).json({ error: "El nombre de usuario ya existe" });
        }
        return res.status(500).json({ error: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const resultado = await pool.query('SELECT * FROM usuarios WHERE username = $1 AND password = $2', [username, password]);
        if (resultado.rows.length === 0) return res.status(400).json({ error: "Credenciales incorrectas" });
        
        res.json({ mensaje: "Ingreso exitoso", usuario_id: resultado.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// RUTAS DEL JUEGO DINÁMICAS (POR USUARIO)
// ==========================================

app.get('/api/progreso', async (req, res) => {
    const { usuario_id } = req.query;
    if (!usuario_id) return res.status(400).json({ error: "Falta usuario_id" });

    const query = `
        SELECT u.username, up.monedas, up.sobres, COALESCE(r.puntos, 0) AS puntos
        FROM usuario_progreso up
        JOIN usuarios u ON up.usuario_id = u.id
        LEFT JOIN ranking r ON up.usuario_id = r.usuario_id
        WHERE up.usuario_id = $1
    `;

    try {
        const resultado = await pool.query(query, [usuario_id]);
        if (resultado.rows.length > 0) {
            res.json(resultado.rows[0]);
        } else {
            res.json({ username: "Usuario", monedas: 0, sobres: 0, puntos: 0 });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/album', async (req, res) => {
    const { usuario_id } = req.query;
    if (!usuario_id) return res.status(400).json({ error: "Falta usuario_id" });

    const query = `
        SELECT j.*, CASE WHEN au.jugador_id IS NOT NULL THEN 1 ELSE 0 END AS obtenido 
        FROM jugadores j
        LEFT JOIN album_usuario au ON j.id = au.jugador_id AND au.usuario_id = $1
    `;
    try {
        const resultado = await pool.query(query, [usuario_id]);
        res.json(resultado.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/abrir-sobre', async (req, res) => {
    const { usuario_id, tipo } = req.body; 
    if (!usuario_id) return res.status(400).json({ error: "Falta usuario_id" });

    try {
        const resultadoProgreso = await pool.query('SELECT sobres FROM usuario_progreso WHERE usuario_id = $1', [usuario_id]);
        if (resultadoProgreso.rows.length === 0 || resultadoProgreso.rows[0].sobres <= 0) {
            return res.status(400).json({ error: "No tenés sobres disponibles" });
        }

        const resultadoJugadores = await pool.query('SELECT * FROM jugadores');
        const todosLosJugadores = resultadoJugadores.rows;

        // Descontamos el sobre consumido
        await pool.query('UPDATE usuario_progreso SET sobres = sobres - 1 WHERE usuario_id = $1', [usuario_id]);

        const jugadoresElegidos = [];
        for (let i = 0; i < 5; i++) {
            const rarezaBuscada = obtenerRarezaAleatoria(tipo); 
            let filtrados = todosLosJugadores.filter(j => j.rareza === rarezaBuscada);
            if (filtrados.length === 0) filtrados = todosLosJugadores.filter(j => j.rareza === 'comun');

            const elegido = filtrados[Math.floor(Math.random() * filtrados.length)];
            jugadoresElegidos.push({ ...elegido, repetido: false, monedasDevueltas: 0 });
        }

        let monedasTotalesGanadas = 0;

        for (const j of jugadoresElegidos) {
            const checkExistencia = await pool.query(
                'SELECT cantidad FROM album_usuario WHERE usuario_id = $1 AND jugador_id = $2',
                [usuario_id, j.id]
            );

            if (checkExistencia.rows.length > 0) {
                await pool.query(
                    'UPDATE album_usuario SET cantidad = cantidad + 1 WHERE usuario_id = $1 AND jugador_id = $2',
                    [usuario_id, j.id]
                );

                j.repetido = true;

                // Tabulador de reintegros por repetida (¡Legendario corregido!)
                if (j.rareza === 'comun') j.monedasDevueltas = 50;
                else if (j.rareza === 'rara') j.monedasDevueltas = 150;
                else if (j.rareza === 'epica') j.monedasDevueltas = 300;
                else if (j.rareza === 'legendaria') j.monedasDevueltas = 500; 

                monedasTotalesGanadas += j.monedasDevueltas;
            } else {
                await pool.query(
                    'INSERT INTO album_usuario (usuario_id, jugador_id, cantidad) VALUES ($1, $2, 1)',
                    [usuario_id, j.id]
                );
            }
        }

        if (monedasTotalesGanadas > 0) {
            await pool.query(
                'UPDATE usuario_progreso SET monedas = monedas + $1 WHERE usuario_id = $2',
                [monedasTotalesGanadas, usuario_id]
            );
        }
        
        res.json({
            jugadores: jugadoresElegidos,
            monedasGanadasPorRepetidas: monedasTotalesGanadas
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tienda/entrenar', async (req, res) => {
    const { usuario_id } = req.body;
    try {
        await pool.query('UPDATE usuario_progreso SET monedas = monedas + 50 WHERE usuario_id = $1', [usuario_id]);
        res.json({ mensaje: "Monedas sumadas" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tienda/comprar-sobre', async (req, res) => {
    const { usuario_id } = req.body;
    try {
        const resultado = await pool.query('SELECT monedas FROM usuario_progreso WHERE usuario_id = $1', [usuario_id]);
        if (resultado.rows.length === 0 || resultado.rows[0].monedas < 25) {
            return res.status(400).json({ error: "Monedas insuficientes" });
        }

        await pool.query('UPDATE usuario_progreso SET monedas = monedas - 25, sobres = sobres + 1 WHERE usuario_id = $1', [usuario_id]);
        res.json({ mensaje: "Sobre comprado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/modificar-monedas', async (req, res) => {
    const { usuario_id, cantidad } = req.body;
    try {
        await pool.query("UPDATE usuario_progreso SET monedas = monedas + $1 WHERE usuario_id = $2", [cantidad, usuario_id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/comprar-sobre-tienda', async (req, res) => {
    const { usuario_id, tipo, costo } = req.body;
    try {
        const resultado = await pool.query("SELECT monedas FROM usuario_progreso WHERE usuario_id = $1", [usuario_id]);
        if (resultado.rows.length === 0 || resultado.rows[0].monedas < costo) {
            return res.status(400).json({ error: "❌ No te alcanzan las monedas, ¡andá a entrenar!" });
        }

        await pool.query("UPDATE usuario_progreso SET monedas = monedas - $1, sobres = sobres + 1 WHERE usuario_id = $2", [costo, usuario_id]);
        res.json({ success: true, tipo: tipo });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 🏆 ENDPOINTS PARA EL RANKING GLOBAL
// ==========================================

app.post('/api/actualizar-ranking', async (req, res) => {
    const { usuario_id, puntos } = req.body;
    if (!usuario_id || puntos === undefined) return res.status(400).json({ error: "Faltan datos obligatorios." });

    const query = `
        INSERT INTO ranking (usuario_id, puntos) 
        VALUES ($1, $2)
        ON CONFLICT(usuario_id) 
        DO UPDATE SET puntos = ranking.puntos + $3
    `;
    try {
        await pool.query(query, [usuario_id, puntos, puntos]);
        res.json({ success: true, mensaje: "¡Puntos sumados al ranking con éxito!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/obtener-ranking', async (req, res) => {
    const query = `
        SELECT u.username AS nombre, r.puntos 
        FROM ranking r
        JOIN usuarios u ON r.usuario_id = u.id
        ORDER BY r.puntos DESC
        LIMIT 10
    `;
    try {
        const resultado = await pool.query(query);
        res.json(resultado.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// APERTURA DEL SERVIDOR (ADAPTADO PARA RENDER) 🚀
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor del Álbum corriendo en el puerto ${PORT}`);
});