# Threat model FEAT-001c: Elegir categoría y fecha del ingreso

| Field | Value |
|-------|-------|
| Ticket | FEAT-001c |
| Spec | docs/daw/specs/spec-FEAT-001c.md |
| Tier | FEATURE |
| Date | 2026-11-11 |

## Components
| Component | Source in the spec |
|---|---|
| `src/utilidades/ordenCategorias.js` | Block 1 |
| `src/servicios/categorias.js` | Block 1 |
| `src/utilidades/fechas.js` | Block 2 |
| `src/componentes/SelectorFecha.jsx` | Block 2 |
| `src/componentes/FormularioMovimiento.jsx` | Block 3 |
| `package.json` | Block 2 |

Este ticket no cambia la base de datos: `BASP_AGREGAR_MOVIMIENTO` (FEAT-001b) sigue siendo el único camino de escritura y ya valida la categoría contra la cuenta de `auth.uid()` y el tipo `INGRESO`.

## Trust boundaries
- Usuario → navegador: elige la categoría en el `select` y la fecha en el calendario de `SelectorFecha`. Ambos valores viven en el estado de React y el usuario los puede alterar con las herramientas del navegador.
- Navegador → Supabase PostgREST (internet público, TLS): `rpc('basp_agregar_movimiento')` con `p_id_categoria` y `p_fecha` elegidos por el usuario, más el JWT. Cualquier valor que cruza este límite puede venir alterado, y la función es la que decide.
- Navegador → PostgREST (`select`): lectura de `bat_categorias` filtrada por RLS (`BAPOL_CATEGORIAS_PROPIETARIO`) y por `tipo = 'INGRESO'`.
- Registro de npm → build: `react-day-picker` 10.0.2 y su dependencia `date-fns` entran al bundle que corre en el navegador del usuario.

## STRIDE analysis
### `src/utilidades/ordenCategorias.js`
- **Spoofing:** es una función pura sobre la lista ya filtrada por RLS; no maneja identidad.
- **Tampering:** devuelve una copia ordenada y no modifica la lista recibida, así que un orden distinto nunca cambia qué categoría se envía: el `select` envía el `id` de la opción, no su posición.
- **Repudiation:** no registra acciones; ordenar no es una acción del usuario.
- **Information Disclosure:** solo ordena categorías del propio usuario; no agrega datos.
- **Denial of Service:** `Intl.Collator` sobre las categorías de una cuenta es lineal-logarítmico sobre una lista corta; el tamaño lo controla el propio usuario (R-05).
- **Elevation of Privilege:** no ejecuta código del usuario: los nombres se comparan como texto y se renderizan como texto de React.

### `src/servicios/categorias.js`
- **Spoofing:** usa el cliente de Supabase con el JWT de la sesión; no recibe un id de usuario ni de cuenta.
- **Tampering:** solo lee. Quitar `.order('nombre')` no cambia el filtro `eq('tipo', 'INGRESO')` ni RLS (R-01).
- **Repudiation:** lectura sin efectos; no requiere registro.
- **Information Disclosure:** RLS devuelve solo las categorías de la cuenta del usuario; el servicio no amplía columnas (`id, nombre, es_defecto`).
- **Denial of Service:** una sola consulta por apertura del formulario, igual que en FEAT-001b.
- **Elevation of Privilege:** el rol `authenticated` solo tiene `select` sobre `bat_categorias`; el servicio no escribe.

### `src/utilidades/fechas.js`
- **Spoofing:** no maneja identidad.
- **Tampering:** `ConvertirTextoAFecha` arma la fecha con `new Date(anio, mes - 1, dia)` en hora local y nunca con `new Date("AAAA-MM-DD")` ni `toISOString()`, que correrían el día en zonas al oeste de UTC (R-02). Un texto con formato inválido lanza un error en lugar de devolver otra fecha.
- **Repudiation:** no registra acciones.
- **Information Disclosure:** no expone datos.
- **Denial of Service:** operaciones constantes sobre un texto validado por expresión regular.
- **Elevation of Privilege:** no ejecuta código del usuario.

### `src/componentes/SelectorFecha.jsx`
- **Spoofing:** no maneja identidad.
- **Tampering:** el usuario puede quitar `disabled` a un día futuro desde las herramientas del navegador y enviar una fecha posterior a hoy. El calendario es una ayuda de interfaz, no un control de seguridad: el rechazo de fechas futuras en el servidor es de FEAT-001d (RF-107), y mientras tanto una fecha futura solo afecta los datos del propio usuario (R-03).
- **Repudiation:** la fecha elegida queda guardada en el movimiento, con `fecha_alta` del servidor.
- **Information Disclosure:** no muestra datos de otros usuarios; solo días del calendario.
- **Denial of Service:** la navegación tiene límites (`startMonth` enero de 1900, `endMonth` el mes actual), así que el selector de años tiene una cantidad fija de opciones.
- **Elevation of Privilege:** no usa `dangerouslySetInnerHTML`; el locale y los textos los arma la librería como texto de React.

