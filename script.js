/* ========================================================================
   🎯 1. CONFIGURACIÓN, INSTANCIAS Y VARIABLES DE ESTADO GLOBAL
   ======================================================================== */

const URL_RENDER_SERVICIO = "https://albumpe.onrender.com";
const URL_BASE = `${URL_RENDER_SERVICIO}/api`;

// Estados del Usuario y Configuración de Sesión
let usuarioActual = null;
let albumCompleto = [];
let paisSeleccionado = "";

// Variables de Control de Energía y Timers Globales
let direccionGanadora = "";
let timbaPreparada = false;
let intervaloCronometro = null;       // Reloj para el Cooldown de Penales
let intervaloCronometroTimba = null;  // Reloj para la Energía de la Timba

// Filtros del Álbum Colector (HUD Cruzado)
let filtroEstadoActual = 'todas'; // Opciones: 'todas', 'desbloqueadas', 'pendientes'
let filtroRarezaActual = 'todas'; // Opciones: 'todas', 'comun', 'rara', 'epica', 'legendaria'

// Estado del Engine Multijugador Coincidente con Backend (Neon)
let multiSalaId = null;
let multiCodigoSala = null;
let multiEsCreador = false;
let multiIntervaloLobby = null;
let multiApuestaFijada = 0;
window.multiTipoApuestaActual = 'amistoso'; // Opciones: 'amistoso', 'oro', 'carta'

// Mapeos Estáticos de Diseño y Lógica de Puntos
const MAPA_PUNTOS_RAREZA = { 
    'comun': 60, 
    'especial': 68, 
    'rara': 75, 
    'epica': 85, 
    'legendaria': 96 
};

const LISTA_SELECCIONES_TIMBA = [
     { nombre: "ARGENTINA", bandera: "🇦🇷" }, { nombre: "BRASIL", bandera: "🇧🇷" },
     { nombre: "URUGUAY", bandera: "🇺🇾" },     { nombre: "ALEMANIA", bandera: "🇩🇪" },
     { nombre: "FRANCIA", bandera: "🇫🇷" },     { nombre: "ESPAÑA", bandera: "🇪🇸" },
     { nombre: "ITALIA", bandera: "🇮🇹" },       { nombre: "INGLATERRA", bandera: "🏴" },
     { nombre: "PORTUGAL", bandera: "🇵🇹" },     { nombre: "HOLANDA", bandera: "🇳🇱" },
     { nombre: "COLOMBIA", bandera: "🇨🇴" },     { nombre: "CHILE", bandera: "🇨🇱" },
     { nombre: "MÉXICO", bandera: "🇲🇽" },       { nombre: "JAPÓN", bandera: "🇯🇵" },
     { nombre: "MARRUECOS", bandera: "🇲🇦" },    { nombre: "CROACIA", bandera: "🇭🇷" },
     { nombre: "BÉLGICA", bandera: "🇧🇪" },      { nombre: "SENEGAL", bandera: "🇸🇳" },
     { nombre: "ESTADOS UNIDOS", bandera: "🇺🇸" }, { nombre: "ARABIA SAUDITA", bandera: "🇸🇦" }
];

var historialPartidosSimulados = [];

/* ========================================================================
   🎛️ 2. CONTROLADORES INTERNOS DE LA UI, PANTALLAS DE CARGA Y MODALES
   ======================================================================== */

function cambiarModulo(idModulo, botonPresionado) {
     // Oculta tanto los módulos comunes como el multijugador
     document.querySelectorAll('.modulo-contenido, #modulo-mundial-multi').forEach(mod => mod.style.display = 'none');
     document.querySelectorAll('.tile-modulo-fifa, .btn-modulo-match').forEach(btn => btn.classList.remove('activo'));
     
     // Muestra el módulo clickeado
     const modActivo = document.getElementById(idModulo);
     if (modActivo) modActivo.style.display = 'block';
     if (botonPresionado) botonPresionado.classList.add('activo');

     // Lógica de carga interna bajo demanda de cada sección
     if (idModulo === 'modulo-album' && usuarioActual) cargarAlbumLocal();
     if (idModulo === 'modulo-penales' && usuarioActual) iniciarDueloLocal();
     
     if (idModulo === 'modulo-timba' && usuarioActual) {
          rotarPartidoTimba();
          document.getElementById("select-tipo-apuesta").value = "monedas"; 
          conmutarControlesTimbaUI();
          actualizarTimbasRestantesUI();
     }
     if (idModulo === 'modulo-minimundial' && usuarioActual) {
          actualizarEstadoMundialUI();
          cargarRankingMundialesLocal(); 
          document.getElementById("fase-inscripcion-mundial").style.display = "block";
          document.getElementById("fase-draft-mundial").style.display = "none";
          document.getElementById("fase-fixture-mundial").style.display = "none";
     }
}

function mostrarCarga(mensaje = "Conectando con la Arena...") {
     document.getElementById("texto-carga-dinamico").innerText = mensaje;
     document.getElementById("pantalla-carga").classList.add("activo");
}

function ocultarCarga() {
     document.getElementById("pantalla-carga").classList.remove("activo");
}

function abrirModalAyuda() {
     const modal = document.getElementById("modal-ayuda-juego");
     if (modal) modal.style.display = "flex";
}

function cerrarModalAyuda() {
     const modal = document.getElementById("modal-ayuda-juego");
     if (modal) modal.style.display = "none";
}

/* ========================================================================
   👤 3. AUTENTICACIÓN, REGISTRO Y GESTIÓN DEL HUD DEL USUARIO
   ======================================================================== */

async function autenticarUsuario(accion) {
     const username = document.getElementById("input-usuario").value.trim();
     const password = document.getElementById("input-pass").value;
     
     if (!username || !password) return alert("❌ Completá los datos.");

     const textoSpinner = accion === 'login' ? "Iniciando sesión..." : "Creando tu cuenta en la Arena...";
     const endpointFinal = accion === 'login' ? 'login' : 'registro';

     mostrarCarga(textoSpinner);

     try {
          const res = await fetch(`${URL_BASE}/${endpointFinal}`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ username, password })
          });
          
          const data = await res.json();
          ocultarCarga();

          if (data.error) {
               alert(data.error);
          } else {
               usuarioActual = data.usuario;
               document.getElementById("seccion-login").style.display = "none";
               
               const interfazJuego = document.getElementById("interfaz-juego");
               interfazJuego.style.removeProperty("display");
               interfazJuego.classList.add("mostrar");
               
               // Reseteamos filtros a nivel lógico al iniciar sesión
               filtroEstadoActual = 'todas';
               filtroRarezaActual = 'todas';
               
               actualizarInterfazUI();
               cargarAlbumLocal();
               actualizarTimbasRestantesUI();
               iniciarControladorAnunciosSeguro(); 
               
               if (accion === 'login') {
                    alert(`⚔️ ¡Bienvenido de vuelta, ${usuarioActual.username}!`);
               } else {
                    alert(`🎉 ¡Cuenta creada con éxito! Bienvenido a la Arena, ${usuarioActual.username}. Empezás con 200 monedas.`);
               }
          }
     } catch (err) {
          console.error(err);
          ocultarCarga();
     }
}

function actualizarInterfazUI() {
     if (!usuarioActual) return;
     document.getElementById("lbl-usuario").innerText = usuarioActual.username.toUpperCase();
     document.getElementById("lbl-monedas").innerText = usuarioActual.monedas;
     document.getElementById("lbl-ranking").innerText = usuarioActual.puntos_ranking;
     
     const lblMundiales = document.getElementById("lbl-copas-mundiales");
     if (lblMundiales) {
          lblMundiales.innerText = usuarioActual.copas_mundiales || 0;
     }
}

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

     clearInterval(intervaloCronometro);
     usuarioActual = null;
     direccionGanadora = "";
     albumCompleto = [];
     window.albumCompleto = [];
     paisSeleccionado = "";

     document.getElementById("input-usuario").value = "";
     document.getElementById("input-pass").value = "";

     const interfazJuego = document.getElementById("interfaz-juego");
     interfazJuego.classList.remove("mostrar");
     interfazJuego.style.display = "none";
     document.getElementById("seccion-login").style.display = "block";

     alert("🚪 Sesión cerrada correctamente. Volviste al menú local.");
}

/* ========================================================================
   📖 4. ÁLBUM COLECTOR (SISTEMA PANINI & FILTRADO INTERACTIVO CRUZADO)
   ======================================================================== */

async function cargarAlbumLocal() {
     if (!usuarioActual) return;
     const contenedorPaises = document.getElementById("selector-paises");
     
     try {
          const res = await fetch(`${URL_BASE}/album/${usuarioActual.id}`);
          const data = await res.json();
          
          albumCompleto = data.album;
          window.albumCompleto = data.album;

          const totalJugadores = albumCompleto.length;
          const obtenidosTotales = albumCompleto.filter(figu => figu.obtenido > 0).length;
          const porcentajeGlobal = totalJugadores > 0 ? Math.round((obtenidosTotales / totalJugadores) * 100) : 0;

          document.getElementById("lbl-progreso-numerico").innerText = `${obtenidosTotales} / ${totalJugadores} (${porcentajeGlobal}%)`;
          document.getElementById("barra-progreso-llenado").style.width = `${porcentajeGlobal}%`;

          const countriesMap = new Map();
          albumCompleto.forEach(figu => {
               if (!countriesMap.has(figu.pais)) {
                    countriesMap.set(figu.pais, { bandera: figu.bandera, complete: true });
               }
          });

          countriesMap.forEach((info, pais) => {
               const figusDeEstePais = albumCompleto.filter(f => f.pais === pais);
               const tieneTodas = figusDeEstePais.every(f => f.obtenido > 0);
               info.complete = tieneTodas;
          });

          contenedorPaises.innerHTML = "";
          if (!paisSeleccionado && countriesMap.size > 0) {
               paisSeleccionado = countriesMap.keys().next().value;
          }

          countriesMap.forEach((info, pais) => {
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

          if (document.getElementById("select-tipo-apuesta") && document.getElementById("select-tipo-apuesta").value === "cromo") {
               cargarRepetidasEnDesplegableUI();
          }
     } catch (err) { console.error("Error al calcular progreso de álbum:", err); }
}

function mostrarJugadoresPorPais() {
     const contenedorGrid = document.getElementById("contenedor-grid-album");
     if (!contenedorGrid) return;
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

     aplicarFiltrosCruzadosUI();
}

function filtrarAlbumPorEstado(estado, boton) {
     filtroEstadoActual = estado;
     actualizarVisualBotonesFiltro(boton, 'estado');
     aplicarFiltrosCruzadosUI();
}

function filtrarAlbumPorRareza(rareza, boton) {
     filtroRarezaActual = rareza;
     actualizarVisualBotonesFiltro(boton, 'rareza');
     aplicarFiltrosCruzadosUI();
}

function aplicarFiltrosCruzadosUI() {
     const contenedor = document.getElementById("contenedor-grid-album");
     if (!contenedor) return;
     
     const cartas = contenedor.getElementsByClassName("carta-clash");
     let contadorVisibles = 0;

     for (let divCarta of cartas) {
          const estaBloqueada = divCarta.classList.contains("bloqueada");
          
          let rarezaCarta = 'comun';
          if (divCarta.classList.contains("rara")) rarezaCarta = 'rara';
          else if (divCarta.classList.contains("epica")) rarezaCarta = 'epica';
          else if (divCarta.classList.contains("legendaria")) rarezaCarta = 'legendaria';

          let cumpleEstado = false;
          if (filtroEstadoActual === 'todas') cumpleEstado = true;
          else if (filtroEstadoActual === 'desbloqueadas' && !estaBloqueada) cumpleEstado = true;
          else if (filtroEstadoActual === 'pendientes' && estaBloqueada) cumpleEstado = true;

          let cumpleRareza = false;
          if (filtroRarezaActual === 'todas') cumpleRareza = true;
          else if (filtroRarezaActual === rarezaCarta) cumpleRareza = true;

          if (cumpleEstado && cumpleRareza) {
               divCarta.style.display = "block";
               contadorVisibles++;
          } else {
               divCarta.style.display = "none";
          }
     }
}

function actualizarVisualBotonesFiltro(botonClasificado, tipoGrupo) {
     const botonesHermanos = botonClasificado.parentElement.getElementsByClassName("btn-filtro-tv");
     for (let btn of botonesHermanos) {
          btn.classList.remove("activo");
     }
     botonClasificado.classList.add("activo");
}

/* ========================================================================
   🍿 5. LOGICA CINEMÁTICA ASÍNCRONA DE PACK OPENING (SOBRES)
   ======================================================================== */

let colaCartasPack = [];
let indiceCartaActualPack = 0;
let sobreAbiertoCompletoCache = []; 
let animacionCartaEnCurso = false; 

async function comprarSobreEspecifico(tipoCofre) {
     if (!usuarioActual) return alert("❌ Error.");
     mostrarCarga(`Adquiriendo derechos de pack ${tipoCofre.toUpperCase()}...`);

     try {
          const res = await fetch(`${URL_BASE}/comprar-sobre`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ usuario_id: usuarioActual.id, tipoCofre: tipoCofre })
          });
          
          const data = await res.json();
          ocultarCarga();

          if (data.error_oro) return alert(data.mensaje);
          if (data.error) return alert("❌ Error: " + data.error);

          usuarioActual.monedas = data.monedas;
          actualizarInterfazUI();

          colaCartasPack = data.sobre;
          sobreAbiertoCompletoCache = data.sobre;
          indiceCartaActualPack = 0;

          document.getElementById("grid-sobre-abierto").innerHTML = "";
          
          const contenedorOpening = document.getElementById("contenedor-pack-opening");
          contenedorOpening.style.display = "flex";
          contenedorOpening.scrollIntoView({ behavior: 'smooth', block: 'center' });

          ejecutarSecuenciaReveladoCarta();
     } catch (err) {
          console.error("Error en la apertura del pack:", err);
          ocultarCarga();
     }
}

