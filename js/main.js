/*
  La Escala · main.js
  Interacciones del sitio (Clase 7). El contenido se ve igual sin JavaScript;
  este archivo agrega las funciones extra.

  01 Utilidades                   08 Agenda (calendario)
  02 Menú en celular              09 Plano de La Casa
  03 Cabecera, volver arriba      10 Galería ampliada (lightbox)
  04 Acordeones                   11 Formularios
  05 Buscador general             12 Estados: sin conexión, horario
  06 Filtros y "cargar más"       13 Índice lateral
  07 Fichas por ?id=
*/
"use strict";

/* 01. Utilidades */
const $ = (selector, contexto = document) => contexto.querySelector(selector);
const $$ = (selector, contexto = document) => [...contexto.querySelectorAll(selector)];

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Convierte "2026-10-24" en una fecha local (sin desfase de zona horaria).
function fechaDesdeTexto(texto) {
  const [a, m, d] = texto.split("-").map(Number);
  return new Date(a, m - 1, d);
}

// Convierte una fecha en "2026-10-24".
function textoDesdeFecha(fecha) {
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${m}-${d}`;
}

function fechaLarga(texto) {
  return fechaDesdeTexto(texto).toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function fechaCorta(texto) {
  const f = fechaDesdeTexto(texto);
  return `${f.getDate()} ${MESES[f.getMonth()]} ${f.getFullYear()}`;
}

// Quita tildes y mayúsculas para comparar textos ("Álvarez" = "alvarez").
function normalizar(texto) {
  return (texto || "").toString().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function escaparHTML(texto) {
  return String(texto).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Aviso flotante (toast) con role="status".
let temporizadorAviso;
function mostrarAviso(mensaje) {
  let aviso = $(".aviso-flotante");
  if (!aviso) {
    aviso = document.createElement("div");
    aviso.className = "aviso-flotante";
    aviso.setAttribute("role", "status");
    document.body.append(aviso);
  }
  aviso.textContent = mensaje;
  aviso.classList.add("es-visible");
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => aviso.classList.remove("es-visible"), 4000);
}

/* 02. Menú móvil */
function iniciarMenu() {
  const cabecera = $("[data-cabecera]");
  const boton = $("[data-menu-btn]");
  const menu = $("#menu");
  if (!cabecera || !boton || !menu) return;
  const texto = $("[data-menu-texto]", boton);

  function abrir(abierto) {
    boton.setAttribute("aria-expanded", String(abierto));
    boton.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
    if (texto) texto.textContent = abierto ? "Cerrar" : "Menú";
    cabecera.classList.toggle("menu-abierto", abierto);
    document.body.classList.toggle("sin-scroll", abierto);
    if (abierto) {
      const primero = $("a", menu);
      if (primero) primero.focus();
    }
  }

  boton.addEventListener("click", () => abrir(boton.getAttribute("aria-expanded") !== "true"));

  document.addEventListener("keydown", (evento) => {
    const abierto = boton.getAttribute("aria-expanded") === "true";
    if (!abierto) return;
    if (evento.key === "Escape") {
      abrir(false);
      boton.focus();
    }
    // Foco atrapado: Tab recorre solo el menú y el botón de cerrar.
    if (evento.key === "Tab") {
      const enfocables = [boton, ...$$("a", menu)];
      const indice = enfocables.indexOf(document.activeElement);
      const siguiente = evento.shiftKey ? indice - 1 : indice + 1;
      evento.preventDefault();
      enfocables[(siguiente + enfocables.length) % enfocables.length].focus();
    }
  });

  $$("a", menu).forEach((enlace) => enlace.addEventListener("click", () => abrir(false)));

  // Si se agranda la ventana a escritorio, el menú vuelve a su estado normal.
  window.matchMedia("(min-width: 1100px)").addEventListener("change", (e) => {
    if (e.matches) abrir(false);
  });
}

/* 03. Cabecera, volver arriba y barra de progreso
   La cabecera queda fija y solo se achica al bajar. Antes se escondía al
   hacer scroll y en Talleres y Agenda parecía que desaparecía el menú. */
function iniciarScroll() {
  const cabecera = $("[data-cabecera]");

  const arriba = document.createElement("button");
  arriba.type = "button";
  arriba.className = "volver-arriba";
  arriba.setAttribute("aria-label", "Volver arriba");
  arriba.innerHTML = '<span aria-hidden="true">↑</span>';
  document.body.append(arriba);
  arriba.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reducirMovimiento ? "auto" : "smooth" });
    const saltar = $(".saltar");
    if (saltar) saltar.focus({ preventScroll: true });
  });

  let barra = null;
  if (document.body.hasAttribute("data-progreso")) {
    barra = document.createElement("div");
    barra.className = "progreso";
    barra.setAttribute("aria-hidden", "true");
    document.body.append(barra);
  }

  let pendiente = false;

  function actualizar() {
    const y = window.scrollY;
    if (cabecera && !cabecera.classList.contains("menu-abierto")) {
      cabecera.classList.toggle("cabecera--compacta", y > 120);
    }
    arriba.classList.toggle("es-visible", y > 600);
    if (barra) {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      barra.style.transform = `scaleX(${total > 0 ? y / total : 0})`;
    }
    pendiente = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!pendiente) {
        pendiente = true;
        window.requestAnimationFrame(actualizar);
      }
    },
    { passive: true },
  );

  actualizar();
}

/* 04. Acordeones */
function iniciarAcordeones() {
  $$(".acordeon__btn").forEach((boton) => {
    const panel = document.getElementById(boton.getAttribute("aria-controls"));
    if (!panel) return;
    panel.hidden = boton.getAttribute("aria-expanded") !== "true";
    boton.addEventListener("click", () => {
      const abierto = boton.getAttribute("aria-expanded") === "true";
      boton.setAttribute("aria-expanded", String(!abierto));
      panel.hidden = abierto;
    });
  });
}

/* 05. Buscador general */
function indiceDeBusqueda() {
  const lista = [...PAGINAS];
  EXPOSICIONES.forEach((e) =>
    lista.push({
      titulo: e.titulo,
      url: `exposicion.html?id=${e.id}`,
      tipo: `${e.tipo} · ${e.estado === "finalizada" ? "Memoria" : e.estado === "proxima" ? "Próximamente" : "Ahora"}`,
      extra: e.artistas,
    }),
  );
  ARTISTAS.forEach((a) =>
    lista.push({
      titulo: a.nombre,
      url: `artista.html?id=${a.id}`,
      tipo: "Artista",
      extra: `${a.tecnicas.map((t) => TECNICAS[t]).join(" ")} ${a.lenguaje}`,
    }),
  );
  TALLERES.forEach((t) =>
    lista.push({
      titulo: `Taller de ${t.titulo.toLowerCase()}`,
      url: `talleres.html#taller-${t.id}`,
      tipo: `Taller · ${t.tallerista}`,
      extra: `${t.cuenta} ${t.horario}`,
    }),
  );
  EVENTOS.filter((e) => e.tipo !== "taller").forEach((e) =>
    lista.push({
      titulo: e.titulo,
      url: `agenda.html#${e.fecha}`,
      tipo: `${TIPOS_EVENTO[e.tipo]} · ${fechaCorta(e.fecha)}`,
      extra: e.descripcion,
    }),
  );
  return lista;
}

