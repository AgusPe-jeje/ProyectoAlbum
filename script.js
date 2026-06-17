/* ========================================================================
   ===                     🏆 VIRTUAL ALBUM MUNDIAL 🏆                  ===
   ======================================================================== */

/* ========================================================================
   🌐 CONFIGURACIÓN DE RED LOCAL
   ======================================================================== */
const IP_LOCAL_SERVIDOR = "192.168.1.210"; 
const URL_BASE = `http://${IP_LOCAL_SERVIDOR}:3000/api`;

let usuarioActual = null;
let direccionGanadora = "";
let albumCompleto = [];
let paisSeleccionado = "";
let timbaPreparada = false; // Manejo seguro de estado local

/* ========================================================================
   🎛️ 1. CONTROL DE MÓDULOS DE LA UI
   ======================================================================== */
function cambiarModulo(idModulo, botonPresionado) {
    document.querySelectorAll('.modulo-contenido').forEach(mod => mod.classList.remove('activo'));
    document.querySelectorAll('.btn-modulo').forEach(btn => btn.classList.remove('activo'));
    document.getElementById(idModulo).classList.add('activo');
    botonPresionado.classList.add('activo');

    if (idModulo === 'modulo-album' && usuarioActual) cargarAlbumLocal();
    if (idModulo === 'modulo-penales' && usuarioActual) cargarRankingLocal();
    // 🎰 Al entrar al módulo separado de la timba, rotamos el partido en la UI
    if (idModulo === 'modulo-timba' && usuarioActual) rotarPartidoTimba();
}

/* ========================================================================
   👤 2. AUTENTICACIÓN Y ESTADO DE USUARIO
   ======================================================================== */