async function ejecutarSecuenciaReveladoCarta() {
    if (indiceCartaActualPack >= colaCartasPack.length) {
        document.getElementById("contenedor-pack-opening").style.display = "none";
        renderizarGrillaFinalSobres();
        animacionCartaEnCurso = false; 
        return;
    }

    animacionCartaEnCurso = true;
    const btnSiguiente = document.getElementById("btn-siguiente-carta-pack");
    if (btnSiguiente) btnSiguiente.disabled = true; 

    const carta = colaCartasPack[indiceCartaActualPack];
    const wrapper = document.getElementById("pantalla-carta-presentada");
    
    const pBandera = document.getElementById("pista-bandera");
    const pPosicion = document.getElementById("pista-posicion");
    const pRareza = document.getElementById("pista-rareza");
    
    pBandera.className = "pista-bloque"; pBandera.innerText = "⏳ ?";
    pPosicion.className = "pista-bloque"; pPosicion.innerText = "⚽ ?";
    pRareza.className = "pista-bloque"; pRareza.innerText = "🃏 ?";
    wrapper.innerHTML = ""; 

    await new Promise(r => setTimeout(r, 200));
    pBandera.innerText = carta.bandera || "🃏";
    pBandera.classList.add("revelada");

    await new Promise(r => setTimeout(r, 600));
    let posText = "DEL";
    const posFiltro = carta.posicion ? carta.posicion.toUpperCase() : "";
    if (posFiltro.includes("DEF") || posFiltro.includes("ARQ") || posFiltro.includes("POR")) posText = "DEF";
    else if (posFiltro.includes("MED") || posFiltro.includes("VOL") || posFiltro.includes("CC")) posText = "MED";
    pPosicion.innerText = posText;
    pPosicion.classList.add("revelada");

    await new Promise(r => setTimeout(r, 600));
    
    let rarezaTexto = carta.rareza.toUpperCase();
    if (rarezaTexto === "ESPECIAL") rarezaTexto = "RARA";
    pRareza.innerText = rarezaTexto;
    pRareza.classList.add("revelada");

    await new Promise(r => setTimeout(r, 500));
    
    let rarezaClase = carta.rareza.toLowerCase();
    if (rarezaClase === "especial") rarezaClase = "rara";
    
    const divCarta = document.createElement("div");
    divCarta.className = `carta-clash ${rarezaClase} caminante-entrada`;
    
    let rarezaColor = "#8e9bb0";
    if (rarezaClase === "rara") rarezaColor = "#0074e8";
    else if (rarezaClase === "epica") rarezaColor = "#a335ee";
    else if (rarezaClase === "legendaria") rarezaColor = "#ffb100";

    divCarta.innerHTML = `
        ${carta.obtenido > 1 ? `<div class="badge-repetidas">x${carta.obtenido}</div>` : ''}
        <img src="${carta.foto}" class="carta-foto" alt="${carta.nombre}">
        <div style="position: absolute; top: 0; left: 0; width: 18px; height: 100%; background: linear-gradient(90deg, ${rarezaColor} 0%, rgba(0,0,0,0) 100%); opacity: 0.4; z-index: 3;"></div>
        <div class="rareza-vertical">${rarezaTexto}</div>
    `;
    
    wrapper.appendChild(divCarta);
    await new Promise(r => setTimeout(r, 400));

    animacionCartaEnCurso = false;
    if (btnSiguiente) btnSiguiente.disabled = false; 
}

function mostrarSiguienteCartaSecuencia() {
     if (animacionCartaEnCurso) return; 
     indiceCartaActualPack++;
     ejecutarSecuenciaReveladoCarta();
}

async function renderizarGrillaFinalSobres() {
     const contenedorSobre = document.getElementById("grid-sobre-abierto");
     contenedorSobre.innerHTML = "";

     sobreAbiertoCompletoCache.forEach((figu, indice) => {
          const itemContenedor = document.createElement("div");
          itemContenedor.style.cssText = "display: flex; flex-direction: column; align-items: center; gap: 8px;";

          let rarezaClaseFinal = figu.rareza.toLowerCase();
          if (rarezaClaseFinal === "especial") rarezaClaseFinal = "rara";

          let rarezaTextoFinal = figu.rareza.toUpperCase();
          if (rarezaTextoFinal === "ESPECIAL") rarezaTextoFinal = "RARA";

          const divCarta = document.createElement("div");
          divCarta.className = `carta-clash ${rarezaClaseFinal}`;
          divCarta.style.animationDelay = `${indice * 0.1}s`;
          
          divCarta.innerHTML = `
              ${figu.obtenido > 1 ? `<div class="badge-repetidas">x${figu.obtenido}</div>` : ''}
              <img src="${figu.foto}" class="carta-foto" alt="${figu.nombre}">
              <div class="rareza-vertical">${rarezaTextoFinal}</div>
          `;

          itemContenedor.appendChild(divCarta);
          contenedorSobre.appendChild(itemContenedor);
     });

     if (usuarioActual) await cargarAlbumLocal();
}


/* ========================================================================
   ⚽ 6. DUELO DE PENALES (COOLDOWN Y CONTROL DE DISPARO RESPONSIVE)
   ======================================================================== */

function arrancarCronometroVisual(milisegundosFaltantes) {
     clearInterval(intervaloCronometro);
     const lblCronometro = document.getElementById("cronometro-tiros");
     if (!lblCronometro) return;
     
     if (milisegundosFaltantes <= 0) {
          lblCronometro.innerText = "🔋 ¡Energía al Máximo!";
          document.querySelectorAll('.zona-disparo-target').forEach(z => z.style.pointerEvents = "auto");
          return;
     }

     let tiempoRestante = milisegundosFaltantes;
     intervaloCronometro = setInterval(() => {
          tiempoRestante -= 1000;
          if (tiempoRestante <= 0) {
               clearInterval(intervaloCronometro);
               lblCronometro.innerText = "⚡ ¡Tiro recargado! Actualizando...";
               document.querySelectorAll('.zona-disparo-target').forEach(z => z.style.pointerEvents = "auto");
               if (usuarioActual) iniciarDueloLocal();
               return;
          }

          const totalSegundos = Math.floor(tiempoRestante / 1000);
          const horas = Math.floor(totalSegundos / 3600);
          const minutos = Math.floor((totalSegundos % 3600) / 60);
          const segundos = totalSegundos % 60;

          let textoReloj = "";
          if (horas > 0) textoReloj += `${horas}h `;
          textoReloj += `${minutos.toString().padStart(2, '0')}m ${segundos.toString().padStart(2, '0')}s`;

          lblCronometro.innerText = `⏱️ Próximo tiro en: ${textoReloj}`;
     }, 1000);
}

async function iniciarDueloLocal() {
     if (!usuarioActual) return alert("❌ Iniciá sesión.");
     const resTexto = document.getElementById("resultado-penal");
     const btnProximo = document.querySelector("button[onclick='iniciarDueloLocal()']");
     const escenario = document.getElementById("escenario-penal");

     cargarRankingLocal();

     try {
          const res = await fetch(`${URL_BASE}/tiros-restantes/${usuarioActual.id}`);
          const data = await res.json();
          
          if (data.tiros <= 0) {
               resTexto.style.color = "var(--rojo)";
               resTexto.innerText = "❌ ¡NO TE QUEDAN TIROS! Esperá que recargue energía.";
               if (btnProximo) btnProximo.disabled = true;
               if (escenario) escenario.classList.add("bloqueado-energia");
               direccionGanadora = "";
          } else {
               resTexto.style.color = "white";
               resTexto.innerText = `⚽ ¡PREPARÁ EL DISPARO! — Te quedan ${data.tiros} tiros.`;
               if (btnProximo) btnProximo.disabled = false;
               if (escenario) escenario.classList.remove("bloqueado-energia");
               document.querySelectorAll('.zona-disparo-target').forEach(z => z.style.pointerEvents = "auto");

               const opciones = ['IZQUIERDA', 'CENTRO', 'DERECHA'];
               direccionGanadora = opciones[Math.floor(Math.random() * opciones.length)];
          }
          arrancarCronometroVisual(data.siguienteIn);
     } catch (err) { console.error("Error al verificar tiros iniciales:", err); }
     
     const balon = document.getElementById('balon-animado');
     const arquero = document.getElementById('arquero-animado');
     if (balon && arquero) {
          balon.style.transform = 'translate(0, 0) scale(1)';
          arquero.style.transform = 'translateX(0px)';
     }
}

async function ejecutarPenalLocal(direccionElegida) {
     if (!usuarioActual || !direccionGanadora) return;

     const esMovil = window.innerWidth <= 768;
     const fX = esMovil ? 0.55 : 1.0; 
     const fY = esMovil ? 0.65 : 1.0; 

     const mapaAnimaciones = {
          'SUP_IZQUIERDA': {
               balon: `translate(${ -185 * fX }px, ${ -185 * fY }px)`,
               arquero: `translate(${ -185 * fX }px, ${ -65 * fY }px) rotate(-25deg)`
          },
          'SUP_CENTRO': {
               balon: `translate(0px, ${ -205 * fY }px)`,
               arquero: `translate(0px, ${ -75 * fY }px) rotate(0deg)`
          },
          'SUP_DERECHA': {
               balon: `translate(${ 185 * fX }px, ${ -185 * fY }px)`,
               arquero: `translate(${ 185 * fX }px, ${ -65 * fY }px) rotate(25deg)`
          },
          'INF_IZQUIERDA': {
               balon: `translate(${ -185 * fX }px, ${ -20 * fY }px)`,
               arquero: `translate(${ -185 * fX }px, ${ 95 * fY }px) rotate(-15deg)`
          },
          'INF_CENTRO': {
               balon: `translate(0px, ${ -35 * fY }px)`,
               arquero: `translate(0px, ${ 85 * fY }px) rotate(0deg)`
          },
          'INF_DERECHA': {
               balon: `translate(${ 185 * fX }px, ${ -20 * fY }px)`,
               arquero: `translate(${ 185 * fX }px, ${ 95 * fY }px) rotate(15deg)`
          }
     };

     const direccionesPosibles = Object.keys(mapaAnimaciones);
     const direccionArquero = direccionesPosibles[Math.floor(Math.random() * direccionesPosibles.length)];

     const arquero = document.getElementById('arquero-animado');
     if (arquero) {
          arquero.style.zIndex = "5"; 
          arquero.style.transform = mapaAnimaciones[direccionArquero].arquero;
     }

     const balon = document.getElementById('balon-animado');
     if (balon) {
          balon.style.zIndex = "10"; 
          balon.style.transform = mapaAnimaciones[direccionElegida].balon;
     }

     document.querySelectorAll('.zona-disparo-target').forEach(z => z.style.pointerEvents = "none");
     await new Promise(r => setTimeout(r, 600));

     const fueAtajado = direccionElegida === direccionArquero;
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
               resTexto.innerText = "¡SIN ENERGÍA! ⏱️";
               return;
          }

          usuarioActual.monedas = data.datos.monedas;
          usuarioActual.puntos_ranking = data.datos.puntos_ranking;
          actualizarInterfazUI();
          cargarRankingLocal();
          
          resTexto.innerText += ` — Te quedan ${data.tiros_restantes} tiros.`;
          const btnProximo = document.querySelector("button[onclick='iniciarDueloLocal()']");
          
          if (data.tiros_restantes <= 0) {
               if (btnProximo) btnProximo.disabled = true;
          } else {
               document.querySelectorAll('.zona-disparo-target').forEach(z => z.style.pointerEvents = "auto");
          }
          arrancarCronometroVisual(data.siguienteIn);
     } catch (err) {
          console.error(err);
          document.querySelectorAll('.zona-disparo-target').forEach(z => z.style.pointerEvents = "auto");
     }
}