function iniciarBuscador() {
  const disparadores = $$("[data-abrir-busqueda]");
  if (!disparadores.length || typeof PAGINAS === "undefined") return;

  const dialogo = document.createElement("dialog");
  dialogo.className = "dialogo-busqueda";
  dialogo.setAttribute("aria-labelledby", "busqueda-titulo");
  dialogo.innerHTML = `
    <div class="dialogo-busqueda__cabeza">
      <h2 id="busqueda-titulo" class="etiqueta">Buscar en La Escala</h2>
      <button type="button" class="btn-icono" data-cerrar aria-label="Cerrar buscador">✕</button>
    </div>
    <form role="search" class="buscador" data-form-busqueda>
      <label for="busqueda-general" class="visualmente-oculto">Buscar exposición, artista, taller o página</label>
      <input type="search" id="busqueda-general" placeholder="Exposición, artista, taller…" autocomplete="off">
      <button type="submit" class="btn btn--primario">Buscar</button>
    </form>
    <p class="conteo" aria-live="polite" data-conteo-busqueda></p>
    <ul class="resultados-busqueda" data-resultados></ul>`;
  document.body.append(dialogo);

  const entrada = $("input", dialogo);
  const resultados = $("[data-resultados]", dialogo);
  const conteo = $("[data-conteo-busqueda]", dialogo);
  const indice = indiceDeBusqueda();
  let quienAbrio = null;

  function pintar() {
    const termino = normalizar(entrada.value);
    resultados.replaceChildren();
    if (!termino) {
      conteo.textContent = "Escribe para buscar en exposiciones, artistas, agenda y páginas.";
      return;
    }
    const encontrados = indice
      .filter((r) => normalizar(`${r.titulo} ${r.tipo} ${r.extra || ""}`).includes(termino))
      .slice(0, 12);
    if (!encontrados.length) {
      conteo.innerHTML = `No encontramos resultados para <q>${escaparHTML(entrada.value)}</q>. Revisa la escritura o prueba con <a href="exposiciones.html">Exposiciones</a>, <a href="artistas.html">Artistas</a> o <a href="agenda.html">Agenda</a>.`;
      return;
    }
    conteo.textContent = `${encontrados.length} resultado${encontrados.length === 1 ? "" : "s"}`;
    encontrados.forEach((r) => {
      const li = document.createElement("li");
      li.innerHTML = `<a href="${r.url}"><span class="etiqueta">${escaparHTML(r.tipo)}</span>${escaparHTML(r.titulo)}</a>`;
      resultados.append(li);
    });
  }

  disparadores.forEach((d) =>
    d.addEventListener("click", (evento) => {
      evento.preventDefault();
      quienAbrio = d;
      dialogo.showModal();
      entrada.focus();
      pintar();
    }),
  );
  entrada.addEventListener("input", pintar);
  $("[data-form-busqueda]", dialogo).addEventListener("submit", (evento) => {
    evento.preventDefault();
    const primero = $("a", resultados);
    if (primero) window.location.href = primero.href;
  });
  $("[data-cerrar]", dialogo).addEventListener("click", () => dialogo.close());
  dialogo.addEventListener("click", (evento) => {
    if (evento.target === dialogo) dialogo.close();
  });
  dialogo.addEventListener("close", () => quienAbrio && quienAbrio.focus());
}