async function autenticarUsuario() {
    const username = document.getElementById("input-usuario").value;
    const password = document.getElementById("input-pass").value;
    if (!username || !password) return alert("❌ Completá los datos.");

    try {
        const res = await fetch(`${URL_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.error) alert(data.error);
        else {
            usuarioActual = data.usuario;
            document.getElementById("seccion-login").style.display = "none";
            document.getElementById("interfaz-juego").classList.add("mostrar");
            
            actualizarInterfazUI();
            cargarAlbumLocal();
            alert(`⚔️ ¡Bienvenido a la Arena, ${usuarioActual.username}!`);
        }
    } catch (err) { console.error(err); }
}

function actualizarInterfazUI() {
    if (!usuarioActual) return;
    document.getElementById("lbl-usuario").innerText = usuarioActual.username.toUpperCase();
    document.getElementById("lbl-monedas").innerText = usuarioActual.monedas;
    document.getElementById("lbl-ranking").innerText = usuarioActual.puntos_ranking;
}

/* ========================================================================
   📖 3. ÁLBUM MUNDIAL (SISTEMA PANINI)
   ======================================================================== */
async function cargarAlbumLocal() {
    if (!usuarioActual) return;
    const contenedorPaises = document.getElementById("selector-paises");
    
    try {
        const res = await fetch(`${URL_BASE}/album/${usuarioActual.id}`);
        const data = await res.json();
        albumCompleto = data.album;

        const totalJugadores = albumCompleto.length;
        const obtenidosTotales = albumCompleto.filter(figu => figu.obtenido > 0).length;
        const porcentajeGlobal = totalJugadores > 0 ? Math.round((obtenidosTotales / totalJugadores) * 100) : 0;

        document.getElementById("lbl-progreso-numerico").innerText = `${obtenidosTotales} / ${totalJugadores} (${porcentajeGlobal}%)`;
        document.getElementById("barra-progreso-llenado").style.width = `${porcentajeGlobal}%`;

        const paisesMap = new Map();
        albumCompleto.forEach(figu => {
            if (!paisesMap.has(figu.pais)) {
                paisesMap.set(figu.pais, { bandera: figu.bandera, completo: true });
            }
        });

        paisesMap.forEach((info, pais) => {
            const figusDeEstePais = albumCompleto.filter(f => f.pais === pais);
            const tieneTodas = figusDeEstePais.every(f => f.obtenido > 0);
            info.complete = tieneTodas;
        });

        contenedorPaises.innerHTML = "";
        if (!paisSeleccionado && paisesMap.size > 0) {
            paisSeleccionado = paisesMap.keys().next().value;
        }

        paisesMap.forEach((info, pais) => {
            const btn = document.createElement("button");
            btn.className = `btn-pais ${pais === paisSeleccionado ? 'activo' : ''} ${info.complete ? 'pais-completo' : ''}`;
            const textoCorona = info.complete ? " 👑" : "";
            btn.innerHTML = `<span>${info.bandera}</span> ${pais.toUpperCase()}${textoCorona}`;
            
            btn.onclick = () => {
                paisSeleccionado = pais;
                document.querySelectorAll('.btn-pais').forEach(b => b.classList.remove('activo'));
                btn.classList.add('activo');
                btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                mostrarJugadoresPorPais();
            };
            contenedorPaises.appendChild(btn);
        });

        mostrarJugadoresPorPais();
    } catch (err) { console.error("Error al calcular progreso de álbum:", err); }
}

function mostrarJugadoresPorPais() {
    const contenedorGrid = document.getElementById("contenedor-grid-album");
    contenedorGrid.innerHTML = "";
    const jugadoresFiltrados = albumCompleto.filter(figu => figu.pais === paisSeleccionado);

    jugadoresFiltrados.forEach((figu, index) => {
        const esObtenida = figu.obtenido > 0;
        const card = document.createElement("div");
        card.className = `carta-clash ${figu.rareza.toLowerCase()} ${esObtenida ? '' : 'bloqueada'}`;
        card.style.animationDelay = `${(index % 12) * 30}ms`; 
        
        card.innerHTML = `
            ${figu.obtenido > 1 ? `<div class="badge-repetidas">x${figu.obtenido}</div>` : ''}
            <img src="${figu.foto}" class="carta-foto" alt="${figu.nombre}">
            <div class="rareza-vertical">${figu.rareza.toUpperCase()}</div>
        `;
        contenedorGrid.appendChild(card);
    });
}

/* ========================================================================
   🛍️ 4. APERTURA DE COFRES (TIENDA)
   ======================================================================== */
async function comprarSobreEspecifico(tipoCofre) {
    if (!usuarioActual) return alert("❌ Debés iniciar sesión.");

    try {
        const res = await fetch(`${URL_BASE}/comprar-sobre`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: usuarioActual.id, tipoCofre: tipoCofre })
        });
        
        const data = await res.json();
        if (data.error_oro) return alert(data.mensaje);
        if (data.error) return alert("❌ Error: " + data.error);

        usuarioActual.monedas = data.monedas;
        actualizarInterfazUI();

        const contenedorSobre = document.getElementById("grid-sobre-abierto");
        if (!contenedorSobre) return;
        contenedorSobre.innerHTML = "";

        data.sobre.forEach((figu, indice) => {
            const itemContenedor = document.createElement("div");
            itemContenedor.style.cssText = "display: flex; flex-direction: column; align-items: center; gap: 10px;";

            const divCarta = document.createElement("div");
            divCarta.className = `carta-clash ${figu.rareza.toLowerCase()}`;
            divCarta.style.animationDelay = `${indice * 0.15}s`;
            divCarta.style.position = "relative";
            
            let posicionEstetica = "⚽ Jugador"; 
            const posFiltro = figu.posicion ? figu.posicion.toUpperCase() : "";

            if (posFiltro.includes("DEF") || posFiltro.includes("ARQ") || posFiltro.includes("POR")) posicionEstetica = "🛡️ Defensor";
            else if (posFiltro.includes("MED") || posFiltro.includes("VOL") || posFiltro.includes("CC")) posicionEstetica = "🧠 Mediocampista";
            else if (posFiltro.includes("DEL") || posFiltro.includes("ATA") || posFiltro.includes("EXT")) posicionEstetica = "🔥 Atacante";
            
            let rarezaColor = "#8e9bb0"; 
            const rarezaFiltro = figu.rareza ? figu.rareza.toLowerCase() : "";
            if (rarezaFiltro === "rara" || rarezaFiltro === "especial") rarezaColor = "#0074e8"; 
            else if (rarezaFiltro === "epica") rarezaColor = "#a335ee"; 
            else if (rarezaFiltro === "legendaria") rarezaColor = "#ffb100"; 

            divCarta.innerHTML = `
                ${figu.obtenido > 1 ? `<div class="badge-repetidas">x${figu.obtenido}</div>` : ''}
                <img src="${figu.foto}" class="carta-foto" alt="${figu.nombre}" style="display: block; width: 100%;">
                <div style="position: absolute; top: 0; left: 0; width: 18px; height: 100%; background: linear-gradient(90deg, ${rarezaColor} 0%, rgba(0,0,0,0) 100%); opacity: 0.4; z-index: 3;"></div>
                <div class="rareza-vertical">${figu.rareza.toUpperCase()}</div>
            `;

            const divInfoExterna = document.createElement("div");
            divInfoExterna.style.cssText = `background: rgba(15, 18, 26, 0.9); color: #fff; font-size: 0.8rem; font-weight: bold; padding: 4px 14px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 4px 6px rgba(0,0,0,0.3); white-space: nowrap;`;
            divInfoExterna.innerHTML = posicionEstetica;

            itemContenedor.appendChild(divCarta);
            itemContenedor.appendChild(divInfoExterna);
            contenedorSobre.appendChild(itemContenedor);
        });
    } catch (err) { console.error(err); }
}