/* ========================================================================
   🎰 7. SISTEMA DE TIMBA MULTI-APUESTA Y REGENERACIÓN DE ENERGÍA
   ======================================================================== */

function arrancarCronometroTimbaVisual(milisegundos) {
     clearInterval(intervaloCronometroTimba);
     const lblCronometro = document.getElementById('cronometro-timba');
     
     if (!lblCronometro) return;
     if (milisegundos <= 0) {
          lblCronometro.innerText = '🔋 ¡Apuestas al Máximo (10/10)!';
          return;
     }

     let tiempoRestante = milisegundos;
     intervaloCronometroTimba = setInterval(() => {
          tiempoRestante -= 1000;
          
          if (tiempoRestante <= 0) {
               clearInterval(intervaloCronometroTimba);
               lblCronometro.innerText = '⚡ ¡Apuesta recargada! Actualizando...';
               if (usuarioActual) actualizarTimbasRestantesUI();
               return;
          }

          const totalSegundos = Math.floor(tiempoRestante / 1000);
          const minutos = Math.floor(totalSegundos / 60);
          const segundos = totalSegundos % 60;

          let textoReloj = minutos.toString().padStart(2, '0') + 'm ' + segundos.toString().padStart(2, '0') + 's';
          lblCronometro.innerText = '⏱️ Próxima apuesta en: ' + textoReloj;
     }, 1000);
}

async function actualizarTimbasRestantesUI() {
     if (!usuarioActual) return;
     const lblCronometro = document.getElementById('cronometro-timba');
     if (!lblCronometro) return;

     try {
          const res = await fetch(URL_BASE + '/timbas-restantes/' + usuarioActual.id);
          const datos = await res.json();
          
          if (datos.timbas <= 0) {
               lblCronometro.style.borderColor = 'var(--rojo)';
               lblCronometro.style.color = 'var(--rojo)';
               lblCronometro.innerText = '❌ SIN ENERGÍA PARA TIMBEAR ⏱️';
          } else {
               lblCronometro.style.borderColor = 'var(--dorado)';
               lblCronometro.style.color = 'var(--dorado)';
               lblCronometro.innerText = '🎰 Apuestas disponibles: ' + datos.timbas + '/10';
          }

          if (datos.siguienteIn > 0 && datos.timbas < 10) {
               arrancarCronometroTimbaVisual(datos.siguienteIn);
          }
     } catch (err) { console.error('Error al actualizar créditos de timba:', err); }
}

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

function conmutarControlesTimbaUI() {
     const tipo = document.getElementById("select-tipo-apuesta").value;
     if (tipo === "monedas") {
          document.getElementById("wrapper-apuesta-monedas").style.display = "flex";
          document.getElementById("wrapper-apuesta-cromo").style.display = "none";
     } else {
          document.getElementById("wrapper-apuesta-monedas").style.display = "none";
          document.getElementById("wrapper-apuesta-cromo").style.display = "flex";
          cargarRepetidasEnDesplegableUI();
     }
}

function cargarRepetidasEnDesplegableUI() {
     const select = document.getElementById("select-cromo-repetido");
     if (!select) return;
     select.innerHTML = "";

     const miAlbumReal = window.albumCompleto || albumCompleto;
     if (!miAlbumReal || !Array.isArray(miAlbumReal)) {
          const opt = document.createElement("option");
          opt.value = ""; opt.innerText = "⏳ Cargando inventario...";
          select.appendChild(opt); return;
     }

     const repetidas = miAlbumReal.filter(f => f && f.obtenido > 1);
     if (repetidas.length === 0) {
          const opt = document.createElement("option");
          opt.value = ""; opt.innerText = "❌ No tenés cromos repetidos";
          select.appendChild(opt); return;
     }

     repetidas.forEach(figu => {
          if (!figu) return;
          const opt = document.createElement("option");
          opt.value = figu.id;
          opt.innerText = `${figu.bandera || "🃏"} ${figu.nombre.toUpperCase()} (x${figu.obtenido}) [${figu.rareza.toUpperCase()}]`;
          select.appendChild(opt);
     });
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

async function prepararOpcionesApuesta() {
     if (!usuarioActual) return alert("❌ Iniciá sesión para timbear.");
     const tipoApuesta = document.getElementById("select-tipo-apuesta").value;
     let montoApuesta = 0; let jugadorIdApostado = null;

     if (tipoApuesta === "monedas") {
          montoApuesta = parseInt(document.getElementById("input-monto-apuesta").value);
          if (isNaN(montoApuesta) || montoApuesta <= 0) return alert("❌ Ingresá un monto de oro válido.");
          if (usuarioActual.monedas < montoApuesta) return alert("🪙 No tenés suficiente Oro.");
     } else {
          jugadorIdApostado = document.getElementById("select-cromo-repetido").value;
          if (!jugadorIdApostado) return alert("❌ Debés seleccionar un cromo repetido válido.");
     }

     mostrarCarga("Estudiando probabilidades...");
     try {
          const res = await fetch(`${URL_BASE}/timba/preparar`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                    usuario_id: usuarioActual.id, tipoApuesta, montoApuesta,
                    jugadorIdApostado: jugadorIdApostado ? parseInt(jugadorIdApostado) : null
               })
          });
          const data = await res.json();
          ocultarCarga();

          if (data.error_limite) {
               alert(data.mensaje); actualizarTimbasRestantesUI(); return;
          }
          if (!data.ok) return alert(data.mensaje);

          const contenedor = document.getElementById("contenedor-opciones-goles");
          if (!contenedor) return;
          contenedor.innerHTML = ""; contenedor.style.display = "grid";

          data.opciones.forEach(opc => {
               const btn = document.createElement("button");
               btn.type = "button"; btn.className = "btn-estadio btn-opcion-resultado"; btn.style.margin = "5px";
               btn.innerText = opc.label;
               btn.onclick = () => procesarEleccionTimbaSegura(opc.idOpcion);
               contenedor.appendChild(btn);
          });
          timbaPreparada = true;
          actualizarTimbasRestantesUI();
     } catch (err) { console.error(err); ocultarCarga(); }
}