/* 06. Filtros, búsqueda, índice A–Z y "cargar más" */
function iniciarFiltros() {
  $$("[data-filtrable]").forEach((zona) => {
    const items = $$("[data-item]", zona);
    const grupos = $$("[data-grupo]", zona);
    const buscador = $("[data-buscar]", zona);
    const conteo = $("[data-conteo]", zona);
    const vacio = $("[data-vacio]", zona);
    const mas = $("[data-mas]", zona);
    const letras = $$("[data-letra]", zona);
    const paso = Number(zona.dataset.paso) || items.length;
    const plural = zona.dataset.plural || "resultados";
    let limite = paso;
    const activos = {};

    grupos.forEach((g) => {
      const marcado = $('[aria-pressed="true"]', g);
      activos[g.dataset.grupo] = marcado ? marcado.dataset.valor : "";
      $$(".chip", g).forEach((c) => (c.dataset.texto = c.textContent.trim()));
    });
    if (letras.length) activos.inicial = "";

    function cumple(item, filtros) {
      const texto = normalizar(item.dataset.texto || item.textContent);
      const termino = buscador ? normalizar(buscador.value) : "";
      if (termino && !texto.includes(termino)) return false;
      return Object.entries(filtros).every(
        ([grupo, valor]) => !valor || (item.dataset[grupo] || "").split(" ").includes(valor),
      );
    }

    function aplicar() {
      const coinciden = items.filter((item) => cumple(item, activos));
      items.forEach((item) => (item.hidden = true));
      coinciden.slice(0, limite).forEach((item) => (item.hidden = false));

      // Chips que darían 0 resultados se deshabilitan y muestran (0).
      grupos.forEach((g) => {
        $$(".chip", g).forEach((chip) => {
          if (!chip.dataset.valor) return;
          const prueba = { ...activos, [g.dataset.grupo]: chip.dataset.valor };
          const n = items.filter((item) => cumple(item, prueba)).length;
          const sinResultados = n === 0 && chip.getAttribute("aria-pressed") !== "true";
          chip.disabled = sinResultados;
          chip.textContent = sinResultados ? `${chip.dataset.texto} (0)` : chip.dataset.texto;
        });
      });

      const mostrados = Math.min(limite, coinciden.length);
      if (conteo)
        conteo.textContent = coinciden.length
          ? `Mostrando ${mostrados} de ${coinciden.length} ${plural}`
          : "";
      if (vacio) {
        vacio.hidden = coinciden.length > 0;
        const q = $("[data-termino]", vacio);
        if (q) {
          q.textContent = buscador && buscador.value ? buscador.value : "";
          q.parentElement.hidden = !(buscador && buscador.value);
        }
      }
      if (mas) mas.hidden = coinciden.length <= limite;
    }

    grupos.forEach((g) => {
      g.addEventListener("click", (evento) => {
        const chip = evento.target.closest(".chip");
        if (!chip || chip.disabled) return;
        $$(".chip", g).forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
        activos[g.dataset.grupo] = chip.dataset.valor;
        limite = paso;
        aplicar();
      });
    });

    letras.forEach((letra) => {
      letra.addEventListener("click", (evento) => {
        evento.preventDefault();
        const valor = activos.inicial === letra.dataset.letra ? "" : letra.dataset.letra;
        activos.inicial = valor;
        letras.forEach((l) => {
          l.classList.toggle("activo", l.dataset.letra === valor);
          l.setAttribute("aria-current", l.dataset.letra === valor ? "true" : "false");
        });
        limite = paso;
        aplicar();
      });
    });

    if (buscador) {
      buscador.addEventListener("input", () => {
        limite = paso;
        aplicar();
      });
      const form = buscador.closest("form");
      if (form)
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          aplicar();
        });
    }

    if (mas)
      mas.addEventListener("click", () => {
        const primeroNuevo = limite;
        limite += paso;
        aplicar();
        const visibles = items.filter((i) => !i.hidden);
        const enfocable = visibles[primeroNuevo] && $("a, button", visibles[primeroNuevo]);
        if (enfocable) enfocable.focus();
      });

    $$("[data-limpiar]", zona).forEach((b) =>
      b.addEventListener("click", () => {
        if (buscador) buscador.value = "";
        grupos.forEach((g) => {
          $$(".chip", g).forEach((c) => c.setAttribute("aria-pressed", String(!c.dataset.valor)));
          activos[g.dataset.grupo] = "";
        });
        if (letras.length) {
          activos.inicial = "";
          letras.forEach((l) => l.classList.remove("activo"));
        }
        limite = paso;
        aplicar();
      }),
    );

    // Permite llegar filtrado desde otra página: artistas.html?tecnica=grabado
    const parametros = new URLSearchParams(window.location.search);
    grupos.forEach((g) => {
      const valor = parametros.get(g.dataset.grupo);
      const chip = valor && $(`.chip[data-valor="${CSS.escape(valor)}"]`, g);
      if (chip) {
        $$(".chip", g).forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
        activos[g.dataset.grupo] = valor;
      }
    });
    if (buscador && window.location.hash === "#buscador") buscador.focus();

    aplicar();
  });
}

/* 07. Ficha de exposición y de artista según la URL */
function iniciarFichaExposicion() {
  if (document.body.dataset.pagina !== "exposicion") return;
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) return;
  const expo = EXPOSICIONES.find((e) => e.id === id);
  const contenido = $("[data-expo-contenido]");
  const noEncontrada = $("[data-expo-no-encontrada]");

  if (!expo) {
    contenido.hidden = true;
    noEncontrada.hidden = false;
    document.title = "Exposición no encontrada · La Escala";
    return;
  }

  document.title = `${expo.titulo} · Exposiciones · La Escala`;
  $$("[data-expo-titulo]").forEach((n) => (n.textContent = expo.titulo));
  $$("[data-expo-artistas]").forEach((n) => (n.textContent = expo.artistas));
  $$("[data-expo-fechas]").forEach((n) => (n.textContent = expo.fechas));
  $$("[data-expo-tipo]").forEach((n) => (n.textContent = expo.tipo));
  const img = $("[data-expo-imagen]");
  if (img) {
    // la imagen de la página trae srcset (versión liviana de la obra de Óscar Barra);
    // se quita para que el navegador muestre la imagen de esta ficha
    img.removeAttribute("srcset");
    img.removeAttribute("sizes");
    img.src = `img/${expo.imagen}.webp`;
    img.alt = expo.afiche ? `Afiche de ${expo.titulo}` : `Imagen de ${expo.titulo}`;
    // Los afiches se muestran completos, sin recortar
    img.closest(".imagen-sangre").classList.toggle("imagen-sangre--afiche", expo.afiche);
  }

  // Obra destacada: solo si la exposición tiene una en datos.js
  const obra = $("[data-expo-obra]");
  if (obra) {
    obra.hidden = !expo.obra;
    if (expo.obra) {
      $("[data-obra-titulo]", obra).textContent = `«${expo.obra.titulo}»`;
      $("[data-obra-anio]", obra).textContent = expo.obra.anio;
      $("[data-obra-tecnica]", obra).textContent = expo.obra.tecnica;
      $("[data-obra-medidas]", obra).textContent = expo.obra.medidas;
      $("[data-obra-valor]", obra).textContent = expo.obra.valor;
    }
  }

  // Texto: párrafos desde datos.js (se conserva el título h2).
  const texto = $("[data-expo-texto]");
  if (texto) {
    $$("p", texto).forEach((p) => p.remove());
    expo.texto.forEach((t) => {
      const p = document.createElement("p");
      p.className = "lead";
      p.textContent = t;
      texto.append(p);
    });
  }

  // Artistas que participan: se muestran solo los de la nómina.
  const lista = $("[data-expo-artistas-lista]");
  const sinArtistas = $("[data-expo-sin-artistas]");
  if (lista) {
    const ids = expo.ids || [];
    $$(".tarjeta", lista).forEach((t) => {
      const enlace = $("a", t);
      const idArtista = new URL(enlace.href).searchParams.get("id");
      t.hidden = !ids.includes(idArtista);
    });
    lista.hidden = ids.length === 0;
    if (sinArtistas) sinArtistas.hidden = ids.length > 0;
  }

  // Lanzamientos, prensa o talleres no tienen fichas de obra: se oculta esa sección.
  $$("[data-expo-obras]").forEach((n) => (n.hidden = !expo.obras));

  const enlace = $("[data-expo-enlace]");
  if (enlace && expo.enlace) {
    enlace.hidden = false;
    enlace.innerHTML = `<a class="btn btn--primario btn--ancho" href="${expo.enlace[1]}">${escaparHTML(expo.enlace[0])}</a>`;
  }

  const estado = $("[data-expo-estado]");
  const aviso = $("[data-expo-aviso]");
  const textos = { vigente: "En la casa ahora", proxima: "Próximamente", finalizada: "Memoria de la casa" };
  if (estado) {
    estado.textContent = textos[expo.estado];
    estado.className = `estado estado--${expo.estado}`;
  }
  if (aviso && expo.estado === "finalizada") {
    aviso.hidden = false;
    aviso.innerHTML = `<p>Esta actividad ya pasó (${escaparHTML(expo.fechas)}). La estás viendo en la <a href="exposiciones.html#archivo">memoria de la casa</a>. <a href="exposicion.html">Ver lo que hay en sala ahora</a>.</p>`;
  }
  if (aviso && expo.estado === "proxima") {
    aviso.hidden = false;
    aviso.innerHTML = `<p>Esta exposición aún no abre: ${escaparHTML(expo.fechas)}.</p>`;
  }
}