/* ========================================================================
   ⚽ 5. DUELO DE PENALES (INTERACTIVO CON ARQUERO)
   ======================================================================== */
async function iniciarDueloLocal() {
    if (!usuarioActual) return alert("❌ Iniciá sesión.");
    const resTexto = document.getElementById("resultado-penal");

    try {
        const res = await fetch(`${URL_BASE}/tiros-restantes/${usuarioActual.id}`);
        const data = await res.json();
        
        if (data.tiros <= 0) {
            resTexto.style.color = "var(--rojo)";
            resTexto.innerText = "❌ ¡NO TE QUEDAN TIROS! Volvé mañana para más penales. 🛌";
            alert("❌ Ya jugaste tus 10 penales de hoy. ¡No podés preparar más tiros!");
            return;
        }

        resTexto.style.color = "white";
        resTexto.innerText = `⚽ ¡PREPARÁ EL DISPARO! — Te quedan ${data.tiros} tiros hoy.`;
        
    } catch (err) {
        console.error("Error al verificar tiros iniciales:", err);
        resTexto.innerText = "⚽ ¡PREPARÁ EL DISPARO!";
    }
    
    const balon = document.getElementById('balon-animado');
    const arquero = document.getElementById('arquero-animado');
    balon.style.transform = 'translate(0, 0) scale(1)';
    arquero.style.transform = 'translateX(0px)';
    
    const opciones = ['IZQUIERDA', 'CENTRO', 'DERECHA'];
    direccionGanadora = opciones[Math.floor(Math.random() * opciones.length)];
}