async function procesarEleccionTimbaSegura(idOpcionElegida) {
    if (!timbaPreparada) return;
    const bandLoc = document.getElementById("timba-bandera-local").innerText;
    const nomLoc = document.getElementById("timba-local").innerText;
    const bandVis = document.getElementById("timba-bandera-visitante").innerText;
    const nomVis = document.getElementById("timba-visitante").innerText;

    mostrarCarga("Procesando tu jugada...");
    try {
        const res = await fetch(`${URL_BASE}/timba/procesar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_id: usuarioActual.id, idOpcionElegida })
        });
        const data = await res.json();
        ocultarCarga();

        if (!data.ok) return alert(data.mensaje);
        usuarioActual.monedas = data.datos.monedas;
        usuarioActual.puntos_ranking = data.datos.puntos_ranking;
        actualizarInterfazUI();

        alert(`⚽ RESULTADO DE LA TIMBA ⚽\n\n${data.mensajeResultado}`);
        document.getElementById("contenedor-opciones-goles").style.display = "none";
        await cargarAlbumLocal();
        
        if (document.getElementById("select-tipo-apuesta").value === "cromo") cargarRepetidasEnDesplegableUI();

        actualizarHistorialUI({
            local: `${bandLoc} ${nomLoc}`, visitor: `${bandVis} ${nomVis}`, res: `${data.golesLReal} - ${data.golesVReal}`
        });
        timbaPreparada = false; rotarPartidoTimba();
    } catch (err) { console.error(err); ocultarCarga(); }
}

setTimeout(rotarPartidoTimba, 1000);

/* ========================================================================
   🏆 8. ENGINE INTERACTIVO DEL MINIMUNDIAL (COOLDOWN + DRAFT + GRUPOS EN VIVO)
   ======================================================================== */

let mundialTernaPaises = [];
let mundialRivalClasif = "";
let jugadoresSeleccionadosDraft = [];
let intervaloCronometroMundial = null;

async function actualizarEstadoMundialUI() {
     if (!usuarioActual) return;
     try {
          const res = await fetch(`${URL_BASE}/mundial/estado/${usuarioActual.id}`);
          const data = await res.json();
          
          const lblCopas = document.getElementById("lbl-copas-mundiales");
          if (lblCopas) lblCopas.innerText = data.copas || 0;

          arrancarCronometroMundialVisual(data.siguienteIn);
     } catch (err) { console.error("Error al pedir estado del Mundial:", err); }
}

function arrancarCronometroMundialVisual(ms) {
     clearInterval(intervaloCronometroMundial);
     const lblReloj = document.getElementById("cronometro-mundial");
     const btnIniciar = document.getElementById("btn-preparar-mundial");
     const contenedorOpcionesPaises = document.getElementById("zona-eleccion-pais-mundial");
     if (!lblReloj) return;

     if (ms <= 0) {
          lblReloj.innerText = "🔋 ¡Inscripción abierta para el MiniMundial!";
          lblReloj.style.color = "var(--verde-match)";
          if (btnIniciar) btnIniciar.style.display = "inline-block";
          return;
     }

     if (btnIniciar) btnIniciar.style.display = "none";
     if (contenedorOpcionesPaises) contenedorOpcionesPaises.innerHTML = "";
     
     let tiempoRestante = ms;
     intervaloCronometroMundial = setInterval(() => {
          tiempoRestante -= 1000;
          if (tiempoRestante <= 0) {
               clearInterval(intervaloCronometroMundial);
               lblReloj.innerText = "⚡ ¡Vestuarios listos! Actualizando...";
               if (btnIniciar) btnIniciar.style.display = "inline-block";
               return;
          }
          const totalSegundos = Math.floor(tiempoRestante / 1000);
          const horas = Math.floor(totalSegundos / 3600);
          const minutos = Math.floor((totalSegundos % 3600) / 60);
          const segundos = totalSegundos % 60;
          lblReloj.innerText = `⏱️ Próximo torneo en: ${horas}h ${minutos.toString().padStart(2,'0')}m ${segundos.toString().padStart(2,'0')}s`;
          lblReloj.style.color = "var(--rojo)";
     }, 1000);
}

async function prepararInscripcionMundial() {
     if (!usuarioActual) return;
     mostrarCarga("Inscribiendo equipo y debitando arancel de la FIFA...");

     try {
          const res = await fetch(`${URL_BASE}/mundial/preparar`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ usuario_id: usuarioActual.id })
          });
          const data = await res.json();
          ocultarCarga();

          if (!data.ok) return alert(data.mensaje);

          usuarioActual.monedas = data.monedasActualizadas !== undefined ? data.monedasActualizadas : usuarioActual.monedas - 500;
          actualizarInterfazUI();

          const barraNavegacion = document.querySelector(".nav-modulos-estadio");
          if (barraNavegacion) barraNavegacion.style.display = "none"; 
          const btnSalir = document.querySelector(".btn-logout-kick");
          if (btnSalir) btnSalir.style.display = "none";

          mundialTernaPaises = data.terna;
          mundialRivalClasif = data.rivalClasificacion;
          jugadoresSeleccionadosDraft = [];

          const contenedorTerna = document.getElementById("zona-eleccion-pais-mundial");
          contenedorTerna.innerHTML = "";
          
          document.getElementById("fase-inscripcion-mundial").style.display = "block";
          document.getElementById("fase-draft-mundial").style.display = "none";
          document.getElementById("fase-fixture-mundial").style.display = "none";

          data.terna.forEach(pais => {
               const btn = document.createElement("button");
               btn.className = "btn-estadio btn-modulo-match"; btn.style.margin = "8px";
               btn.innerText = `⚽ ${pais.toUpperCase()}`;
               btn.onclick = () => iniciarDraftJugadoresMundial(pais);
               contenedorTerna.appendChild(btn);
          });
     } catch (err) { console.error(err); ocultarCarga(); }
}

function iniciarDraftJugadoresMundial(paisElegido) {
     window.mundialSeleccionUsuario = paisElegido;
     document.getElementById("fase-inscripcion-mundial").style.display = "none";
     document.getElementById("fase-draft-mundial").style.display = "block";
     document.getElementById("lbl-tu-seleccion-mundial").innerText = paisElegido.toUpperCase();
     document.getElementById("lbl-rival-clasificacion-mundial").innerText = mundialRivalClasif.toUpperCase();

     actualizarEstrellasVisualesDraft();
     renderizarGridCartasDisponiblesDraft(paisElegido);
}

function renderizarGridCartasDisponiblesDraft(paisElegido) {
     const grid = document.getElementById("grid-cartas-draft-mundial");
     if (!grid) return; grid.innerHTML = "";

     const cartasFiltradas = albumCompleto.filter(f => f.obtenido > 0 && f.pais.toLowerCase() === paisElegido.toLowerCase());
     cartasFiltradas.forEach(carta => {
          const card = document.createElement("div");
          const estaElegida = jugadoresSeleccionadosDraft.includes(carta.id);
          card.className = `carta-clash ${carta.rareza.toLowerCase()} ${estaElegida ? 'activo-draft' : ''}`;
          card.innerHTML = `<img src="${carta.foto}" class="carta-foto" alt="${carta.nombre}"><div class="rareza-vertical">${carta.rareza.toUpperCase()}</div>`;

          card.onclick = () => {
               if (jugadoresSeleccionadosDraft.includes(carta.id)) {
                    jugadoresSeleccionadosDraft = jugadoresSeleccionadosDraft.filter(id => id !== carta.id);
               } else {
                    if (jugadoresSeleccionadosDraft.length >= 3) return alert("❌ Alineación completa (Máximo 3).");
                    jugadoresSeleccionadosDraft.push(carta.id);
               }
               renderizarGridCartasDisponiblesDraft(paisElegido);
               actualizarEstrellasVisualesDraft();
          };
          grid.appendChild(card);
     });
}

function actualizarEstrellasVisualesDraft() {
     const lblEstrellas = document.getElementById("lbl-estrellas-equipo-mundial");
     if (!lblEstrellas) return;
     if (jugadoresSeleccionadosDraft.length !== 3) {
          lblEstrellas.innerText = "⚠️ Alineá 3 jugadores para calcular poder"; return;
     }

     const cartasElegidas = albumCompleto.filter(f => jugadoresSeleccionadosDraft.includes(f.id));
     const promedio = cartasElegidas.reduce((acc, c) => acc + MAPA_PUNTOS_RAREZA[c.rareza.toLowerCase()], 0) / 3;

     let numEstrellas = 1;
     if (promedio >= 90) numEstrellas = 5;
     else if (promedio >= 79) numEstrellas = 4;
     else if (promedio >= 70) numEstrellas = 3;
     else if (promedio >= 62) numEstrellas = 2;

     lblEstrellas.innerText = "⭐".repeat(numEstrellas) + ` (${numEstrellas}/5 Estrellas)`;
}

async function ejecutarTorneoMundial() {
    const faseDraftOnline = document.getElementById("multi-fase-draft");
    if (faseDraftOnline && faseDraftOnline.style.display === "block") {
        if (jugadoresSeleccionadosDraft.length !== 3) return alert("❌ Completá la alineación de 3 jugadores.");
        confirmarInscripcionMultiServidor(window.mundialSeleccionUsuario, jugadoresSeleccionadosDraft);
        return;
    }
    if (jugadoresSeleccionadosDraft.length !== 3) return alert("❌ Completá la alineación de 3 jugadores.");

     mostrarCarga("Pidiendo autorización de planilla a la FIFA...");
     try {
          const res = await fetch(`${URL_BASE}/mundial/jugar`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                    usuario_id: usuarioActual.id, seleccionElegida: window.mundialSeleccionUsuario,
                    rivalClasificacion: mundialRivalClasif, jugadorIds: jugadoresSeleccionadosDraft
               })
          });
          const data = await res.json(); ocultarCarga();

          if (!data.ok) return alert(data.mensaje);
          document.getElementById("fase-draft-mundial").style.display = "none";
          document.getElementById("fase-fixture-mundial").style.display = "block";

          const contenedorLista = document.getElementById("lista-cruces-mundial-simulacion");
          contenedorLista.innerHTML = "";

          if (!data.progreso.ganoClasificacion) {
               contenedorLista.innerHTML = `<div class="item-historial-partido" style="color:var(--rojo); border-color:var(--rojo); text-align:center;"><span>❌ Quedaste afuera por falta de puntos en eliminatorias.</span></div>`;
               usuarioActual.monedas = data.datosActualizados?.monedas || usuarioActual.monedas;
               actualizarInterfazUI(); actualizarEstadoMundialUI(); liberarNavegacionArenaUI(); return;
          }

          const wrapperTabla = document.createElement("div");
          wrapperTabla.style.cssText = "background:rgba(0,0,0,0.4); padding:15px; border-radius:12px; margin-bottom:20px; border:1px solid #1a2436;";
          wrapperTabla.innerHTML = `<h4 style="color:var(--dorado); margin:0 0 10px 0; font-family:'Oswald'; text-align:center;">📊 TABLA EN VIVO</h4><table style="width:100%; border-collapse:collapse; text-align:center; font-weight:bold;"><thead><tr style="color:#64748b; font-size:0.85rem;"><th>POS</th><th style="text-align:left;">SELECCIÓN</th><th>GF</th><th>GC</th><th>PTS</th></tr></thead><tbody id="tbody-tabla-grupo-live"></tbody></table>`;
          contenedorLista.appendChild(wrapperTabla);

          const renderizarTablaGrupoLive = (tablaEstado) => {
               const tbody = document.getElementById("tbody-tabla-grupo-live"); if (!tbody) return;
               let listaOrdenada = Object.values(tablaEstado).sort((a,b) => b.pts !== a.pts ? b.pts - a.pts : (b.gf - b.gc) - (a.gf - a.gc));
               tbody.innerHTML = "";
               listaOrdenada.forEach((fila, idx) => {
                    const esTuPais = fila.pais === window.mundialSeleccionUsuario;
                    const tr = document.createElement("tr"); tr.style.color = esTuPais ? "var(--verde-match)" : "#fff";
                    tr.innerHTML = `<td style="padding:6px 0; color:${idx < 2 ? 'var(--verde-match)':'var(--rojo)'};">${idx + 1}</td><td style="text-align:left;">⚽ ${fila.pais.toUpperCase()}</td><td>${fila.gf}</td><td>${fila.gc}</td><td style="color:var(--dorado);">${fila.pts}</td>`;
                    tbody.appendChild(tr);
               });
          };

          let estadoTablaMundial = {};
          data.progreso.integrantesGrupo.forEach(p => { estadoTablaMundial[p] = { pais: p, pts: 0, gf: 0, gc: 0 }; });
          renderizarTablaGrupoLive(estadoTablaMundial);

          for (let f = 0; f < data.progreso.bitacoraGrupo.length; f++) {
               const fechaData = data.progreso.bitacoraGrupo[f];
               const divFecha = document.createElement("div");
               divFecha.style.cssText = "background:#0b111e; padding:12px; border-radius:8px; border-left:4px solid var(--celeste); margin-bottom:15px;";
               divFecha.innerHTML = `<div style="color:var(--celeste); font-size:0.9rem; font-weight:bold;">📅 FECHA ${fechaData.fecha}</div><div style="display:flex; justify-content:space-between;"><span>🇦🇷 ${fechaData.local} vs ${fechaData.visitante}</span><span id="goles-m1-f${f}" style="color:var(--verde-match);">0 - 0</span></div><div style="display:flex; justify-content:space-between;"><span>🤖 ${fechaData.botL} vs ${fechaData.botV}</span><span id="goles-m2-f${f}" style="color:#aaa;">0 - 0</span></div><div id="reloj-f${f}" style="text-align:center; font-size:0.8rem; color:#64748b;">⏱️ 00:00</div>`;
               contenedorLista.appendChild(divFecha); divFecha.scrollIntoView({ behavior: 'smooth' });

               await new Promise((resolveFecha) => {
                    let segV = 0; let g1_L = 0; let g1_V = 0; let g2_L = 0; let g2_V = 0;
                    const tGroup = setInterval(() => {
                         segV += 9; if (segV > 90) segV = 90;
                         if (g1_L < fechaData.gL && Math.random() < 0.2) g1_L++;
                         if (g1_V < fechaData.gV && Math.random() < 0.2) g1_V++;
                         if (g2_L < fechaData.gBL && Math.random() < 0.2) g2_L++;
                         if (g2_V < fechaData.gBV && Math.random() < 0.2) g2_V++;

                         if (segV === 90) { g1_L = fechaData.gL; g1_V = fechaData.gV; g2_L = fechaData.gBL; g2_V = fechaData.gBV; }
                         document.getElementById(`goles-m1-f${f}`).innerText = `${g1_L} - ${g1_V}`;
                         document.getElementById(`goles-m2-f${f}`).innerText = `${g2_L} - ${g2_V}`;
                         document.getElementById(`reloj-f${f}`).innerText = `⏱️ MINUTO ${segV}:00`;

                         if (segV >= 90) {
                              clearInterval(tGroup);
                              const acumLive = (loc, vis, gl, gv) => {
                                  estadoTablaMundial[loc].gf += gl; estadoTablaMundial[loc].gc += gv;
                                  estadoTablaMundial[vis].gf += gv; estadoTablaMundial[vis].gc += gl;
                                  if (gl > gv) estadoTablaMundial[loc].pts += 3;
                                  else if (gl < gv) estadoTablaMundial[vis].pts += 3;
                                  else { estadoTablaMundial[loc].pts += 1; estadoTablaMundial[vis].pts += 1; }
                              };
                              acumLive(fechaData.local, fechaData.visitante, fechaData.gL, fechaData.gV);
                              acumLive(fechaData.botL, fechaData.botV, fechaData.gBL, fechaData.gBV);
                              renderizarTablaGrupoLive(estadoTablaMundial); resolveFecha();
                         }
                    }, 1000);
               });
          }

          if (!data.progreso.clasifico) {
               const cartelEliminado = document.createElement("div");
               cartelEliminado.style.cssText = "text-align:center; padding:15px; border:2px solid var(--rojo); color:var(--rojo); font-weight:bold; border-radius:8px;";
               cartelEliminado.innerText = `❌ Quedaste fuera en Grupos (Puesto #${data.progreso.posicionFinalGrupo}).`;
               contenedorLista.appendChild(cartelEliminado);
               usuarioActual.monedas = data.datosActualizados?.monedas || usuarioActual.monedas;
               actualizarInterfazUI(); actualizarEstadoMundialUI(); liberarNavegacionArenaUI(); return;
          }

          for (let i = 0; i < data.progreso.bitacoraPlayoffs.length; i++) {
               const partido = data.progreso.bitacoraPlayoffs[i];
               const ganoEsteCruce = partido.resultado.includes("Ganaste");
               await simularMarcadorPantalla(contenedorLista, partido.ronda, window.mundialSeleccionUsuario, partido.rival, ganoEsteCruce);
               if (!ganoEsteCruce) break;
          }

          if (data.progreso.campeon) {
               const corona = document.createElement("div");
               corona.style.cssText = "text-align:center; margin-top:20px; color:var(--dorado); font-size:1.4rem; font-weight:bold;";
               corona.innerText = "🏆 ¡CAMPEÓN DEL MUNDO! 🏆\n🎁 ¡Premio de 5.000 de Oro depositado!";
               contenedorLista.appendChild(corona); corona.scrollIntoView({ behavior: 'smooth' });
          }

          if (data.datosActualizados) {
               usuarioActual.monedas = data.datosActualizados.monedas;
               usuarioActual.puntos_ranking = data.datosActualizados.puntos_ranking;
               usuarioActual.copas_mundiales = data.datosActualizados.copas_mundiales;
               actualizarInterfazUI(); cargarRankingMundialesLocal();
          }
          actualizarEstadoMundialUI(); liberarNavegacionArenaUI();
     } catch (err) { console.error(err); ocultarCarga(); liberarNavegacionArenaUI(); }
}

function simularMarcadorPantalla(contenedor, ronda, tuPais, rival, ganoUsuario) {
    return new Promise(async (resolve) => {
         const filaPartido = document.createElement("div");
         filaPartido.className = "item-historial-partido"; 
         filaPartido.style.cssText = "flex-direction: column; background: #0b111e; padding: 15px; margin-bottom: 20px; border-left: 4px solid var(--celeste); transition: all 0.3s ease;";
         
         const idUnico = ronda.replace(/ /g,'') + Math.floor(Math.random() * 1000);
         
         filaPartido.innerHTML = `
              <div style="display:flex; justify-content:space-between; color:var(--dorado); border-bottom:1px solid #1a2436; padding-bottom:5px;">
                   <span style="text-transform: uppercase; font-family:'Oswald';">📋 ${ronda}</span>
                   <span id="reloj-vivo-${idUnico}" style="font-weight:bold; color:var(--celeste);">⏱️ MINUTO 00:00</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px;">
                   <span style="width:40%; text-align:left; font-weight:bold; font-size:1.1rem;">🇦🇷 ${tuPais} <span id="boost-badge-${idUnico}" style="display:none; color:var(--verde-match); font-size:0.75rem;">⚡ BOOSTED</span></span>
                   <span id="score-vivo-${idUnico}" style="font-family:'Oswald'; font-size:1.8rem; background:#000; padding:4px 16px; border-radius:6px; color:var(--verde-match); min-width:70px; text-align:center; box-shadow: inset 0 0 10px rgba(0,255,136,0.2);">0 - 0</span>
                   <span style="width:40%; text-align:right; font-weight:bold; font-size:1.1rem;">${rival} 🤖</span>
              </div>
              <!-- Consola de Incidencias en Vivo -->
              <div id="consola-incidencias-${idUnico}" style="margin-top:12px; padding:8px; background:rgba(0,0,0,0.3); border-radius:6px; font-size:0.85rem; color:#94a3b8; min-height:35px; text-align:center; font-style:italic; border: 1px dashed #1e293b;">
                   ⚽ El árbitro da la orden... ¡Comienza el partido!
              </div>
              <!-- Zona Interactiva de Entretiempo -->
              <div id="zona-entretiempo-${idUnico}" style="display:none; margin-top:10px; text-align:center; padding:10px; background:rgba(234,179,8,0.1); border: 1px solid var(--dorado); border-radius:6px;">
                   <p style="margin:0 0 8px 0; font-size:0.85rem; color:var(--dorado); font-weight:bold;">👔 ¡ENTRETIEMPO! Tenés 5 segundos para dar la Charla Técnica</p>
                   <button type="button" id="btn-charla-${idUnico}" class="btn-estadio" style="background:var(--dorado); color:#000; font-size:0.8rem; padding:4px 12px;">📣 Arengar Equipo (+15% Ataque)</button>
              </div>
         `;
         contenedor.appendChild(filaPartido); 
         filaPartido.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

         // Generación de goles esperados
         let golesTu = Math.floor(Math.random() * 3); 
         let golesRival = Math.floor(Math.random() * 3);
         if (ganoUsuario && golesTu <= golesRival) golesTu = golesRival + Math.floor(Math.random() * 2) + 1;
         else if (!ganoUsuario && golesRival <= golesTu) golesRival = golesTu + Math.floor(Math.random() * 2) + 1;

         // Simulación local de incidencias si el backend no las manda
         let incidenciasSimuladas = {
              15: `⚠️ Presiona ${rival}, bombazo que pasa cerca del ángulo izquierdo.`,
              45: "⏳ ENTRETIEMPO: Los jugadores se retiran al descanso a recomponer ideas.",
              72: `🟥 ¡Falta durísima! Tarjeta amarilla para el capitán de ${rival}.`,
              85: `🔥 ¡Zafarrancho en el área! La hinchada empuja con el alma.`
         };

         let golesTuActuales = 0; 
         let golesRivalActuales = 0; 
         let segundoVirtual = 0;
         let tieneBoost = false;

         // BOTÓN CHARLA TÉCNICA
         document.getElementById(`btn-charla-${idUnico}`).onclick = () => {
              tieneBoost = true;
              document.getElementById(`boost-badge-${idUnico}`).style.display = "inline-block";
              document.getElementById(`btn-charla-${idUnico}`).disabled = true;
              document.getElementById(`btn-charla-${idUnico}`).innerText = "✅ ¡EQUIPO MOTIVADO!";
              // Si el usuario tiene boost, aumentamos la chance de que meta un gol extra si iba perdiendo
              if (!ganoUsuario && Math.random() < 0.4) {
                   golesTu++; // Ventaja táctica de cambiar el destino
              }
         };

         // Reloj más lento y emocionante: Avanza de a 3 minutos cada 400ms (Unos 12 segundos reales por partido)
         const timer = setInterval(async () => {
             if (segundoVirtual === 45 && !document.getElementById(`zona-entretiempo-${idUnico}`).classList.contains("pausado")) {
                 // Pausa de Entretiempo Interactiva
                 document.getElementById(`zona-entretiempo-${idUnico}`).classList.add("pausado");
                 document.getElementById(`zona-entretiempo-${idUnico}`).style.display = "block";
                 document.getElementById(`consola-incidencias-${idUnico}`).innerText = "📣 Charla técnica en curso en los vestuarios...";
                 
                 clearInterval(timer); // Frenamos el reloj del partido
                 
                 setTimeout(() => {
                     // Reanudamos a los 5 segundos
                     document.getElementById(`zona-entretiempo-${idUnico}`).style.display = "none";
                     segundoVirtual += 3;
                     rearrancarReloj();
                 }, 5000);
                 return;
             }

             segundoVirtual += 3; 
             if (segundoVirtual > 90) segundoVirtual = 90;

             // Distribución orgánica de goles a lo largo del tiempo
             if (segundoVirtual >= 20 && segundoVirtual < 45 || segundoVirtual >= 55) {
                 if (golesTuActuales < golesTu && Math.random() < (tieneBoost ? 0.18 : 0.10)) {
                      golesTuActuales++;
                      inyectarAlertaIncidencia(idUnico, `⚽ ¡GOOOL DE ${tuPais.toUpperCase()}! 🔥`);
                 }
                 if (golesRivalActuales < golesRival && Math.random() < 0.09) {
                      golesRivalActuales++;
                      inyectarAlertaIncidencia(idUnico, `💥 Gol de ${rival.toUpperCase()}. Se grita fuerte en el banco rival.`);
                 }
             }

             if (segundoVirtual === 90) { 
                 golesTuActuales = golesTu; 
                 golesRivalActuales = golesRival; 
             }

             // Actualizar UI
             document.getElementById(`reloj-vivo-${idUnico}`).innerText = `⏱️ MINUTO ${segundoVirtual.toString().padStart(2,'0')}:00`;
             document.getElementById(`score-vivo-${idUnico}`).innerText = `${golesTuActuales} - ${golesRivalActuales}`;

             // Mostrar incidencias narrativas por minuto
             if (incidenciasSimuladas[segundoVirtual]) {
                  document.getElementById(`consola-incidencias-${idUnico}`).innerText = incidenciasSimuladas[segundoVirtual];
             }

             if (segundoVirtual >= 90) {
                 clearInterval(timer); 
                 filaPartido.style.borderColor = ganoUsuario ? "var(--verde-match)" : "var(--rojo)";
                 
                 const finLabel = document.createElement("div");
                 finLabel.style.cssText = `text-align:right; font-size:0.85rem; font-weight:bold; margin-top:5px; color:${ganoUsuario ? 'var(--verde-match)' : 'var(--rojo)'};`;
                 finLabel.innerText = ganoUsuario ? "🏁 FINALIZADO - AVANZAS ✅" : "🏁 FINALIZADO - ELIMINADO ❌";
                 filaPartido.appendChild(finLabel);
                 
                 document.getElementById(`consola-incidencias-${idUnico}`).innerText = ganoUsuario ? "🎉 ¡Silbatazo final! Triunfo histórico para meterse en el bolsillo a la hinchada." : "😢 Final del partido. Rendimiento amargo, toca pensar en el próximo torneo.";
                 resolve();
             }
         }, 400);

         function rearrancarReloj() {
              // Función auxiliar para reanudar el bucle después del entretiempo
              // (Misma lógica exacta de arriba para continuar del 48 al 90)
              const resumeTimer = setInterval(() => {
                   segundoVirtual += 3;
                   if (segundoVirtual > 90) segundoVirtual = 90;

                   if (golesTuActuales < golesTu && Math.random() < (tieneBoost ? 0.22 : 0.12)) {
                        golesTuActuales++;
                        inyectarAlertaIncidencia(idUnico, `⚽ ¡GOOOL DE ${tuPais.toUpperCase()}! 🚀`);
                   }
                   if (golesRivalActuales < golesRival && Math.random() < 0.09) {
                        golesRivalActuales++;
                        inyectarAlertaIncidencia(idUnico, `💥 Gol de ${rival.toUpperCase()}. Silencio sepulcral.`);
                   }

                   if (segundoVirtual === 90) { golesTuActuales = golesTu; golesRivalActuales = golesRival; }
                   
                   document.getElementById(`reloj-vivo-${idUnico}`).innerText = `⏱️ MINUTO ${segundoVirtual.toString().padStart(2,'0')}:00`;
                   document.getElementById(`score-vivo-${idUnico}`).innerText = `${golesTuActuales} - ${golesRivalActuales}`;

                   if (incidenciasSimuladas[segundoVirtual]) {
                        document.getElementById(`consola-incidencias-${idUnico}`).innerText = incidenciasSimuladas[segundoVirtual];
                   }

                   if (segundoVirtual >= 90) {
                        clearInterval(resumeTimer);
                        filaPartido.style.borderColor = ganoUsuario ? "var(--verde-match)" : "var(--rojo)";
                        const finLabel = document.createElement("div");
                        finLabel.style.cssText = `text-align:right; font-size:0.85rem; font-weight:bold; margin-top:5px; color:${ganoUsuario ? 'var(--verde-match)' : 'var(--rojo)'};`;
                        finLabel.innerText = ganoUsuario ? "🏁 FINALIZADO - AVANZAS ✅" : "🏁 FINALIZADO - ELIMINADO ❌";
                        filaPartido.appendChild(finLabel);
                        document.getElementById(`consola-incidencias-${idUnico}`).innerText = ganoUsuario ? "🎉 ¡Victoria épica! Los jugadores festejan de cara a la tribuna." : "❌ Derrota dolorosa. El vestuario quedó golpeado.";
                        resolve();
                   }
              }, 400);
         }
    });
}

function inyectarAlertaIncidencia(idUnico, texto) {
     const caja = document.getElementById(`consola-incidencias-${idUnico}`);
     if (!caja) return;
     caja.innerText = texto;
     caja.style.color = "var(--dorado)";
     caja.style.fontWeight = "bold";
     setTimeout(() => { if (caja) { caja.style.color = "#94a3b8"; caja.style.fontWeight = "normal"; } }, 1500);
}

function liberarNavegacionArenaUI() {
     const barraNavegacion = document.querySelector(".nav-modulos-estadio");
     if (barraNavegacion) barraNavegacion.style.removeProperty("display");
     const btnSalir = document.querySelector(".btn-logout-kick");
     if (btnSalir) btnSalir.style.removeProperty("display");
}

/* ========================================================================
   🌎 9. ENGINE MULTIJUGADOR ONLINE (LLAMADOS DE RED & POLLING DINÁMICO)
   ======================================================================== */

async function abrirDraftMulti(esCreador) {
    multiEsCreador = esCreador;
    
    if (!esCreador) {
        const cod = document.getElementById("multi-input-codigo").value.trim().toUpperCase();
        if (cod.length !== 6) return alert("❌ Código inválido. Debe tener 6 caracteres.");
        multiCodigoSala = cod;

        mostrarCarga("Validando credenciales de la sala...");
        try {
            const res = await fetch(`${URL_BASE}/multijugador/sala/${cod}`);
            const data = await res.json();
            ocultarCarga();

            if (!data.ok) return alert(data.mensaje);
            window.multiTipoApuestaActual = data.tipo_apuesta ? data.tipo_apuesta.toLowerCase() : 'amistoso';
            multiSalaId = data.sala_id;
        } catch (e) { ocultarCarga(); return alert("Error de conexión con la sala."); }
    } else {
        const inputApuesta = document.getElementById("multi-input-apuesta");
        multiApuestaFijada = inputApuesta ? (parseInt(inputApuesta.value) || 0) : 0;
        const selectTipo = document.getElementById("multi-select-tipo-apuesta");
        window.multiTipoApuestaActual = selectTipo ? selectTipo.value.toLowerCase() : 'amistoso';
    }

    document.getElementById("multi-menu-inicial").style.display = "none";
    document.getElementById("multi-fase-inscripcion").style.display = "block";
    prepararInscripcionMundialMulti();
}

async function prepararInscripcionMundialMulti() {
     if (!usuarioActual) return;
     mostrarCarga("Conectando con la central de la Arena Online...");

     try {
          const res = await fetch(`${URL_BASE}/multijugador/preparar-draft`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ usuario_id: usuarioActual.id })
          });
          const data = await res.json(); ocultarCarga();

          if (!data.ok) {
               document.getElementById("multi-menu-inicial").style.display = "block";
               document.getElementById("multi-fase-inscripcion").style.display = "none";
               return alert(data.mensaje);
          }

          const barraNavegacion = document.querySelector(".nav-modulos-estadio");
          if (barraNavegacion) barraNavegacion.style.display = "none"; 
          const btnSalir = document.querySelector(".btn-logout-kick");
          if (btnSalir) btnSalir.style.display = "none";

          mundialTernaPaises = data.terna; jugadoresSeleccionadosDraft = [];
          const contenedorTerna = document.getElementById("multi-zona-eleccion-pais");
          if (!contenedorTerna) return; contenedorTerna.innerHTML = "";
          
          data.terna.forEach(pais => {
               const btn = document.createElement("button");
               btn.className = "btn-estadio btn-modulo-match"; btn.style.margin = "8px";
               btn.innerText = `⚽ ${pais.toUpperCase()}`;
               btn.onclick = () => iniciarDraftJugadoresMundialMulti(pais);
               contenedorTerna.appendChild(btn);
          });
     } catch (err) { console.error(err); ocultarCarga(); }
}