function iniciarFichaArtista() {
  if (document.body.dataset.pagina !== "artista") return;
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) return;
  const artista = ARTISTAS.find((a) => a.id === id);
  if (!artista) {
    $("[data-artista-contenido]").hidden = true;
    $("[data-artista-no-encontrado]").hidden = false;
    document.title = "Artista no encontrado · La Escala";
    return;
  }
  const tecnicas = artista.tecnicas.map((t) => TECNICAS[t]).join(" · ");
  document.title = `${artista.nombre} · Artistas · La Escala`;
  const poner = (atributo, valor) => $$(`[data-artista-${atributo}]`).forEach((n) => (n.textContent = valor));
  poner("nombre", artista.nombre);
  poner("tecnicas", tecnicas);
  poner("origen", artista.origen);
  poner("lenguaje", artista.lenguaje);
  poner("resumen", artista.resumen);
  poner("tipo", artista.rol ? `${artista.rol} · ${tecnicas}` : tecnicas);

  const retrato = $("[data-artista-imagen]");
  if (retrato) {
    retrato.src = `img/${artista.imagen}.webp`;
    retrato.alt = `Retrato de ${artista.nombre}`;
  }
  const bio = $("[data-artista-bio]");
  if (bio) {
    bio.replaceChildren(
      ...artista.bio.map((t) => {
        const p = document.createElement("p");
        p.textContent = t;
        return p;
      }),
    );
  }
  const trayectoria = $("[data-artista-trayectoria]");
  const hitos = $("[data-artista-hitos]");
  if (trayectoria && hitos) {
    trayectoria.hidden = artista.hitos.length === 0;
    hitos.innerHTML = artista.hitos
      .map(
        ([anio, texto]) =>
          `<li><span class="linea-tiempo__anio">${escaparHTML(anio)}</span><div><p>${escaparHTML(texto)}</p></div></li>`,
      )
      .join("");
  }
  // "Otros artistas": se oculta la tarjeta del artista actual y se muestran todos los demás.
  const otros = $("[data-artista-otros]");
  if (otros) {
    $$(".tarjeta", otros).forEach(
      (t) => (t.hidden = new URL($("a", t).href).searchParams.get("id") === artista.id),
    );
    if (!$(`a[href="artista.html?id=jaime-blaset"]`, otros) && artista.id !== "jaime-blaset") {
      // la tarjeta del director no está en el carrusel estático: se agrega
      const plantilla = $(".tarjeta", otros);
      const director = ARTISTAS.find((a) => a.id === "jaime-blaset");
      if (plantilla && director) {
        const copia = plantilla.cloneNode(true);
        copia.hidden = false;
        $("img", copia).src = `img/${director.imagen}.webp`;
        $("img", copia).alt = `Retrato de ${director.nombre}`;
        $("a", copia).href = `artista.html?id=${director.id}`;
        $("a", copia).textContent = director.nombre;
        $(".tarjeta__meta", copia).textContent = `${director.rol} · ${director.lenguaje}`;
        otros.prepend(copia);
      }
    }
  }
}

