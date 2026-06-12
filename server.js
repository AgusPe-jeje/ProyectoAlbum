const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a la base de datos de Neon en la nube
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Fkl8WfbH7SgQ@ep-dark-lab-atehlsos.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

// Probamos la conexión
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error al conectar a PostgreSQL en Neon:', err);
  } else {
    console.log('✅ Conectado con éxito a PostgreSQL en la nube');
    inicializarBaseDeDatos();
  }
});

async function inicializarBaseDeDatos() {
    try {
        // TABLA DE JUGADORES
        await pool.query(`CREATE TABLE IF NOT EXISTS jugadores (
            id SERIAL PRIMARY KEY,
            nombre TEXT,
            pais TEXT,
            bandera TEXT,
            posicion TEXT,
            foto TEXT,
            rareza TEXT DEFAULT 'comun'
        )`);

        // NUEVA TABLA DE USUARIOS
        await pool.query(`CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE,
            password TEXT
        )`);

        // PROGRESO VINCULADO AL USUARIO
        await pool.query(`CREATE TABLE IF NOT EXISTS usuario_progreso (
            usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id),
            monedas INTEGER DEFAULT 100,
            sobres INTEGER DEFAULT 3
        )`);

        // 🏆 NUEVA TABLA: RANKING DE MINIJUEGO VINCULADO AL USUARIO
        await pool.query(`CREATE TABLE IF NOT EXISTS ranking (
            usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id),
            puntos INTEGER DEFAULT 0
        )`);

        // ÁLBUM VINCULADO AL USUARIO
        await pool.query(`CREATE TABLE IF NOT EXISTS album_usuario (
            usuario_id INTEGER REFERENCES usuarios(id),
            jugador_id INTEGER REFERENCES jugadores(id),
            cantidad INTEGER DEFAULT 1,
            PRIMARY KEY (usuario_id, jugador_id)
        )`);

        // Carga inicial de jugadores (Solo si está vacía)
        const checkJugadores = await pool.query("SELECT COUNT(*) AS total FROM jugadores");
        if (parseInt(checkJugadores.rows[0].total) === 0) {
            const jugadoresMundial = [
                   // --- AUSTRALIA ---
                    ['Aiden O\'Neill', 'Australia', '🇦🇺', 'Mediocampista', 'fotos/aus_oneill.jpg', 'comun'],
                    ['Alessandro Circati', 'Australia', '🇦🇺', 'Defensor', 'fotos/aus_circa.jpg', 'comun'],
                    ['Aziz Behich', 'Australia', '🇦🇺', 'Defensor', 'fotos/aus_behich.jpg', 'rara'],
                    ['Cameron Burgess', 'Australia', '🇦🇺', 'Defensor', 'fotos/aus_burges.jpg', 'comun'],
                    ['Craig Goodwin', 'Australia', '🇦🇺', 'Delantero', 'fotos/aus_goodwin.jpg', 'rara'],
                    ['Harry Souttar', 'Australia', '🇦🇺', 'Defensor', 'fotos/aus_souttar.jpg', 'rara'],
                    ['Jackson Irvine', 'Australia', '🇦🇺', 'Mediocampista', 'fotos/aus_irvine.jpg', 'rara'],
                    ['Jordan Bos', 'Australia', '🇦🇺', 'Defensor', 'fotos/aus_bos.jpg', 'comun'],
                    ['Kusini Yengi', 'Australia', '🇦🇺', 'Delantero', 'fotos/aus_yengi.jpg', 'comun'],
                    ['Lewis Miller', 'Australia', '🇦🇺', 'Defensor', 'fotos/aus_miller.jpg', 'comun'],
                    ['Mathew Ryan', 'Australia', '🇦🇺', 'Arquero', 'fotos/aus_ryan.jpg', 'epica'],
                    ['Milos Degenek', 'Australia', '🇦🇺', 'Defensor', 'fotos/aus_degenek.jpg', 'comun'],
                    ['Nestory Irankunda', 'Australia', '🇦🇺', 'Delantero', 'fotos/aus_irankun.jpg', 'legendaria'],


                    // --- ARGENTINA ---
                    ['Lionel Messi', 'Argentina', '🇦🇷', 'Delantero', 'fotos/arg_messi.jpg', 'legendaria'],
                    ['Emiliano Martínez', 'Argentina', '🇦🇷', 'Arquero', 'fotos/arg_martinez.jpg', 'epica'],
                    ['Rodrigo De Paul', 'Argentina', '🇦🇷', 'Mediocampista', 'fotos/arg_paul.jpg', 'epica'],
                    ['Julián Álvarez', 'Argentina', '🇦🇷', 'Delantero', 'fotos/arg_alvarez.jpg', 'epica'],
                    ['Lautaro Martínez', 'Argentina', '🇦🇷', 'Delantero', 'fotos/arg_martinez-.jpg', 'epica'],
                    ['Alexis Mac Allister', 'Argentina', '🇦🇷', 'Mediocampista', 'fotos/arg_allister.jpg', 'rara'],
                    ['Enzo Fernández', 'Argentina', '🇦🇷', 'Mediocampista', 'fotos/arg_fernandez.jpg', 'rara'],
                    ['Cristian Romero', 'Argentina', '🇦🇷', 'Defensor', 'fotos/arg_romero.jpg', 'epica'],
                    ['Nicolas Gonzalez', 'Argentina', '🇦🇷', 'Delantero', 'fotos/arg_gonzalez.jpg', 'comun'],
                    ['Franco Mastantuono', 'Argentina', '🇦🇷', 'Delantero', 'fotos/arg_mastantuono.jpg', 'rara'],
                    ['Exequiel Palacios', 'Argentina', '🇦🇷', 'Mediocampista', 'fotos/arg_palacios.jpg', 'comun'],
                    ['Leandro Paredes', 'Argentina', '🇦🇷', 'Mediocampista', 'fotos/arg_paredes.jpg', 'rara'],
                    ['Nico Paz', 'Argentina', '🇦🇷', 'Mediocampista', 'fotos/arg_paz.jpg', 'rara'],
                    ['Giuliano Simeone', 'Argentina', '🇦🇷', 'Delantero', 'fotos/arg_simeone.jpg', 'comun'],
                    

                    // --- BOSNIA Y HERZEGOVINA ---
                    ['Samed Baždar', 'Bosnia y Herzegovina', '🇧🇦', 'Delantero', 'fotos/bos_bazdar.jpg', 'comun'],
                    ['Benjamin Tahirović', 'Bosnia y Herzegovina', '🇧🇦', 'Mediocampista', 'fotos/bos_tahirovic.jpg', 'rara'],
                    ['Edin Džeko', 'Bosnia y Herzegovina', '🇧🇦', 'Delantero', 'fotos/bos_dzeko.jpg', 'epica'],
                    ['Amir Hadžiahmetović', 'Bosnia y Herzegovina', '🇧🇦', 'Mediocampista', 'fotos/bos_hadziahmetovic.jpg', 'comun'],
                    ['Ivan Bašić', 'Bosnia y Herzegovina', '🇧🇦', 'Mediocampista', 'fotos/bos_basic.jpg', 'comun'],
                    ['Sead Kolašinac', 'Bosnia y Herzegovina', '🇧🇦', 'Defensor', 'fotos/bos_kolasinac.jpg', 'rara'],
                    ['Amar Memić', 'Bosnia y Herzegovina', '🇧🇦', 'Mediocampista', 'fotos/bos_memic.jpg', 'comun'],
                    ['Tarik Muharemovic', 'Bosnia y Herzegovina', '🇧🇦', 'Defensor', 'fotos/bos_muharemovic.jpg', 'comun'],
                    ['Nihad Mujakić', 'Bosnia y Herzegovina', '🇧🇦', 'Defensor', 'fotos/bos_mujakic.jpg', 'comun'],
                    ['Ivan Šunjić', 'Bosnia y Herzegovina', '🇧🇦', 'Mediocampista', 'fotos/bos_sunjic.jpg', 'comun'],
                    ['Haris Tabaković', 'Bosnia y Herzegovina', '🇧🇦', 'Delantero', 'fotos/bos_tabakovic.jpg', 'comun'],
                    ['Nikola Vasilj', 'Bosnia y Herzegovina', '🇧🇦', 'Arquero', 'fotos/bos_vasilj.jpg', 'comun'],
                    

                    // --- BÉLGICA ---
                    ['Kevin de Bruyne', 'Bélgica', 'bel', 'Mediocampista', 'fotos/bel_bruyne.jpg', 'legendaria'],
                    ['Timothy Castagne', 'Bélgica', 'bel', 'Defensor', 'fotos/bel_castagne.jpg', 'rara'],
                    ['Maxim de Cuyper', 'Bélgica', 'bel', 'Mediocampista', 'fotos/bel_cuyper.jpg', 'comun'],
                    ['Zeno Debast', 'Bélgica', 'bel', 'Defensor', 'fotos/bel_debast.jpg', 'rara'],
                    ['Jeremy Doku', 'Bélgica', 'bel', 'Delantero', 'fotos/bel_doku.jpg', 'epica'],
                    ['Romelu Lukaku', 'Bélgica', 'bel', 'Delantero', 'fotos/bel_lakaku.jpg', 'legendaria'],
                    ['Brandon Mechele', 'Bélgica', 'bel', 'Defensor', 'fotos/bel_mechele.jpg', 'comun'],
                    ['Thomas Meunier', 'Bélgica', 'bel', 'Defensor', 'fotos/bel_meunier.jpg', 'rara'],
                    ['Amadou Onana', 'Bélgica', 'bel', 'Arquero', 'fotos/bel_onana.jpg', 'epica'],
                    ['Lois Openda', 'Bélgica', 'bel', 'Delantero', 'fotos/bel_openda.jpg', 'epica'],
                    ['Nicolas Raskin', 'Bélgica', 'bel', 'Mediocampista', 'fotos/bel_raskin.jpg', 'comun'],
                    ['Alexis Saelemaekers', 'Bélgica', 'bel', 'Delantero', 'fotos/bel_saelemaekers.jpg', 'rara'],
                    ['Arthur Theate', 'Bélgica', 'bel', 'Defensor', 'fotos/bel_theate.jpg', 'rara'],
                    ['Youri Tielemans', 'Bélgica', 'bel', 'Mediocampista', 'fotos/bel_tielemans.jpg', 'epica'],
                    ['Hans Vanaken', 'Bélgica', 'bel', 'Mediocampista', 'fotos/bel_vanaken.jpg', 'comun'],

                    // --- CHEQUIA ---
                    ['Vaclav Cerny', 'Chequia', 'che', 'Delantero', 'fotos/che_cerny.jpg', 'rara'],
                    ['Lukas Cerv', 'Chequia', 'che', 'Mediocampista', 'fotos/che_cerv.jpg', 'comun'],
                    ['Tomas Chory', 'Chequia', 'che', 'Delantero', 'fotos/che_chory.jpg', 'comun'],
                    ['Adam Hlozek', 'Chequia', 'che', 'Delantero', 'fotos/che_hlozek.jpg', 'epica'],
                    ['Tomas Holes', 'Chequia', 'che', 'Mediocampista', 'fotos/che_holes.jpg', 'rara'],
                    ['Matej Kovar', 'Chequia', 'che', 'Arquero', 'fotos/che_kovar.jpg', 'rara'],
                    ['Ladislav Krejci', 'Chequia', 'che', 'Defensor', 'fotos/che_krejci.jpg', 'epica'],
                    ['Lukas Provod', 'Chequia', 'che', 'Mediocampista', 'fotos/che_provod.jpg', 'rara'],
                    ['Michal Sadilek', 'Chequia', 'che', 'Mediocampista', 'fotos/che_sadilek.jpg', 'rara'],
                    ['Patrik Schick', 'Chequia', 'che', 'Delantero', 'fotos/che_schick.jpg', 'legendaria'],
                    ['Jindrich Stanek', 'Chequia', 'che', 'Arquero', 'fotos/che_stanek.jpg', 'comun'],
                    ['Pavel Sulc', 'Chequia', 'che', 'Mediocampista', 'fotos/che_sulc.jpg', 'comun'],
                    ['Matej Vydra', 'Chequia', 'che', 'Delantero', 'fotos/che_vydra.jpg', 'comun'],
                    ['Jaroslav Zeleny', 'Chequia', 'che', 'Defensor', 'fotos/che_zeleny.jpg', 'comun'],
                    ['David Zima', 'Chequia', 'che', 'Defensor', 'fotos/che_zima.jpg', 'rara'],

                    // --- COSTA DE MARFIL ---
                    ['Simon Adingra', 'Costa de Marfil', 'cm', 'Delantero', 'fotos/cm_adingra.jpg', 'rara'],
                    ['Emmanuel Agbadou', 'Costa de Marfil', 'cm', 'Defensor', 'fotos/cm_agbadou.jpg', 'comun'],
                    ['Willy Boly', 'Costa de Marfil', 'cm', 'Defensor', 'fotos/cm_boly.jpg', 'rara'],
                    ['Amad Diallo', 'Costa de Marfil', 'cm', 'Delantero', 'fotos/cm_diallo.jpg', 'epica'],
                    ['Yan Diomande', 'Costa de Marfil', 'cm', 'Delantero', 'fotos/cm_diomande.jpg', 'epica'],
                    ['Ousmane Diomande', 'Costa de Marfil', 'cm', 'Defensor', 'fotos/cm_diomande--.jpg', 'epica'],
                    ['Yahia Fofana', 'Costa de Marfil', 'cm', 'Arquero', 'fotos/cm_fofana.jpg', 'epica'],
                    ['Seko Fofana', 'Costa de Marfil', 'cm', 'Mediocampista', 'fotos/cm_fofana-.jpg', ''],
                    ['Sébastien Haller', 'Costa de Marfil', 'cm', 'Delantero', 'fotos/cm_haller.jpg', 'legendaria'],
                    ['Ghislain Konan', 'Costa de Marfil', 'cm', 'Defensor', 'fotos/cm_konan.jpg', 'comun'],
                    ['Odilon Kossounou', 'Costa de Marfil', 'cm', 'Defensor', 'fotos/cm_kossounou.jpg', 'rara'],
                    ['Evan Ndicka', 'Costa de Marfil', 'cm', 'Defensor', 'fotos/cm_ndicka.jpg', 'epica'],
                    ['Wilfried Singo', 'Costa de Marfil', 'cm', 'Defensor', 'fotos/cm_singo.jpg', 'rara'],

                    // --- COLOMBIA ---
                    ['Jhon Arias', 'Colombia', 'col', 'Defensor', 'fotos/col_arias.jpg', 'epica'],
                    ['Santiago Arias', 'Colombia', 'col', 'Defensor', 'fotos/col_arias-.jpg', ''],
                    ['Jorge Carrascal', 'Colombia', 'col', 'Mediocampista', 'fotos/col_carrascal.jpg', 'rara'],
                    ['Kevin Castaño', 'Colombia', 'col', 'Mediocampista', 'fotos/col_castaño.jpg', 'comun'],
                    ['Jhon Córdoba', 'Colombia', 'col', 'Delantero', 'fotos/col_cordoba.jpg', 'rara'],
                    ['Luis Díaz', 'Colombia', 'col', 'Delantero', 'fotos/col_diaz.jpg', 'legendaria'],
                    ['Jefferson Lerma', 'Colombia', 'col', 'Mediocampista', 'fotos/col_lerma.jpg', 'epica'],
                    ['Daniel Muñoz', 'Colombia', 'col', 'Defensor', 'fotos/col_muñoz.jpg', 'epica'],
                    ['David Ospina', 'Colombia', 'col', 'Arquero', 'fotos/col_ospina.jpg', 'rara'],
                    ['Juan Fernando Quintero', 'Colombia', 'col', 'Mediocampista', 'fotos/col_quintero.jpg', 'epica'],
                    ['Richard Ríos', 'Colombia', 'col', 'Mediocampista', 'fotos/col_rios.jpg', 'epica'],
                    ['James Rodríguez', 'Colombia', 'col', 'Mediocampista', 'fotos/col_rodriguez.jpg', 'legendaria'],
                    ['Jhon Durán', 'Colombia', 'col', 'Delantero', 'fotos/col_suarez.jpg', 'epica'],
                    ['Camilo Vargas', 'Colombia', 'col', 'Arquero', 'fotos/col_vargas.jpg', 'epica'],

                    // --- ECUADOR ---
                    ['Nilson Angulo', 'Ecuador', 'ecu', 'Delantero', 'fotos/ecu_angulo.jpg', 'comun'],
                    ['Moises Caicedo', 'Ecuador', 'ecu', 'Mediocampista', 'fotos/ecu_caicedo.jpg', 'legendaria'],
                    ['Leonardo Campana', 'Ecuador', 'ecu', 'Delantero', 'fotos/ecu_campana.jpg', 'rara'],
                    ['Alan Franco', 'Ecuador', 'ecu', 'Mediocampista', 'fotos/ecu_franco.jpg', 'rara'],
                    ['Hernán Galíndez', 'Ecuador', 'ecu', 'Arquero', 'fotos/ecu_galindez.jpg', 'epica'],
                    ['Alan Minda', 'Ecuador', 'ecu', 'Delantero', 'fotos/ecu_minda.jpg', 'rara'],
                    ['Joel Ordóñez', 'Ecuador', 'ecu', 'Defensor', 'fotos/ecu_ordoñez.jpg', 'rara'],
                    ['Kendry Páez', 'Ecuador', 'ecu', 'Mediocampista', 'fotos/ecu_paez.jpg', 'epica'],
                    ['Gonzalo Plata', 'Ecuador', 'ecu', 'Delantero', 'fotos/ecu_plata.jpg', 'epica'],
                    ['Kevin Rodríguez', 'Ecuador', 'ecu', 'Delantero', 'fotos/ecu_rodriguez.jpg', 'comun'],
                    ['Enner Valencia', 'Ecuador', 'ecu', 'Delantero', 'fotos/ecu_valencia.jpg', 'legendaria'],
                    ['Gonzalo Valle', 'Ecuador', 'ecu', 'Arquero', 'fotos/ecu_valle.jpg', 'comun'],
                    ['Pedro Vite', 'Ecuador', 'ecu', 'Mediocampista', 'fotos/ecu_vite.jpg', 'rara'],
                    ['John Yeboah', 'Ecuador', 'ecu', 'Delantero', 'fotos/ecu_yeboah.jpg', 'rara'],

                    // --- ESPAÑA ---
                    ['Dani Carvajal', 'España', 'esp', 'Defensor', 'fotos/esp_carvajal.jpg', 'legendaria'],
                    ['Marc Cucurella', 'España', 'esp', 'Defensor', 'fotos/esp_cucurella.jpg', 'epica'],
                    ['Mikel Merino', 'España', 'esp', 'Mediocampista', 'fotos/esp_merino.jpg', 'rara'],
                    ['Álvaro Morata', 'España', 'esp', 'Delantero', 'fotos/esp_morata.jpg', 'rara'],
                    ['Dani Olmo', 'España', 'esp', 'Mediocampista', 'fotos/esp_olmo.jpg', 'epica'],
                    ['Mikel Oyarzabal', 'España', 'esp', 'Delantero', 'fotos/esp_oyarzabal.jpg', 'rara'],
                    ['Pedri', 'España', 'esp', 'Mediocampista', 'fotos/esp_pedri.jpg', 'epica'],
                    ['Rodri', 'España', 'esp', 'Mediocampista', 'fotos/esp_rodri.jpg', 'legendaria'],
                    ['Fabian Ruiz', 'España', 'esp', 'Mediocampista', 'fotos/esp_ruiz.jpg', 'epica'],
                    ['Unai Simón', 'España', 'esp', 'Arquero', 'fotos/esp_simon.jpg', 'epica'],
                    ['Ferran Torres', 'España', 'esp', 'Delantero', 'fotos/esp_torres.jpg', 'rara'],
                    ['Nico Williams', 'España', 'esp', 'Delantero', 'fotos/esp_williams.jpg', 'legendaria'],
                    ['Lamine Yamal', 'España', 'esp', 'Delantero', 'fotos/esp_yamal.jpg', 'legendaria'],
                    ['Martin Zubimendi', 'España', 'esp', 'Mediocampista', 'fotos/esp_zubimendi.jpg', 'rara'],
                    
                    // --- FRANCIA ---
                    ['Bradley Barcola', 'Francia', 'fra', 'Delantero', 'fotos/fra_barcola.jpg', 'epica'],
                    ['Eduardo Camavinga', 'Francia', 'fra', 'Mediocampista', 'fotos/fra_camavinga.jpg', 'epica'],
                    ['Kingsley Coman', 'Francia', 'fra', 'Delantero', 'fotos/fra_coman.jpg', 'rara'],
                    ['Ousmane Dembélé', 'Francia', 'fra', 'Delantero', 'fotos/fra_dembele.jpg', 'legendaria'],
                    ['Lucas Digne', 'Francia', 'fra', 'Defensor', 'fotos/fra_digne.jpg', 'rara'],
                    ['Desiré Doué', 'Francia', 'fra', 'Mediocampista', 'fotos/fra_doue.jpg', 'rara'],
                    ['Hugo Ekitike', 'Francia', 'fra', 'Delantero', 'fotos/fra_ekitike.jpg', 'rara'],
                    ['Manu Koné', 'Francia', 'fra', 'Mediocampista', 'fotos/fra_kone.jpg', 'comun'],
                    ['Mike Maignan', 'Francia', 'fra', 'Arquero', 'fotos/fra_maignan.jpg', 'epica'],
                    ['Kylian Mbappé', 'Francia', 'fra', 'Delantero', 'fotos/fra_mbappe.jpg', 'legendaria'],
                    ['Michael Olise', 'Francia', 'fra', 'Delantero', 'fotos/fra_olise.jpg', 'epica'],
                    ['Adrien Rabiot', 'Francia', 'fra', 'Mediocampista', 'fotos/fra_rabiot.jpg', 'rara'],
                    ['Aurélien Tchouaméni', 'Francia', 'fra', 'Mediocampista', 'fotos/fra_tchuamani.jpg', 'epica'],
                    ['Dayot Upamecano', 'Francia', 'fra', 'Defensor', 'fotos/fra_upamecano.jpg', 'rara'],

                    // --- INGLATERRA ---
                    ['Jude Bellingham', 'Inglaterra', 'ing', 'Mediocampista', 'fotos/ing_bellingham.jpg', 'legendaria'],
                    ['Dan Burn', 'Inglaterra', 'ing', 'Defensor', 'fotos/ing_burn.jpg', 'rara'],
                    ['Phil Foden', 'Inglaterra', 'ing', 'Delantero', 'fotos/ing_foden.jpg', 'legendaria'],
                    ['Anthony Gordon', 'Inglaterra', 'ing', 'Delantero', 'fotos/ing_gordon.jpg', 'rara'],
                    ['Marc Guéhi', 'Inglaterra', 'ing', 'Defensor', 'fotos/ing_guehi.jpg', 'epica'],
                    ['Dean Henderson', 'Inglaterra', 'ing', 'Arquero', 'fotos/ing_henderson.jpg', 'rara'],
                    ['Harry Kane', 'Inglaterra', 'ing', 'Delantero', 'fotos/ing_kane.jpg', 'legendaria'],
                    ['Cole Palmer', 'Inglaterra', 'ing', 'Mediocampista', 'fotos/ing_palmer.jpg', 'legendaria'],
                    ['Jordan Pickford', 'Inglaterra', 'ing', 'Arquero', 'fotos/ing_pickford.jpg', 'epica'],
                    ['Marcus Rashford', 'Inglaterra', 'ing', 'Delantero', 'fotos/ing_rashford.jpg', 'epica'],
                    ['Declan Rice', 'Inglaterra', 'ing', 'Mediocampista', 'fotos/ing_rice.jpg', 'epica'],
                    ['Morgan Rogers', 'Inglaterra', 'ing', 'Mediocampista', 'fotos/ing_rogers.jpg', 'comun'],
                    ['Bukayo Saka', 'Inglaterra', 'ing', 'Delantero', 'fotos/ing_saka.jpg', 'legendaria'],
                    ['John Stones', 'Inglaterra', 'ing', 'Defensor', 'fotos/ing_stones.jpg', 'epica'],
                    ['Ollie Watkins', 'Inglaterra', 'ing', 'Delantero', 'fotos/ing_watkins.jpg', 'epica'],

                    // --- MEXICO ---
                    ['Luis Malagon', 'México', '🇲🇽', 'Arquero', 'fotos/mex_malagon.jpg', 'rara'],
                    ['Edson Álvarez', 'México', '🇲🇽', 'Mediocampista', 'fotos/mex_alvarez.jpg', 'epica'],
                    ['Chucky Lozano', 'México', '🇲🇽', 'Delantero', 'fotos/mex_lozano.jpg', 'rara'],
                    ['César Montes', 'México', '🇲🇽', 'Defensor', 'fotos/mex_montes.jpg', 'comun'],
                    ['Carlos Rodriguez', 'México', '🇲🇽', 'Mediocampista', 'fotos/mex_rodriguez.jpg', 'comun'],
                    ['Diego Lainez', 'México', '🇲🇽', 'Mediocampista', 'fotos/mex_lainez.jpg', 'comun'],
                    ['Erick Sanchez', 'México', '🇲🇽', 'Mediocampista', 'fotos/mex_sanchez.jpg', 'comun'],
                    ['Israel Reyes', 'México', '🇲🇽', 'Mediocampista', 'fotos/mex_reyes.jpg', 'comun'],
                    ['Jesus Gallardo', 'México', '🇲🇽', 'Delantero', 'fotos/mex_gallardo.jpg', 'comun'],
                    ['Marcelo Ruiz', 'México', '🇲🇽', 'Mediocampista', 'fotos/mex_ruiz.jpg', 'comun'],
                    ['Santiago Gimenez', 'México', '🇲🇽', 'Delantero', 'fotos/mex_gimenez.jpg', 'epica'],
                    ['Raul Jimenez', 'México', '🇲🇽', 'Delantero', 'fotos/mex_jimenez.jpg', 'rara'],
                    ['Johan Vasquez', 'México', '🇲🇽', 'Delantero', 'fotos/mex_vasquez.jpg', 'comun'],
                    ['Jorge Sanchez', 'México', '🇲🇽', 'Delantero', 'fotos/mex_sanchez1.jpg', 'comun'],
                    ['Orbelin Pineda', 'México', '🇲🇽', 'Delantero', 'fotos/mex_pineda.jpg', 'comun'],

                    // --- JAPÓN ---
                    ['Junya Ito', 'Japón', 'jap', 'Delantero', 'fotos/jap_ito.jpg', 'epica'],
                    ['Daichi Kamada', 'Japón', 'jap', 'Mediocampista', 'fotos/jap_kamada.jpg', 'epica'],
                    ['Takefusa Kubo', 'Japón', 'jap', 'Delantero', 'fotos/jap_kubo.jpg', 'legendaria'],
                    ['Shuto Machino', 'Japón', 'jap', 'Delantero', 'fotos/jap_machino.jpg', 'comun'],
                    ['Takumi Minamino', 'Japón', 'jap', 'Mediocampista', 'fotos/jap_minamino.jpg', 'epica'],
                    ['Keito Nakamura', 'Japón', 'jap', 'Delantero', 'fotos/jap_nakamura.jpg', 'rara'],
                    ['Kaishu Sano', 'Japón', 'jap', 'Mediocampista', 'fotos/jap_sano.jpg', 'comun'],
                    ['Yuki Soma', 'Japón', 'jap', 'Delantero', 'fotos/jap_soma.jpg', 'comun'],
                    ['Zion Suzuki', 'Japón', 'jap', 'Arquero', 'fotos/jap_suzuki.jpg', 'rara'],
                    ['Ao Tanaka', 'Japón', 'jap', 'Mediocampista', 'fotos/jap_tanaka.jpg', 'rara'],
                    ['Shogo Taniguchi', 'Japón', 'jap', 'Defensor', 'fotos/jap_taniguchi.jpg', 'rara'],
                    ['Ayase Ueda', 'Japón', 'jap', 'Delantero', 'fotos/jap_ueda.jpg', 'epica'],
                    ['Kota Watanabe', 'Japón', 'jap', 'Mediocampista', 'fotos/jap_watanabe.jpg', 'comun'],

                    // --- NORUEGA ---
                    ['Kristoffer Ajer', 'Noruega', 'nor', 'Defensor', 'fotos/nor_ajer.jpg', 'rara'],
                    ['', 'Noruega', 'nor', '', 'fotos/nor_ajer-.jpg', ''],
                    ['Patrick Berg', 'Noruega', 'nor', 'Mediocampista', 'fotos/nor_berg.jpg', 'comun'],
                    ['Sander Berge', 'Noruega', 'nor', 'Mediocampista', 'fotos/nor_berge.jpg', 'rara'],
                    ['Oscar Bobb', 'Noruega', 'nor', 'Delantero', 'fotos/nor_bobb.jpg', 'epica'],
                    ['Aron Dønnum', 'Noruega', 'nor', 'Delantero', 'fotos/nor_donnum.jpg', 'comun'],
                    ['Erling Haaland', 'Noruega', 'nor', 'Delantero', 'fotos/nor_haaland.jpg', 'legendaria'],
                    ['Torbiørn Heggem', 'Noruega', 'nor', 'Defensor', 'fotos/nor_heggem.jpg', 'comun'],
                    ['Jørgen Strand Larsen', 'Noruega', 'nor', 'Delantero', 'fotos/nor_larsen.jpg', 'rara'],
                    ['Antonio Nusa', 'Noruega', 'nor', 'Delantero', 'fotos/nor_nusa.jpg', 'epica'],
                    ['Martin Ødegaard', 'Noruega', 'nor', 'Mediocampista', 'fotos/nor_odegaard.jpg', 'legendaria'],
                    ['Leo Østigård', 'Noruega', 'nor', 'Defensor', 'fotos/nor_ostigard.jpg', 'rara'],
                    ['Andreas Schjelderup', 'Noruega', 'nor', 'Delantero', 'fotos/nor_schjelderup.jpg', 'rara'],
                    ['Morten Thorsby', 'Noruega', 'nor', 'Mediocampista', 'fotos/nor_thorsby.jpg', 'rara'],
                    ['David Møller Wolfe', 'Noruega', 'nor', 'Defensor', 'fotos/nor_wolfe.jpg', 'comun'],

                    // --- PAÍSES BAJOS ---
                    ['Memphis Depay', 'Países Bajos', 'pai', 'Delantero', 'fotos/pai_depay.jpg', 'epica'],
                    ['Virgil van Dijk', 'Países Bajos', 'pai', 'Defensor', 'fotos/pai_dijk.jpg', 'legendaria'],
                    ['Denzel Dumfries', 'Países Bajos', 'pai', 'Defensor', 'fotos/pai_dumfries.jpg', 'epica'],
                    ['Ryan Gravenberch', 'Países Bajos', 'pai', 'Mediocampista', 'fotos/pai_gravenberch.jpg', 'rara'],
                    ['Jan Paul van Hecke', 'Países Bajos', 'pai', 'Defensor', 'fotos/pai_hecke.jpg', 'comun'],
                    ['Frenkie de Jong', 'Países Bajos', 'pai', 'Mediocampista', 'fotos/pai_jong.jpg', 'legendaria'],
                    ['Justin Kluivert', 'Países Bajos', 'pai', 'Delantero', 'fotos/pai_kluivert.jpg', 'rara'],
                    ['Teun Koopmeiners', 'Países Bajos', 'pai', 'Mediocampista', 'fotos/pai_koopmeiners.jpg', 'epica'],
                    ['Donyell Malen', 'Países Bajos', 'pai', 'Delantero', 'fotos/pai_malen.jpg', 'rara'],
                    ['Tijjani Reijnders', 'Países Bajos', 'pai', 'Mediocampista', 'fotos/pai_reijnders.jpg', 'epica'],
                    ['Xavi Simons', 'Países Bajos', 'pai', 'Mediocampista', 'fotos/pai_simons.jpg', 'legendaria'],
                    ['Micky van de Ven', 'Países Bajos', 'pai', 'Defensor', 'fotos/pai_ven.jpg', 'epica'],
                    ['Bart Verbruggen', 'Países Bajos', 'pai', 'Arquero', 'fotos/pai_verbruggen.jpg', 'epica'],
                    ['Wout Weghorst', 'Países Bajos', 'pai', 'Delantero', 'fotos/pai_weghorst.jpg', 'rara'],

                    // --- PORTUGAL ---
                    ['João Cancelo', 'Portugal', 'por', 'Defensor', 'fotos/por_cancelo.jpg', 'epica'],
                    ['Diogo Costa', 'Portugal', 'por', 'Arquero', 'fotos/por_costa.jpg', 'epica'],
                    ['Diogo Dalot', 'Portugal', 'por', 'Defensor', 'fotos/por_dalot.jpg', 'rara'],
                    ['Rúben Dias', 'Portugal', 'por', 'Defensor', 'fotos/por_dias.jpg', 'legendaria'],
                    ['João Félix', 'Portugal', 'por', 'Delantero', 'fotos/por_felix.jpg', 'rara'],
                    ['Bruno Fernandes', 'Portugal', 'por', 'Mediocampista', 'fotos/por_fernandes.jpg', 'legendaria'],
                    ['Gonçalo Inácio', 'Portugal', 'por', 'Defensor', 'fotos/por_inacio.jpg', 'rara'],
                    ['Nuno Mendes', 'Portugal', 'por', 'Defensor', 'fotos/por_mendes.jpg', 'epica'],
                    ['Rúben Neves', 'Portugal', 'por', 'Mediocampista', 'fotos/por_neves-.jpg', 'rara'],
                    ['Joao Neves', 'Portugal', 'por', 'Mediocampista', 'fotos/por_neves.jpg', 'epica'],
                    ['Cristiano Ronaldo', 'Portugal', 'por', 'Delantero', 'fotos/por_ronaldo.jpg', 'legendaria'],
                    ['Bernardo Silva', 'Portugal', 'por', 'Mediocampista', 'fotos/por_silva.jpg', 'legendaria'],
                    ['Trincão', 'Portugal', 'por', 'Delantero', 'fotos/por_trincao.jpg', 'comun'],
                    ['Vitinha', 'Portugal', 'por', 'Mediocampista', 'fotos/por_vitinha.jpg', 'epica'],

                    // --- ESTADOS UNIDOS ---
                    ['Brenden Aaronson', 'Estados Unidos', '🇺🇸', 'Mediocampista', 'fotos/usa_aaronson.jpg', 'comun'],
                    ['Tyler Adams', 'Estados Unidos', '🇺🇸', 'Mediocampista', 'fotos/usa_adams.jpg', 'rara'],
                    ['Cristian Roldan', 'Estados Unidos', '🇺🇸', 'Mediocampista', 'fotos/usa_roldan.jpg', 'comun'],
                    ['Diego Luna', 'Estados Unidos', '🇺🇸', 'Mediocampista', 'fotos/usa_luna.jpg', 'rara'],
                    ['Folarin Balogun', 'Estados Unidos', '🇺🇸', 'Delantero', 'fotos/usa_balogun.jpg', 'rara'],
                    ['Alejandro Zendejas', 'Estados Unidos', '🇺🇸', 'Delantero', 'fotos/usa_freeman.jpg', 'comun'],
                    ['Matt Freese', 'Estados Unidos', '🇺🇸', 'Arquero', 'fotos/usa_freese.jpg', 'comun'],  
                    ['Weston McKennie', 'Estados Unidos', '🇺🇸', 'Mediocampista', 'fotos/usa_mckennie.jpg', 'rara'],
                    ['Mark McKenzie', 'Estados Unidos', '🇺🇸', 'Defensor', 'fotos/usa_mckenzie.jpg', 'comun'],
                    ['Ricardo Pepi', 'Estados Unidos', '🇺🇸', 'Delantero', 'fotos/usa_pepi.jpg', 'comun'],
                    ['Christian Pulisic', 'Estados Unidos', '🇺🇸', 'Delantero', 'fotos/usa_pulisic.jpg', 'epica'],
                    ['Chris Richards', 'Estados Unidos', '🇺🇸', 'Defensor', 'fotos/usa_richards.jpg', 'comun'],
                    ['Antonee Robinson', 'Estados Unidos', '🇺🇸', 'Defensor', 'fotos/usa_robinson.jpg', 'comun'],
                    ['Tanner Tessmann', 'Estados Unidos', '🇺🇸', 'Mediocampista', 'fotos/usa_tessmann.jpg', 'comun'],
                    ['Tim Weah', 'Estados Unidos', '🇺🇸', 'Delantero', 'fotos/usa_weah.jpg', 'comun'],

                    // --- CATAR ---
                    ['Ahmed Alaaeldin', 'Catar', 'qat', 'Delantero', 'fotos/qat_ahmed.jpg', 'comun'],
                    ['Sultan Al-Brake', 'Catar', 'qat', 'Defensor', 'fotos/qat_albrake.jpg', 'comun'],
                    ['Almoez Ali', 'Catar', 'qat', 'Delantero', 'fotos/qat_ali.jpg', 'legendaria'],
                    ['Karim Boudiaf', 'Catar', 'qat', 'Mediocampista', 'fotos/qat_boudiaf.jpg', 'rara'],
                    ['Homam Ahmed', 'Catar', 'qat', 'Defensor', 'fotos/qat_ganehi.jpg', 'comun'],
                    ['Abdulaziz Hatem', 'Catar', 'qat', 'Mediocampista', 'fotos/qat_hatem.jpg', 'rara'],
                    ['Hassan Al-Haydos', 'Catar', 'qat', 'Delantero', 'fotos/qat_haydos.jpg', 'epica'],
                    ['Boualem Khoukhi', 'Catar', 'qat', 'Defensor', 'fotos/qat_khoukhi.jpg', 'epica'],
                    ['Assim Madibo', 'Catar', 'qat', 'Mediocampista', 'fotos/qat_madibo.jpg', 'comun'],
                    ['Lucas Mendes', 'Catar', 'qat', 'Defensor', 'fotos/qat_mendes.jpg', 'rara'],
                    ['Pedro Miguel', 'Catar', 'qat', 'Defensor', 'fotos/qat_miguel.jpg', 'rara'],
                    ['Tarek Salman', 'Catar', 'qat', 'Defensor', 'fotos/qat_salman.jpg', 'comun'],
                    ['Mohammed Waad', 'Catar', 'qat', 'Mediocampista', 'fotos/qat_waad.jpg', 'rara'],
                    
                    // --- CANADÁ ---
                    ['Alphonso Davies', 'Canadá', '🇨🇦', 'Defensor', 'fotos/can_davies.jpg', 'epica'],
                    ['Samuel Adekugbe', 'Canadá', '🇨🇦', 'Defensor', 'fotos/can_adekugbe.jpg', 'comun'],
                    ['Moise Bombito', 'Canadá', '🇨🇦', 'Defensor', 'fotos/can_bombito.jpg', 'rara'],
                    ['Tajon Buchanan', 'Canadá', '🇨🇦', 'Mediocampista', 'fotos/can_buchanan.jpg', 'rara'],
                    ['Mathieu Choiniere', 'Canadá', '🇨🇦', 'Mediocampista', 'fotos/can_choiniere.jpg', 'comun'],
                    ['Derek Cornelius', 'Canadá', '🇨🇦', 'Defensor', 'fotos/can_cornelius.jpg', 'comun'],
                    ['Cyle Larin', 'Canadá', '🇨🇦', 'Delantero', 'fotos/can_larin.jpg', 'comun'],
                    ['Jonathan David', 'Canadá', '🇨🇦', 'Delantero', 'fotos/can_david.jpg', 'rara'],
                    ['Dayne St. Clair', 'Canadá', '🇨🇦', 'Arquero', 'fotos/can_clair.jpg', 'comun'],
                    ['Stephen Eustaquio', 'Canadá', '🇨🇦', 'Mediocampista', 'fotos/can_eustaquio.jpg', 'rara'],
                    ['Ismael Kone', 'Canadá', '🇨🇦', 'Mediocampista', 'fotos/can_kone.jpg', 'comun'],
                    ['Liam Millar', 'Canadá', '🇨🇦', 'Delantero', 'fotos/can_millar.jpg', 'comun'],
                    ['Kamal Miller', 'Canadá', '🇨🇦', 'Defensor', 'fotos/can_miller.jpg', 'comun'],
                    ['Jonathan Osorio', 'Canadá', '🇨🇦', 'Mediocampista', 'fotos/can_osorio.jpg', 'comun'],

                    // --- BRASIL ---
                    ['Alisson Becker', 'Brasil', '🇧🇷', 'Arquero', 'fotos/bra_becker.jpg', 'epica'],
                    ['Gleison Bremer', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_bremer.jpg', 'rara'],
                    ['Casemiro', 'Brasil', '🇧🇷', 'Mediocampista', 'fotos/bra_casemiro.jpg', 'epica'],
                    ['Matheus Cunha', 'Brasil', '🇧🇷', 'Delantero', 'fotos/bra_cunha.jpg', 'comun'],
                    ['Danilo', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_danilo.jpg', 'comun'],
                    ['Danilo', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_danilo-.jpg', 'comun'],
                    ['Endrick', 'Brasil', '🇧🇷', 'Delantero', 'fotos/bra_endrick.jpg', 'rara'],
                    ['Fabinho', 'Brasil', '🇧🇷', 'Mediocampista', 'fotos/bra_fabinho.jpg', 'comun'],
                    ['Bruno Guimarães', 'Brasil', '🇧🇷', 'Mediocampista', 'fotos/bra_guimaraes.jpg', 'rara'],
                    ['Henrique', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_henriqe.jpg', 'comun'],
                    ['Roger Ibáñez', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_ibañez.jpg', 'comun'],
                    ['Gabriel Magalhães', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_magalhaes.jpg', 'rara'],
                    ['Marquinhos', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_marquinhos.jpg', 'epica'],
                    ['Gabriel Martinelli', 'Brasil', '🇧🇷', 'Delantero', 'fotos/bra_martinelli.jpg', 'rara'],
                    ['Ederson Moraes', 'Brasil', '🇧🇷', 'Arquero', 'fotos/bra_moraes.jpg', 'rara'],
                    ['Neymar Jr', 'Brasil', '🇧🇷', 'Delantero', 'fotos/bra_neymar.jpg', 'legendaria'],
                    ['Lucas Paquetá', 'Brasil', '🇧🇷', 'Mediocampista', 'fotos/bra_paqueta.jpg', 'rara'],
                    ['Andreas Pereira', 'Brasil', '🇧🇷', 'Mediocampista', 'fotos/bra_pereira.jpg', 'comun'],
                    ['Raphinha', 'Brasil', '🇧🇷', 'Delantero', 'fotos/bra_raphinha.jpg', 'epica'],
                    ['Rayan', 'Brasil', '🇧🇷', 'Delantero', 'fotos/bra_rayan.jpg', 'comun'],
                    ['Alex Sandro', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_sandro.jpg', 'comun'],
                    ['Santos', 'Brasil', '🇧🇷', 'Arquero', 'fotos/bra_santos.jpg', 'comun'],
                    ['Igor Thiago', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_thiago.jpg', 'comun'],
                    ['Vinícius Jr', 'Brasil', '🇧🇷', 'Delantero', 'fotos/bra_vinicius.jpg', 'legendaria'],
                    ['Weverton', 'Brasil', '🇧🇷', 'Arquero', 'fotos/bra_weverton.jpg', 'comun'],
                    ['Wesley', 'Brasil', '🇧🇷', 'Defensor', 'fotos/bra_wesley.jpg', 'comun'],

                    // --- ESCOCIA ---
                    ['Ryan Christie', 'Escocia', 'esc', 'Mediocampista', 'fotos/esc_christie.jpg', 'rara'],
                    ['Lyndon Dykes', 'Escocia', 'esc', 'Delantero', 'fotos/esc_dykes.jpg', 'rara'],
                    ['Lewis Ferguson', 'Escocia', 'esc', 'Mediocampista', 'fotos/esc_ferguson.jpg', 'rara'],
                    ['Angus Gunn', 'Escocia', 'esc', 'Arquero', 'fotos/esc_gunn.jpg', 'epica'],
                    ['Grant Hanley', 'Escocia', 'esc', 'Defensor', 'fotos/esc_hanley.jpg', 'comun'],
                    ['Jack Hendry', 'Escocia', 'esc', 'Defensor', 'fotos/esc_hendry.jpg', 'rara'],
                    ['John McGinn', 'Escocia', 'esc', 'Mediocampista', 'fotos/esc_mcginn.jpg', 'epica'],
                    ['Scott McKenna', 'Escocia', 'esc', 'Defensor', 'fotos/esc_mckenna.jpg', 'comun'],
                    ['Kenny McLean', 'Escocia', 'esc', 'Mediocampista', 'fotos/esc_mclean.jpg', 'comun'],
                    ['Scott McTominay', 'Escocia', 'esc', 'Mediocampista', 'fotos/esc_mctominay.jpg', 'legendaria'],
                    ['Anthony Ralston', 'Escocia', 'esc', 'Defensor', 'fotos/esc_ralston.jpg', 'comun'],
                    ['John Souttar', 'Escocia', 'esc', 'Defensor', 'fotos/esc_souttar.jpg', 'rara'],
                    
                    // --- HAITÍ ---
                    ['Ricardo Adé', 'Haití', 'hai', 'Delantero', 'fotos/hai_ade.jpg', 'comun'],
                    ['Carlens Arcus', 'Haití', 'hai', 'Defensor', 'fotos/hai_arcus.jpg', 'comun'],
                    ['Christopher Attvs', 'Haití', 'hai', 'Defensor', 'fotos/hai_attvs.jpg', 'comun'], 
                    ['Jean-Ricner Bellegarde', 'Haití', 'hai', 'Mediocampista', 'fotos/hai_bellegarde.jpg', 'epica'],
                    ['Josué Casimir', 'Haití', 'hai', 'Defensor', 'fotos/hai_casimir.jpg', 'comun'],
                    ['Don Deedson Louicius', 'Haití', 'hai', 'Delantero', 'fotos/hai_deedson.jpg', 'comun'],
                    ['Hannes Delcroix', 'Haití', 'hai', 'Defensor', 'fotos/hai_delcroix.jpg', 'comun'],
                    ['Jean-Kévin Duverne', 'Haití', 'hai', 'Defensor', 'fotos/hai_duverne.jpg', 'rara'],
                    ['Derrick Etienne Jr.', 'Haití', 'hai', 'Mediocampista', 'fotos/hai_etienne_Jr.jpg', 'comun'],
                    ['Martin Experience', 'Haití', 'hai', 'Defensor', 'fotos/hai_experience.jpg', 'comun'],
                    ['Danley Jean Jacques', 'Haití', 'hai', 'Mediocampista', 'fotos/hai_jacques.jpg', 'comun'],
                    ['Duke Lacroix', 'Haití', 'hai', 'Defensor', 'fotos/hai_lacroix.jpg', 'comun'],
                    ['Duckens Nazon', 'Haití', 'hai', 'Delantero', 'fotos/hai_nazon.jpg', 'rara'],
                    ['Leverton Pierre', 'Haití', 'hai', 'Delantero', 'fotos/hai_pierre.jpg', 'comun'],
                    ['Johny Placide', 'Haití', 'hai', 'Arquero', 'fotos/hai_placide.jpg', 'rara'],

                    // --- COREA DEL SUR ---
                    ['Jens Castrop', 'Corea del Sur', 'kor', 'Mediocampista', 'fotos/kor_castrop.jpg', 'comun'],
                    ['Yumin Cho', 'Corea del Sur', 'kor', 'Defensor', 'fotos/kor_cho.jpg', 'comun'],
                    ['Heechan Hwang', 'Corea del Sur', 'kor', 'Delantero', 'fotos/kor_hwang.jpg', 'epica'],
                    ['Jaesung Lee', 'Corea del Sur', 'kor', 'Mediocampista', 'fotos/kor_jLee.jpg', 'rara'],
                    ['Hyeonwoo Jo', 'Corea del Sur', 'kor', 'Arquero', 'fotos/kor_jo.jpg', 'rara'],
                    ['Seunggyu Kim', 'Corea del Sur', 'kor', 'Arquero', 'fotos/kor_kim.jpg', 'rara'],
                    ['Kangin Lee', 'Corea del Sur', 'kor', 'Mediocampista', 'fotos/kor_kLee.jpg', 'epica'],
                    ['Hanbeom Lee', 'Corea del Sur', 'kor', 'Defensor', 'fotos/kor_lee.jpg', 'comun'],
                    ['Myungjae Lee', 'Corea del Sur', 'kor', 'Defensor', 'fotos/kor_mLee.jpg', 'comun'],
                    ['Hyeongyu Oh', 'Corea del Sur', 'kor', 'Delantero', 'fotos/kor_oh.jpg', 'comun'],
                    ['Seungho Paik', 'Corea del Sur', 'kor', 'Mediocampista', 'fotos/kor_paik.jpg', 'comun'],
                    ['Youngwoo Seol', 'Corea del Sur', 'kor', 'Defensor', 'fotos/kor_seol.jpg', 'comun'],
                    ['Heungmin Son', 'Corea del Sur', 'kor', 'Delantero', 'fotos/kor_son.jpg', 'legendaria'],

                    // --- PARAGUAY ---
                    ['Omar Alderete', 'Paraguay', 'par', 'Defensor', 'fotos/par_alderete.jpg', 'rara'],
                    ['Miguel Almirón', 'Paraguay', 'par', 'Delantero', 'fotos/par_almiron.jpg', 'epica'],
                    ['Junior Alonso', 'Paraguay', 'par', 'Defensor', 'fotos/par_alonso.jpg', 'comun'],
                    ['Fabián Balbuena', 'Paraguay', 'par', 'Defensor', 'fotos/par_balbuena.jpg', 'comun'],
                    ['Juan José Cáceres', 'Paraguay', 'par', 'Defensor', 'fotos/par_caceres.jpg', 'comun'],
                    ['Andrés Cubas', 'Paraguay', 'par', 'Mediocampista', 'fotos/par_cubas.jpg', 'comun'],
                    ['Julio Enciso', 'Paraguay', 'par', 'Delantero', 'fotos/par_enciso.jpg', 'epica'],
                    ['Roberto Fernández', 'Paraguay', 'par', 'Arquero', 'fotos/par_fernandez.jpg', 'comun'],
                    ['Gustavo Gómez', 'Paraguay', 'par', 'Defensor', 'fotos/par_gGomez.jpg', 'rara'],
                    ['Orlando Gill', 'Paraguay', 'par', 'Arquero', 'fotos/par_gill.jpg', 'comun'],
                    ['Diego Gómez', 'Paraguay', 'par', 'Mediocampista', 'fotos/par_gomez.jpg', 'rara'],
                    ['Ángel Romero', 'Paraguay', 'par', 'Delantero', 'fotos/par_romero.jpg', 'comun'],
                    ['Ramón Sosa', 'Paraguay', 'par', 'Delantero', 'fotos/par_sosa.jpg', 'rara'],
                    ['Mathías Villasanti', 'Paraguay', 'par', 'Mediocampista', 'fotos/par_villasanti.jpg', 'comun'],

                    // --- SUIZA ---
                    ['Michel Aebischer', 'Suiza', 'sui', 'Mediocampista', 'fotos/sui_aebischer.jpg', 'rara'],
                    ['Manuel Akanji', 'Suiza', 'sui', 'Defensor', 'fotos/sui_akanji.jpg', 'legendaria'],
                    ['Zeki Amdouni', 'Suiza', 'sui', 'Delantero', 'fotos/sui_amdouni.jpg', 'rara'],
                    ['Aurèle Amenda', 'Suiza', 'sui', 'Defensor', 'fotos/sui_amenda.jpg', 'comun'],
                    ['Nico Elvedi', 'Suiza', 'sui', 'Defensor', 'fotos/sui_elvedi.jpg', 'rara'],
                    ['Remo Freuler', 'Suiza', 'sui', 'Mediocampista', 'fotos/sui_freuler.jpg', 'epica'],
                    ['Gregor Kobel', 'Suiza', 'sui', 'Arquero', 'fotos/sui_kobel.jpg', 'legendaria'],
                    ['Joel Monteiro', 'Suiza', 'sui', 'Delantero', 'fotos/sui_manzambi.jpg', 'comun'],
                    ['Dan Ndoye', 'Suiza', 'sui', 'Delantero', 'fotos/sui_ndoye.jpg', 'epica'],
                    ['Fabian Rieder', 'Suiza', 'sui', 'Mediocampista', 'fotos/sui_rieder.jpg', 'rara'],
                    ['Ricardo Rodríguez', 'Suiza', 'sui', 'Defensor', 'fotos/sui_rodriguez.jpg', 'epica'],
                    ['Ruben Vargas', 'Suiza', 'sui', 'Delantero', 'fotos/sui_vargas.jpg', 'epica'],
                    ['Silvan Widmer', 'Suiza', 'sui', 'Defensor', 'fotos/sui_widmer.jpg', 'rara'],
                    ['Granit Xhaka', 'Suiza', 'sui', 'Mediocampista', 'fotos/sui_xhaka.jpg', 'legendaria'],
                    ['Denis Zakaria', 'Suiza', 'sui', 'Mediocampista', 'fotos/sui_zakaria.jpg', 'epica'],

                    // --- TÚNEZ ---
                    ['Ali Abdi', 'Túnez', 'tun', 'Defensor', 'fotos/tun_abdi.jpg', 'rara'],
                    ['Elias Achouri', 'Túnez', 'tun', 'Delantero', 'fotos/tun_achouri.jpg', 'rara'],
                    ['Aymen Dahmen', 'Túnez', 'tun', 'Arquero', 'fotos/tun_dahmen.jpg', 'comun'],
                    ['Ismaël Gharbi', 'Túnez', 'tun', 'Mediocampista', 'fotos/tun_gharbi.jpg', 'rara'],
                    ['Aïssa Laïdouni', 'Túnez', 'tun', 'Mediocampista', 'fotos/tun_laidouni.jpg', 'epica'],
                    ['Sayfallah Ltaief', 'Túnez', 'tun', 'Delantero', 'fotos/tun_ltaief.jpg', 'comun'],
                    ['Rani Mastouri', 'Túnez', 'tun', 'Delantero', 'fotos/tun_mastouri.jpg', 'comun'],
                    ['Hannibal Mejbri', 'Túnez', 'tun', 'Mediocampista', 'fotos/tun_mejbri.jpg', 'epica'],
                    ['Yassine Meriah', 'Túnez', 'tun', 'Defensor', 'fotos/tun_meriah.jpg', 'rara'],
                    ['Haythem Jouini', 'Túnez', 'tun', 'Delantero', 'fotos/tun_saad.jpg', 'comun'],
                    ['Ferjani Sassi', 'Túnez', 'tun', 'Mediocampista', 'fotos/tun_sassi.jpg', 'rara'],
                    ['Ellyes Skhiri', 'Túnez', 'tun', 'Mediocampista', 'fotos/tun_skhiri.jpg', 'legendaria'],
                    ['Naïm Sliti', 'Túnez', 'tun', 'Delantero', 'fotos/tun_sliti.jpg', 'rara'],
                    ['Montassar Talbi', 'Túnez', 'tun', 'Defensor', 'fotos/tun_talbi.jpg', 'epica'],
                    ['Yan Valery', 'Túnez', 'tun', 'Defensor', 'fotos/tun_valery.jpg', 'rara'],

                    // --- ALEMANIA ---
                    ['Jamal Musiala', 'Alemania', 'ger', 'Mediocampista', 'fotos/ale_musiala.jpg', 'legendaria'],
                    ['Florian Wirtz', 'Alemania', 'ger', 'Mediocampista', 'fotos/ale_wirtz.jpg', 'legendaria'],
                    ['Kai Havertz', 'Alemania', 'ger', 'Delantero', 'fotos/ale_havertz.jpg', 'rara'],
                    ['Leon Goretzka', 'Alemania', 'ger', 'Mediocampista', 'fotos/ale_goretzka.jpg', 'rara'],
                    ['Joshua Kimmich', 'Alemania', 'ger', 'Mediocampista', 'fotos/ale_kimmich.jpg', 'epica'],
                    ['Antonio Rüdiger', 'Alemania', 'ger', 'Defensor', 'fotos/ale_rudiger.jpg', 'epica'],
                    ['Marc-André ter Stegen', 'Alemania', 'ger', 'Arquero', 'fotos/ale_stegen.jpg', 'epica'],
                    ['Serge Gnabry', 'Alemania', 'ger', 'Delantero', 'fotos/ale_gnabry.jpg', 'rara'],
                    ['Maximilian Mittelstädt', 'Alemania', 'ger', 'Defensor', 'fotos/ale_mittle.jpg', 'comun'],
                    ['Felix Nmecha', 'Alemania', 'ger', 'Mediocampista', 'fotos/ale_nmecha.jpg', 'comun'],
                    ['Ridle Baku', 'Alemania', 'ger', 'Defensor', 'fotos/ale_baku.jpg', 'comun'],
                    ['Nico Schlotterbeck', 'Alemania', 'ger', 'Defensor', 'fotos/ale_schlotterbeck.jpg', 'comun'],
                    ['Nick Woltemade', 'Alemania', 'ger', 'Delantero', 'fotos/ale_woltemade.jpg', 'comun'],
                    ['Jonathan Tah', 'Alemania', 'ger', 'Defensor', 'fotos/ale_tah.jpg', 'comun'],

                    // --- URUGUAY ---
                    ['Ronald Araújo', 'Uruguay', 'uru', 'Defensor', 'fotos/uru_araujo.jpg', 'legendaria'],
                    ['Maxi Araujo', 'Uruguay', 'uru', 'Delantero', 'fotos/uru_araujo-.jpg', 'comun'],
                    ['Rodrigo Bentancur', 'Uruguay', 'uru', 'Mediocampista', 'fotos/uru_bentancur.jpg', 'epica'],
                    ['Sebastián Cáceres', 'Uruguay', 'uru', 'Defensor', 'fotos/uru_caceres.jpg', 'rara'],
                    ['José María Giménez', 'Uruguay', 'uru', 'Defensor', 'fotos/uru_gimenez.jpg', 'epica'],
                    ['Alan Matturro', 'Uruguay', 'uru', 'Defensor', 'fotos/uru_miele.jpg', 'comun'],
                    ['Nahitan Nández', 'Uruguay', 'uru', 'Mediocampista', 'fotos/uru_nandez.jpg', 'epica'],
                    ['Darwin Núñez', 'Uruguay', 'uru', 'Delantero', 'fotos/uru_nuñez.jpg', 'legendaria'],
                    ['Mathías Olivera', 'Uruguay', 'uru', 'Defensor', 'fotos/uru_olivera.jpg', 'rara'],
                    ['Facundo Pellistri', 'Uruguay', 'uru', 'Delantero', 'fotos/uru_pellistri.jpg', 'epica'],
                    ['Sergio Rochet', 'Uruguay', 'uru', 'Arquero', 'fotos/uru_rochet.jpg', 'epica'],
                    ['Manuel Ugarte', 'Uruguay', 'uru', 'Mediocampista', 'fotos/uru_ugarte.jpg', 'epica'],
                    ['Federico Valverde', 'Uruguay', 'uru', 'Mediocampista', 'fotos/uru_valverde.jpg', 'legendaria'],
                    ['Guillermo Varela', 'Uruguay', 'uru', 'Defensor', 'fotos/uru_varela.jpg', 'rara'],
                    ['Federico Viñas', 'Uruguay', 'uru', 'Delantero', 'fotos/uru_viñas.jpg', 'rara'],

                    // --- TURQUÍA ---
                    ['Yunus Akgun', 'Turquía', 'tur', 'Delantero', 'fotos/tur_akgun.jpg', 'comun'],
                    ['Kerem Akturkoglu', 'Turquía', 'tur', 'Delantero', 'fotos/tur_akturkoglu.jpg', 'epica'],
                    ['Kaan Ayhan', 'Turquía', 'tur', 'Defensor', 'fotos/tur_ayhan.jpg', 'comun'],
                    ['Abdulkerim Bardakci', 'Turquía', 'tur', 'Defensor', 'fotos/tur_bardakci.jpg', 'comun'],
                    ['Ugurcan Cakir', 'Turquía', 'tur', 'Arquero', 'fotos/tur_cakir.jpg', 'comun'],
                    ['Zeki Celik', 'Turquía', 'tur', 'Defensor', 'fotos/tur_celik.jpg', 'comun'],
                    ['Merih Demiral', 'Turquía', 'tur', 'Defensor', 'fotos/tur_demiral.jpg', 'rara'],
                    ['Irfan Can Kahveci', 'Turquía', 'tur', 'Mediocampista', 'fotos/tur_kahveci.jpg', 'comun'],
                    ['Arda Guler', 'Turquía', 'tur', 'Mediocampista', 'fotos/tur_guler.jpg', 'epica'],
                    ['Orkun Kokcu', 'Turquía', 'tur', 'Mediocampista', 'fotos/tur_kokcu.jpg', 'rara'],
                    ['Mert Muldur', 'Turquía', 'tur', 'Defensor', 'fotos/tur_muldur.jpg', 'comun'],
                    ['Caglar Soyuncu', 'Turquía', 'tur', 'Defensor', 'fotos/tur_soyuncu.jpg', 'rara'],
                    ['Can Uzun', 'Turquía', 'tur', 'Delantero', 'fotos/tur_uzun.jpg', 'comun'],
                    ['Kenan Yildiz', 'Turquía', 'tur', 'Delantero', 'fotos/tur_yildiz.jpg', 'rara'],
                    ['Baris Alper Yilmaz', 'Turquía', 'tur', 'Mediocampista', 'fotos/tur_yilmaz.jpg', 'comun'],

                    // --- UZBEKISTÁN ---
                    ['Khojiakbar Alijonov', 'Uzbekistán', 'uzb', 'Defensor', 'fotos/uzb_alijonov.jpg', 'comun'],
                    ['Khusniddin Aliqulov', 'Uzbekistán', 'uzb', 'Defensor', 'fotos/uzb_aliqulov.jpg', 'rara'],
                    ['Rustam Ashurmatov', 'Uzbekistán', 'uzb', 'Defensor', 'fotos/uzb_ashurmatov.jpg', 'comun'],
                    ['Khojimat Erkinov', 'Uzbekistán', 'uzb', 'Delantero', 'fotos/uzb_erkinov.jpg', 'rara'],
                    ['Umar Eshmurodov', 'Uzbekistán', 'uzb', 'Defensor', 'fotos/uzb_eshmurodov.jpg', 'comun'],
                    ['Abbosbek Fayzullaev', 'Uzbekistán', 'uzb', 'Mediocampista', 'fotos/uzb_fayzullaev.jpg', 'epica'],
                    ['Jamshid Iskanderov', 'Uzbekistán', 'uzb', 'Mediocampista', 'fotos/uzb_iskanderov.jpg', 'comun'],
                    ['Jaloliddin Masharipov', 'Uzbekistán', 'uzb', 'Mediocampista', 'fotos/uzb_masharipov.jpg', 'rara'],
                    ['Sherzod Nasrullaev', 'Uzbekistán', 'uzb', 'Defensor', 'fotos/uzb_nasrullaev.jpg', 'comun'],
                    ['Farrukh Sayfiev', 'Uzbekistán', 'uzb', 'Defensor', 'fotos/uzb_sayfiev.jpg', 'rara'],
                    ['Igor Sergeev', 'Uzbekistán', 'uzb', 'Delantero', 'fotos/uzb_sergeev.jpg', 'rara'],
                    ['Eldor Shomurodov', 'Uzbekistán', 'uzb', 'Delantero', 'fotos/uzb_shomurodov.jpg', 'legendaria'],
                    ['Otabek Shukurov', 'Uzbekistán', 'uzb', 'Mediocampista', 'fotos/uzb_shukurov.jpg', 'epica'],
                    ['Azizbek Turgunboev', 'Uzbekistán', 'uzb', 'Mediocampista', 'fotos/uzb_turgunboev.jpg', 'rara'],
                    ['Oston Urunov', 'Uzbekistán', 'uzb', 'Delantero', 'fotos/uzb_urunov.jpg', 'rara'],
                    

                    // --- MARRUECOS ---
                    ['Nayef Aguerd', 'Marruecos', 'mar', 'Defensor', 'fotos/mar_aguerd.jpg', 'rara'],
                    ['Sofyan Amrabat', 'Marruecos', 'mar', 'Mediocampista', 'fotos/mar_amrabat.jpg', 'rara'],
                    ['Yassine Bounou', 'Marruecos', 'mar', 'Arquero', 'fotos/mar_bounou.jpg', 'epica'],
                    ['Brahim Díaz', 'Marruecos', 'mar', 'Mediocampista', 'fotos/mar_diaz.jpg', 'epica'],
                    ['Abde Ezzalzouli', 'Marruecos', 'mar', 'Delantero', 'fotos/mar_ezzalzouli.jpg', 'comun'],
                    ['Ayoub El Kaabi', 'Marruecos', 'mar', 'Delantero', 'fotos/mar_kaabi.jpg', 'rara'],
                    ['Bilal El Khannouss', 'Marruecos', 'mar', 'Mediocampista', 'fotos/mar_khannouss.jpg', 'comun'],
                    ['Adam Masina', 'Marruecos', 'mar', 'Defensor', 'fotos/mar_masina.jpg', 'comun'],
                    ['Youssef En-Nesyri', 'Marruecos', 'mar', 'Delantero', 'fotos/mar_nesyri.jpg', 'comun'],
                    ['Ismael Saibari', 'Marruecos', 'mar', 'Mediocampista', 'fotos/mar_saibari.jpg', 'comun'],
                    ['Romain Saiss', 'Marruecos', 'mar', 'Defensor', 'fotos/mar_saiss.jpg', 'comun'],
                    ['Eliesse Ben Seghir', 'Marruecos', 'mar', 'Mediocampista', 'fotos/mar_seghir.jpg', 'comun'],
                    ['Jawad El Yamiq', 'Marruecos', 'mar', 'Defensor', 'fotos/mar_yamiq.jpg', 'comun'],


		    // --- ARGELIA ---
                    ['Houssem Aouar', 'Argelia', '🇩🇿', 'Mediocampista', 'fotos/arg_aquar.jpg', 'rara'],
                    ['Youcef Atal', 'Argelia', '🇩🇿', 'Defensor', 'fotos/arg_atal.jpg', 'comun'],
                    ['Ismaël Bennacer', 'Argelia', '🇩🇿', 'Mediocampista', 'fotos/arg_bennacer.jpg', 'epica'],
                    ['Saïd Benrahma', 'Argelia', '🇩🇿', 'Delantero', 'fotos/arg_benrahma.jpg', 'rara'],
                    ['Ramy Bensebaini', 'Argelia', '🇩🇿', 'Defensor', 'fotos/arg_bensebaini.jpg', 'rara'],
                    ['Hicham Boudaoui', 'Argelia', '🇩🇿', 'Mediocampista', 'fotos/arg_boudaqui.jpg', 'comun'],
                    ['Baghdad Bounedjah', 'Argelia', '🇩🇿', 'Delantero', 'fotos/arg_bounedjah.jpg', 'comun'],
                    ['Farès Chaïbi', 'Argelia', '🇩🇿', 'Mediocampista', 'fotos/arg_chaibi.jpg', 'comun'],
                    ['Amine Gouiri', 'Argelia', '🇩🇿', 'Delantero', 'fotos/arg_gouiri.jpg', 'rara'],
                    ['Mustapha Zeghba', 'Argelia', '🇩🇿', 'Arquero', 'fotos/arg_guendouz.jpg', 'comun'],
                    ['Riyad Mahrez', 'Argelia', '🇩🇿', 'Delantero', 'fotos/arg_mahrez.jpg', 'legendaria'],
                    ['Aïssa Mandi', 'Argelia', '🇩🇿', 'Defensor', 'fotos/arg_mandi.jpg', 'rara'],
                    ['Nadjib Amine Tougai', 'Argelia', '🇩🇿', 'Defensor', 'fotos/arg_tougai.jpg', 'comun'],
                    ['Ramiz Zerrouki', 'Argelia', '🇩🇿', 'Mediocampista', 'fotos/arg_zerrouki.jpg', 'comun']

		    // --- AUSTRIA ---
                    ['David Alaba', 'Austria', '🇦🇹', 'Defensor', 'fotos/aus_alaba.jpg', 'legendaria'],
                    ['Christoph Baumgartner', 'Austria', '🇦🇹', 'Mediocampista', 'fotos/aus_baumgartner.jpg', 'rara'],
                    ['Kevin Danso', 'Austria', '🇦🇹', 'Defensor', 'fotos/aus_danso.jpg', 'rara'],
                    ['Michael Gregoritsch', 'Austria', '🇦🇹', 'Delantero', 'fotos/aus_gregoritsch.jpg', 'comun'],
                    ['Konrad Laimer', 'Austria', '🇦🇹', 'Mediocampista', 'fotos/aus_laimer.jpg', 'epica'],
                    ['Philipp Lienhart', 'Austria', '🇦🇹', 'Defensor', 'fotos/aus_lienhart.jpg', 'comun'],
                    ['Patrick Pentz', 'Austria', '🇦🇹', 'Arquero', 'fotos/aus_pentz.jpg', 'comun'],
                    ['Stefan Posch', 'Austria', '🇦🇹', 'Defensor', 'fotos/aus_posch.jpg', 'rara'],
                    ['Alexander Prass', 'Austria', '🇦🇹', 'Mediocampista', 'fotos/aus_prass.jpg', 'comun'],
                    ['Marcel Sabitzer', 'Austria', '🇦🇹', 'Mediocampista', 'fotos/aus_sabitzer.jpg', 'epica'],
                    ['Xaver Schlager', 'Austria', '🇦🇹', 'Mediocampista', 'fotos/aus_schlager-.jpg', 'rara'],
                    ['Alexander Schlager', 'Austria', '🇦🇹', 'Arquero', 'fotos/aus_schlager.jpg', 'comun'], // REPETIDA - COMPLETAR
                    ['Romano Schmid', 'Austria', '🇦🇹', 'Mediocampista', 'fotos/aus_schmid.jpg', 'comun'],
                    ['Nicolas Seiwald', 'Austria', '🇦🇹', 'Mediocampista', 'fotos/aus_seiwald.jpg', 'comun'],
                    ['Patrick Wimmer', 'Austria', '🇦🇹', 'Mediocampista', 'fotos/aus_wimmer.jpg', 'comun']

		    // --- ARABIA SAUDITA ---
                    ['Saud Abdulhamid', 'Arabia Saudita', '🇸🇦', 'Defensor', 'fotos/ara_abdulhamid.jpg', 'rara'],
                    ['Salem Al-Dawsari', 'Arabia Saudita', '🇸🇦', 'Mediocampista', 'fotos/ara_aldawsari.jpg', 'legendaria'],
                    ['Nasser Aldawsari', 'Arabia Saudita', '🇸🇦', 'Mediocampista', 'fotos/ara_aldawsari-.jpg', 'comun'], // REPETIDA - COMPLETAR
                    ['Moteb Al-Harbi', 'Arabia Saudita', '🇸🇦', 'Defensor', 'fotos/ara_alharbi.jpg', 'comun'],
                    ['Fahad Al-Johani', 'Arabia Saudita', '🇸🇦', 'Delantero', 'fotos/ara_aljohani.jpg', 'comun'],
                    ['Musab Al-Juwayr', 'Arabia Saudita', '🇸🇦', 'Mediocampista', 'fotos/ara_aljuwayr.jpg', 'comun'],
                    ['Abdullah Al-Khaibari', 'Arabia Saudita', '🇸🇦', 'Mediocampista', 'fotos/ara_alkhaibari.jpg', 'rara'],
                    ['Abdulelah Al-Amri', 'Arabia Saudita', '🇸🇦', 'Defensor', 'fotos/ara_alobud.jpg', 'rara'],
                    ['Marwan Al-Sahafi', 'Arabia Saudita', '🇸🇦', 'Delantero', 'fotos/ara_alsahafi.jpg', 'comun'],
                    ['Ahmed Al-Ghamdi', 'Arabia Saudita', '🇸🇦', 'Mediocampista', 'fotos/ara_alsanbi.jpg', 'comun'],
                    ['Mohammed Al-Shamat', 'Arabia Saudita', '🇸🇦', 'Defensor', 'fotos/ara_alshamat.jpg', 'comun'],
                    ['Saleh Al-Shehri', 'Arabia Saudita', '🇸🇦', 'Delantero', 'fotos/ara_alsheri.jpg', 'epica'],
                    ['Hassan Al-Tambakti', 'Arabia Saudita', '🇸🇦', 'Defensor', 'fotos/ara_altambakti.jpg', 'rara'],
                    ['Ayman Yahya', 'Arabia Saudita', '🇸🇦', 'Delantero', 'fotos/ara_thikri.jpg', 'comun']

		    // --- REPÚBLICA DEMOCRÁTICA DEL CONGO ---
                    ['Cédric Bakambu', 'Congo', '🇨🇩', 'Delantero', 'fotos/con_bakambu.jpg', 'epica'],
                    ['Aaron Wan-Bissaka', 'Congo', '🇨🇩', 'Defensor', 'fotos/con_bissaka.jpg', 'epica'],
                    ['Brian Cipenga', 'Congo', '🇨🇩', 'Delantero', 'fotos/con_cipenga.jpg', 'comun'], // Nota: El archivo dice cipenga pero la figu es Sadiki
                    ['Meschack Elia', 'Congo', '🇨🇩', 'Delantero', 'fotos/con_elia.jpg', 'rara'],
                    ['Joris Kayembe', 'Congo', '🇨🇩', 'Delantero', 'fotos/con_kayembe.jpg', 'rara'],
                    ['Edo Kayembe', 'Congo', '🇨🇩', 'Mediocampista', 'fotos/con_kayembe-.jpg', 'comun'], // REPETIDA - COMPLETAR
                    ['Arthur Masuaku', 'Congo', '🇨🇩', 'Defensor', 'fotos/con_masuaku.jpg', 'rara'],
                    ['Fiston Mayele', 'Congo', '🇨🇩', 'Delantero', 'fotos/con_mayele.jpg', 'comun'],
                    ['Chancel Mbemba', 'Congo', '🇨🇩', 'Defensor', 'fotos/con_mbemba.jpg', 'legendaria'],
                    ['Nathanaël Mbuku', 'Congo', '🇨🇩', 'Delantero', 'fotos/con_mbuku.jpg', 'comun'],
                    ['Lionel Mpasi', 'Congo', '🇨🇩', 'Arquero', 'fotos/con_mpasi.jpg', 'comun'],
                    ['Ngal\'ayel Mukau', 'Congo', '🇨🇩', 'Mediocampista', 'fotos/con_mukau.jpg', 'comun'],
                    ['Charles Pickel', 'Congo', '🇨🇩', 'Mediocampista', 'fotos/con_pickel.jpg', 'comun'],
                    ['Axel Tuanzebe', 'Congo', '🇨🇩', 'Defensor', 'fotos/con_tuanzebe.jpg', 'rara'],
                    ['Yoane Wissa', 'Congo', '🇨🇩', 'Delantero', 'fotos/con_wissa.jpg', 'epica']

		    // --- EGIPTO ---
                    ['Mohamed El-Shenawy', 'Egipto', '🇪🇬', 'Arquero', 'fotos/egi_elshenawy.jpg', 'epica'],
                    ['Ahmed Fatouh', 'Egipto', '🇪🇬', 'Defensor', 'fotos/egi_fatouh.jpg', 'rara'],
                    ['Mohamed Hany', 'Egipto', '🇪🇬', 'Defensor', 'fotos/egi_handy.jpg', 'rara'], // Nota: El archivo dice handy pero es Hany
                    ['Mohanad Lasheen', 'Egipto', '🇪🇬', 'Mediocampista', 'fotos/egi_laheen.jpg', 'comun'], // Nota: El archivo dice laheen pero es Ahmed Hassan (Kouka)
                    ['Omar Marmoush', 'Egipto', '🇪🇬', 'Delantero', 'fotos/egi_marniysh.jpg', 'epica'],
                    ['Ramy Rabia', 'Egipto', '🇪🇬', 'Defensor', 'fotos/egi_rabia.jpg', 'comun'],
                    ['Mohamed Salah', 'Egipto', '🇪🇬', 'Delantero', 'fotos/egi_salah.jpg', 'legendaria'],
                    ['Ramadan Sobhi', 'Egipto', '🇪🇬', 'Delantero', 'fotos/egi_sobhi.jpg', 'rara'],
                    ['Trézéguet', 'Egipto', '🇪🇬', 'Delantero', 'fotos/egi_trezeguet.jpg', 'epica']

		    // --- JORDANIA ---
                    ['Abualnadi', 'Jordania', '🇯🇴', 'Defensor', 'fotos/jor_abualnadi.jpg', 'comun'],
                    ['Yazeed Abulaila', 'Jordania', '🇯🇴', 'Arquero', 'fotos/jor_abulaila.jpg', 'rara'],
                    ['Ihsan Haddad', 'Jordania', '🇯🇴', 'Defensor', 'fotos/jor_haddad.jpg', 'rara'],
                    ['Mohammad Abu Jamous', 'Jordania', '🇯🇴', 'Defensor', 'fotos/jor_jamous.jpg', 'comun'],
                    ['Mahmoud Al-Mardi', 'Jordania', '🇯🇴', 'Mediocampista', 'fotos/jor_mardi.jpg', 'rara'],
                    ['Yazan Al-Naimat', 'Jordania', '🇯🇴', 'Delantero', 'fotos/jor_naimat.jpg', 'rara'],
                    ['Obaid', 'Jordania', '🇯🇴', 'Defensor', 'fotos/jor_obaid.jpg', 'comun'],
                    ['Ali Olwan', 'Jordania', '🇯🇴', 'Delantero', 'fotos/jor_olwan.jpg', 'comun'],
                    ['Abdallah Rashdan', 'Jordania', '🇯🇴', 'Defensor', 'fotos/jor_rashdan.jpg', 'comun'],
                    ['Noor Al-Rawabdeh', 'Jordania', '🇯🇴', 'Mediocampista', 'fotos/jor_rawabdeh.jpg', 'comun'],
                    ['Ibrahim Sadeh', 'Jordania', '🇯🇴', 'Mediocampista', 'fotos/jor_saadeh.jpg', 'comun'], // Nota: Basado en saadeh
                    ['Koubaib Al-Sabra', 'Jordania', '🇯🇴', 'Defensor', 'fotos/jor_sabra.jpg', 'comun'],
                    ['Mousa Al-Tamari', 'Jordania', '🇯🇴', 'Delantero', 'fotos/jor_taamari.jpg', 'epica'],
                    ['Moouath Taha', 'Jordania', '🇯🇴', 'Defensor', 'fotos/jor_taha.jpg', 'comun'],
                    ['Mohammad Abu Zrayq', 'Jordania', '🇯🇴', 'Delantero', 'fotos/jor_zrayq.jpg', 'comun']


		    // --- SUDÁFRICA ---
                    ['Oswin Appollis', 'Sudáfrica', '🇿🇦', 'Delantero', 'fotos/sud_appollis.jpg', 'rara'],
                    ['Sipho Chaine', 'Sudáfrica', '🇿🇦', 'Arquero', 'fotos/sud_cahine.jpg', 'comun'], // Nota: Basado en el archivo de Chaine
                    ['Samukele Kabini', 'Sudáfrica', '🇿🇦', 'Defensor', 'fotos/sud_kabini.jpg', 'comun'], // Nota: Basado en el archivo de Kabini
                    ['Thalente Mbatha', 'Sudáfrica', '🇿🇦', 'Mediocampista', 'fotos/sud_mbatha.jpg', 'comun'], // Nota: Basado en el archivo de Maseko/Mbatha
                    ['Sipho Mbule', 'Sudáfrica', '🇿🇦', 'Mediocampista', 'fotos/sud_mbule.jpg', 'comun'],
                    ['Khuliso Mudau', 'Sudáfrica', '🇿🇦', 'Defensor', 'fotos/sud_mudau.jpg', 'rara'],
                    ['Khulumani Ndamane', 'Sudáfrica', '🇿🇦', 'Defensor', 'fotos/sud_ndamane.jpg', 'rara'], // Nota: Basado en el archivo de Modiba/Ndamane
                    ['Siyabonga Ngezana', 'Sudáfrica', '🇿🇦', 'Defensor', 'fotos/sud_negezana.jpg', 'rara'],
                    ['Mohau Nkota', 'Sudáfrica', '🇿🇦', 'Defensor', 'fotos/sud_nkota.jpg', 'comun'], // Nota: Basado en el archivo de Nkota/Sibisi
                    ['Iqraam Rayners', 'Sudáfrica', '🇿🇦', 'Delantero', 'fotos/sud_rayners.jpg', 'comun'],
                    ['Ronwen Williams', 'Sudáfrica', '🇿🇦', 'Arquero', 'fotos/sud_williams.jpg', 'epica']

		    // --- TURQUÍA ---
                    ['Barış Alper Yılmaz', 'Turquía', '🇹🇷', 'Delantero', 'fotos/tur_akgun.jpg', 'rara'], // Nota: Basado en el archivo akgun/Yılmaz
                    ['Kerem Aktürkoğlu', 'Turquía', '🇹🇷', 'Delantero', 'fotos/tur_akturkoglu.jpg', 'epica'],
                    ['Kaan Ayhan', 'Turquía', '🇹🇷', 'Defensor', 'fotos/tur_ayhan.jpg', 'rara'],
                    ['Abdülkerim Bardakcı', 'Turquía', '🇹🇷', 'Defensor', 'fotos/tur_bardakci.jpg', 'rara'],
                    ['Uğurcan Çakır', 'Turquía', '🇹🇷', 'Arquero', 'fotos/tur_cakir.jpg', 'rara'],
                    ['Zeki Çelik', 'Turquía', '🇹🇷', 'Defensor', 'fotos/tur_celik.jpg', 'rara'],
                    ['Merih Demiral', 'Turquía', '🇹🇷', 'Defensor', 'fotos/tur_demiral.jpg', 'epica'],
                    ['Arda Güler', 'Turquía', '🇹🇷', 'Mediocampista', 'fotos/tur_guler.jpg', 'legendaria'],
                    ['İrfan Can Kahveci', 'Turquía', '🇹🇷', 'Mediocampista', 'fotos/tur_kahveci.jpg', 'rara'],
                    ['Orkun Kökçü', 'Turquía', '🇹🇷', 'Mediocampista', 'fotos/tur_kokcu.jpg', 'epica'],
                    ['Mert Müldür', 'Turquía', '🇹🇷', 'Defensor', 'fotos/tur_muldur.jpg', 'comun'],
                    ['Çağlar Söyüncü', 'Turquía', '🇹🇷', 'Defensor', 'fotos/tur_soyuncu.jpg', 'epica'],
                    ['Semih Kılıçsoy', 'Turquía', '🇹🇷', 'Delantero', 'fotos/tur_uzun.jpg', 'comun'], // Nota: Basado en el archivo uzun/Kılıçsoy
                    ['Kenan Yıldız', 'Turquía', '🇹🇷', 'Delantero', 'fotos/tur_yildiz.jpg', 'legendaria'],
                    ['Hakan Çalhanoğlu', 'Turquía', '🇹🇷', 'Mediocampista', 'fotos/tur_yilmaz.jpg', 'legendaria'] // Nota: Basado en el archivo yilmaz/Çalhanoğlu

		    // --- CABO VERDE ---
                    ['Patrick Andrade', 'Cabo Verde', '🇨🇻', 'Mediocampista', 'fotos/ver_andrade.jpg', 'comun'],
                    ['Bebé', 'Cabo Verde', '🇨🇻', 'Delantero', 'fotos/ver_bebe.jpg', 'epica'],
                    ['Jovane Cabral', 'Cabo Verde', '🇨🇻', 'Delantero', 'fotos/ver_cabral.jpg', 'epica'],
                    ['Logan Costa', 'Cabo Verde', '🇨🇻', 'Defensor', 'fotos/ver_costa.jpg', 'rara'],
                    ['Diney', 'Cabo Verde', '🇨🇻', 'Defensor', 'fotos/ver_dinev.jpg', 'comun'], // Nota: Basado en el archivo dinev
                    ['Deroy Duarte', 'Cabo Verde', '🇨🇻', 'Mediocampista', 'fotos/ver_duarte.jpg', 'rara'],
                    ['Dailon Livramento', 'Cabo Verde', '🇨🇻', 'Delantero', 'fotos/ver_livramento.jpg', 'comun'], // Nota: Basado en el archivo livramento
                    ['Ryan Mendes', 'Cabo Verde', '🇨🇻', 'Delantero', 'fotos/ver_mendes.jpg', 'legendaria'],
                    ['Steven Moreira', 'Cabo Verde', '🇨🇻', 'Defensor', 'fotos/ver_moreira.jpg', 'rara'],
                    ['João Paulo', 'Cabo Verde', '🇨🇻', 'Mediocampista', 'fotos/ver_paulo.jpg', 'comun'],
                    ['Pico', 'Cabo Verde', '🇨🇻', 'Defensor', 'fotos/ver_pico.jpg', 'rara'],
                    ['Jamiro Monteiro', 'Cabo Verde', '🇨🇻', 'Mediocampista', 'fotos/ver_pina.jpg', 'rara'], // Nota: Basado en el archivo pina
                    ['Semedo', 'Cabo Verde', '🇨🇻', 'Mediocampista', 'fotos/ver_semedo.jpg', 'comun'],
                    ['Wagner Pina', 'Cabo Verde', '🇨🇻', 'Defensor', 'fotos/ver_semedo-.jpg', 'comun'], // REPETIDA - COMPLETAR
                    ['Vozinha', 'Cabo Verde', '🇨🇻', 'Arquero', 'fotos/ver_vozinha.jpg', 'rara']

		    // --- NUEVA ZELANDA ---
                    ['Kosta Barbarouses', 'Nueva Zelanda', '🇳🇿', 'Delantero', 'fotos/zel_barbarouses.jpg', 'rara'], //
                    ['Joe Bell', 'Nueva Zelanda', '🇳🇿', 'Mediocampista', 'fotos/zel_bell.jpg', 'rara'], //
                    ['Michael Boxall', 'Nueva Zelanda', '🇳🇿', 'Defensor', 'fotos/zel_boxall.jpg', 'comun'], //
                    ['Liberato Cacace', 'Nueva Zelanda', '🇳🇿', 'Defensor', 'fotos/zel_cacace.jpg', 'epica'], //
                    ['Max Crocombe', 'Nueva Zelanda', '🇳🇿', 'Arquero', 'fotos/zel_crocombe.jpg', 'comun'], //
                    ['Matthew Garbett', 'Nueva Zelanda', '🇳🇿', 'Mediocampista', 'fotos/zel_garbett.jpg', 'rara'], //
                    ['Callum McCowatt', 'Nueva Zelanda', '🇳🇿', 'Delantero', 'fotos/zel_mccowatt.jpg', 'comun'], //
                    ['Alex Paulsen', 'Nueva Zelanda', '🇳🇿', 'Arquero', 'fotos/zel_paulsen.jpg', 'rara'], //
                    ['Tim Payne', 'Nueva Zelanda', '🇳🇿', 'Defensor', 'fotos/zel_payne.jpg', 'comun'], //
                    ['Marko Stamenic', 'Nueva Zelanda', '🇳🇿', 'Mediocampista', 'fotos/zel_stamenic.jpg', 'epica'], //
                    ['Finn Surman', 'Nueva Zelanda', '🇳🇿', 'Defensor', 'fotos/zel_surman.jpg', 'comun'], // Nota: Basado en su archivo surman
                    ['Ryan Thomas', 'Nueva Zelanda', '🇳🇿', 'Mediocampista', 'fotos/zel_thomas.jpg', 'comun'], //
                    ['Francis de Vries', 'Nueva Zelanda', '🇳🇿', 'Defensor', 'fotos/zel_vries.jpg', 'comun'], //
                    ['Chris Wood', 'Nueva Zelanda', '🇳🇿', 'Delantero', 'fotos/zel_wood.jpg', 'legendaria'] //

            ];

            for (const j of jugadoresMundial) {
                await pool.query(
                    "INSERT INTO jugadores (nombre, pais, bandera, posicion, foto, rareza) VALUES ($1, $2, $3, $4, $5, $6)",
                    [j[0], j[1], j[2], j[3], j[4], j[5]]
                );
            }
            console.log("🌱 Base de datos poblada con jugadores iniciales.");
        }
    } catch (error) {
        console.error("❌ Error inicializando la base de datos:", error);
    }
}

function obtenerRarezaAleatoria(tipo) {
    const r = Math.random() * 100;
    const tipoLimpio = (tipo || 'estandar').toLowerCase().trim();

    if (tipoLimpio === 'oro elite' || tipoLimpio === 'elite') {
        if (r < 20) return 'legendaria';
        if (r < 65) return 'epica';
        return 'rara';
    } 
    else if (tipoLimpio === 'premium') {
        if (r < 5) return 'legendaria';
        if (r < 20) return 'epica';
        if (r < 60) return 'rara';
        return 'comun';
    } 
    else {
        if (r < 1) return 'legendaria';
        if (r < 5) return 'epica';
        if (r < 20) return 'rara';
        return 'comun';
    }
}

// ==========================================
// ENDPOINTS DE AUTENTICACIÓN
// ==========================================

// Registro de usuario
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Faltan datos" });

    try {
        // Insertamos el usuario y pedimos que nos devuelva el ID creado
        const nuevoUsuario = await pool.query(
            'INSERT INTO usuarios (username, password) VALUES ($1, $2) RETURNING id',
            [username, password]
        );
        
        const nuevoUsuarioId = nuevoUsuario.rows[0].id;

        // Inicializamos su progreso y ranking de forma secuencial
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

// Login de usuario
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    pool.query('SELECT * FROM usuarios WHERE username = $1 AND password = $2', [username, password], (err, resultado) => {
        if (err) return res.status(500).json({ error: err.message });
        if (resultado.rows.length === 0) return res.status(400).json({ error: "Credenciales incorrectas" });
        
        res.json({ mensaje: "Ingreso exitoso", usuario_id: resultado.rows[0].id });
    });
});

// ==========================================
// RUTAS DEL JUEGO DINÁMICAS (POR USUARIO)
// ==========================================

app.get('/api/progreso', (req, res) => {
    const usuario_id = req.query.usuario_id;
    if (!usuario_id) return res.status(400).json({ error: "Falta usuario_id" });

    const query = `
        SELECT u.username, up.monedas, up.sobres, COALESCE(r.puntos, 0) AS puntos
        FROM usuario_progreso up
        JOIN usuarios u ON up.usuario_id = u.id
        LEFT JOIN ranking r ON up.usuario_id = r.usuario_id
        WHERE up.usuario_id = $1
    `;

    pool.query(query, [usuario_id], (err, resultado) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (resultado.rows.length > 0) {
            res.json(resultado.rows[0]);
        } else {
            res.json({ username: "Usuario", monedas: 0, sobres: 0, puntos: 0 });
        }
    });
});

app.get('/api/album', (req, res) => {
    const usuario_id = req.query.usuario_id;
    if (!usuario_id) return res.status(400).json({ error: "Falta usuario_id" });

    const query = `
        SELECT j.*, CASE WHEN au.jugador_id IS NOT NULL THEN 1 ELSE 0 END AS obtenido 
        FROM jugadores j
        LEFT JOIN album_usuario au ON j.id = au.jugador_id AND au.usuario_id = $1
    `;
    pool.query(query, [usuario_id], (err, resultado) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(resultado.rows);
    });
});

app.post('/api/abrir-sobre', (req, res) => {
    const { usuario_id, tipo } = req.body; 
    if (!usuario_id) return res.status(400).json({ error: "Falta usuario_id" });

    // Tabla de recompensas por rareza
    const premios = {
        'comun': 5,
        'rara': 15,
        'epica': 30,
        'legendaria': 60
    };

    pool.query('SELECT sobres FROM usuario_progreso WHERE usuario_id = $1', [usuario_id], (err, resultadoProgreso) => {
        if (err) return res.status(500).json({ error: err.message });
        if (resultadoProgreso.rows.length === 0 || resultadoProgreso.rows[0].sobres <= 0) {
            return res.status(400).json({ error: "No tenés sobres disponibles" });
        }

        pool.query('SELECT * FROM jugadores', [], async (err, resultadoJugadores) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const todosLosJugadores = resultadoJugadores.rows;

            try {
                // Descontamos el sobre
                await pool.query('UPDATE usuario_progreso SET sobres = sobres - 1 WHERE usuario_id = $1', [usuario_id]);

                const jugadoresElegidos = [];
                for (let i = 0; i < 5; i++) {
                    const rarezaBuscada = obtenerRarezaAleatoria(tipo); 
                    let filtrados = todosLosJugadores.filter(j => j.rareza === rarezaBuscada);
                    if (filtrados.length === 0) filtrados = todosLosJugadores.filter(j => j.rareza === 'comun');

                    const elegido = filtrados[Math.floor(Math.random() * filtrados.length)];
                    jugadoresElegidos.push({ ...elegido });
                }

                // Procesamos cada carta
                for (const j of jugadoresElegidos) {
                    const monedasARecibir = premios[j.rareza] || 5;

                    // Intentamos insertar. Si ya existe, NO la duplicamos en la DB (DO NOTHING)
                    // pero usamos RETURNING para saber si falló el insert (era repetida)
                    const resInsert = await pool.query(`
                        INSERT INTO album_usuario (usuario_id, jugador_id, cantidad) 
                        VALUES ($1, $2, 1)
                        ON CONFLICT(usuario_id, jugador_id) 
                        DO NOTHING
                        RETURNING jugador_id
                    `, [usuario_id, j.id]);
                    
                    // Si resInsert.rows.length es 0, significa que YA TENÍAS la carta
                    if (resInsert.rows.length === 0) {
                        j.repetida = true;
                        j.monedasGanadas = monedasARecibir;
                        
                        // Sumamos las monedas al usuario
                        await pool.query(`
                            UPDATE usuario_progreso 
                            SET monedas = monedas + $1 
                            WHERE usuario_id = $2
                        `, [monedasARecibir, usuario_id]);
                    } else {
                        j.repetida = false;
                        j.monedasGanadas = 0;
                    }
                }
                
                res.json(jugadoresElegidos);
            } catch (errorPostgres) {
                return res.status(500).json({ error: errorPostgres.message });
            }
        });
    });
});

app.post('/api/tienda/entrenar', (req, res) => {
    const { usuario_id } = req.body;
    pool.query('UPDATE usuario_progreso SET monedas = monedas + 50 WHERE usuario_id = $1', [usuario_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: "Monedas sumadas" });
    });
});

app.post('/api/tienda/comprar-sobre', (req, res) => {
    const { usuario_id } = req.body;
    pool.query('SELECT monedas FROM usuario_progreso WHERE usuario_id = $1', [usuario_id], (err, resultado) => {
        if (err) return res.status(500).json({ error: err.message });
        if (resultado.rows.length === 0 || resultado.rows[0].monedas < 25) {
            return res.status(400).json({ error: "Monedas insuficientes" });
        }

        pool.query('UPDATE usuario_progreso SET monedas = monedas - 25, sobres = sobres + 1 WHERE usuario_id = $1', [usuario_id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ mensaje: "Sobre comprado" });
        });
    });
});

app.post('/api/modificar-monedas', (req, res) => {
    const { usuario_id, cantidad } = req.body;
    pool.query("UPDATE usuario_progreso SET monedas = monedas + $1 WHERE usuario_id = $2", [cantidad, usuario_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.post('/api/comprar-sobre-tienda', (req, res) => {
    const { usuario_id, tipo, costo } = req.body;

    pool.query("SELECT monedas FROM usuario_progreso WHERE usuario_id = $1", [usuario_id], (err, resultado) => {
        if (err) return res.status(500).json({ error: err.message });
        if (resultado.rows.length === 0 || resultado.rows[0].monedas < costo) {
            return res.status(400).json({ error: "❌ No te alcanzan las monedas, ¡andá a entrenar!" });
        }

        pool.query("UPDATE usuario_progreso SET monedas = monedas - $1, sobres = sobres + 1 WHERE usuario_id = $2", [costo, usuario_id], (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ success: true, tipo: tipo });
        });
    });
});

// ==========================================
// 🏆 ENDPOINTS PARA EL RANKING GLOBAL
// ==========================================

app.post('/api/actualizar-ranking', (req, res) => {
    const { usuario_id, puntos } = req.body;
    if (!usuario_id || puntos === undefined) return res.status(400).json({ error: "Faltan datos obligatorios." });

    const query = `
        INSERT INTO ranking (usuario_id, puntos) 
        VALUES ($1, $2)
        ON CONFLICT(usuario_id) 
        DO UPDATE SET puntos = ranking.puntos + $3
    `;

    pool.query(query, [usuario_id, puntos, puntos], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, mensaje: "¡Puntos sumados al ranking con éxito!" });
    });
});

app.get('/api/obtener-ranking', (req, res) => {
    const query = `
        SELECT u.username AS nombre, r.puntos 
        FROM ranking r
        JOIN usuarios u ON r.usuario_id = u.id
        ORDER BY r.puntos DESC
        LIMIT 10
    `;

    pool.query(query, [], (err, resultado) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(resultado.rows);
    });
});

// ==========================================
// APERTURA DEL SERVIDOR (ADAPTADO PARA RENDER) 🚀
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor del Álbum corriendo en el puerto ${PORT}`);
});