function iniciarDraftJugadoresMundialMulti(paisElegido) {
     window.mundialSeleccionUsuario = paisElegido;
     document.getElementById("multi-fase-inscripcion").style.display = "none";
     document.getElementById("multi-fase-draft").style.display = "block";
     document.getElementById("multi-lbl-tu-seleccion").innerText = paisElegido.toUpperCase();

     const wrapperApuestaInvitado = document.getElementById("multi-wrapper-apuesta-invitado");

     if (window.multiTipoApuestaActual === 'carta' && !multiEsCreador) {
          if (wrapperApuestaInvitado) wrapperApuestaInvitado.style.display = "block";
          const selectCromo = document.getElementById("multi-select-carta-apuesta-invitado");
          if (selectCromo) {
              selectCromo.innerHTML = "";
              const repetidas = albumCompleto.filter(f => f.obtenido > 1);
              if (repetidas.length === 0) {
                  const opt = document.createElement("option");
                  opt.value = ""; opt.innerText = "❌ No tenés cartas repetidas para arriesgar";
                  selectCromo.appendChild(opt);
              } else {
                  repetidas.forEach(figu => {
                      const opt = document.createElement("option"); opt.value = figu.id;
                      opt.innerText = `🃏 ${figu.nombre.toUpperCase()} (Tenes ${figu.obtenido})`;
                      selectCromo.appendChild(opt);
                  });
              }
          }
     } else {
          if (wrapperApuestaInvitado) wrapperApuestaInvitado.style.display = "none";
     }
     
     actualizarEstrellasVisualesDraftMulti();
     renderizarGridCartasDisponiblesDraftMulti(paisElegido);
}