/* 08. Agenda: calendario interactivo */
function crearICS(evento) {
  const fecha = evento.fecha.replaceAll("-", "");
  const hora = (h) => h.replace(":", "") + "00";
  const texto = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//La Escala//Agenda//ES",
    "BEGIN:VEVENT",
    `UID:${evento.id}@laescala.cl`,
    `DTSTART;TZID=America/Santiago:${fecha}T${hora(evento.hora)}`,
    `DTEND;TZID=America/Santiago:${fecha}T${hora(evento.fin || `${String(Number(evento.hora.split(":")[0]) + 2).padStart(2, "0")}:${evento.hora.split(":")[1]}`)}`,
    `SUMMARY:${evento.titulo} · La Escala`,
    `LOCATION:${evento.lugar}, Barrio Puerto, Valparaíso`,
    `DESCRIPTION:${evento.descripcion}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(new Blob([texto], { type: "text/calendar" }));
  enlace.download = `la-escala-${evento.id}.ics`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
  mostrarAviso("Descargamos la actividad para tu calendario.");
}

function iniciarAgenda() {
  const agenda = $("[data-agenda]");
  if (!agenda || typeof EVENTOS === "undefined") return;

  const vistaCalendario = $("[data-vista-calendario]", agenda);
  const grilla = $("[data-grilla]", agenda);
  const titulo = $("[data-mes-titulo]", agenda);
  const panel = $("[data-panel]", agenda);
  const lista = $("[data-lista]", agenda);
  const hoy = textoDesdeFecha(new Date());
  let tipoActivo = "";

  const eventosDe = (fecha) =>
    EVENTOS.filter((e) => e.fecha === fecha && (!tipoActivo || e.tipo === tipoActivo));
  const proximoDesde = (fecha) =>
    EVENTOS.filter((e) => e.fecha > fecha && (!tipoActivo || e.tipo === tipoActivo)).sort((a, b) =>
      a.fecha.localeCompare(b.fecha),
    )[0];

  // Día inicial: el de la URL (#2026-10-24), hoy si tiene actividad o la próxima.
  const desdeURL = /^#\d{4}-\d{2}-\d{2}$/.test(window.location.hash) ? window.location.hash.slice(1) : null;
  const proximoHoy = EVENTOS.filter((e) => e.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  let seleccion = desdeURL || (eventosDe(hoy).length ? hoy : proximoHoy ? proximoHoy.fecha : hoy);
  let mes = fechaDesdeTexto(seleccion);
  mes.setDate(1);

  function pintarMes() {
    const anio = mes.getFullYear();
    const m = mes.getMonth();
    titulo.textContent = `${MESES[m]} ${anio}`;
    $("[data-mes-ant]", agenda).textContent = MESES[(m + 11) % 12];
    $("[data-mes-sig]", agenda).textContent = MESES[(m + 1) % 12];
    grilla.replaceChildren();

    ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].forEach((d) => {
      const cab = document.createElement("div");
      cab.className = "calendario__dia-semana";
      cab.setAttribute("aria-hidden", "true");
      cab.textContent = d;
      grilla.append(cab);
    });

    const desfase = (new Date(anio, m, 1).getDay() + 6) % 7; // lunes = 0
    for (let i = 0; i < desfase; i++) {
      const vacio = document.createElement("div");
      vacio.className = "dia dia--vacio";
      vacio.setAttribute("aria-hidden", "true");
      grilla.append(vacio);
    }

    const diasDelMes = new Date(anio, m + 1, 0).getDate();
    for (let d = 1; d <= diasDelMes; d++) {
      const fecha = textoDesdeFecha(new Date(anio, m, d));
      const eventos = eventosDe(fecha);
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "dia";
      boton.dataset.fecha = fecha;
      if (fecha < hoy) boton.classList.add("dia--pasado");
      if (fecha === hoy) boton.classList.add("dia--hoy");
      boton.setAttribute("aria-pressed", String(fecha === seleccion));
      const cantidad = eventos.length
        ? `, ${eventos.length} actividad${eventos.length > 1 ? "es" : ""}`
        : ", sin actividades";
      // Nombre accesible = número visible + contexto oculto (WCAG 2.5.3).
      boton.innerHTML = `<span>${d}</span><span class="visualmente-oculto"> de ${MESES[m]}, ${fechaLarga(fecha).split(" ")[0]}${fecha === hoy ? ", hoy" : ""}${cantidad}</span>`;
      if (fecha === hoy)
        boton.insertAdjacentHTML("beforeend", '<span class="etiqueta" aria-hidden="true">Hoy</span>');
      eventos.forEach((e) => {
        boton.insertAdjacentHTML(
          "beforeend",
          `<span class="dia__marca tipo--${e.tipo}" aria-hidden="true"></span><span class="dia__etiqueta tipo--${e.tipo}" aria-hidden="true">${e.tipo === "taller" ? e.titulo.split(" ")[0] : TIPOS_EVENTO[e.tipo].split(" ")[0]}</span>`,
        );
      });
      grilla.append(boton);
    }
  }

  function pintarPanel() {
    const eventos = eventosDe(seleccion);
    panel.classList.add("pila");
    if (!eventos.length) {
      const prox = proximoDesde(seleccion);
      const domingo = fechaDesdeTexto(seleccion).getDay() === 0;
      panel.innerHTML = `
        <p class="etiqueta">${fechaLarga(seleccion)}</p>
        <h3>${domingo ? "Domingo: la casa está cerrada" : "No hay actividades programadas este día"}</h3>
        <p class="texto-suave">${domingo ? "Te esperamos de lunes a sábado, de 11:00 a 18:00." : "La galería y el café están abiertos de 11:00 a 18:00, con entrada liberada y libre recorrido."}</p>
        ${prox ? `<button type="button" class="btn btn--contorno" data-ir="${prox.fecha}">Ir a la próxima: ${fechaDesdeTexto(prox.fecha).getDate()} ${MESES_CORTOS[fechaDesdeTexto(prox.fecha).getMonth()].toLowerCase()} →</button>` : ""}`;
      return;
    }
    panel.innerHTML = eventos
      .map((e) => {
        const acciones =
          e.tipo === "taller"
            ? `<a class="btn btn--primario btn--ancho" href="${TIENDA_URL}" target="_blank" rel="noopener">Obtener cupo en la tienda ↗<span class="visualmente-oculto"> (se abre en otra pestaña)</span></a>
           <a class="btn btn--texto" href="talleres.html#taller-${e.taller}">Ver el taller →</a>`
            : e.expo
              ? `<a class="btn btn--texto" href="exposicion.html?id=${e.expo}">Ver en la memoria →</a>`
              : "";
        return `
        <article class="pila panel-dia__evento">
          <p class="etiqueta">${fechaLarga(e.fecha)}</p>
          ${e.imagen ? `<img class="panel-dia__afiche" src="img/${e.imagen}.webp" alt="Afiche de ${escaparHTML(e.titulo)}" width="800" height="1000" loading="lazy">` : ""}
          <p class="etiqueta etiqueta--suave">${TIPOS_EVENTO[e.tipo]}</p>
          <h3>${escaparHTML(e.titulo)}</h3>
          <dl class="ficha">
            <div class="ficha__fila"><dt>Horario</dt><dd>${e.fin ? `${e.hora} – ${e.fin}` : `Desde las ${e.hora}`}</dd></div>
            <div class="ficha__fila"><dt>Lugar</dt><dd>${escaparHTML(e.lugar)}</dd></div>
            <div class="ficha__fila"><dt>Valor</dt><dd>${escaparHTML(e.valor)}</dd></div>
          </dl>
          <p class="pequeno">${escaparHTML(e.descripcion)}</p>
          ${acciones}
          ${e.fecha >= hoy ? `<button type="button" class="btn btn--contorno btn--ancho" data-ics="${e.id}">Añadir a mi calendario</button>` : ""}
        </article>`;
      })
      .join("");
  }

  function seleccionar(fecha, enfocar) {
    seleccion = fecha;
    const f = fechaDesdeTexto(fecha);
    if (f.getMonth() !== mes.getMonth() || f.getFullYear() !== mes.getFullYear()) {
      mes = new Date(f.getFullYear(), f.getMonth(), 1);
    }
    pintarMes();
    pintarPanel();
    history.replaceState(null, "", `#${fecha}`);
    if (enfocar) {
      const boton = $(`[data-fecha="${fecha}"]`, grilla);
      if (boton) boton.focus();
    }
  }

  grilla.addEventListener("click", (evento) => {
    const dia = evento.target.closest("[data-fecha]");
    if (dia) seleccionar(dia.dataset.fecha);
  });

  // Teclado: flechas mueven entre días.
  grilla.addEventListener("keydown", (evento) => {
    const dia = evento.target.closest("[data-fecha]");
    const saltos = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!dia || !(evento.key in saltos)) return;
    evento.preventDefault();
    const f = fechaDesdeTexto(dia.dataset.fecha);
    f.setDate(f.getDate() + saltos[evento.key]);
    seleccionar(textoDesdeFecha(f), true);
  });

  panel.addEventListener("click", (evento) => {
    const ir = evento.target.closest("[data-ir]");
    if (ir) seleccionar(ir.dataset.ir);
    const ics = evento.target.closest("[data-ics]");
    if (ics) crearICS(EVENTOS.find((e) => e.id === ics.dataset.ics));
  });

  $$("[data-mes]", agenda).forEach((b) =>
    b.addEventListener("click", () => {
      mes = new Date(mes.getFullYear(), mes.getMonth() + Number(b.dataset.mes), 1);
      pintarMes();
    }),
  );

  // Filtro por tipo: actúa sobre el calendario y la lista.
  const grupo = $("[data-filtro-agenda]", agenda);
  if (grupo)
    grupo.addEventListener("click", (evento) => {
      const chip = evento.target.closest(".chip");
      if (!chip) return;
      $$(".chip", grupo).forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      tipoActivo = chip.dataset.valor;
      $$("[data-item]", lista).forEach((li) => (li.hidden = tipoActivo && li.dataset.tipo !== tipoActivo));
      const visibles = $$("[data-item]", lista).filter((li) => !li.hidden).length;
      $("[data-conteo]", agenda).textContent =
        `${visibles} actividad${visibles === 1 ? "" : "es"} en la lista`;
      $("[data-vacio]", agenda).hidden = visibles > 0;
      pintarMes();
      pintarPanel();
    });

  // Vista calendario / lista.
  $$("[data-vista]", agenda).forEach((b) =>
    b.addEventListener("click", () => {
      const calendario = b.dataset.vista === "calendario";
      $$("[data-vista]", agenda).forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
      vistaCalendario.hidden = !calendario;
      if (!calendario)
        lista.closest("section").scrollIntoView({ behavior: reducirMovimiento ? "auto" : "smooth" });
    }),
  );

  // Enlaces "Ver en el calendario" de la lista (#2026-10-24).
  window.addEventListener("hashchange", () => {
    const fecha = window.location.hash.slice(1);
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha) && fecha !== seleccion) {
      vistaCalendario.hidden = false;
      $$("[data-vista]", agenda).forEach((o) =>
        o.setAttribute("aria-pressed", String(o.dataset.vista === "calendario")),
      );
      seleccionar(fecha);
      vistaCalendario.scrollIntoView({ behavior: reducirMovimiento ? "auto" : "smooth" });
    }
  });

  // Botones "añadir a mi calendario" de la lista estática.
  $$("[data-ics]", lista).forEach((b) =>
    b.addEventListener("click", () => crearICS(EVENTOS.find((e) => e.id === b.dataset.ics))),
  );

  pintarMes();
  pintarPanel();
}

