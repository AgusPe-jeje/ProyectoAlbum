/* ========================================================================
   🛡️ ENTORNO SEGURO (IIFE) - Previene manipulación desde la consola
   ======================================================================== */
(() => {
    /* ========================================================================
       🎯 1. CONFIGURACIÓN, INSTANCIAS Y VARIABLES DE ESTADO GLOBAL
       ======================================================================== */
    
    const URL_RENDER_SERVICIO = "https://albumpe.onrender.com";
    const URL_BASE = `${URL_RENDER_SERVICIO}/api`;
    
    // Estados del Usuario y Configuración de Sesión (AHORA PRIVADOS)
    let usuarioActual = null;
    let albumCompleto = [];
    let paisSeleccionado = "";
    
    // Variables de Control de Energía y Timers Globales
    let direccionGanadora = "";
    let timbaPreparada = false;
    let intervaloCronometro = null;       
    let intervaloCronometroTimba = null;  
    
    // Filtros del Álbum Colector
    let filtroEstadoActual = 'todas'; 
    let filtroRarezaActual = 'todas'; 
    
    // Estado del Engine Multijugador
    let multiSalaId = null;
    let multiCodigoSala = null;
    let multiEsCreador = false;
    let multiIntervaloLobby = null;
    let multiApuestaFijada = 0;
    let multiTipoApuestaActual = 'amistoso'; 
    
    // Mapeos Estáticos
    const MAPA_PUNTOS_RAREZA = { 
        'comun': 60, 'especial': 68, 'rara': 75, 'epica': 85, 'legendaria': 96 
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
       🛡️ 1.5. FUNCIONES DE SEGURIDAD (ANTI-XSS)
       ======================================================================== */
    // Esta función limpia cualquier código HTML malicioso que venga del servidor
    const sanitizarHTML = (str) => {
        if (typeof str !== 'string') return str;
        return str.replace(/[&<>'"]/g, tag => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[tag]));
    };
    
    /* ========================================================================
       🎛️ 2. CONTROLADORES INTERNOS DE LA UI, PANTALLAS DE CARGA Y MODALES
       ======================================================================== */
    
    function cambiarModulo(idModulo, botonPresionado) {
         document.querySelectorAll('.modulo-contenido, #modulo-mundial-multi, #modulo-mercado-pases').forEach(mod => mod.style.display = 'none');
         document.querySelectorAll('.tile-modulo-fifa, .btn-modulo-match').forEach(btn => btn.classList.remove('activo'));
         
         const modActivo = document.getElementById(idModulo);
         if (modActivo) modActivo.style.display = 'block';
         if (botonPresionado) botonPresionado.classList.add('activo');
    
         if (idModulo === 'modulo-album' && usuarioActual) cargarAlbumLocal();
         if (idModulo === 'modulo-penales' && usuarioActual) iniciarDueloLocal();
         
         if (idModulo === 'modulo-mercado-pases' && usuarioActual) {
              cargarMisRepetidasParaVenta();
              obtenerOfertasMercado();
         }
         
         if (idModulo === 'modulo-timba' && usuarioActual) {
              rotarPartidoTimba();
              document.getElementById("select-tipo-apuesta").value = "monedas"; 
              conmutarControlesTimbaUI();
              actualizarTimbasRestantesUI();
              if (typeof cargarPartidosQuinielaUI === "function") {
                  cargarPartidosQuinielaUI();
              }
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
       👤 3. AUTENTICACIÓN Y GESTIÓN DEL HUD
       ======================================================================== */
    
    async function autenticarUsuario(accion) {
         const username = document.getElementById("input-usuario").value.trim();
         const password = document.getElementById("input-pass").value;
         
         if (!username || !password) return alert("❌ Completá los datos.");
    
         const textoSpinner = accion === 'login' ? "Iniciando sesión..." : "Creando tu cuenta en la Arena...";
         const endpointFinal = accion === 'login' ? 'login' : 'registro';
    
         mostrarCarga(textoSpinner);
    
         try {
             /* 🚨 ALERTA DE SEGURIDAD BACKEND 🚨
                A futuro, este endpoint debe devolver un Token (JWT) en el JSON o setear una cookie HttpOnly. 
                Ese token lo vas a mandar en los headers de todos los fetch siguientes.
             */
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
                   
                   filtroEstadoActual = 'todas';
                   filtroRarezaActual = 'todas';
                   
                   actualizarInterfazUI();
                   cargarAlbumLocal();
                   actualizarTimbasRestantesUI();
                   iniciarControladorAnunciosSeguro(); 
                   
                   // Usamos sanitización para evitar que un nombre raro rompa el alert
                   const nombreSeguro = sanitizarHTML(usuarioActual.username);
                   if (accion === 'login') {
                        alert(`⚔️ ¡Bienvenido de vuelta, ${nombreSeguro}!`);
                   } else {
                        alert(`🎉 ¡Cuenta creada con éxito! Bienvenido a la Arena, ${nombreSeguro}. Empezás con 200 monedas.`);
                   }
              }
         } catch (err) {
              console.error(err);
              ocultarCarga();
         }
    }
    
    // Captura de Enter (No es necesario exponerla a window porque usa event listeners puros)
    document.addEventListener("DOMContentLoaded", () => {
        const inputUser = document.getElementById("input-usuario");
        const inputPass = document.getElementById("input-pass");
    
        const manejarEnterLogin = (event) => {
            if (event.key === "Enter") {
                event.preventDefault(); 
                autenticarUsuario('login');
            }
        };
    
        if (inputUser) inputUser.addEventListener("keydown", manejarEnterLogin);
        if (inputPass) inputPass.addEventListener("keydown", manejarEnterLogin);
    });
    
    function actualizarInterfazUI() {
         if (!usuarioActual) return;
         document.getElementById("lbl-usuario").innerText = sanitizarHTML(usuarioActual.username).toUpperCase();
         document.getElementById("lbl-monedas").innerText = usuarioActual.monedas;
         document.getElementById("lbl-ranking").innerText = usuarioActual.puntos_ranking;
         
         const lblMundiales = document.getElementById("lbl-copas-mundiales");
         if (lblMundiales) {
              lblMundiales.innerText = usuarioActual.copas_mundiales || 0;
         }
    }
    
    async function cerrarSesionLocal() {
         if (!usuarioActual) return;
    
         const nombreSeguro = sanitizarHTML(usuarioActual.username);
         const confirmar = confirm(`¿Estás seguro de que querés salir, ${nombreSeguro}?`);
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
       📖 4. ÁLBUM COLECTOR
       ======================================================================== */
    
    async function cargarAlbumLocal() {
         if (!usuarioActual) return;
         const contenedorPaises = document.getElementById("selector-paises");
         
         try {
             /* 🚨 ALERTA DE SEGURIDAD BACKEND 🚨
                En el futuro, sacá `usuarioActual.id` de la URL. Mandá el Token en el header y que el backend saque el ID de ahí.
             */
              const res = await fetch(`${URL_BASE}/album/${usuarioActual.id}`);
              const data = await res.json();
              
              albumCompleto = data.album;
    
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
                   // TextContent para prevenir XSS en caso de que países vengan de DB
                   const spanBandera = document.createElement("span");
                   spanBandera.textContent = info.bandera;
                   btn.appendChild(spanBandera);
                   btn.appendChild(document.createTextNode(` ${pais.toUpperCase()}${textoCorona}`));
                   
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
              
              // Evitando XSS en la foto y el nombre
              const badgeStr = figu.obtenido > 1 ? `<div class="badge-repetidas">x${figu.obtenido}</div>` : '';
              const nombreSeguro = sanitizarHTML(figu.nombre);
              
              card.innerHTML = `
                  ${badgeStr}
                  <img src="${sanitizarHTML(figu.foto)}" class="carta-foto" alt="${nombreSeguro}">
                  <div class="rareza-vertical">${sanitizarHTML(figu.rareza).toUpperCase()}</div>
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
       🍿 5. LOGICA CINEMÁTICA ASÍNCRONA DE PACK OPENING
       ======================================================================== */
    
    let colaCartasPack = [];
    let indiceCartaActualPack = 0;
    let sobreAbiertoCompletoCache = []; 
    let animacionCartaEnCurso = false; 
    
    async function comprarSobreEspecifico(tipoCofre) {
         if (!usuarioActual) return alert("❌ Error.");
         mostrarCarga(`Adquiriendo derechos de pack ${tipoCofre.toUpperCase()}...`);
    
         try {
             /* 🚨 ALERTA DE SEGURIDAD BACKEND 🚨
                En el futuro no envies usuario_id acá. Usa el Token JWT.
             */
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
            <img src="${sanitizarHTML(carta.foto)}" class="carta-foto" alt="${sanitizarHTML(carta.nombre)}">
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
                  <img src="${sanitizarHTML(figu.foto)}" class="carta-foto" alt="${sanitizarHTML(figu.nombre)}">
                  <div class="rareza-vertical">${rarezaTextoFinal}</div>
              `;
    
              itemContenedor.appendChild(divCarta);
              contenedorSobre.appendChild(itemContenedor);
         });
    
         if (usuarioActual) await cargarAlbumLocal();
    }
    
    /* ========================================================================
       ⚽ 6. DUELO DE PENALES
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
              'SUP_IZQUIERDA': { balon: `translate(${ -185 * fX }px, ${ -185 * fY }px)`, arquero: `translate(${ -185 * fX }px, ${ -65 * fY }px) rotate(-25deg)` },
              'SUP_CENTRO': { balon: `translate(0px, ${ -205 * fY }px)`, arquero: `translate(0px, ${ -75 * fY }px) rotate(0deg)` },
              'SUP_DERECHA': { balon: `translate(${ 185 * fX }px, ${ -185 * fY }px)`, arquero: `translate(${ 185 * fX }px, ${ -65 * fY }px) rotate(25deg)` },
              'INF_IZQUIERDA': { balon: `translate(${ -185 * fX }px, ${ -20 * fY }px)`, arquero: `translate(${ -185 * fX }px, ${ 95 * fY }px) rotate(-15deg)` },
              'INF_CENTRO': { balon: `translate(0px, ${ -35 * fY }px)`, arquero: `translate(0px, ${ 85 * fY }px) rotate(0deg)` },
              'INF_DERECHA': { balon: `translate(${ 185 * fX }px, ${ -20 * fY }px)`, arquero: `translate(${ 185 * fX }px, ${ 95 * fY }px) rotate(15deg)` }
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
             /* 🚨 ALERTA DE SEGURIDAD BACKEND 🚨
                El cliente NO DEBE decirle al servidor si fue gol (`gano: esGol`). Esto permite hackear oro infinito. 
                Deberías mandar `direccionElegida` y que el backend decida a dónde saltó el arquero y si hay premio.
             */
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
              
              if (typeof intervaloCronometroVisual !== "undefined") {
                   clearInterval(intervaloCronometroVisual);
              }
              
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
                   const TIEMPO_CONGELADO_MS = 5000;
                   setTimeout(() => {
                        const tiempoTranscurrido = TIEMPO_CONGELADO_MS;
                        const tiempoAjustado = datos.siguienteIn - tiempoTranscurrido;
                        
                        arrancarCronometroTimbaVisual(tiempoAjustado > 0 ? tiempoAjustado : datos.siguienteIn);
                   }, TIEMPO_CONGELADO_MS);
              }
         } catch (err) { 
              console.error('Error al actualizar créditos de timba:', err); 
         }
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
    
         const miAlbumReal = albumCompleto;
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
              opt.innerText = `${figu.bandera || "🃏"} ${sanitizarHTML(figu.nombre).toUpperCase()} (x${figu.obtenido}) [${sanitizarHTML(figu.rareza).toUpperCase()}]`;
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
              li.innerHTML = `<span>⚔️ ${sanitizarHTML(p.local)} vs ${sanitizarHTML(p.visitante)}</span> <b style="color: var(--celeste);">${sanitizarHTML(p.res)}</b>`;
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
                local: `${bandLoc} ${nomLoc}`, visitante: `${bandVis} ${nomVis}`, res: `${data.golesLReal} - ${data.golesVReal}`
            });
            timbaPreparada = false; rotarPartidoTimba();
        } catch (err) { console.error(err); ocultarCarga(); }
    }
    
    setTimeout(rotarPartidoTimba, 1000);
    
    /* ========================================================================
       🏆 8. ENGINE INTERACTIVO DEL MINIMUNDIAL
       ======================================================================== */
    
    let mundialTernaPaises = [];
    let mundialRivalClasif = "";
    let jugadoresSeleccionadosDraft = [];
    let intervaloCronometroMundial = null;
    let mundialSeleccionUsuario = "";
    
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
    
              if (data.monedasActualizadas !== undefined) {
                   usuarioActual.monedas = data.monedasActualizadas;
              } else {
                   usuarioActual.monedas -= 1500;
              }
              actualizarInterfazUI();
    
              const COOLDOWN_MUNDIAL_MS = 3 * 60 * 60 * 1000; 
              arrancarCronometroMundialVisual(COOLDOWN_MUNDIAL_MS);
    
              const barraNavegacion = document.querySelector(".nav-modulos-estadio");
              if (barraNavegacion) barraNavegacion.style.display = "none"; 
              const btnSalir = document.querySelector(".btn-logout-kick");
              if (btnSalir) btnSalir.style.display = "none";
    
              mundialTernaPaises = data.terna;
              mundialRivalClasif = data.rivalClasificacion;
              jugadoresSeleccionadosDraft = [];
    
              const contenedorTerna = document.getElementById("zona-eleccion-pais-mundial");
              if (contenedorTerna) contenedorTerna.innerHTML = "";
              
              document.getElementById("fase-inscripcion-mundial").style.display = "block";
              document.getElementById("fase-draft-mundial").style.display = "none";
              document.getElementById("fase-fixture-mundial").style.display = "none";
    
              data.terna.forEach(pais => {
                   const btn = document.createElement("button");
                   btn.className = "btn-estadio btn-modulo-match"; btn.style.margin = "8px";
                   btn.innerText = `⚽ ${pais.toUpperCase()}`;
                   btn.onclick = () => iniciarDraftJugadoresMundial(pais);
                   if (contenedorTerna) contenedorTerna.appendChild(btn);
              });
         } catch (err) { console.error(err); ocultarCarga(); }
    }
    
    function iniciarDraftJugadoresMundial(paisElegido) {
         mundialSeleccionUsuario = paisElegido;
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
              card.innerHTML = `<img src="${sanitizarHTML(carta.foto)}" class="carta-foto" alt="${sanitizarHTML(carta.nombre)}"><div class="rareza-vertical">${sanitizarHTML(carta.rareza).toUpperCase()}</div>`;
    
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
            confirmarInscripcionMultiServidor(mundialSeleccionUsuario, jugadoresSeleccionadosDraft);
            return;
        }
        if (jugadoresSeleccionadosDraft.length !== 3) return alert("❌ Completá la alineación de 3 jugadores.");
    
         mostrarCarga("Pidiendo autorización de planilla a la FIFA...");
         try {
              const res = await fetch(`${URL_BASE}/mundial/jugar`, {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({
                       usuario_id: usuarioActual.id, seleccionElegida: mundialSeleccionUsuario,
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
                        const esTuPais = fila.pais === mundialSeleccionUsuario;
                        const tr = document.createElement("tr"); tr.style.color = esTuPais ? "var(--verde-match)" : "#fff";
                        tr.innerHTML = `<td style="padding:6px 0; color:${idx < 2 ? 'var(--verde-match)':'var(--rojo)'};">${idx + 1}</td><td style="text-align:left;">⚽ ${sanitizarHTML(fila.pais).toUpperCase()}</td><td>${fila.gf}</td><td>${fila.gc}</td><td style="color:var(--dorado);">${fila.pts}</td>`;
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
                   divFecha.innerHTML = `<div style="color:var(--celeste); font-size:0.9rem; font-weight:bold;">📅 FECHA ${fechaData.fecha}</div><div style="display:flex; justify-content:space-between;"><span>🇦🇷 ${sanitizarHTML(fechaData.local)} vs ${sanitizarHTML(fechaData.visitante)}</span><span id="goles-m1-f${f}" style="color:var(--verde-match);">0 - 0</span></div><div style="display:flex; justify-content:space-between;"><span>🤖 ${sanitizarHTML(fechaData.botL)} vs ${sanitizarHTML(fechaData.botV)}</span><span id="goles-m2-f${f}" style="color:#aaa;">0 - 0</span></div><div id="reloj-f${f}" style="text-align:center; font-size:0.8rem; color:#64748b;">⏱️ 00:00</div>`;
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
                   await simularMarcadorPantalla(contenedorLista, partido.ronda, mundialSeleccionUsuario, partido.rival, ganoEsteCruce);
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
             
             const idUnico = sanitizarHTML(ronda).replace(/ /g,'') + Math.floor(Math.random() * 1000);
             
             filaPartido.innerHTML = `
                  <div style="display:flex; justify-content:space-between; color:var(--dorado); border-bottom:1px solid #1a2436; padding-bottom:5px;">
                       <span style="text-transform: uppercase; font-family:'Oswald';">📋 ${sanitizarHTML(ronda)}</span>
                       <span id="reloj-vivo-${idUnico}" style="font-weight:bold; color:var(--celeste);">⏱️ MINUTO 00:00</span>
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px;">
                       <span style="width:40%; text-align:left; font-weight:bold; font-size:1.1rem;">🇦🇷 ${sanitizarHTML(tuPais)} <span id="boost-badge-${idUnico}" style="display:none; color:var(--verde-match); font-size:0.75rem;">⚡ BOOSTED</span></span>
                       <span id="score-vivo-${idUnico}" style="font-family:'Oswald'; font-size:1.8rem; background:#000; padding:4px 16px; border-radius:6px; color:var(--verde-match); min-width:70px; text-align:center; box-shadow: inset 0 0 10px rgba(0,255,136,0.2);">0 - 0</span>
                       <span style="width:40%; text-align:right; font-weight:bold; font-size:1.1rem;">${sanitizarHTML(rival)} 🤖</span>
                  </div>
                  <div id="consola-incidencias-${idUnico}" style="margin-top:12px; padding:8px; background:rgba(0,0,0,0.3); border-radius:6px; font-size:0.85rem; color:#94a3b8; min-height:35px; text-align:center; font-style:italic; border: 1px dashed #1e293b;">
                       ⚽ El árbitro da la orden... ¡Comienza el partido!
                  </div>
                  <div id="zona-entretiempo-${idUnico}" style="display:none; margin-top:10px; text-align:center; padding:10px; background:rgba(234,179,8,0.1); border: 1px solid var(--dorado); border-radius:6px;">
                       <p style="margin:0 0 8px 0; font-size:0.85rem; color:var(--dorado); font-weight:bold;">👔 ¡ENTRETIEMPO! Tenés 5 segundos para dar la Charla Técnica</p>
                       <button type="button" id="btn-charla-${idUnico}" class="btn-estadio" style="background:var(--dorado); color:#000; font-size:0.8rem; padding:4px 12px;">📣 Arengar Equipo (+15% Ataque)</button>
                  </div>
             `;
             contenedor.appendChild(filaPartido); 
             filaPartido.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
             let golesTu = Math.floor(Math.random() * 3); 
             let golesRival = Math.floor(Math.random() * 3);
             if (ganoUsuario && golesTu <= golesRival) golesTu = golesRival + Math.floor(Math.random() * 2) + 1;
             else if (!ganoUsuario && golesRival <= golesTu) golesRival = golesTu + Math.floor(Math.random() * 2) + 1;
    
             let incidenciasSimuladas = {
                  15: `⚠️ Presiona ${sanitizarHTML(rival)}, bombazo que pasa cerca del ángulo izquierdo.`,
                  45: "⏳ ENTRETIEMPO: Los jugadores se retiran al descanso a recomponer ideas.",
                  72: `🟥 ¡Falta durísima! Tarjeta amarilla para el capitán de ${sanitizarHTML(rival)}.`,
                  85: `🔥 ¡Zafarrancho en el área! La hinchada empuja con el alma.`
             };
    
             let golesTuActuales = 0; 
             let golesRivalActuales = 0; 
             let segundoVirtual = 0;
             let tieneBoost = false;
    
             document.getElementById(`btn-charla-${idUnico}`).onclick = () => {
                  tieneBoost = true;
                  document.getElementById(`boost-badge-${idUnico}`).style.display = "inline-block";
                  document.getElementById(`btn-charla-${idUnico}`).disabled = true;
                  document.getElementById(`btn-charla-${idUnico}`).innerText = "✅ ¡EQUIPO MOTIVADO!";
                  if (!ganoUsuario && Math.random() < 0.4) {
                       golesTu++;
                  }
             };
    
             const timer = setInterval(async () => {
                 if (segundoVirtual === 45 && !document.getElementById(`zona-entretiempo-${idUnico}`).classList.contains("pausado")) {
                     document.getElementById(`zona-entretiempo-${idUnico}`).classList.add("pausado");
                     document.getElementById(`zona-entretiempo-${idUnico}`).style.display = "block";
                     document.getElementById(`consola-incidencias-${idUnico}`).innerText = "📣 Charla técnica en curso en los vestuarios...";
                     clearInterval(timer);
                     
                     setTimeout(() => {
                         document.getElementById(`zona-entretiempo-${idUnico}`).style.display = "none";
                         segundoVirtual += 3;
                         rearrancarReloj();
                     }, 5000);
                     return;
                 }
    
                 segundoVirtual += 3; 
                 if (segundoVirtual > 90) segundoVirtual = 90;
    
                 if (segundoVirtual >= 20 && segundoVirtual < 45 || segundoVirtual >= 55) {
                     if (golesTuActuales < golesTu && Math.random() < (tieneBoost ? 0.18 : 0.10)) {
                          golesTuActuales++;
                          inyectarAlertaIncidencia(idUnico, `⚽ ¡GOOOL DE ${sanitizarHTML(tuPais).toUpperCase()}! 🔥`);
                     }
                     if (golesRivalActuales < golesRival && Math.random() < 0.09) {
                          golesRivalActuales++;
                          inyectarAlertaIncidencia(idUnico, `💥 Gol de ${sanitizarHTML(rival).toUpperCase()}. Se grita fuerte en el banco rival.`);
                     }
                 }
    
                 if (segundoVirtual === 90) { 
                     golesTuActuales = golesTu; 
                     golesRivalActuales = golesRival; 
                 }
    
                 document.getElementById(`reloj-vivo-${idUnico}`).innerText = `⏱️ MINUTO ${segundoVirtual.toString().padStart(2,'0')}:00`;
                 document.getElementById(`score-vivo-${idUnico}`).innerText = `${golesTuActuales} - ${golesRivalActuales}`;
    
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
                  const resumeTimer = setInterval(() => {
                       segundoVirtual += 3;
                       if (segundoVirtual > 90) segundoVirtual = 90;
    
                       if (golesTuActuales < golesTu && Math.random() < (tieneBoost ? 0.22 : 0.12)) {
                            golesTuActuales++;
                            inyectarAlertaIncidencia(idUnico, `⚽ ¡GOOOL DE ${sanitizarHTML(tuPais).toUpperCase()}! 🚀`);
                       }
                       if (golesRivalActuales < golesRival && Math.random() < 0.09) {
                            golesRivalActuales++;
                            inyectarAlertaIncidencia(idUnico, `💥 Gol de ${sanitizarHTML(rival).toUpperCase()}. Silencio sepulcral.`);
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
       🌎 9. ENGINE MULTIJUGADOR ONLINE
       ======================================================================== */
    
    let multiMiCartaApostadaTexto = "";
    
    async function abrirDraftMulti(esCreador) {
        multiEsCreador = esCreador;
        
        if (!esCreador) {
            const cod = document.getElementById("multi-input-codigo").value.trim().toUpperCase();
            if (cod.length !== 6) return alert("❌ Código inválido. Debe tener 6 caracteres.");
            multiCodigoSala = sanitizarHTML(cod);
    
            mostrarCarga("Validando credenciales de la sala...");
            try {
                const res = await fetch(`${URL_BASE}/multijugador/consultar-sala/${multiCodigoSala}`);
                const data = await res.json();
    
                if (!data.ok) {
                    ocultarCarga();
                    return alert(data.mensaje);
                }
                if (data.estado !== 'esperando') {
                    ocultarCarga();
                    return alert("🚫 Esta sala ya cerró o el torneo ya arrancó.");
                }
    
                multiTipoApuestaActual = data.tipo_apuesta ? data.tipo_apuesta.toLowerCase() : 'amistoso';
    
                let cartelAdvertencia = "";
    
                if (multiTipoApuestaActual === 'amistoso') {
                    cartelAdvertencia = `🏟️ ¿Querés unirte a la Sala ${multiCodigoSala}?\n\n🔹 Modalidad: AMISTOSO\n🔸 No se arriesgan recursos. ¡Puro juego para foguear el plantel!`;
                } else if (multiTipoApuestaActual === 'oro') {
                    cartelAdvertencia = `🪙 ¡ATENCIÓN JUGADOR!\n\nLa Sala ${multiCodigoSala} exige una entrada de: 🪙${data.apuesta_oro || 0} monedas de Oro.\n⚠️ El monto se debitará de tu cuenta al iniciar la simulación si confirmás tu plantilla. ¿Querés continuar?`;
                } else if (multiTipoApuestaActual === 'carta') {
                    cartelAdvertencia = `🚨 ¡CUIDADO CRACK!\n\nLa Sala ${multiCodigoSala} es una contienda: POR CARTAS REPETIDAS.\n⚠️ Se descontará automáticamente un cromo repetido de tu stock al dar el silbatazo inicial. Si perdés, no vuelve. ¿Te la bancás?`;
                }
    
                ocultarCarga();
    
                if (!confirm(cartelAdvertencia)) {
                    return;
                }
    
                const resSala = await fetch(`${URL_BASE}/multijugador/sala/${multiCodigoSala}`);
                const dataSala = await resSala.json();
                if (dataSala.ok) {
                    multiSalaId = dataSala.sala_id;
                }
    
            } catch (e) { 
                ocultarCarga(); 
                return alert("Error de conexión con la sala."); 
            }
        } else {
            const inputApuesta = document.getElementById("multi-input-apuesta");
            multiApuestaFijada = inputApuesta ? (parseInt(inputApuesta.value) || 0) : 0;
            const selectTipo = document.getElementById("multi-select-tipo-apuesta");
            multiTipoApuestaActual = selectTipo ? selectTipo.value.toLowerCase() : 'amistoso';
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
                   btn.innerText = `⚽ ${sanitizarHTML(pais).toUpperCase()}`;
                   btn.onclick = () => iniciarDraftJugadoresMundialMulti(pais);
                   contenedorTerna.appendChild(btn);
              });
         } catch (err) { console.error(err); ocultarCarga(); }
    }
    
    function iniciarDraftJugadoresMundialMulti(paisElegido) {
         mundialSeleccionUsuario = paisElegido;
         document.getElementById("multi-fase-inscripcion").style.display = "none";
         document.getElementById("multi-fase-draft").style.display = "block";
         document.getElementById("multi-lbl-tu-seleccion").innerText = sanitizarHTML(paisElegido).toUpperCase();
    
         const wrapperApuestaInvitado = document.getElementById("multi-wrapper-apuesta-invitado");
         if (wrapperApuestaInvitado) wrapperApuestaInvitado.style.display = "none";
         
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
              card.innerHTML = `<img src="${sanitizarHTML(carta.foto)}" class="carta-foto" alt="${sanitizarHTML(carta.nombre)}"><div class="rareza-vertical">${sanitizarHTML(carta.rareza).toUpperCase()}</div>`;
    
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
        
        multiMiCartaApostadaTexto = "Cromo repetido de tu stock";
    
        mostrarCarga("Enviando planilla de vestuarios a la Arena Online...");
        let url = `${URL_BASE}/multijugador/crear`;
        let cuerpo = {
            usuario_id: usuarioActual.id, seleccion: paisElegido, jugador_ids: arrayIdsJugadores,
            tipo_apuesta: multiTipoApuestaActual, apuesta_oro: multiApuestaFijada
        };
    
        if (!multiEsCreador) {
            url = `${URL_BASE}/multijugador/unirse`;
            cuerpo = {
                usuario_id: usuarioActual.id, seleccion: paisElegido, jugador_ids: arrayIdsJugadores,
                codigo_sala: multiCodigoSala
            };
        }
    
        try {
            const res = await fetch(url, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo)
            });
            const data = await res.json();
    
            if (!data.ok) { ocultarCarga(); return alert(data.mensaje); }
            
            multiSalaId = data.sala_id;
            if (data.codigo_sala) multiCodigoSala = data.codigo_sala;
    
            document.getElementById("multi-fase-draft").style.display = "none";
            document.getElementById("multi-lobby-espera").style.display = "block";
            document.getElementById("lobby-txt-codigo").innerText = sanitizarHTML(multiCodigoSala);
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
            if (data.tipo_apuesta) multiTipoApuestaActual = data.tipo_apuesta.toLowerCase();
    
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
                let detalle = `🪙 MODALIDAD: TIMBA POR ORO\n⚠️ El Oro se debitará de tu cuenta al presionar 'Iniciar'.`;
                if (multiTipoApuestaActual === 'carta') {
                     detalle = `🃏 DUELO DE CARTAS REPETIDAS\n⚠️ ¡Muerte Súbita! Se descontará una carta repetida de tu stock al arrancar.\n\n🔒 TU APUESTA: CRÓMICA AUTOMÁTICA`;
                } else if (multiTipoApuestaActual === 'amistoso') { detalle = `🤝 MODALIDAD: AMISTOSO ONLINE`; }
                
                infoSalaBox.innerHTML = `<div style="background:rgba(11,17,30,0.8); padding:12px; border-radius:8px; border:1px solid var(--dorado); text-align:center; font-weight:bold; color:var(--dorado); margin-bottom:15px; font-family:'Oswald'; white-space:pre-line;">${detalle}</div>`;
            }
    
            const txtPozo = document.getElementById("lobby-txt-pozo");
            if (txtPozo) {
                if (multiTipoApuestaActual === 'carta') txtPozo.innerText = `🎰 Pozo: 1 Cromo Épico/Leg Mínimo`;
                else if (multiTipoApuestaActual === 'amistoso') txtPozo.innerText = `⚽ Modo de Práctica`;
                else txtPozo.innerText = `💰 Pozo Estimado: ${data.apuesta_oro * 2} Oro`;
            }
            
            document.getElementById("lobby-cnt-jugadores").innerText = data.participantes.length;
            contenedorListado.innerHTML = "";
    
            data.participantes.forEach(p => {
                const div = document.createElement("div");
                div.style.cssText = "background:rgba(255,255,255,0.05); padding:10px 15px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; border-left:4px solid var(--verde-match); margin-bottom:6px;";
                const esHost = p.usuario_id === data.creador_id;
                div.innerHTML = `<span style="font-weight:bold; color:#fff;">${esHost ? '👑 ' : ''}${sanitizarHTML(p.username)}</span><span style="color:var(--dorado); font-family:'Oswald';">⚽ ${sanitizarHTML(p.seleccion).toUpperCase()}</span>`;
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
    
            renderizarFixturePasoAPaso(data.bitacora, data.premio);
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
              
              renderizarFixturePasoAPaso(data.bitacora, data.premio);
         } catch(e) { console.error(e); ocultarCarga(); }
    }
    
    function renderizarFixturePasoAPaso(bitacora, premio, apuestasTexto) {
        document.getElementById("multi-lobby-espera").style.display = "none";
        document.getElementById("multi-pantalla-fixture").style.display = "block";
        const tablero = document.getElementById("multi-cronologia-goles");
        if (!tablero) return; tablero.innerHTML = ""; 
    
        if (apuestasTexto && Array.isArray(apuestasTexto) && apuestasTexto.length > 0) {
            const bloqueTextoApuestas = document.createElement("div");
            bloqueTextoApuestas.style.cssText = "background: rgba(255, 0, 0, 0.05); border: 1px solid var(--rojo); padding: 12px; border-radius: 8px; margin-bottom: 20px; font-weight: bold; text-align: center;";
            bloqueTextoApuestas.innerHTML = `⚠️ <span style="color: var(--rojo); font-family: 'Oswald';">CROMOS ARRIESGADOS:</span><br>${apuestasTexto.map(sanitizarHTML).join('<br>')}`;
            tablero.appendChild(bloqueTextoApuestas);
        }
    
        if (!bitacora || !Array.isArray(bitacora) || bitacora.length === 0) return;
        let secuenciaPromesas = Promise.resolve();
    
        bitacora.forEach((partido, index) => {
            const loc = sanitizarHTML(partido.local) || "Local"; 
            const vis = sanitizarHTML(partido.visitante) || "Rival";
            const rondaNombre = sanitizarHTML(partido.ronda) || `PARTIDO #${index + 1}`;
            const golesLocalDefinitivos = partido.golesLocal || 0; 
            const golesVisitanteDefinitivos = partido.golesVisitante || 0;
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
    
                     const timerMulti = setInterval(() => {
                         minVirtual += 5; 
                         if (minVirtual > 90) minVirtual = 90;
    
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
    
                         if (document.getElementById(`multi-reloj-${index}`)) {
                              document.getElementById(`multi-reloj-${index}`).innerText = `⏱️ MINUTO ${minVirtual.toString().padStart(2,'0')}:00`;
                         }
                         if (document.getElementById(`multi-score-${index}`)) {
                              document.getElementById(`multi-score-${index}`).innerText = `${gL_act} - ${gV_act}`;
                         }
    
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
                              finTexto.innerText = `🏆 GANADOR: ${sanitizarHTML(partido.ganadorUsername).toUpperCase()} ✅`;
                              bloquePartido.appendChild(finTexto);
                              
                              document.getElementById(`multi-log-vivo-${index}`).innerText = "🏁 El árbitro pita el final del encuentro. Planillas guardadas con éxito.";
                              resolveCruce(); 
                         }
                     }, 400);
                });
            });
        });
    
         secuenciaPromesas.then(() => {
              const bloquePremio = document.createElement("div");
              bloquePremio.style.cssText = "text-align:center; margin-top:25px; padding:15px; background:rgba(0,255,136,0.05); border:2px dashed var(--dorado); border-radius:10px;";
              let textoPremio = `👑 ¡Fin de la transmisión!\n🎁 El torneo ha concluido exitosamente.`;
              
              if (premio && !premio.ganoBot) {
                   if (premio.tipo_apuesta === 'oro') {
                        textoPremio = `🏆 ¡FIN DEL TORNEO! 🏆\n👑 Campeón: ${sanitizarHTML(premio.ganador_username).toUpperCase()}\n🎁 ¡Se lleva 🪙 ${premio.pozo} de Oro!`;
                        
                        if (usuarioActual) {
                            if (premio.ganador_username.toLowerCase() === usuarioActual.username.toLowerCase()) {
                                usuarioActual.monedas += (premio.pozo / 2); 
                            } else {
                                usuarioActual.monedas -= (premio.pozo / 2); 
                            }
                            const elMonedas = document.getElementById("lbl-monedas");
                            if (elMonedas) elMonedas.innerText = usuarioActual.monedas;
                        }
    
                   } else if (premio.tipo_apuesta === 'carta') {
                        textoPremio = `🏆 ¡FIN DEL TORNEO! 🏆\n👑 Campeón: ${sanitizarHTML(premio.ganador_username).toUpperCase()}\n\n🎉 ¡Conservás tu cromo y ganaste a:\n🌟 [ ${sanitizarHTML(premio.nombreCartaPremio) || 'Jugador Épico'} ]!\n\n💀 Los perdedores perdieron su cromo permanentemente.`;
                   }
              } else if (premio && premio.ganoBot) {
                   textoPremio = premio.tipo_apuesta === 'carta' ? `🤖 ¡El torneo fue conquistado por un Bot (${sanitizarHTML(premio.ganador_username).toUpperCase()})!\n\n💀 Ambos jugadores perdieron sus cartas permanentemente.` : `🤖 ¡Torneo conquistado por un Bot (${sanitizarHTML(premio.ganador_username).toUpperCase()})!\n💸 El pozo se disolvió.`;
                   
                   if (premio.tipo_apuesta === 'oro' && usuarioActual) {
                        usuarioActual.monedas -= (premio.pozo / 2);
                        const elMonedas = document.getElementById("lbl-monedas");
                        if (elMonedas) elMonedas.innerText = usuarioActual.monedas;
                   }
              }
              
              if (premio && (premio.tipo_apuesta === 'carta' || premio.tipo_apuesta === 'oro') && typeof actualizarInterfazUI === 'function') {
                   actualizarInterfazUI();
              }
              
              // Se inserta usando textContent en los elementos de texto por seguridad
              bloquePremio.innerHTML = `<h3 style="color:var(--dorado); font-family:'Oswald';">🏁 CRÓNICA DEFINITIVA</h3><p id="texto-premio-seguro" style="color:#fff; font-weight:bold; white-space:pre-line;"></p><button type="button" id="btn-regresar-limpio-multi" class="btn-estadio" style="width:80%; margin-top:15px; background:var(--celeste);">🔄 REGRESAR A LA HOME</button>`;
              tablero.appendChild(bloquePremio); 
              document.getElementById("texto-premio-seguro").textContent = textoPremio;
              bloquePremio.scrollIntoView({ behavior: 'smooth' });
    
              document.getElementById("btn-regresar-limpio-multi").onclick = () => {
                  document.getElementById("multi-pantalla-fixture").style.display = "none";
                  document.getElementById("multi-menu-inicial").style.display = "block";
                  if (document.getElementById("modulo-mundial-multi")) document.getElementById("modulo-mundial-multi").style.display = "block";
                  liberarNavegacionArenaUI(); multiSalaId = null; multiCodigoSala = null; multiEsCreador = false; jugadoresSeleccionadosDraft = [];
                  const btnTienda = document.querySelector("button[onclick*='modulo-sobres']"); cambiarModulo('modulo-sobres', btnTienda);
              };
         });
    }
    
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
                const miAlbumReal = albumCompleto || [];
                const repetidas = miAlbumReal.filter(f => f && f.obtenido > 1);
    
                if (repetidas.length === 0) {
                    const opt = document.createElement("option"); opt.value = ""; opt.innerText = "❌ Sin cromos repetidos";
                    selectCromoMulti.appendChild(opt);
                } else {
                    repetidas.forEach(figu => {
                        const opt = document.createElement("option"); opt.value = figu.id;
                        opt.innerText = `${figu.bandera || '🃏'} ${sanitizarHTML(figu.nombre).toUpperCase()} (x${figu.obtenido})`;
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
       📢 10. LEADERBOARDS Y BANNER INFORMATIVO
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
    
                   const tdPos = document.createElement("td"); tdPos.innerHTML = `<b>${posicionText}</b>`;
                   const tdUser = document.createElement("td"); 
                   tdUser.style.cssText = "text-align: left; padding-left: 15px;";
                   tdUser.textContent = user.username;
                   if (usuarioActual && user.username === usuarioActual.username) {
                       const spanVos = document.createElement("span");
                       spanVos.style.cssText = "color:var(--celeste); font-size:0.8rem;";
                       spanVos.textContent = " (Vos)";
                       tdUser.appendChild(spanVos);
                   }
                   const tdPts = document.createElement("td");
                   tdPts.style.cssText = "color: #ff4a4a; font-weight: bold;";
                   tdPts.textContent = user.puntos_ranking;
    
                   tr.appendChild(tdPos); tr.appendChild(tdUser); tr.appendChild(tdPts);
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
    
                   const tdPos = document.createElement("td"); tdPos.innerHTML = `<b>${posicionText}</b>`;
                   const tdUser = document.createElement("td");
                   tdUser.style.cssText = "text-align: left; padding-left: 15px;";
                   tdUser.textContent = user.username.toUpperCase();
                   if (usuarioActual && user.username === usuarioActual.username) {
                       const spanVos = document.createElement("span");
                       spanVos.style.cssText = "color:var(--celeste); font-size:0.8rem;";
                       spanVos.textContent = " (Vos)";
                       tdUser.appendChild(spanVos);
                   }
                   const tdCups = document.createElement("td");
                   tdCups.style.cssText = "color: var(--dorado); font-weight: bold; font-size: 1.2rem;";
                   tdCups.textContent = `🏆 ${user.copas_mundiales}`;
    
                   tr.appendChild(tdPos); tr.appendChild(tdUser); tr.appendChild(tdCups);
                   tbody.appendChild(tr);
              });
         } catch (err) { console.error("Error al cargar ranking de mundiales:", err); }
    }
    
    let datosInformeParcheCache = null;
    
    async function iniciarControladorAnunciosSeguro() {
        try {
            const res = await fetch(`${URL_BASE}/anuncio-actual`);
            const anuncio = await res.json();
            if (!anuncio || !anuncio.activo) return;
    
            datosInformeParcheCache = anuncio.informe || null;
    
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
                const img = document.createElement('img'); img.src = sanitizarHTML(anuncio.urlImagen); img.className = "anuncio-media"; img.alt = "Novedades";
                cuerpoHtml.appendChild(img);
            } else if (anuncio.tipo === "video" && anuncio.urlVideo) {
                const containerVideo = document.createElement('div'); containerVideo.className = "anuncio-video-container";
                const iframe = document.createElement('iframe'); iframe.src = sanitizarHTML(anuncio.urlVideo); iframe.setAttribute('allowfullscreen', 'true'); iframe.style.border = "none";
                containerVideo.appendChild(iframe); cuerpoHtml.appendChild(containerVideo);
            }
            modal.style.display = "flex";
        } catch (err) { console.error("Error en banner de novedades:", err); }
    }
    
    function cerrarAnuncioGlobal() {
        const modal = document.getElementById('modalAnuncioGlobal');
        if (modal) { 
            modal.style.display = "none"; 
            document.getElementById('anuncioCuerpo').innerHTML = ""; 
        }
        if (datosInformeParcheCache) {
            abrirInformeActualizacionUI(datosInformeParcheCache);
        }
    }
    
    function abrirInformeActualizacionUI(info) {
        const elVersion = document.getElementById("informe-txt-version");
        const elFecha = document.getElementById("informe-txt-fecha");
        const contenedorCambios = document.getElementById("informe-lista-cambios");
        
        if (elVersion) elVersion.innerText = info.version || "v2.0";
        if (elFecha) elFecha.innerText = info.fecha || "Reciente";
        
        if (contenedorCambios) {
            contenedorCambios.innerHTML = "";
            if (Array.isArray(info.cambios)) {
                info.cambios.forEach(cambio => {
                    const p = document.createElement("p");
                    p.style.margin = "0";
                    // En lugar de innerHTML directo, lo sanitizamos primero y después aplicamos la negrita
                    let textoSeguro = sanitizarHTML(cambio);
                    p.innerHTML = textoSeguro.replace(/\*\*(.*?)\*\*/g, '<b style="color:var(--dorado);">$1</b>');
                    contenedorCambios.appendChild(p);
                });
            }
        }
        
        const modalParche = document.getElementById("modal-informe-parche");
        if (modalParche) modalParche.style.display = "flex";
    }
    
    function cerrarInformeParche() {
        const modalParche = document.getElementById("modal-informe-parche");
        if (modalParche) modalParche.style.display = "none";
        datosInformeParcheCache = null; 
    }
    
    function abrirMercadoBot(listaTusRepetidas) {
        const contenedorBot = document.getElementById("modulo-comerciante-bot");
        contenedorBot.style.display = "block";
    
        contenedorBot.innerHTML = `
            <div style="background: #0f172a; border: 2px solid var(--dorado); padding: 20px; border-radius: 12px; text-align: center; max-width: 500px; margin: 20px auto;">
                <h3 style="color: var(--dorado); font-family: 'Oswald'; font-size: 1.5rem; margin-top: 0;">🤖 BOT COMERCIANTE</h3>
                <p style="color: #94a3b8; font-size: 0.9rem; font-style: italic;">
                    "Traeme 3 cartas repetidas de la misma rareza y te daré una carta de un escalón superior. ¡Si sacrificás cartas de Élite podrías activar recompensas especiales ocultas!"
                </p>
                
                <div id="zona-seleccion-bot" style="margin: 15px 0; text-align: left;">
                     <label style="color: #fff; font-size: 0.85rem; font-weight: bold;">Elegí tus 3 cartas a sacrificar (Deben ser de igual rareza):</label>
                     <div id="lista-checks-repetidas" style="max-height: 200px; min-height: 60px; overflow-y: auto; background: #020617; padding: 10px; border-radius: 6px; margin-top: 5px;">
                     </div>
                </div>
    
                <button type="button" id="btn-ejecutar-trato" class="btn-estadio" style="background: var(--verde-match); color: #000; width: 100%; font-weight: bold; transition: all 0.3s ease;">
                     🤝 FIRMAR CONTRATO DE TRADEO
                </button>
                <div id="resultado-trato-bot" style="margin-top: 12px; font-weight: bold; font-size: 0.95rem;"></div>
            </div>
        `;
    
        const listaCheckboxes = document.getElementById("lista-checks-repetidas");
        listaCheckboxes.innerHTML = ""; 
    
        let contadorRepetidas = 0;
        
        listaTusRepetidas.forEach(jugador => {
             const copias = jugador.obtenido !== undefined ? jugador.obtenido : (jugador.cantidad || 0);
    
             if (copias > 1) {
                  contadorRepetidas++;
                  listaCheckboxes.innerHTML += `
                       <label style="display: flex; align-items: center; gap: 10px; color: #cbd5e1; font-size: 0.85rem; margin-bottom: 8px; cursor: pointer; text-align: left; width: 100%;">
                            <input type="checkbox" class="check-cromo-bot" value="${jugador.id}" style="width: 16px; height: 16px; cursor: pointer; flex-shrink: 0;">
                            <span style="flex-grow: 1;">${sanitizarHTML(jugador.nombre) || 'Jugador'} (${sanitizarHTML(jugador.rareza || 'comun').toUpperCase()}) - Repetidas: [${copias - 1}]</span>
                       </label>
                  `;
             }
        });
    
        if (contadorRepetidas === 0) {
             listaCheckboxes.style.display = "flex";
             listaCheckboxes.style.flexDirection = "column";
             listaCheckboxes.style.justifyContent = "center";
             
             listaCheckboxes.innerHTML = `
                  <div style="color: var(--rojo); font-weight: bold; font-size: 0.9rem; text-align: center; width: 100%;">
                       ❌ No tenés cromos repetidos en tu álbum para negociar.
                  </div>
             `;
             const btnTrato = document.getElementById("btn-ejecutar-trato");
             btnTrato.disabled = true;
             btnTrato.style.background = "#334155";
             btnTrato.style.color = "#94a3b8";
             btnTrato.style.cursor = "not-allowed";
             btnTrato.innerText = "⛔ SIN ELEMENTOS PARA INTERCAMBIAR";
        } else {
             listaCheckboxes.style.display = "block";
        }
    
        document.getElementById("btn-ejecutar-trato").onclick = async () => {
             const seleccionados = Array.from(document.querySelectorAll('.check-cromo-bot:checked')).map(cb => parseInt(cb.value));
    
             if (seleccionados.length !== 3) {
                  alert("⚠️ Tenés que seleccionar exactamente 3 cromos repetidos para hacer el trato.");
                  return;
             }
    
             document.getElementById("btn-ejecutar-trato").disabled = true;
             document.getElementById("resultado-trato-bot").style.color = "#fff";
             document.getElementById("resultado-trato-bot").innerText = "⏳ El bot está tasando tus cartas...";
    
             try {
                  const res = await fetch('/api/album/comerciar-bot', {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ usuario_id: usuarioActual.id, jugadorIdsASacar: seleccionados })
                  });
                  const data = await res.json();
    
                  if (data.ok) {
                       document.getElementById("resultado-trato-bot").style.color = "var(--verde-match)";
                       
                       let plantillaMensaje = `
                           🎉 ¡Trato hecho!<br>
                           🌟 CROMO RECIBIDO: <span style="color: var(--dorado);">${sanitizarHTML(data.cartaGanada.nombre)} [${sanitizarHTML(data.cartaGanada.rareza)}]</span>
                       `;
    
                       if (data.eventoEspecial) {
                            plantillaMensaje += `<br><br><span style="color: #38bdf8; font-weight: bold; font-size: 0.95rem; display: block; padding: 8px; background: #0c4a6e; border-radius: 6px; border: 1px dashed #0284c7;">${sanitizarHTML(data.eventoEspecial)}</span>`;
                            alert(`🎁 ¡EVENTO ULTRA RARO ACTIVADO!\n\n${sanitizarHTML(data.eventoEspecial)}`);
                       }
    
                       document.getElementById("resultado-trato-bot").innerHTML = plantillaMensaje;
                       
                       setTimeout(() => { 
                           cargarAlbumLocal(); 
                           cambiarModulo('modulo-album', null);
                       }, 3500);
                  } else {
                       document.getElementById("resultado-trato-bot").style.color = "var(--rojo)";
                       document.getElementById("resultado-trato-bot").innerText = data.mensaje || data.error || "❌ La Arena rechazó el intercambio.";
                       document.getElementById("btn-ejecutar-trato").disabled = false;
                  }
             } catch (err) {
                  console.error(err);
                  document.getElementById("resultado-trato-bot").style.color = "var(--rojo)";
                  document.getElementById("resultado-trato-bot").innerText = "❌ Error de conexión con la Arena.";
                  document.getElementById("btn-ejecutar-trato").disabled = false;
             }
        };
    }
    
    function cargarMisRepetidasParaVenta() {
        const select = document.getElementById("select-mercado-vender");
        if (!select) return;
        select.innerHTML = '<option value="">-- Elegí tu cromo --</option>';
        
        const cartas = albumCompleto || [];
        cartas.forEach(jugador => {
            const copias = jugador.obtenido !== undefined ? jugador.obtenido : (jugador.cantidad || 0);
            if (copias > 1) {
                select.innerHTML += `<option value="${jugador.id}">${sanitizarHTML(jugador.nombre)} (${sanitizarHTML(jugador.rareza || 'comun').toUpperCase()}) [x${copias - 1}]</option>`;
            }
        });
    }
    
    async function publicarCartaMercado() {
        const jugadorId = document.getElementById("select-mercado-vender").value;
        const precio = parseInt(document.getElementById("input-mercado-precio").value);
    
        if (!jugadorId || !precio || precio < 50) {
            alert("⚠️ Seleccioná un cromo válido y un precio mínimo de 🪙50 de Oro.");
            return;
        }
    
        try {
            const res = await fetch('/api/mercado/publicar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario_id: parseInt(usuarioActual.id), jugador_id: parseInt(jugadorId), precio })
            });
            const data = await res.json();
            
            if (data.ok) {
                alert("✨ Cromo publicado en la vitrina internacional.");
                document.getElementById("input-mercado-precio").value = "";
                cargarAlbumLocal(); 
                setTimeout(() => { cambiarModulo('modulo-mercado-pases', document.getElementById('btn-nav-mercado')); }, 500);
            } else {
                alert(data.mensaje);
            }
        } catch (err) {
            console.error(err);
        }
    }
    
    async function obtenerOfertasMercado() {
        const grid = document.getElementById("grid-mercado-pases");
        if (!grid) return;
        grid.innerHTML = "<p style='color:#64748b; grid-column:1/-1; text-align:center;'>⏳ Cargando vitrina de pases...</p>";
    
        const idLimpio = usuarioActual && usuarioActual.id ? parseInt(usuarioActual.id) : null;
    
        if (!idLimpio || isNaN(idLimpio)) {
            grid.innerHTML = "<p style='color:var(--rojo); grid-column:1/-1; text-align:center;'>❌ Sesión de usuario inválida.</p>";
            return;
        }
    
        try {
            const res = await fetch(`/api/mercado/ofertas?usuario_id=${idLimpio}`);
            const data = await res.json();
    
            if (!data.ok) {
                grid.innerHTML = `<p style='color:var(--rojo); grid-column:1/-1; text-align:center;'>❌ Error del servidor: ${sanitizarHTML(data.error) || 'Consola backend'}</p>`;
                return;
            }
    
            if (data.ofertas.length === 0) {
                grid.innerHTML = "<p style='color:#64748b; grid-column:1/-1; text-align:center;'>🏪 La vitrina está vacía en este momento.</p>";
                return;
            }
    
            grid.innerHTML = "";
            data.ofertas.forEach(oferta => {
                const esMia = (parseInt(oferta.vendedor_id) === idLimpio);
                
                let etiquetaTiempo = "⏱️ Vence en 1 día";
                let colorTiempo = "var(--celeste)"; 
    
                if (oferta.segundos_restantes !== undefined && oferta.segundos_restantes !== null) {
                    const segundos = parseFloat(oferta.segundos_restantes);
                    if (segundos > 0) {
                        const horasTotales = Math.floor(segundos / 3600);
                        const minutosRestantes = Math.floor((segundos % 3600) / 60);
                        
                        if (horasTotales > 0) {
                            etiquetaTiempo = `⏱️ Quedan: ${horasTotales}h ${minutosRestantes}m`;
                        } else {
                            etiquetaTiempo = `🚨 ¡Vence en: ${minutosRestantes} min!`;
                            colorTiempo = "var(--rojo)";
                        }
                    } else {
                        etiquetaTiempo = "⏳ Expirando...";
                        colorTiempo = "var(--rojo)";
                    }
                }
    
                const btnAccion = esMia 
                    ? `<button type="button" class="btn-estadio" style="background: #475569; color:#fff; width:100%; font-size:0.8rem; padding: 5px 0; cursor: not-allowed;" disabled>TU PUBLICACIÓN</button>`
                    : `<button type="button" class="btn-estadio" style="background: var(--dorado); color:#000; width:100%; font-size:0.8rem; padding: 5px 0;" onclick="comprarCartaMercado(${oferta.id})">COMPRAR</button>`;
    
                grid.innerHTML += `
                    <div style="background: #1e293b; border: 1px solid ${esMia ? '#475569' : 'var(--dorado)'}; border-radius: 8px; padding: 12px; text-align: center; display: flex; flex-direction: column; justify-content: space-between; opacity: ${esMia ? '0.8' : '1'};">
                        <div>
                            <span style="font-size: 1.5rem; display:block; margin-bottom:5px;">${sanitizarHTML(oferta.bandera) || '🛡️'}</span>
                            <strong style="color: #fff; font-size: 0.95rem; display:block;">${sanitizarHTML(oferta.nombre)}</strong>
                            <span style="font-size:0.75rem; color:var(--celeste); font-weight:bold; display:block; margin-top:2px;">${sanitizarHTML(oferta.rareza || 'comun').toUpperCase()}</span>
                            <span style="font-size:0.75rem; color:#94a3b8; display:block; margin-top:4px;">${esMia ? '✨ Tuya' : 'Vendedor: ' + sanitizarHTML(oferta.nombre_vendedor || 'Usuario')}</span>
                            
                            <span style="font-size:0.75rem; color:${colorTiempo}; font-weight:bold; display:block; margin-top:4px; font-family:'Oswald';">${etiquetaTiempo}</span>
                        </div>
                        <div style="margin-top: 10px;">
                            <div style="color: var(--dorado); font-weight: bold; font-size: 1rem; margin-bottom: 8px;">🪙 ${oferta.precio_oro}</div>
                            ${btnAccion}
                        </div>
                    </div>
                `;
            });
        } catch (err) {
            console.error(err);
            grid.innerHTML = "<p style='color:var(--rojo); grid-column:1/-1; text-align:center;'>❌ Error de red en la Arena.</p>";
        }
    }
    
    async function comprarCartaMercado(ofertaId) {
        try {
            const res = await fetch('/api/mercado/comprar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario_id: parseInt(usuarioActual.id), oferta_id: ofertaId })
            });
            const data = await res.json();
    
            if (data.ok) {
                alert(`🎉 ¡Fichaje cerrado! Recibiste a ${sanitizarHTML(data.jugador)}. El Oro fue transferido.`);
                
                if (usuarioActual && data.nuevoOro !== undefined) {
                    usuarioActual.monedas = data.nuevoOro;
                }
    
                const elMonedas = document.getElementById("lbl-monedas");
                if (elMonedas && data.nuevoOro !== undefined) {
                    elMonedas.innerText = data.nuevoOro;
                }
    
                if (typeof cargarDatosUsuario === "function") cargarDatosUsuario();
                if (typeof actualizarPerfilUI === "function") actualizarPerfilUI();
    
                cargarAlbumLocal(); 
                obtenerOfertasMercado();
    
            } else {
                alert(data.mensaje);
            }
        } catch (err) {
            console.error(err);
            alert("❌ Ocurrió un problema de red al procesar el fichaje.");
        }
    }
    
    let eleccionesQuiniela = { p1: null, p2: null, p3: null };
    
    async function cargarPartidosQuinielaUI() {
        const contenedor = document.getElementById("contenedor-lista-quiniela");
        if (!contenedor) return;
    
        try {
            const res = await fetch('/api/timba/quiniela/partidos');
            const data = await res.json();
    
            if (data.ok && data.partidos.length === 3) {
                contenedor.innerHTML = ""; 
    
                data.partidos.forEach((partido, index) => {
                    const numP = index + 1;
                    contenedor.innerHTML += `
                        <div style="background: rgba(2, 6, 23, 0.6); padding: 10px; border-radius: 6px; border: 1px solid #334155;">
                            <div style="color: #cbd5e1; font-size: 0.8rem; font-weight: bold; text-align: center; margin-bottom: 6px; letter-spacing: 0.5px;">
                                ${sanitizarHTML(partido.emoji)} PARTIDO ${numP}: ${sanitizarHTML(partido.local)} vs ${sanitizarHTML(partido.visitante)}
                            </div>
                            <div style="display: flex; justify-content: space-around; gap: 6px;">
                                <button type="button" class="btn-quiniela-p${numP}" style="background: #1e293b; color: #fff; padding: 6px 10px; cursor: pointer; font-size: 0.75rem; border-radius: 4px; border: 1px solid #475569; width: 32%; font-weight: bold;" onclick="seleccionarQuiniela(${numP}, 'L', this)">LOCAL</button>
                                <button type="button" class="btn-quiniela-p${numP}" style="background: #1e293b; color: #fff; padding: 6px 10px; cursor: pointer; font-size: 0.75rem; border-radius: 4px; border: 1px solid #475569; width: 32%; font-weight: bold;" onclick="seleccionarQuiniela(${numP}, 'E', this)">EMPATE</button>
                                <button type="button" class="btn-quiniela-p${numP}" style="background: #1e293b; color: #fff; padding: 6px 10px; cursor: pointer; font-size: 0.75rem; border-radius: 4px; border: 1px solid #475569; width: 32%; font-weight: bold;" onclick="seleccionarQuiniela(${numP}, 'V', this)">VISITA</button>
                            </div>
                        </div>
                    `;
                });
            }
        } catch (err) {
            console.error("Error cargando quiniela rotativa:", err);
            contenedor.innerHTML = "<p style='color:var(--rojo); text-align:center;'>❌ Error al sincronizar la cartelera.</p>";
        }
    }
    
    function seleccionarQuiniela(partido, prediccion, boton) {
        document.querySelectorAll(`.btn-quiniela-p${partido}`).forEach(btn => {
            btn.style.background = "#1e293b";
            btn.style.color = "#fff";
            btn.style.borderColor = "#475569";
        });
    
        boton.style.background = "var(--dorado, #fbbf24)";
        boton.style.color = "#000";
        boton.style.borderColor = "var(--dorado, #fbbf24)";
    
        eleccionesQuiniela[`p${partido}`] = prediccion;
    }
    
    async function enviarBoletaQuiniela() {
        const monto = parseInt(document.getElementById("input-monto-quiniela").value);
        const divRes = document.getElementById("resultado-quiniela");
    
        const btnTimbaComun = document.getElementById("btn-preparar-apuesta"); 
    
        if (btnTimbaComun && btnTimbaComun.disabled) {
            alert("⚠️ ¡Sin energía! Debés esperar a que se recargue el cronómetro de la Timba para poder jugar otra boleta.");
            return;
        }
    
        if (!eleccionesQuiniela.p1 || !eleccionesQuiniela.p2 || !eleccionesQuiniela.p3) {
            alert("⚠️ Seleccioná un pronóstico para los 3 partidos vigentes.");
            return;
        }
        if (!monto || monto < 50) {
            alert("⚠️ El monto mínimo es de 🪙50.");
            return;
        }
    
        divRes.style.color = "#fff";
        divRes.innerText = "⏳ Procesando boleta combinada...";
    
        try {
            const res = await fetch('/api/timba/quiniela', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario_id: usuarioActual.id,
                    monto: monto,
                    elecciones: eleccionesQuiniela
                })
            });
            const data = await res.json();
    
            if (data.ok) {
                if (usuarioActual && data.nuevoOro !== undefined) usuarioActual.monedas = data.nuevoOro;
                const elMonedas = document.getElementById("lbl-monedas");
                if (elMonedas && data.nuevoOro !== undefined) elMonedas.innerText = data.nuevoOro;
    
                if (typeof actualizarTimbasRestantesUI === "function") {
                    actualizarTimbasRestantesUI();
                }
    
                const trad = (sigla) => sigla === 'L' ? 'Local' : (sigla === 'E' ? 'Empate' : 'Visita');
                
                const p1 = data.partidosSimulados[0];
                const p2 = data.partidosSimulados[1];
                const p3 = data.partidosSimulados[2];
    
                const desglose = `<br><span style="color:#94a3b8; font-size:0.8rem;">
                    [${sanitizarHTML(p1.local)} vs ${sanitizarHTML(p1.visitante)}: ${trad(data.resultadosReales.p1)}]<br>
                    [${sanitizarHTML(p2.local)} vs ${sanitizarHTML(p2.visitante)}: ${trad(data.resultadosReales.p2)}]<br>
                    [${sanitizarHTML(p3.local)} vs ${sanitizarHTML(p3.visitante)}: ${trad(data.resultadosReales.p3)}]
                </span>`;
    
                if (data.ganó) {
                    divRes.style.color = "var(--verde-match, #10b981)";
                    divRes.innerHTML = `🎉 ${sanitizarHTML(data.mensaje)}${desglose}`;
                } else {
                    divRes.style.color = "var(--rojo, #ef4444)";
                    divRes.innerHTML = `❌ ${sanitizarHTML(data.mensaje)}${desglose}`;
                }
    
                document.getElementById("input-monto-quiniela").value = "100";
                eleccionesQuiniela = { p1: null, p2: null, p3: null };
                
                document.querySelectorAll('[class^="btn-quiniela-p"]').forEach(btn => {
                    btn.style.background = "#1e293b";
                    btn.style.color = "#fff";
                    btn.style.borderColor = "#475569";
                });
    
                cargarPartidosQuinielaUI();
    
            } else {
                divRes.style.color = "var(--rojo)";
                divRes.innerText = data.mensaje;
            }
        } catch (err) {
            console.error(err);
            divRes.style.color = "var(--rojo)";
            divRes.innerText = "❌ Error de conexión.";
        }
    }


    /* ========================================================================
       🌐 EXPORTAR FUNCIONES AL SCOPE GLOBAL PARA LOS ONCLICK DEL HTML
       ======================================================================== */
    window.cambiarModulo = cambiarModulo;
    window.autenticarUsuario = autenticarUsuario;
    window.cerrarSesionLocal = cerrarSesionLocal;
    window.abrirModalAyuda = abrirModalAyuda;
    window.cerrarModalAyuda = cerrarModalAyuda;
    window.filtrarAlbumPorEstado = filtrarAlbumPorEstado;
    window.filtrarAlbumPorRareza = filtrarAlbumPorRareza;
    window.comprarSobreEspecifico = comprarSobreEspecifico;
    window.mostrarSiguienteCartaSecuencia = mostrarSiguienteCartaSecuencia;
    window.iniciarDueloLocal = iniciarDueloLocal;
    window.ejecutarPenalLocal = ejecutarPenalLocal;
    window.conmutarControlesTimbaUI = conmutarControlesTimbaUI;
    window.prepararOpcionesApuesta = prepararOpcionesApuesta;
    window.prepararInscripcionMundial = prepararInscripcionMundial;
    window.ejecutarTorneoMundial = ejecutarTorneoMundial;
    window.abrirDraftMulti = abrirDraftMulti;
    window.conmutarInputsMultiUI = conmutarInputsMultiUI;
    window.lanzarSimulacionMulti = lanzarSimulacionMulti;
    window.cerrarAnuncioGlobal = cerrarAnuncioGlobal;
    window.cerrarInformeParche = cerrarInformeParche;
    window.abrirMercadoBot = abrirMercadoBot;
    window.publicarCartaMercado = publicarCartaMercado;
    window.comprarCartaMercado = comprarCartaMercado;
    window.seleccionarQuiniela = seleccionarQuiniela;
    window.enviarBoletaQuiniela = enviarBoletaQuiniela;
})();