function renderizarGridCartasDisponiblesDraftMulti(paisElegido) {
     const grid = document.getElementById("multi-grid-cartas-draft");
     if (!grid) return; grid.innerHTML = "";

     const cartasFiltradas = albumCompleto.filter(f => f.obtenido > 0 && f.pais.toLowerCase() === paisElegido.toLowerCase());
     if (cartasFiltradas.length === 0) {
          grid.innerHTML = `<div style="color:var(--rojo); padding:15px; text-align:center; font-weight:bold;">❌ No tenés jugadores de este país.</div>`; return;
     }

     cartasFiltradas.forEach(carta => {
          const card = document.createElement("div");
          const estaElegida = jugadoresSeleccionadosDraft.includes(carta.id);
          card.className = `carta-clash ${carta.rareza.toLowerCase()} ${estaElegida ? 'activo-draft' : ''}`;
          card.innerHTML = `<img src="${carta.foto}" class="carta-foto" alt="${carta.nombre}"><div class="rareza-vertical">${carta.rareza.toUpperCase()}</div>`;

          card.onclick = () => {
               if (jugadoresSeleccionadosDraft.includes(carta.id)) {
                    jugadoresSeleccionadosDraft = jugadoresSeleccionadosDraft.filter(id => id !== carta.id);
               } else {
                    if (jugadoresSeleccionadosDraft.length >= 3) return alert("❌ Máximo 3 jugadores.");
                    jugadoresSeleccionadosDraft.push(carta.id);
               }
               renderizarGridCartasDisponiblesDraftMulti(paisElegido);
               actualizarEstrellasVisualesDraftMulti();
          };
          grid.appendChild(card);
     });
}

function actualizarEstrellasVisualesDraftMulti() {
     const lblEstrellas = document.getElementById("multi-lbl-estrellas-equipo"); if (!lblEstrellas) return;
     if (jugadoresSeleccionadosDraft.length !== 3) {
          lblEstrellas.innerText = "⚠️ Alineá 3 jugadores para calcular poder"; return;
     }
     const cartasElegidas = albumCompleto.filter(f => jugadoresSeleccionadosDraft.includes(f.id));
     const promedio = cartasElegidas.reduce((acc, c) => acc + MAPA_PUNTOS_RAREZA[c.rareza.toLowerCase()], 0) / 3;

     let numEstrellas = 1;
     if (promedio >= 90) numEstrellas = 5;
     else if (promedio >= 79) numEstrellas = 4;
     else if (promedio >= 70) numEstrellas = 3;
     else if (promedio >= 62) numEstrellas = 2;
     lblEstrellas.innerText = "⭐".repeat(numEstrellas) + ` (${numEstrellas}/5 Estrellas)`;
}

async function confirmarInscripcionMultiServidor(paisElegido, arrayIdsJugadores) {
    if (arrayIdsJugadores.length !== 3) return alert("❌ Debés alinear exactamente 3 jugadores.");
     let cartaIdSeleccionada = null;

     if (window.multiTipoApuestaActual === 'carta') {
         const idSelect = multiEsCreador ? "multi-select-carta-apuesta" : "multi-select-carta-apuesta-invitado";
         const selectElement = document.getElementById(idSelect);
         cartaIdSeleccionada = selectElement ? selectElement.value : null;
         if (!cartaIdSeleccionada) return alert("❌ Debés elegir tu cromo a arriesgar.");
         window.multiMiCartaApostadaTexto = selectElement.options[selectElement.selectedIndex].text;
     } else { window.multiMiCartaApostadaTexto = null; }

    mostrarCarga("Enviando planilla de vestuarios a la Arena Online...");
    let url = `${URL_BASE}/multijugador/crear`;
    let cuerpo = {
        usuario_id: usuarioActual.id, seleccion: paisElegido, jugador_ids: arrayIdsJugadores,
        tipo_apuesta: window.multiTipoApuestaActual, apuesta_oro: multiApuestaFijada,
        carta_apuesta_id: cartaIdSeleccionada ? parseInt(cartaIdSeleccionada) : null
    };

    if (!multiEsCreador) {
        url = `${URL_BASE}/multijugador/unirse`;
        cuerpo = {
            usuario_id: usuarioActual.id, seleccion: paisElegido, jugador_ids: arrayIdsJugadores,
            codigo_sala: multiCodigoSala, carta_apuesta_id: cartaIdSeleccionada ? parseInt(cartaIdSeleccionada) : null
        };
    }

    try {
        const res = await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo)
        });
        const data = await res.json();

        if (!data.ok) { ocultarCarga(); return alert(data.mensaje); }
        if (data.monedasActualizadas !== undefined) {
            usuarioActual.monedas = data.monedasActualizadas;
            actualizarInterfazUI();
        }

        multiSalaId = data.sala_id;
        if (data.codigo_sala) multiCodigoSala = data.codigo_sala;

        document.getElementById("multi-fase-draft").style.display = "none";
        document.getElementById("multi-lobby-espera").style.display = "block";
        document.getElementById("lobby-txt-codigo").innerText = multiCodigoSala;
        ocultarCarga();

        multiIntervaloLobby = setInterval(actualizarLobbyEnVivo, 3000);
        actualizarLobbyEnVivo(); 
    } catch (err) { console.error(err); ocultarCarga(); }
}