/* 09. Plano interactivo de La Casa */
function iniciarPlano() {
  const plano = $("[data-plano]");
  if (!plano || typeof ESPACIOS === "undefined") return;
  const zonas = $$(".zona", plano);
  const panel = $("[data-panel-espacio]");
  const orden = zonas.map((z) => z.dataset.espacio);

  function seleccionar(id, enfocar) {
    const e = ESPACIOS[id];
    if (!e) return;
    zonas.forEach((z) => z.setAttribute("aria-pressed", String(z.dataset.espacio === id)));
    $("[data-esp-nombre]", panel).textContent = e.nombre;
    $("[data-esp-nivel]", panel).textContent = GRUPOS_ESPACIO[e.grupo];
    $("[data-esp-texto]", panel).textContent = e.texto;
    // Sin dato confirmado se muestra el estado "por confirmar", no se inventa contenido.
    const ahora = $("[data-esp-ahora]", panel);
    ahora.textContent = e.ahora || "Información por confirmar con la galería";
    ahora.classList.toggle("estado-info--pendiente", !e.ahora);
    const img = $("[data-esp-img]", panel);
    img.src = `img/${e.imagen}.webp`;
    img.alt = `Fotografía de ${e.nombre}`;
    const enlace = $("[data-esp-enlace]", panel);
    const externo = /^https?:/.test(e.enlace);
    enlace.href = e.enlace;
    enlace.textContent = e.accion;
    if (externo) {
      enlace.target = "_blank";
      enlace.rel = "noopener";
    } else {
      enlace.removeAttribute("target");
      enlace.removeAttribute("rel");
    }
    if (enfocar) $(`[data-espacio="${id}"]`, plano).focus();
  }

  zonas.forEach((z) => z.addEventListener("click", () => seleccionar(z.dataset.espacio)));

  const siguiente = $("[data-siguiente-espacio]");
  if (siguiente)
    siguiente.addEventListener("click", () => {
      const actual = zonas.findIndex((z) => z.getAttribute("aria-pressed") === "true");
      seleccionar(orden[(actual + 1) % orden.length]);
    });

  // Niveles: atenúan los espacios que no están en el nivel elegido.
  const niveles = $("[data-niveles]");
  if (niveles)
    niveles.addEventListener("click", (evento) => {
      const chip = evento.target.closest(".chip");
      if (!chip) return;
      $$(".chip", niveles).forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      const nivel = chip.dataset.valor;
      zonas.forEach((z) =>
        z.classList.toggle("zona--atenuada", Boolean(nivel) && ESPACIOS[z.dataset.espacio].grupo !== nivel),
      );
      const primero = zonas.find((z) => !nivel || ESPACIOS[z.dataset.espacio].grupo === nivel);
      if (primero) seleccionar(primero.dataset.espacio);
    });

  // Empieza en el espacio marcado en el HTML (la cafetería).
  const inicial = zonas.find((z) => z.getAttribute("aria-pressed") === "true");
  seleccionar(inicial ? inicial.dataset.espacio : orden[0]);
}

