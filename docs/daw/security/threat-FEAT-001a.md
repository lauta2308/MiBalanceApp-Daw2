# Threat model FEAT-001a: Entrar y ver la cuenta

| Field | Value |
|-------|-------|
| Ticket | FEAT-001a |
| Spec | docs/daw/specs/spec-FEAT-001a.md |
| Tier | FEATURE |
| Date | 2026-11-07 |

## Components
| Component | Source in the spec |
|---|---|
| `supabase/migrations/20261107000001_crear_esquema_inicial.sql` | Block 2 |
| `supabase/scripts/limpiar_usuarios_prueba.sql` | Block 2 |
| `src/autenticacion/sesionProvisoria.js` | Block 3 |
| `src/servicios/cuentas.js` | Block 4 |
| `src/paginas/SeccionCuenta.jsx` | Block 4 |

## Trust boundaries
- Navegador → Supabase Auth (internet público): `signInAnonymously` crea un usuario y devuelve un JWT de sesión; el navegador lo guarda en `localStorage`.
- Navegador → Supabase PostgREST (internet público): consultas `select` a `bat_cuentas`, `bat_categorias` y `bat_movimientos` con la clave anónima pública y el JWT del usuario; RLS decide qué filas ve.
- Supabase Auth → PostgreSQL (`auth.users` → esquema `public`): el trigger `BATR_CREAR_CUENTA_USUARIO` ejecuta `BATF_CREAR_CUENTA_USUARIO` con privilegios del dueño (`SECURITY DEFINER`).
- Operador → base de datos (SQL Editor del panel de Supabase): `limpiar_usuarios_prueba.sql` borra usuarios con privilegios de administrador.

## STRIDE analysis
### `supabase/migrations/20261107000001_crear_esquema_inicial.sql`
- **Spoofing:** las políticas `BAPOL_*_PROPIETARIO` comparan `bat_cuentas.id_usuario` con `(select auth.uid())`, que sale del JWT firmado por Supabase; un cliente no puede declarar otro `id_usuario`.
- **Tampering:** a `anon` y `authenticated` se les revocan todos los privilegios (`revoke all`) y solo `authenticated` recibe `select`; sin políticas de escritura, ningún cliente modifica cuentas, categorías, movimientos ni saldo (R-01).
- **Repudiation:** en este ticket no hay escrituras del usuario; la única escritura es el alta por trigger, que queda fechada en `fecha_alta` y ligada a `auth.users.created_at`.
- **Information Disclosure:** RLS habilitado en las tres tablas con `select` solo del propietario; un usuario que consulta por identificadores ajenos recibe 0 filas (AC-27, R-02).
- **Denial of Service:** cada inicio de sesión anónimo crea 1 cuenta y 2 categorías; el volumen queda acotado por el límite de inicios anónimos de Supabase (~30 por hora por IP) (R-04).
- **Elevation of Privilege:** `BATF_CREAR_CUENTA_USUARIO` es `SECURITY DEFINER` con `set search_path = ''`, nombres calificados con `public.` y `revoke execute` a `public`, `anon` y `authenticated`; solo la ejecuta el trigger, sin parámetros del cliente (R-03).

### `supabase/scripts/limpiar_usuarios_prueba.sql`
- **Spoofing:** lo ejecuta solo el operador desde el panel de Supabase autenticado; no se expone por RPC ni se incluye en las migraciones.
- **Tampering:** borra únicamente filas de `auth.users` con `is_anonymous = true` y `raw_user_meta_data->>'es_prueba' = 'true'`; las cuentas, categorías y movimientos se borran por `on delete cascade`.
- **Repudiation:** el script devuelve la cantidad de usuarios borrados (`returning id`) para que el operador la registre.
- **Information Disclosure:** no devuelve datos financieros, solo identificadores.
- **Denial of Service:** un usuario real que se marque `es_prueba` en su metadata puede ser borrado; solo se afecta a sí mismo y además tiene que ser anónimo (R-05).
- **Elevation of Privilege:** no concede privilegios ni crea objetos.

### `src/autenticacion/sesionProvisoria.js`
- **Spoofing:** la sesión anónima no tiene credenciales; quien tenga el JWT y el refresh token del navegador actúa como ese usuario. Se mitiga evitando inyección de HTML (R-06).
- **Tampering:** el JWT está firmado por Supabase; un token alterado es rechazado por PostgREST.
- **Repudiation:** Supabase Auth registra cada alta de usuario en sus logs de auth.
- **Information Disclosure:** el mensaje de error de FR-04 no muestra el error técnico de Supabase (NFR-02); el detalle solo va a `console.error` en desarrollo.
- **Denial of Service:** en modo estricto de React los efectos corren dos veces; una única promesa de inicio compartida a nivel de módulo y el botón "Aceptar" deshabilitado durante el reintento evitan crear usuarios de más y gastar el límite por IP (R-04).
- **Elevation of Privilege:** el usuario anónimo recibe el rol `authenticated`, que en este esquema solo tiene `select` filtrado por RLS.