async function actualizarLobbyEnVivo() {
    if (!multiCodigoSala) return;

    try {
        const res = await fetch(`${URL_BASE}/multijugador/sala/${multiCodigoSala}`);
        const data = await res.json();

        if (!data.ok) { clearInterval(multiIntervaloLobby); return; }
        if (data.tipo_apuesta) window.multiTipoApuestaActual = data.tipo_apuesta.toLowerCase();

        if (data.estado === 'finalizado' || data.estado === 'jugando') {
            clearInterval(multiIntervaloLobby);
            if (!multiEsCreador) { multiSalaId = data.sala_id; consultarResultadoInvitado(); }
            return;
        }

        const contenedorListado = document.getElementById("lobby-lista-participantes");
        let infoSalaBox = document.getElementById("multi-info-sala-dinamica");
        if (!infoSalaBox && contenedorListado) {
            infoSalaBox = document.createElement("div"); infoSalaBox.id = "multi-info-sala-dinamica";
            contenedorListado.parentNode.insertBefore(infoSalaBox, contenedorListado);
        }

        if (infoSalaBox) {
            let detalle = `🪙 MODALIDAD: TIMBA POR ORO`;
            if (window.multiTipoApuestaActual === 'carta') {
                 let miCartaInfo = window.multiMiCartaApostadaTexto || "Seleccionada en Vestuario";
                 detalle = `🃏 DUELO DE CARTAS REPETIDAS\n⚠️ ¡Muerte Súbita! El perdedor descarta.\n\n🔒 TU APUESTA: ${miCartaInfo.toUpperCase()}`;
            } else if (window.multiTipoApuestaActual === 'amistoso') { detalle = `🤝 MODALIDAD: AMISTOSO ONLINE`; }
            
            infoSalaBox.innerHTML = `<div style="background:rgba(11,17,30,0.8); padding:12px; border-radius:8px; border:1px solid var(--dorado); text-align:center; font-weight:bold; color:var(--dorado); margin-bottom:15px; font-family:'Oswald'; white-space:pre-line;">${detalle}</div>`;
        }

        const txtPozo = document.getElementById("lobby-txt-pozo");
        if (txtPozo) {
            if (window.multiTipoApuestaActual === 'carta') txtPozo.innerText = `🎰 Pozo: 1 Cromo Épico/Leg Mínimo`;
            else if (window.multiTipoApuestaActual === 'amistoso') txtPozo.innerText = `⚽ Modo de Práctica`;
            else txtPozo.innerText = `💰 Pozo Actual: ${data.pozo_total} Oro`;
        }
        
        document.getElementById("lobby-cnt-jugadores").innerText = data.participantes.length;
        contenedorListado.innerHTML = "";

        data.participantes.forEach(p => {
            const div = document.createElement("div");
            div.style.cssText = "background:rgba(255,255,255,0.05); padding:10px 15px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; border-left:4px solid var(--verde-match); margin-bottom:6px;";
            const esHost = p.usuario_id === data.creador_id;
            div.innerHTML = `<span style="font-weight:bold; color:#fff;">${esHost ? '👑 ' : ''}${p.username}</span><span style="color:var(--dorado); font-family:'Oswald';">⚽ ${p.seleccion.toUpperCase()}</span>`;
            contenedorListado.appendChild(div);
        });

        document.getElementById("multi-btn-iniciar-fixture").style.display = multiEsCreador ? "block" : "none";
        document.getElementById("multi-txt-espera-host").style.display = multiEsCreador ? "none" : "block";
    } catch (err) { console.error(err); }
}

async function lanzarSimulacionMulti() {
    mostrarCarga("Sorteando las llaves y cerrando las planillas online...");
    clearInterval(multiIntervaloLobby);
    try {
        const res = await fetch(`${URL_BASE}/multijugador/jugar`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sala_id: multiSalaId, usuario_id: usuarioActual.id })
        });
        const data = await res.json(); ocultarCarga();
        if (!data.ok) { alert(data.mensaje); multiIntervaloLobby = setInterval(actualizarLobbyEnVivo, 3000); return; }

        window.renderizarFixturePasoAPaso(data.bitacora, data.premio);
    } catch (err) { console.error(err); ocultarCarga(); }
}

async function consultarResultadoInvitado(intento = 1) {
     if (intento === 1) mostrarCarga("¡El Torneo comenzó! Recibiendo transmisión oficial...");
     try {
          const res = await fetch(`${URL_BASE}/multijugador/resultado-invitado/${multiSalaId}`);
          const data = await res.json();
          
          if (data.ok && (!data.bitacora || data.bitacora.length <= 1)) {
               if (intento <= 3) {
                    setTimeout(() => consultarResultadoInvitado(intento + 1), 800); return;
               }
          }
          ocultarCarga();
          if (!data.ok) { alert(data.mensaje || "Error al sincronizar."); cancelarMundialMultiLobby(); return; }
          
          window.renderizarFixturePasoAPaso(data.bitacora, data.premio);
     } catch(e) { console.error(e); ocultarCarga(); }
}

window.renderizarFixturePasoAPaso = function(bitacora, premio, apuestasTexto) {
    document.getElementById("multi-lobby-espera").style.display = "none";
    document.getElementById("multi-pantalla-fixture").style.display = "block";
    const tablero = document.getElementById("multi-cronologia-goles");
    if (!tablero) return; tablero.innerHTML = ""; 

    if (apuestasTexto && Array.isArray(apuestasTexto) && apuestasTexto.length > 0) {
        const bloqueTextoApuestas = document.createElement("div");
        bloqueTextoApuestas.style.cssText = "background: rgba(255, 0, 0, 0.05); border: 1px solid var(--rojo); padding: 12px; border-radius: 8px; margin-bottom: 20px; font-weight: bold; text-align: center;";
        bloqueTextoApuestas.innerHTML = `⚠️ <span style="color: var(--rojo); font-family: 'Oswald';">CROMOS ARRIESGADOS:</span><br>${apuestasTexto.join('<br>')}`;
        tablero.appendChild(bloqueTextoApuestas);
    }

    if (!bitacora || !Array.isArray(bitacora) || bitacora.length === 0) return;
    let secuenciaPromesas = Promise.resolve();

    bitacora.forEach((partido, index) => {
        const loc = partido.local || "Local"; 
        const vis = partido.visitante || "Rival";
        const rondaNombre = partido.ronda || `PARTIDO #${index + 1}`;
        const golesLocalDefinitivos = partido.golesLocal || 0; 
        const golesVisitanteDefinitivos = partido.golesVisitante || 0;
        
        // Traemos las incidencias que viajan desde tu base de datos / backend
        const incidenciasDelPartido = partido.incidencias || {};

        secuenciaPromesas = secuenciaPromesas.then(() => {
            return new Promise((resolveCruce) => {
                 const bloquePartido = document.createElement("div"); 
                 bloquePartido.className = "item-historial-partido";
                 bloquePartido.style.cssText = "flex-direction: column; align-items: stretch; background: #0b111e; margin-bottom:20px; border-left:4px solid var(--dorado); padding:15px;";
                 
                 bloquePartido.innerHTML = `
                     <div style="display:flex; justify-content:space-between; color:var(--dorado); border-bottom:1px solid #1a2436; padding-bottom:5px;">
                          <span style="font-family:'Oswald'; font-weight:bold; text-transform: uppercase;">📋 ${rondaNombre}</span>
                          <span id="multi-reloj-${index}" style="color:var(--celeste); font-weight:bold;">⏱️ MINUTO 00:00</span>
                     </div>
                     <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px;">
                          <span style="width:40%; text-align:left; font-weight:bold;">⚽ ${loc.toUpperCase()}</span>
                          <span id="multi-score-${index}" style="font-family:'Oswald'; font-size:1.6rem; background:#000; padding:4px 14px; border-radius:6px; color:var(--verde-match); min-width:60px; text-align:center;">0 - 0</span>
                          <span style="width:40%; text-align:right; font-weight:bold;">${vis.toUpperCase()} ⚽</span>
                     </div>
                     <div id="multi-log-vivo-${index}" style="margin-top:12px; font-size:0.85rem; color:#64748b; text-align:center; font-style:italic; min-height:25px;">
                          🏁 Los capitanes sortean los lados... ¡Mucha tensión en la Arena!
                     </div>
                     <div id="multi-penales-box-${index}" style="display:none; text-align:center; color:var(--rojo); font-weight:bold; margin-top:8px; font-size:0.9rem; background:rgba(239,68,68,0.1); padding:6px; border-radius:4px;"></div>
                 `;
                 tablero.appendChild(bloquePartido); 
                 bloquePartido.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

                 let minVirtual = 0; 
                 let gL_act = 0; 
                 let gV_act = 0;

                 // MODIFICACIÓN: Avanza de a 5 minutos cada 400ms para estirar el drama y hacerlo épico
                 const timerMulti = setInterval(() => {
                     minVirtual += 5; 
                     if (minVirtual > 90) minVirtual = 90;

                     // Los goles van cayendo de forma escalonada e inteligente a lo largo del tiempo
                     if (minVirtual >= 15) {
                          if (gL_act < golesLocalDefinitivos && Math.random() < 0.2) {
                               gL_act++;
                               inyectarGritoGolMulti(index, `⚽ ¡GOOOL DE ${loc.toUpperCase()}! Se cae el estadio... 🔥`);
                          }
                          if (gV_act < golesVisitanteDefinitivos && Math.random() < 0.2) {
                               gV_act++;
                               inyectarGritoGolMulti(index, `💥 ¡GOL DE ${vis.toUpperCase()}! Silencio sepulcral en la Arena...`);
                          }
                     }

                     if (minVirtual === 90) { 
                          gL_act = golesLocalDefinitivos; 
                          gV_act = golesVisitanteDefinitivos; 
                     }

                     // Pintamos tiempos y marcadores actualizados
                     if (document.getElementById(`multi-reloj-${index}`)) {
                          document.getElementById(`multi-reloj-${index}`).innerText = `⏱️ MINUTO ${minVirtual.toString().padStart(2,'0')}:00`;
                     }
                     if (document.getElementById(`multi-score-${index}`)) {
                          document.getElementById(`multi-score-${index}`).innerText = `${gL_act} - ${gV_act}`;
                     }

                     // Evaluamos e inyectamos los textos del servidor (PostgreSQL) en vivo
                     if (incidenciasDelPartido[minVirtual]) {
                          document.getElementById(`multi-log-vivo-${index}`).innerText = incidenciasDelPartido[minVirtual];
                     }

                     if (minVirtual >= 90) {
                         clearInterval(timerMulti);
                         
                         if (partido.definicionPenales && document.getElementById(`multi-penales-box-${index}`)) {
                              document.getElementById(`multi-penales-box-${index}`).style.display = "block";
                              document.getElementById(`multi-penales-box-${index}`).innerText = `💥 TANDA DE PENALES POR LA INMORTALIDAD: (${partido.penalesLocal} - ${partido.penalesVisitante})`;
                         }
                         
                         bloquePartido.style.borderColor = "var(--verde-match)";
                         const finTexto = document.createElement("div"); 
                         finTexto.style.cssText = "text-align:right; font-size:0.85rem; font-weight:bold; color:var(--verde-match); margin-top:5px;";
                         finTexto.innerText = `🏆 GANADOR: ${partido.ganadorUsername.toUpperCase()} ✅`;
                         bloquePartido.appendChild(finTexto);
                         
                         document.getElementById(`multi-log-vivo-${index}`).innerText = "🏁 El árbitro pita el final del encuentro. Planillas guardadas con éxito.";
                         resolveCruce(); 
                     }
                 }, 400);
            });
        });
    });

    // Cierre limpio de los premios y reset del lobby
    secuenciaPromesas.then(() => {
          const bloquePremio = document.createElement("div");
          bloquePremio.style.cssText = "text-align:center; margin-top:25px; padding:15px; background:rgba(0,255,136,0.05); border:2px dashed var(--dorado); border-radius:10px;";
          let textoPremio = `👑 ¡Fin de la transmisión!\n🎁 El torneo ha concluido exitosamente.`;
          
          if (premio && !premio.ganoBot) {
               if (premio.tipo_apuesta === 'oro') {
                    textoPremio = `🏆 ¡FIN DEL TORNEO! 🏆\n👑 Campeón: ${premio.ganador_username.toUpperCase()}\n🎁 ¡Se lleva 🪙 ${premio.pozo} de Oro!`;
               } else if (premio.tipo_apuesta === 'carta') {
                    textoPremio = `🏆 ¡FIN DEL TORNEO! 🏆\n👑 Campeón: ${premio.ganador_username.toUpperCase()}\n\n🎉 ¡Conservás tu cromo y ganaste a:\n🌟 [ ${premio.nombreCartaPremio || 'Jugador Épico'} ]!\n\n💀 Los perdedores perdieron su cromo permanentemente.`;
               }
          } else if (premio && premio.ganoBot) {
               textoPremio = premio.tipo_apuesta === 'carta' ? `🤖 ¡El torneo fue conquistado por un Bot (${premio.ganador_username.toUpperCase()})!\n\n💀 Ambos jugadores perdieron sus cartas permanentemente.` : `🤖 ¡Torneo conquistado por un Bot (${premio.ganador_username.toUpperCase()})!\n💸 El pozo se disolvió.`;
          }
          
          bloquePremio.innerHTML = `<h3 style="color:var(--dorado); font-family:'Oswald';">🏁 CRÓNICA DEFINITIVA</h3><p style="color:#fff; font-weight:bold; white-space:pre-line;">${textoPremio}</p><button type="button" id="btn-regresar-limpio-multi" class="btn-estadio" style="width:80%; margin-top:15px; background:var(--celeste);">🔄 REGRESAR A LA HOME</button>`;
          tablero.appendChild(bloquePremio); bloquePremio.scrollIntoView({ behavior: 'smooth' });

          document.getElementById("btn-regresar-limpio-multi").onclick = () => {
              document.getElementById("multi-pantalla-fixture").style.display = "none";
              document.getElementById("multi-menu-inicial").style.display = "block";
              if (document.getElementById("modulo-mundial-multi")) document.getElementById("modulo-mundial-multi").style.display = "block";
              liberarNavegacionArenaUI(); multiSalaId = null; multiCodigoSala = null; multiEsCreador = false;
              const btnTienda = document.querySelector("button[onclick*='modulo-sobres']"); cambiarModulo('modulo-sobres', btnTienda);
          };
    });
};