async function ejecutarPenalLocal(direccionElegida) {
    if (!usuarioActual || !direccionGanadora) {
        alert("❌ Primero dale a 'Próximo tiro' para habilitar el arco.");
        return;
    }

    try {
        const checkRes = await fetch(`${URL_BASE}/tiros-restantes/${usuarioActual.id}`);
        const checkData = await checkRes.json();
        
        if (checkData.tiros <= 0) {
            const resTexto = document.getElementById("resultado-penal");
            resTexto.style.color = "var(--rojo)";
            resTexto.innerText = "❌ ¡NO TE QUEDAN TIROS! Volvé mañana. 🛌";
            alert("❌ Ya gastaste tus 10 tiros diarios.");
            return;
        }
    } catch (err) { console.error("Error en chequeo previo:", err); }

    const arquero = document.getElementById('arquero-animado');
    const posicionesArquero = ['-80px', '0px', '80px']; 
    const movArquero = posicionesArquero[Math.floor(Math.random() * posicionesArquero.length)];
    arquero.style.transform = `translateX(${movArquero})`;

    const balon = document.getElementById('balon-animado');
    if (direccionElegida === 'IZQUIERDA') balon.style.transform = 'translate(-80px, -70px) scale(0.6)';
    else if (direccionElegida === 'DERECHA') balon.style.transform = 'translate(80px, -70px) scale(0.6)';
    else balon.style.transform = 'translate(0px, -70px) scale(0.6)';

    await new Promise(r => setTimeout(r, 600));

    const mapaPos = { 'IZQUIERDA': '-80px', 'CENTRO': '0px', 'DERECHA': '80px' };
    const fueAtajado = mapaPos[direccionElegida] === movArquero;
    const esGol = !fueAtajado; 

    const resTexto = document.getElementById("resultado-penal");
    if (fueAtajado) {
        resTexto.style.color = "var(--rojo)";
        resTexto.innerText = "¡ATAJADO POR EL ARQUERO! 🧤";
    } else {
        resTexto.style.color = "var(--celeste)";
        resTexto.innerText = "¡GOOOL! 🪙 +100 Oro";
    }
    
    direccionGanadora = "";

    try {
        const res = await fetch(`${URL_BASE}/jugar-penal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: usuarioActual.id, gano: esGol })
        });
        const data = await res.json();
        
        if (data.error_limite) {
            alert(data.mensaje);
            resTexto.style.color = "var(--rojo)";
            resTexto.innerText = "¡MAÑANA SE VUELVE A PATEAR! ⏱️";
            return;
        }

        usuarioActual.monedas = data.datos.monedas;
        usuarioActual.puntos_ranking = data.datos.puntos_ranking;
        actualizarInterfazUI();
        cargarRankingLocal();
        
        resTexto.innerText += ` — Te quedan ${data.tiros_restantes} tiros hoy.`;
    } catch (err) { console.error(err); }
}

/* ========================================================================
   🏆 6. RANKING DE LA ARENA (LEADERBOARD)
   ======================================================================== */
async function cargarRankingLocal() {
    const tbody = document.getElementById("tabla-ranking-body");
    if (!tbody) return;

    try {
        const res = await fetch(`${URL_BASE}/ranking`);
        const data = await res.json();
        tbody.innerHTML = "";

        if (!data.ranking || data.ranking.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="color:#777;">No hay jugadores en la arena</td></tr>`;
            return;
        }

        data.ranking.forEach((user, index) => {
            const tr = document.createElement("tr");
            if (usuarioActual && user.username === usuarioActual.username) {
                tr.className = "fila-usuario-actual"; 
                tr.style.background = "rgba(32, 181, 203, 0.15)";
                tr.style.border = "1px solid var(--celeste)";
            }

            let posicionText = index + 1;
            if (index === 0) posicionText = "🥇";
            if (index === 1) posicionText = "🥈";
            if (index === 2) posicionText = "🥉";

            tr.innerHTML = `
                <td><b>${posicionText}</b></td>
                <td style="text-align: left; padding-left: 15px;">
                    ${user.username} ${usuarioActual && user.username === usuarioActual.username ? '<span style="color:var(--celeste); font-size:0.8rem;">(Vos)</span>' : ''}
                </td>
                <td style="color: #ff4a4a; font-weight: bold;">${user.puntos_ranking}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) { console.error(err); }
}

/* ========================================================================
   🚪 7. CERRAR SESIÓN (CON AVISO AL SERVIDOR)
   ======================================================================== */
async function cerrarSesionLocal() {
    if (!usuarioActual) return;

    const confirmar = confirm(`¿Estás seguro de que querés salir, ${usuarioActual.username}?`);
    if (!confirmar) return;

    try {
        await fetch(`${URL_BASE}/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usuarioActual.username })
        });
    } catch (err) { console.error("Error al avisar logout al servidor:", err); }

    usuarioActual = null;
    direccionGanadora = "";
    albumCompleto = [];
    paisSeleccionado = "";

    document.getElementById("input-usuario").value = "";
    document.getElementById("input-pass").value = "";

    document.getElementById("interfaz-juego").classList.remove("mostrar");
    document.getElementById("interfaz-juego").style.display = "none";
    document.getElementById("seccion-login").style.display = "block";

    alert("🚪 Sesión cerrada correctamente. Volviste al menú local.");
}

/* ========================================================================
   🎰 8. SISTEMA DE TIMBA (SEGURA E INHACKEABLE DESDE EL SERVIDOR)
   ======================================================================== */