### `src/servicios/cuentas.js`
- **Spoofing:** no recibe identificadores de usuario; consulta sin filtro de `id_usuario` y RLS limita las filas al propietario del JWT.
- **Tampering:** solo hace `select`; no hay escrituras desde el cliente.
- **Repudiation:** no aplica: no hay acciones del usuario que registrar en este ticket.
- **Information Disclosure:** pide solo `nombre, moneda, saldo::text` y un conteo `head` de movimientos; el saldo se lee como texto para no perder precisión (NFR-02 de la representación decimal).
- **Denial of Service:** una sola consulta por carga de la sección Cuenta; el conteo usa `count: 'exact', head: true` sobre el índice `BAIX_MOVIMIENTOS_CUENTA_FECHA`.
- **Elevation of Privilege:** usa la clave anónima pública; la clave `service_role` nunca se incluye en el frontend ni en `.env.example`.

### `src/paginas/SeccionCuenta.jsx`
- **Spoofing:** se muestra solo dentro de `GuardiaSesion`, cuando hay sesión.
- **Tampering:** solo lectura.
- **Repudiation:** no aplica en este ticket.
- **Information Disclosure:** el nombre de la cuenta y los textos se renderizan como texto de React (escapado); no se usa `dangerouslySetInnerHTML` (R-06). Un error de carga muestra un mensaje sin detalles técnicos.
- **Denial of Service:** una carga por montaje; no hay sondeo periódico.
- **Elevation of Privilege:** no hay acciones privilegiadas en la pantalla.

## Data classification
| Data | Class | At rest | In transit |
|---|---|---|---|
| JWT y refresh token de la sesión anónima | credentials | `localStorage` del navegador (cifrado del disco del dispositivo); el JWT vence en 1 hora y se rota con el refresh token; en Supabase el refresh token se guarda en `auth.refresh_tokens` en disco cifrado AES-256 del proveedor | TLS 1.2+ (HTTPS) |
| `saldo`, `monto` | financial | PostgreSQL de Supabase, disco cifrado AES-256 del proveedor; RLS por propietario | TLS 1.2+ (HTTPS) |
| `id_usuario` (UUID del usuario anónimo) | PII (seudónimo) | PostgreSQL de Supabase, disco cifrado AES-256 del proveedor | TLS 1.2+ (HTTPS) |
| nombre de cuenta y de categorías | financial | PostgreSQL de Supabase, disco cifrado AES-256 del proveedor; RLS por propietario | TLS 1.2+ (HTTPS) |
| `VITE_SUPABASE_ANON_KEY` | public | en el bundle del frontend por diseño de Supabase | TLS 1.2+ (HTTPS) |

## Risks and mitigations
| ID | Risk | STRIDE | Likelihood | Impact | Mitigation |
|---|---|---|---|---|---|
| R-01 | un cliente modifica su saldo, su cuenta o datos ajenos con `update`/`insert`/`delete` directo por PostgREST | T | H | C | `revoke all` a `anon` y `authenticated`, solo `grant select` a `authenticated`, sin políticas de escritura (Block 2) |
| R-02 | un usuario lee la cuenta, las categorías o los movimientos de otro | I | M | C | RLS en las tres tablas, políticas `to authenticated` con `(select auth.uid())`, prueba AC-27 contra la API real (Block 2) |
| R-03 | la función `SECURITY DEFINER` del trigger es invocada por un cliente o secuestrada por `search_path` | E | L | H | `set search_path = ''`, nombres calificados, `revoke execute` a `public`, `anon` y `authenticated` (Block 2) |
| R-04 | creación masiva de usuarios anónimos (dos inicios por modo estricto o abuso externo) que agota el límite por IP o llena la base | D | M | M | una única promesa de inicio por carga y botón "Aceptar" deshabilitado al reintentar (Block 3); límite de inicios anónimos de Supabase por IP; el reemplazo por Google llega antes de abrir la aplicación a usuarios reales |
| R-05 | el script de limpieza borra un usuario real que se marcó `es_prueba` | D | L | L | filtro adicional `is_anonymous = true`; el único afectado es el propio usuario que editó su metadata; se revisa al incorporar Google (Block 2) |
| R-06 | robo del token de sesión por XSS | I | L | H | sin `dangerouslySetInnerHTML` ni HTML de origen externo; textos renderizados como texto de React; la regla queda en la spec para revisión del arch-auditor (Blocks 3 y 4) |
| R-07 | precisión del saldo perdida al leerlo como número de JSON | T | M | M | `select` con `saldo::text` y `FormatearSaldo` sobre texto, sin `parseFloat` (Blocks 1 y 4) |

## Supply chain
Dependencias nuevas, todas en su última versión estable al incorporarlas y fijadas en `package-lock.json`: `react`, `react-dom`, `@supabase/supabase-js` (producción); `vite`, `@vitejs/plugin-react`, `eslint` y sus plugins de React, `vitest`, `jsdom` y `@testing-library/*` (solo desarrollo). El SAST de CODE revisa el código propio; `npm audit` se corre en el Block 1 y un hallazgo alto o crítico bloquea el bloque.

## Availability
El vector de DoS propio de este ticket es la creación de usuarios anónimos (R-04), acotada por el límite de Supabase y por la promesa única de inicio. El resto de la disponibilidad depende del plan gratuito de Supabase (pausa por inactividad), riesgo ya registrado en `PRD.md` y fuera del alcance de este ticket.