// Función auxiliar interna exclusiva para dar flash visual en los gritos de gol del multi
function inyectarGritoGolMulti(index, mensajeTexto) {
     const logView = document.getElementById(`multi-log-vivo-${index}`);
     if (!logView) return;
     logView.innerText = mensajeTexto;
     logView.style.color = "var(--dorado)";
     logView.style.fontWeight = "bold";
     setTimeout(() => { if (logView) { logView.style.color = "#64748b"; logView.style.fontWeight = "normal"; } }, 1600);
}

function conmutarInputsMultiUI() {
    const selector = document.getElementById("multi-select-tipo-apuesta"); if (!selector) return;
    const tipo = selector.value;
    const divOro = document.getElementById("multi-wrapper-oro"); const divCarta = document.getElementById("multi-wrapper-carta");

    if (tipo === 'oro') {
        if (divOro) divOro.style.display = "block"; if (divCarta) divCarta.style.display = "none";
    } else if (tipo === 'carta') {
        if (divOro) divOro.style.display = "none"; if (divCarta) divCarta.style.display = "block";
        const selectCromoMulti = document.getElementById("multi-select-carta-apuesta");
        if (selectCromoMulti) {
            selectCromoMulti.innerHTML = "";
            const miAlbumReal = window.albumCompleto || albumCompleto || [];
            const repetidas = miAlbumReal.filter(f => f && f.obtenido > 1);

            if (repetidas.length === 0) {
                const opt = document.createElement("option"); opt.value = ""; opt.innerText = "❌ Sin cromos repetidos";
                selectCromoMulti.appendChild(opt);
            } else {
                repetidas.forEach(figu => {
                    const opt = document.createElement("option"); opt.value = figu.id;
                    opt.innerText = `${figu.bandera || '🃏'} ${figu.nombre.toUpperCase()} (x${figu.obtenido})`;
                    selectCromoMulti.appendChild(opt);
                });
            }
        }
    } else {
        if (divOro) divOro.style.display = "none"; if (divCarta) divCarta.style.display = "none";
    }
}

function cancelarMundialMultiLobby() {
     if (multiIntervaloLobby) clearInterval(multiIntervaloLobby);
     document.getElementById("multi-fase-inscripcion").style.display = "none";
     document.getElementById("multi-fase-draft").style.display = "none";
     document.getElementById("multi-lobby-espera").style.display = "none";
     document.getElementById("multi-pantalla-fixture").style.display = "none";
     document.getElementById("multi-menu-inicial").style.display = "block";
     liberarNavegacionArenaUI(); multiSalaId = null; multiCodigoSala = null; multiEsCreador = false; jugadoresSeleccionadosDraft = [];
}

/* ========================================================================
   📢 10. LEADERBOARDS (RANKINGS GENERAL Y MUNDIAL) Y BANNER INFORMATIVO
   ======================================================================== */

async function cargarRankingLocal() {
     cargarRankingMundialesLocal();
     const tbody = document.getElementById("tabla-ranking-body");
     if (!tbody) return;

     try {
          const res = await fetch(`${URL_BASE}/ranking`);
          const data = await res.json();
          tbody.innerHTML = "";

          if (!data.ranking || data.ranking.length === 0) {
               tbody.innerHTML = `<tr><td colspan="3" style="color:#777;">No hay jugadores en la arena</td></tr>`; return;
          }

          data.ranking.forEach((user, index) => {
               const tr = document.createElement("tr");
               if (usuarioActual && user.username === usuarioActual.username) tr.className = "fila-usuario-actual";

               let posicionText = index + 1;
               if (index === 0) posicionText = "🥇";
               if (index === 1) posicionText = "🥈";
               if (index === 2) posicionText = "🥉";

               tr.innerHTML = `<td><b>${posicionText}</b></td><td style="text-align: left; padding-left: 15px;">${user.username} ${usuarioActual && user.username === usuarioActual.username ? '<span style="color:var(--celeste); font-size:0.8rem;">(Vos)</span>' : ''}</td><td style="color: #ff4a4a; font-weight: bold;">${user.puntos_ranking}</td>`;
               tbody.appendChild(tr);
          });
     } catch (err) { console.error(err); }
}

async function cargarRankingMundialesLocal() {
     const tbody = document.getElementById("tabla-ranking-mundiales-body");
     if (!tbody) return;

     try {
          const res = await fetch(`${URL_BASE}/ranking-mundiales`);
          const data = await res.json();
          tbody.innerHTML = "";

          if (!data.ranking || data.ranking.length === 0) {
               tbody.innerHTML = `<tr><td colspan="3" style="color:#777; padding: 15px;">🌟 Todavía no hay campeones en la Arena. ¡Sé el primero! 👑</td></tr>`; return;
          }

          data.ranking.forEach((user, index) => {
               const tr = document.createElement("tr");
               if (usuarioActual && user.username === usuarioActual.username) tr.className = "fila-usuario-actual";

               let posicionText = index + 1;
               if (index === 0) posicionText = "🥇";
               if (index === 1) posicionText = "🥈";
               if (index === 2) posicionText = "🥉";

               tr.innerHTML = `<td><b>${posicionText}</b></td><td style="text-align: left; padding-left: 15px;">${user.username.toUpperCase()} ${usuarioActual && user.username === usuarioActual.username ? '<span style="color:var(--celeste); font-size:0.8rem;">(Vos)</span>' : ''}</td><td style="color: var(--dorado); font-weight: bold; font-size: 1.2rem;">🏆 ${user.copas_mundiales}</td>`;
               tbody.appendChild(tr);
          });
     } catch (err) { console.error("Error al cargar ranking de mundiales:", err); }
}

async function iniciarControladorAnunciosSeguro() {
    try {
        const res = await fetch(`${URL_BASE}/anuncio-actual`);
        const anuncio = await res.json();
        if (!anuncio || !anuncio.activo) return;

        const modal = document.getElementById('modalAnuncioGlobal');
        const tituloHtml = document.getElementById('anuncioTitulo');
        const cuerpoHtml = document.getElementById('anuncioCuerpo');
        if (!modal || !tituloHtml || !cuerpoHtml) return;

        tituloHtml.textContent = anuncio.titulo.toUpperCase();
        cuerpoHtml.innerHTML = ""; 

        if (anuncio.texto) {
            const p = document.createElement('p'); p.textContent = anuncio.texto; cuerpoHtml.appendChild(p);
        }
        if (anuncio.tipo === "imagen" && anuncio.urlImagen) {
            const img = document.createElement('img'); img.src = anuncio.urlImagen; img.className = "anuncio-media"; img.alt = "Novedades";
            cuerpoHtml.appendChild(img);
        } else if (anuncio.tipo === "video" && anuncio.urlVideo) {
            const containerVideo = document.createElement('div'); containerVideo.className = "anuncio-video-container";
            const iframe = document.createElement('iframe'); iframe.src = anuncio.urlVideo; iframe.setAttribute('allowfullscreen', 'true'); iframe.style.border = "none";
            containerVideo.appendChild(iframe); cuerpoHtml.appendChild(containerVideo);
        }
        modal.style.display = "flex";
    } catch (err) { console.error("Error en banner de novedades:", err); }
}

function cerrarAnuncioGlobal() {
    const modal = document.getElementById('modalAnuncioGlobal');
    if (modal) { modal.style.display = "none"; document.getElementById('anuncioCuerpo').innerHTML = ""; }
}

// Función para abrir la interfaz del Bot en el Front
function abrirMercadoBot(listaTusRepetidas) {
    // Supongamos que tenés un contenedor para el mercado del Bot
    const contenedorBot = document.getElementById("modulo-comerciante-bot");
    contenedorBot.style.display = "block";

    contenedorBot.innerHTML = `
        <div style="background: #0f172a; border: 2px solid var(--dorado); padding: 20px; border-radius: 12px; text-align: center; max-width: 500px; margin: 20px auto;">
            <h3 style="color: var(--dorado); font-family: 'Oswald'; font-size: 1.5rem; margin-top: 0;">🤖 BOT COMERCIANTE</h3>
            <p style="color: #94a3b8; font-size: 0.9rem; font-style: italic;">
                "Traeme 3 cartas repetidas que te sobren y yo te daré un cromo de Élite (Épica o Legendaria). ¿Hacemos negocio?"
            </p>
            
            <div id="zona-seleccion-bot" style="margin: 15px 0; text-align: left;">
                 <label style="color: #fff; font-size: 0.85rem; font-weight: bold;">Elegí tus 3 cartas a sacrificar:</label>
                 <div id="lista-checks-repetidas" style="max-height: 150px; overflow-y: auto; background: #020617; padding: 10px; border-radius: 6px; margin-top: 5px;">
                      </div>
            </div>

            <button type="button" id="btn-ejecutar-trato" class="btn-estadio" style="background: var(--verde-match); color: #000; width: 100%; font-weight: bold;">
                 🤝 FIRMAR CONTRATO DE TRADEO
            </button>
            <div id="resultado-trato-bot" style="margin-top: 12px; font-weight: bold; font-size: 0.95rem;"></div>
        </div>
    `;

    const listaCheckboxes = document.getElementById("lista-checks-repetidas");
    
    // Filtramos e insertamos solo los jugadores que tengan cantidad > 1
    listaTusRepetidas.forEach(jugador => {
         if (jugador.cantidad > 1) {
              listaCheckboxes.innerHTML += `
                   <label style="display: block; color: #cbd5e1; font-size: 0.85rem; margin-bottom: 5px; cursor: pointer;">
                        <input type="checkbox" class="check-cromo-bot" value="${jugador.id}" style="margin-right: 8px;">
                        ${jugador.nombre} (${jugador.rareza.toUpperCase()}) - Repetidas: [${jugador.cantidad - 1}]
                   </label>
              `;
         }
    });

    // Evento al hacer click en el tradeo
    document.getElementById("btn-ejecutar-trato").onclick = async () => {
         const seleccionados = Array.from(document.querySelectorAll('.check-cromo-bot:checked')).map(cb => parseInt(cb.value));

         if (seleccionados.length !== 3) {
              alert("⚠️ Tenés que seleccionar exactamente 3 cromos repetidos para hacer el trato.");
              return;
         }

         document.getElementById("btn-ejecutar-trato").disabled = true;
         document.getElementById("resultado-trato-bot").innerText = "⏳ El bot está tasando tus cartas...";

         try {
              const res = await fetch('/api/album/comerciar-bot', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ usuario_id: miUsuarioId, jugadorIdsASacar: seleccionados })
              });
              const data = await res.json();

              if (data.ok) {
                   document.getElementById("resultado-trato-bot").style.color = "var(--verde-match)";
                   document.getElementById("resultado-trato-bot").innerHTML = `
                        🎉 ${data.mensaje}<br>
                        🌟 CROMO RECIBIDO: <span style="color: var(--dorado);">${data.cartaGanada.nombre} [${data.cartaGanada.rareza}]</span>
                   `;
                   // Acá podés recargar el álbum de tu front de forma limpia
                   setTimeout(() => { actualizarUI_Album(); }, 2000);
              } else {
                   document.getElementById("resultado-trato-bot").style.color = "var(--rojo)";
                   document.getElementById("resultado-trato-bot").innerText = data.mensaje;
                   document.getElementById("btn-ejecutar-trato").disabled = false;
              }
         } catch (err) {
              console.error(err);
              document.getElementById("btn-ejecutar-trato").disabled = false;
         }
    };
}