### `src/componentes/FormularioMovimiento.jsx`
- **Spoofing:** la cuenta no viaja desde el formulario; la función la toma de `auth.uid()`.
- **Tampering:** el `id` de categoría y la fecha que envía pueden alterarse en el navegador. `BASP_AGREGAR_MOVIMIENTO` rechaza una categoría ajena o de otro tipo con 42501 y una fecha nula con 22023, sin escribir nada (R-04).
- **Repudiation:** cada alta queda con `fecha_alta` y ligada a la cuenta, como en FEAT-001b.
- **Information Disclosure:** ante un rechazo muestra el texto fijo de FEAT-001b ("No se pudo registrar el ingreso. Vuelva a intentarlo."), sin detalles técnicos; `console.error` solo en desarrollo.
- **Denial of Service:** sin cambios respecto de FEAT-001b: un alta por envío del formulario.
- **Elevation of Privilege:** no agrega llamadas nuevas a Supabase; usa `AgregarIngreso` sin cambios.

### `package.json`
- **Spoofing:** las versiones se fijan en `package-lock.json` con su hash de integridad, y la CI instala con `npm ci`.
- **Tampering:** un paquete alterado en el registro no coincide con el hash `integrity` del lock y `npm ci` falla (R-06).
- **Repudiation:** el cambio de dependencias queda en el commit del bloque 2 y en el pull request.
- **Information Disclosure:** `react-day-picker` no hace pedidos de red ni lee almacenamiento; las pruebas de unidad bloquean la red externa (ADR-002), así que un pedido inesperado haría fallar la suite.
- **Denial of Service:** un paquete abandonado o con fallas rompería el calendario, no los datos; se audita con `npm audit` en el SAST de cada ticket (R-06).
- **Elevation of Privilege:** las dependencias corren en el navegador con los mismos permisos que el resto del bundle, sin acceso a claves: el cliente solo tiene la clave anónima pública.

## Data classification
| Data | Class | At rest | In transit |
|---|---|---|---|
| fecha del movimiento | financial | `date` en `BAT_MOVIMIENTOS`, protegida por RLS; cifrado en reposo del disco de Supabase (AES-256) | TLS 1.2+ hacia Supabase |
| id y nombre de la categoría | financial | `BAT_CATEGORIAS`, protegida por RLS; cifrado en reposo de Supabase (AES-256) | TLS 1.2+ |
| JWT de la sesión | credentials | `localStorage` del navegador, lo maneja supabase-js como en FEAT-001a | encabezado `Authorization`, TLS 1.2+ |

## Risks and mitigations
| ID | Risk | STRIDE | Likelihood | Impact | Mitigation |
|---|---|---|---|---|---|
| R-01 | Al mover el orden al cliente, el servicio deja de filtrar por tipo y el selector muestra categorías de gasto | I | L | M | `ObtenerCategoriasIngreso` mantiene `eq('tipo', 'INGRESO')`; prueba de servicio y AC-10 en la interfaz |
| R-02 | La fecha elegida se guarda con un día de corrimiento por la zona horaria | T | M | H | `ConvertirTextoAFecha` y `ObtenerFechaHoy` trabajan en hora local; prohibido `toISOString()` y `new Date("AAAA-MM-DD")`; prueba con `TZ=America/Argentina/Buenos_Aires` a las 22:00 (AC-13) |
| R-03 | Un usuario habilita un día futuro desde el navegador y registra un ingreso con fecha futura | T | L | L | Solo afecta los datos del propio usuario; el rechazo en el servidor llega con FEAT-001d (RF-107), ver riesgo aceptado |
| R-04 | Se envía el id de una categoría ajena o de gasto alterando el `select` | E | L | H | `BASP_AGREGAR_MOVIMIENTO` valida cuenta y tipo y rechaza con 42501 (pruebas de FEAT-001b `test_categoria_ajena_rechazada` y `test_categoria_de_otro_tipo_rechazada`, que siguen en la suite) |
| R-05 | Una cuenta con muchísimas categorías hace lento el orden | D | L | L | El usuario solo puede inflar su propia lista; `Intl.Collator` se crea una vez por llamada |
| R-06 | Dependencia nueva comprometida o con CVE | T | L | M | Versión exacta en el lock con `integrity`, `npm ci` en CI, `npm audit` en el SAST de CODE |

## Accepted risks
### R-03
- **Accepted by:** Lautaro (usuario y dueño del producto), al aprobar la división de FEAT-001 el 2026-11-07, que asigna a FEAT-001d el rechazo desde la API de fechas posteriores a mañana en UTC.
- **Justification:** una fecha futura alterada a mano solo cambia los datos de quien la altera, sin tocar cuentas ajenas ni el saldo de otro usuario; el calendario ya impide elegirla en el uso normal.
- **Review conditions:** se cierra cuando FEAT-001d agregue la validación de fecha en `BASP_AGREGAR_MOVIMIENTO`; se revisa antes si la app pasa a tener más de un usuario por cuenta.

## Supply chain
`react-day-picker` 10.0.2 (última estable, 2026-09-30) entra como dependencia de producción y trae `date-fns` ^4.1.0 y `@date-fns/tz` ^1.4.1. Se fija en `package-lock.json` con su hash de integridad, se instala con `npm ci` en la CI y se audita con `npm audit` en el SAST. No hace pedidos de red; las pruebas de unidad bloquean la red externa (ADR-002), así que lo comprobarían.

## Availability
No hay endpoints nuevos ni consultas nuevas: la lectura de categorías es la misma de FEAT-001b y el alta sigue siendo una llamada por envío. Los límites de PostgREST y de Supabase se mantienen como en FEAT-001b. El calendario corre solo en el navegador del usuario.
