# Cambios de UI (frontend)

## Revisión del trabajo parcial previo
- Se verificaron las sustituciones de `if (loading) return <div>Cargando</div>`.
- Corregido: 3 imports rotos (`./components/PageState` -> `./PageState`) en ScheduleSettings, TeamCalendarView y VacationGanttChart.
- `tsc --noEmit` y `vite build` pasan sin errores.

## Simplificación (sin cambio de comportamiento)
- `components/StatusBadge.tsx`: única fuente de etiqueta y color de estados de vacaciones/ausencias (antes duplicado en Absences, Vacations, TeamRequests, admin/Vacations).
- `components/PageState.tsx`: `LoadingState`, `EmptyState`, `ErrorState` accesibles (role/aria) para estados uniformes.

## Diseño
- Tokens en `tailwind.config.js`: radios `control/card/modal`, sombras `soft/card/float`, colores semánticos `success/warning/danger` (+soft/ink), `brand`, tamaño `text-2xs` (11px, sustituye a `text-[10px]`).
- `index.css`: fuente Inter, foco visible (`:focus-visible`), `prefers-reduced-motion`, scrollbar en modo oscuro.

## Tokens para Android
- Primario: azul 600 `#2563eb` (variable `--primary-600`); success `#16a34a`/soft `#dcfce7`; warning `#d97706`/`#fef3c7`; danger `#dc2626`/`#fee2e2`.
- Fondo: slate-50 `#f8fafc` (oscuro slate-950); texto slate-900.
- Fuente: Inter (fallback Roboto). Mínimo 11sp.
- Radios: control 12dp, card 16dp, modal 24dp.

---

# Segunda pasada: refactor y diseño (todas las páginas)

## Sistema de diseño (transversal)
- `tailwind.config.js`: escala de capas `z-header/nav/modal/popover/toast` (sustituye 40/50/60/70/9998/9999 sueltos) y documentación de la escala tipográfica. Radios `control 12 / card 16 / modal 24`, sombras y colores semánticos ya existentes, ahora usados de verdad.
- `index.css`: nuevas primitivas `.btn`, `.btn-primary/secondary/ghost/danger`, `.field`, `.label`, `.card`, `.modal-backdrop`, `.modal-panel`, `.page-title`, `.page-subtitle`.
- Codemods aplicados a `pages/` y `components/`:
  - Radios: `rounded-lg/xl` -> `rounded-control`, tarjetas -> `rounded-card`, `rounded-2xl` -> `rounded-card`, paneles de modal -> `rounded-modal`.
  - Contraste AA: `text-slate-400` -> `text-slate-500` (claro) y `dark:text-slate-500` -> `dark:text-slate-400`; textos `green/amber/yellow/orange/emerald/teal/red-500|600` oscurecidos un paso.
  - ~65 inputs/selects unificados en `.field`, ~66 tarjetas en `.card`, ~60 etiquetas en `.label`, ~25 botones en `.btn-*`.
  - Todos los `<h1>` usan `.page-title` (o 2xl/3xl responsivo en el saludo).
  - Rejillas de formulario `grid-cols-2` -> `grid-cols-1 sm:grid-cols-2` (10 sitios) para 320-360 px.
  - `aria-label` añadido a ~50 botones solo-icono (cerrar, anterior/siguiente, editar, eliminar...).
  - Quitados `outline-none` sin anillo de foco equivalente (Calendar, TeamCalendar, TeamCalendarView).
  - Modales: 17 backdrops inline -> `.modal-backdrop`; eliminado el hack `pb-24` (la barra flotante ya queda por debajo del modal).
  - Tablas sin contenedor de scroll (admin Benefits, Events, News) ahora con `overflow-x-auto`.

## Cambios por página / componente
- **Dashboard**: datos extraídos a `hooks/useDashboardData` (antes dependía de índices de `Promise.all`); banners duplicados (ajustes / avisos) en `AlertBanner`; `StatCard` compartido; estado de error con reintento; acentos corregidos (Nómina, Próximos, revisión...).
- **FichajeButton**: lógica en `hooks/useFichaje`; subcomponentes `TurnoBadge` y `TodayFichajesPanel`; icono Lucide en vez de SVG inline; botón de ajuste visible al foco con teclado; verde de salida con contraste AA.
- **Vacations**: el formulario de 300 líneas pasa a `components/VacationRequestForm` (validación separada en `submitMedicalHours` / `submitDaysRequest`); helpers de cálculo y lista de motivos a `utils/vacationUtils`; `JustificationCell` (antes duplicado en tabla y tarjetas), `hooks/useJustificationUpload`, `StatusBadge` único, estados vacío/carga. Eliminadas clases inexistentes (`animate-fadeIn`) y código muerto.
- **Absences**: mismos componentes compartidos; `alert()` nativo -> `Modal`; tarjetas de saldo con contraste suficiente (antes texto blanco sobre amber-500).
- **Payroll**: `SignedAction`, `PayrollStatus`, `PayrollPeriod`, `SelectToggle` (checkbox accesible con `role/aria-checked`); `StatCard`; estado vacío.
- **manager/Fichajes** (726 -> ~100 líneas): `FichajeAdjustmentsPanel`, `TeamWeekFichajes`, `hooks/useTeamWeek`; toasts caseros con `document.createElement` sustituidos por `react-hot-toast`.
- **manager/TeamCalendar y TeamCalendarView**: lógica duplicada (datos de equipo, turnos, selección de fechas/rango, asignación) a `hooks/useTeamShifts` (-300 líneas en total).
- **admin/Settings**: `Tabs` accesible, `ImageUploadField` (3 bloques idénticos), `InviteCodesPanel`, `EmailTemplatesPanel`; `alert/confirm` -> toast / `ConfirmModal`.
- **admin/ContentLayout**: `confirm()` -> `ConfirmModal`; tarjeta de layout ya no anida `<button>` dentro de `<button>` (div con `role=button` y teclado).
- **Calendar**: el panel de detalle del día estaba vacío (`...existing code...`); nuevo `DayDetailPanel` con fichajes, incidencias, horario previsto y solicitud de ajuste (la función de ajustes era inalcanzable). Generación del PDF a `utils/attendanceReport` con import dinámico de jsPDF (chunk principal 956 kB -> 528 kB). Estado `signatureDataUrl` muerto eliminado.
- **Modal / ConfirmModal / AdjustFichajeModal / SignatureModal**: reescritos con `.modal-*`, `role=dialog`, Escape (`hooks/useEscapeKey`), modo oscuro (ConfirmModal y SignatureModal no lo tenían). Bug corregido: `Modal` llamaba a un hook después de un `return` condicional.
- **Login / Register / ForgotPassword / ResetPassword**: variantes `dark:` completas (eran solo claro); botón principal en azul de marca.
- **UnifiedLayout**: `console.log` de depuración fuera; `aria-label/expanded` en menús. `Layout.tsx` y `AdminLayout.tsx` eliminados (no se importaban en ningún sitio).
- **FichajeAdjustmentsPanel, InviteCodesPanel, TeamWeekFichajes**: nuevos, con encabezados `scope`, estados vacío/carga y copy en sentence case.