const LISTA_SELECCIONES_TIMBA = [
    { nombre: "ARGENTINA", bandera: "🇦🇷" }, { nombre: "BRASIL", bandera: "🇧🇷" },
    { nombre: "URUGUAY", bandera: "🇺🇾" }, { nombre: "ALEMANIA", bandera: "🇩🇪" },
    { nombre: "FRANCIA", bandera: "🇫🇷" }, { nombre: "ESPAÑA", bandera: "🇪🇸" },
    { nombre: "ITALIA", bandera: "🇮🇹" }, { nombre: "INGLATERRA", bandera: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    { nombre: "PORTUGAL", bandera: "🇵🇹" }, { nombre: "HOLANDA", bandera: "🇳🇱" }
];

let historialPartidosSimulados = [];

function rotarPartidoTimba() {
    let local = LISTA_SELECCIONES_TIMBA[Math.floor(Math.random() * LISTA_SELECCIONES_TIMBA.length)];
    let visitante = LISTA_SELECCIONES_TIMBA[Math.floor(Math.random() * LISTA_SELECCIONES_TIMBA.length)];
    
    while (local.nombre === visitante.nombre) {
        visitante = LISTA_SELECCIONES_TIMBA[Math.floor(Math.random() * LISTA_SELECCIONES_TIMBA.length)];
    }
    
    document.getElementById("timba-bandera-local").innerText = local.bandera;
    document.getElementById("timba-local").innerText = local.nombre;
    
    document.getElementById("timba-bandera-visitante").innerText = visitante.bandera;
    document.getElementById("timba-visitante").innerText = visitante.nombre;
}

function actualizarHistorialUI(infoPartido) {
    historialPartidosSimulados.unshift(infoPartido); 
    if (historialPartidosSimulados.length > 3) historialPartidosSimulados.pop(); 

    const contenedorLista = document.getElementById("lista-historial-timba");
    if (!contenedorLista) return;
    contenedorLista.innerHTML = "";

    historialPartidosSimulados.forEach(p => {
        const li = document.createElement("li");
        li.className = "item-historial-partido";
        li.innerHTML = `<span>⚔️ ${p.local} vs ${p.visitante}</span> <b style="color: var(--celeste);">${p.res}</b>`;
        contenedorLista.appendChild(li);
    });
}

// ✨ ACTUALIZADO: El cliente pide las opciones encriptadas y anónimas al server
async function prepararOpcionesApuesta() {
    if (!usuarioActual) return alert("❌ Iniciá sesión para timbear.");
    
    const montoApuesta = parseInt(document.getElementById("input-monto-apuesta").value);
    if (isNaN(montoApuesta) || montoApuesta <= 0) {
        return alert("❌ Ingresá un monto de oro válido antes de ver las opciones.");
    }
    if (usuarioActual.monedas < montoApuesta) {
        return alert("🪙 No tenés suficiente Oro para bancar esa apuesta.");
    }

    try {
        // Consultamos el endpoint seguro que simula en secreto
        const res = await fetch(`${URL_BASE}/timba/preparar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: usuarioActual.id, montoApuesta })
        });
        const data = await res.json();

        if (!data.ok) return alert(data.mensaje);

        const contenedor = document.getElementById("contenedor-opciones-goles");
        if (!contenedor) return;
        contenedor.innerHTML = "";
        contenedor.style.display = "grid";

        // Renderizamos las 6 opciones ciegas (F12 solo ve IDs de 0 a 5)
        data.opciones.forEach(opc => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn-modulo btn-opcion-resultado";
            btn.style.margin = "5px";
            btn.innerText = opc.label;
            // Pasamos el ID de opción seguro al backend para validar
            btn.onclick = () => procesarEleccionTimbaSegura(opc.idOpcion);
            contenedor.appendChild(btn);
        });

        timbaPreparada = true;

    } catch (err) { console.error("Error al preparar opciones seguras:", err); }
}

// ✨ ACTUALIZADO: Validación del lado del Backend (Inhackeable)
async function procesarEleccionTimbaSegura(idOpcionElegida) {
    if (!timbaPreparada) return;

    const bandLoc = document.getElementById("timba-bandera-local").innerText;
    const nomLoc = document.getElementById("timba-local").innerText;
    const bandVis = document.getElementById("timba-bandera-visitante").innerText;
    const nomVis = document.getElementById("timba-visitante").innerText;

    try {
        const res = await fetch(`${URL_BASE}/timba/procesar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: usuarioActual.id, idOpcionElegida })
        });
        const data = await res.json();

        if (!data.ok) return alert(data.mensaje);

        // Actualizamos los datos reales de oro y ranking devueltos por la DB
        usuarioActual.monedas = data.datos.monedas;
        usuarioActual.puntos_ranking = data.datos.puntos_ranking;
        actualizarInterfazUI();

        alert(`⚽ RESULTADO DE LA TIMBA ⚽\n\n${data.mensajeResultado}`);

        document.getElementById("contenedor-opciones-goles").style.display = "none";
        document.getElementById("input-monto-apuesta").value = "50";

        // Alimentamos la bitácora con la verdad del partido simulado
        actualizarHistorialUI({ 
            local: `${bandLoc} ${nomLoc}`, 
            visitante: `${bandVis} ${nomVis}`, 
            res: `${data.golesLReal} - ${data.golesVReal}` 
        });

        timbaPreparada = false;
        rotarPartidoTimba();

    } catch (err) { console.error("Error al procesar jugada segura:", err); }
}

// 🔄 Enganchamos la rotación inicial del partido cuando cargue el script por primera vez
setTimeout(rotarPartidoTimba, 1000);