/* 10. Galería ampliada / lightbox */
function iniciarLightbox() {
  const enlaces = $$("[data-lightbox]");
  if (!enlaces.length) return;

  const dialogo = document.createElement("dialog");
  dialogo.className = "lightbox";
  dialogo.setAttribute("aria-label", "Imagen ampliada");
  dialogo.innerHTML = `
    <figure class="lightbox__figura">
      <img src="" alt="">
      <figcaption class="lightbox__barra">
        <button type="button" class="lightbox__btn" data-paso="-1" aria-label="Imagen anterior">‹</button>
        <span data-pie aria-live="polite"></span>
        <span class="fila">
          <button type="button" class="lightbox__btn" data-paso="1" aria-label="Imagen siguiente">›</button>
          <button type="button" class="lightbox__btn" data-cerrar aria-label="Cerrar">✕</button>
        </span>
      </figcaption>
    </figure>`;
  document.body.append(dialogo);
  const img = $("img", dialogo);
  const pie = $("[data-pie]", dialogo);
  let actual = 0;

  function mostrar(i) {
    actual = (i + enlaces.length) % enlaces.length;
    const enlace = enlaces[actual];
    const miniatura = $("img", enlace);
    img.src = enlace.href;
    img.alt = miniatura ? miniatura.alt : "";
    pie.textContent = `${actual + 1} / ${enlaces.length} · ${enlace.dataset.pie || img.alt}`;
  }

  enlaces.forEach((enlace, i) =>
    enlace.addEventListener("click", (evento) => {
      evento.preventDefault();
      mostrar(i);
      dialogo.showModal();
    }),
  );
  $$("[data-paso]", dialogo).forEach((b) =>
    b.addEventListener("click", () => mostrar(actual + Number(b.dataset.paso))),
  );
  $("[data-cerrar]", dialogo).addEventListener("click", () => dialogo.close());
  dialogo.addEventListener("keydown", (evento) => {
    if (evento.key === "ArrowRight") mostrar(actual + 1);
    if (evento.key === "ArrowLeft") mostrar(actual - 1);
  });
  dialogo.addEventListener("click", (evento) => {
    if (evento.target === dialogo) dialogo.close();
  });
  dialogo.addEventListener("close", () => enlaces[actual].focus());
}

/* 11. Formularios: validación y envío */
function mensajeDeError(campo) {
  const v = campo.validity;
  if (v.valueMissing) {
    if (campo.type === "checkbox") return "Marca esta casilla para poder continuar.";
    if (campo.type === "radio") return "Elige una opción.";
    if (campo.tagName === "SELECT") return "Elige una opción de la lista.";
    return "Este campo es obligatorio.";
  }
  if ((v.typeMismatch || v.patternMismatch) && campo.type === "email") {
    return campo.value.includes("@")
      ? "Falta el dominio, por ejemplo nombre@correo.cl"
      : "Falta el @, por ejemplo nombre@correo.cl";
  }
  if (v.tooShort) return `Escribe al menos ${campo.minLength} caracteres.`;
  if (v.patternMismatch && campo.type === "tel") return "Revisa el teléfono, por ejemplo +56 9 1234 5678.";
  return "Revisa este dato.";
}

function validarCampo(campo) {
  const clave = campo.type === "radio" ? campo.name : campo.id || campo.name;
  const error = document.getElementById(`${clave}-error`);
  const ok = campo.checkValidity();
  if (campo.type === "radio") {
    $$(`[name="${campo.name}"]`, campo.form).forEach((r) => r.setAttribute("aria-invalid", String(!ok)));
  } else {
    campo.setAttribute("aria-invalid", String(!ok));
  }
  if (error) error.textContent = ok ? "" : mensajeDeError(campo);
  const contenedor = campo.closest(".campo");
  if (contenedor && ["text", "email", "tel"].includes(campo.type))
    contenedor.classList.toggle("campo--valido", ok && campo.value !== "");
  return ok;
}