## No cubierto en esta pasada
- Revisión a fondo de `ScheduleSettings`, `ProfileModal`, `EmailTemplateEditor`, `VacationGanttChart`, `DateRangePicker`, `FloatingNavbar`, `NotificationDropdown`, `admin/{Users,Vacations,Events,News,Payrolls,Fichajes,Benefits,Dashboard}`, `manager/TeamRequests`, `News`, `Profile`: solo recibieron los codemods transversales (radios, contraste, `.field/.card/.btn`, aria), sin refactor estructural.
- `utils/dateUtils.ts` no se importa en ningún sitio (fuera de mi alcance; se deja).
- Sin pruebas visuales automatizadas de las pantallas autenticadas (requieren backend); comprobado solo Login en 360 px claro/oscuro y `tsc --noEmit` + `vite build`.

## Rediseño "abstracto" alineado con la app nativa (octubre 2026)

La web adopta el mismo lenguaje visual que la app Android (`XyonEmpleadosApp`, `ui/theme/Theme.kt` y `ui/Components.kt`).

**Tokens** (`tailwind.config.js`)
- Paleta: azul Xyon `#2563EB` como ancla + lima `#C8F53C`, lila `#C9B6FF`, sol `#FFD84A`, coral `#FF6B4A`, papel `#F4F2EA`, tinta `#0C0C12`.
- La escala `slate` se sustituye por neutros cálidos: fondo papel en claro y tinta casi negra en oscuro. Así todas las páginas heredan el estilo sin tocar cada una.
- Tipografía: Inter + Inter Tight (titulares negros y apretados). Radios: control 16, tarjeta 28, modal 32. Borde `border-thick` (1.5px).
- Animaciones: curva `ease-spring`, `animate-pop`, `animate-bob`, `animate-burst` y entrada escalonada `.stagger`. Todas respetan `prefers-reduced-motion`.

**Primitivas** (`index.css`): `.btn-primary` (píldora tinta), `.btn-blue`, `.btn-lime`, `.btn-secondary`, `.btn-danger` (coral), `.card` (relleno plano + contorno tinta), `.card-blue`, `.field`, `.chip`, `.press` (rebote al pulsar), `.page-title`.

**Componentes nuevos**
- `Shapes.tsx`: manchas, destellos, estrellas y garabatos vectoriales (`BlueField`, `AuroraBackdrop`, `BlobIcon`, `AnimatedNumber`).
- `AuthShell.tsx`: pantallas de acceso con campo azul animado y panel papel.
- `Sidebar.tsx`: barra lateral de escritorio (≥ lg) con resaltado lima deslizante; se pliega a iconos y recuerda la preferencia.
- `FloatingNavbar.tsx`: en móvil, cápsula oscura solo iconos, idéntica a la app.
- `CommandPalette.tsx`: Ctrl/⌘+K para saltar a cualquier sección.
- `Avatar.tsx` (iniciales de color si no hay foto) y `ErrorBoundary.tsx` (una pantalla rota ya no deja la web en blanco).
- `hooks/useNavItems.ts`: items por rol y puntos de avisos, compartidos por la barra lateral y la cápsula.

**Pantallas**
- Inicio: tarjeta azul con el botón de fichaje que cambia de forma (lima fuera / coral dentro), estallido de destellos, contador de jornada y fichas de color.
- Panel de admin: fichas de color y un panel con todas las herramientas.
- Acceso: login, registro, recuperar y restablecer contraseña.

**Fallos corregidos**
- Cualquier 403 cerraba la sesión; ahora solo lo hacen los 401 y los tokens caducados o inválidos. Un "no tienes permiso" ya no te expulsa.
- Una cuenta desactivada muestra un aviso claro en el login.
- El registro volvía al login en vez de entrar; ahora entra.
- Los requisitos de contraseña mostrados no coincidían con el backend; el backend ahora acepta cualquier símbolo de forma coherente y responde en español.
- Eventos, Beneficios y Diseño del inicio no eran accesibles desde la interfaz; ahora están en el panel de admin y en la paleta.
- Se quitó el bloque falso de "Actividad reciente" del panel de admin, y los errores de estadísticas se muestran en vez de enseñar ceros.
- El formateo de importes de nómina ya no puede romper la página.