function iniciarFormularios() {
  $$("form[data-validar]").forEach((form) => {
    form.noValidate = true; // usamos mensajes propios, en lenguaje simple
    const campos = () => [...form.elements].filter((c) => c.willValidate && c.type !== "submit");
    const resumen = $("[data-resumen]", form);
    const exito = $("[data-exito]", form.parentElement);
    const errorEnvio = $("[data-error-envio]", form);
    const enviar = $('[type="submit"]', form);

    campos().forEach((campo) => {
      // Se valida al salir del campo (no mientras se escribe): evita errores prematuros.
      campo.addEventListener("blur", () => {
        if (campo.value || campo.getAttribute("aria-invalid") === "true") validarCampo(campo);
      });
      campo.addEventListener("change", () => {
        if (campo.type === "checkbox" || campo.type === "radio" || campo.tagName === "SELECT")
          validarCampo(campo);
      });
    });

    form.addEventListener("submit", (evento) => {
      evento.preventDefault();
      const malos = campos().filter((c) => !validarCampo(c));
      const unicos = [...new Set(malos.map((c) => c.name))];
      if (resumen) {
        resumen.hidden = unicos.length === 0;
        resumen.textContent = unicos.length
          ? `Revisa ${unicos.length} campo${unicos.length > 1 ? "s" : ""} marcado${unicos.length > 1 ? "s" : ""} antes de enviar.`
          : "";
      }
      if (malos.length) {
        malos[0].focus();
        return;
      }
      if (errorEnvio) errorEnvio.hidden = true;
      if (!navigator.onLine) {
        // Sin conexión: se avisa y se conserva lo escrito.
        if (errorEnvio) errorEnvio.hidden = false;
        return;
      }
      enviar.setAttribute("aria-busy", "true");
      enviar.setAttribute("aria-disabled", "true");
      const textoOriginal = enviar.textContent;
      enviar.textContent = "Enviando…";

      // Simulación del envío: el sitio no tiene servidor (GitHub Pages).
      setTimeout(() => {
        enviar.removeAttribute("aria-busy");
        enviar.removeAttribute("aria-disabled");
        enviar.textContent = textoOriginal;
        const nombre = form.elements.nombre ? form.elements.nombre.value.split(" ")[0] : "";
        if (exito) {
          const n = $("[data-exito-nombre]", exito);
          if (n) n.textContent = nombre ? `, ${nombre}` : "";
          exito.hidden = false;
          exito.setAttribute("tabindex", "-1");
          exito.focus();
        }
        form.reset();
        campos().forEach((c) => {
          c.removeAttribute("aria-invalid");
          const cont = c.closest(".campo");
          if (cont) cont.classList.remove("campo--valido");
        });
      }, 900);
    });
  });

  // Precarga desde la URL: talleres.html?taller=id · visitanos.html?motivo=obra&obra=Título
  const p = new URLSearchParams(window.location.search);
  const taller = p.get("taller");
  const selectTaller = $('select[name="taller"]');
  if (taller && selectTaller && $(`option[value="${CSS.escape(taller)}"]`, selectTaller))
    selectTaller.value = taller;
  const motivo = p.get("motivo");
  const radio = motivo && $(`input[name="motivo"][value="${CSS.escape(motivo)}"]`);
  if (radio) radio.checked = true;
  const obra = p.get("obra");
  const mensaje = $('textarea[name="mensaje"]');
  if (obra && mensaje && !mensaje.value)
    mensaje.value = `Hola, me interesa la obra «${obra}». ¿Sigue disponible?`;
}

/* 12. Estados: sin conexión, imágenes rotas, abierto/cerrado */
function iniciarEstados() {
  const avisoRed = document.createElement("div");
  avisoRed.className = "aviso-red";
  avisoRed.setAttribute("role", "status");
  avisoRed.textContent =
    "Sin conexión. Mostramos la última información cargada; algunas acciones no estarán disponibles.";
  avisoRed.hidden = navigator.onLine;
  document.body.prepend(avisoRed);
  const estadoRed = () => (avisoRed.hidden = navigator.onLine);
  window.addEventListener("online", estadoRed);
  window.addEventListener("offline", estadoRed);

  // Imagen que no carga: se marca y se deja visible su texto alternativo.
  document.addEventListener(
    "error",
    (evento) => {
      if (evento.target.tagName === "IMG") evento.target.classList.add("img--rota");
    },
    true,
  );

  // Indicador "Abierto ahora": solo si el horario está confirmado.
  $$("[data-abierto]").forEach((n) => {
    const horario = HORARIOS[n.dataset.abierto];
    if (!horario) {
      n.textContent = "Horario por confirmar con la galería";
      return;
    }
    const ahora = new Date();
    const hoy = horario[ahora.getDay()];
    const minutos = ahora.getHours() * 60 + ahora.getMinutes();
    const aMin = (h) => Number(h.split(":")[0]) * 60 + Number(h.split(":")[1]);
    const abierto = hoy && minutos >= aMin(hoy[0]) && minutos < aMin(hoy[1]);
    n.classList.add(abierto ? "abierto--si" : "abierto--no");
    n.textContent = abierto ? `Abierto ahora · hasta las ${hoy[1]}` : "Cerrado ahora";
  });
}

/* 13. Índice lateral y pestañas activas */
function iniciarIndice() {
  const enlaces = $$(".indice a, .pestanas a");
  if (!enlaces.length || !("IntersectionObserver" in window)) return;
  const secciones = enlaces.map((a) => document.getElementById(a.hash.slice(1))).filter(Boolean);
  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        enlaces.forEach((a) => {
          const activo = a.hash === `#${entrada.target.id}`;
          a.classList.toggle("activo", activo);
          if (activo) a.setAttribute("aria-current", "location");
          else a.removeAttribute("aria-current");
        });
      });
    },
    { rootMargin: "-35% 0px -60% 0px" },
  );
  secciones.forEach((s) => observador.observe(s));
}

/* Inicio: se ejecuta todo cuando la página termina de cargar */
iniciarMenu();
iniciarScroll();
iniciarAcordeones();
iniciarBuscador();
iniciarFiltros();
iniciarFichaExposicion();
iniciarFichaArtista();
iniciarAgenda();
iniciarPlano();
iniciarLightbox();
iniciarFormularios();
iniciarEstados();
iniciarIndice();
