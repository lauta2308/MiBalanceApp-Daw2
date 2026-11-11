# Threat model FEAT-001b: Registrar ingreso con Pago Ingresado por defecto

| Field | Value |
|-------|-------|
| Ticket | FEAT-001b |
| Spec | docs/daw/specs/spec-FEAT-001b.md |
| Tier | FEATURE |
| Date | 2026-11-11 |

## Components
| Component | Source in the spec |
|---|---|
| `supabase/migrations/20261111000001_agregar_movimiento.sql` | Block 1 |
| `supabase/scripts/pruebas_movimientos.sql` | Block 1 |
| `src/servicios/movimientos.js` | Block 2 |
| `src/servicios/categorias.js` | Block 2 |
| `src/componentes/FormularioMovimiento.jsx` | Block 3 |
| `src/paginas/SeccionCuenta.jsx` | Block 4 |

## Trust boundaries
- Navegador → Supabase PostgREST (internet público, TLS): `rpc('basp_agregar_movimiento')` con `p_tipo`, `p_monto` (texto), `p_fecha` y `p_id_categoria`, más el JWT del usuario. Todo lo que cruza este límite lo controla el cliente y puede venir alterado.
- PostgREST (rol `authenticated`) → función `BASP_AGREGAR_MOVIMIENTO` (`SECURITY DEFINER`, dueño `postgres`): la función escribe con privilegios que el cliente no tiene, así que es el único punto donde se valida la propiedad.
- Navegador → PostgREST (`select`): lectura de `bat_movimientos` con `bat_categorias(nombre)` y de `bat_categorias`, filtrada por RLS.
- Operador → base de datos (SQL Editor, rol `postgres`): `pruebas_movimientos.sql` crea un usuario, un trigger temporal y movimientos dentro de una transacción que termina en `rollback`.

## STRIDE analysis
### `supabase/migrations/20261111000001_agregar_movimiento.sql`
- **Spoofing:** la cuenta sale de `auth.uid()`, que se lee del JWT firmado por Supabase. La función no recibe el id de la cuenta, así que un cliente no puede indicar la cuenta de otro usuario (R-01). Sin sesión, `auth.uid()` es nulo y la función rechaza la llamada.
- **Tampering:** una categoría que no es de la cuenta del llamador, o que es de otro tipo, se rechaza antes de escribir nada (R-02). Un monto menor o igual a 0 o con más de dos decimales se rechaza en la función y además en `BACK_MOVIMIENTOS_MONTO_POSITIVO`/`numeric(14,2)` (R-03). El saldo se actualiza con `saldo = saldo + v_importe` sobre la fila bloqueada con `for update`, así que dos altas simultáneas no pisan el saldo (R-04).
- **Repudiation:** cada movimiento queda con `fecha_alta` (`now()`) y ligado a su cuenta. Es una aplicación de finanzas personales con un solo usuario por cuenta, sin un tercero ante quien negar una acción.
- **Information Disclosure:** los errores se lanzan con mensajes fijos y genéricos que no confirman si existe la categoría o la cuenta de otro usuario (R-06).
- **Denial of Service:** cada llamada escribe una fila en la cuenta del propio llamador y bloquea solo esa cuenta; un abuso llena únicamente los datos del abusador (R-09).
- **Elevation of Privilege:** `SECURITY DEFINER` con `set search_path = ''` y todos los nombres calificados con `public.` impiden secuestrar la función con objetos del llamador (R-05). `revoke execute ... from public, anon` y `grant execute ... to authenticated` dejan la función solo para usuarios con sesión.

### `supabase/scripts/pruebas_movimientos.sql`
- **Spoofing:** se ejecuta solo en el SQL Editor como `postgres`; ningún cliente lo puede invocar. Simula el JWT de un usuario creado por el mismo script con `set local request.jwt.claims`.
- **Tampering:** todo ocurre entre `begin` y `rollback`: el usuario, el trigger temporal que hace fallar la actualización del saldo y los movimientos desaparecen al terminar. No modifica filas existentes (R-10).
- **Repudiation:** el script imprime con `raise notice` el resultado de cada caso; VERIFY registra la corrida en su reporte.
- **Information Disclosure:** no lee datos de otros usuarios. Solo consulta las filas del usuario que creó.
- **Denial of Service:** el trigger temporal existe solo dentro de la transacción. Mientras dura, bloquea la tabla `bat_cuentas` para otras sesiones, así que se corre en el proyecto de desarrollo y nunca en producción (R-10).
- **Elevation of Privilege:** no otorga ni cambia permisos; `set local role` vuelve a `postgres` al terminar la transacción.

### `src/servicios/movimientos.js`
- **Spoofing:** no envía identidad propia. El JWT lo agrega supabase-js desde la sesión de `sesionProvisoria.js`.
- **Tampering:** envía el monto como texto (`p_monto`), nunca como número de JavaScript, para no perder precisión (RNF-04). La validación real ocurre en el servidor.
- **Repudiation:** no aplica: el registro lo hace la función.
- **Information Disclosure:** `ObtenerMovimientos` no filtra por usuario, porque RLS (`BAPOL_MOVIMIENTOS_PROPIETARIO`) devuelve solo las filas del propietario. AC-27 ahora lo prueba con un movimiento real de B (R-07).
- **Denial of Service:** una sola consulta por carga de la sección Cuenta; la paginación queda fuera del alcance de este PRD.
- **Elevation of Privilege:** solo usa la clave anónima pública; nunca `service_role`.

### `src/servicios/categorias.js`
- **Spoofing:** igual que `movimientos.js`: la identidad sale del JWT.
- **Tampering:** solo lee. Que el usuario elija una categoría ajena se rechaza en el servidor (R-02), no aquí.
- **Repudiation:** no aplica: solo lectura.
- **Information Disclosure:** RLS (`BAPOL_CATEGORIAS_PROPIETARIO`) limita el resultado a las categorías de la propia cuenta.
- **Denial of Service:** una consulta por apertura del formulario.
- **Elevation of Privilege:** sin escritura y sin privilegios extra.

### `src/componentes/FormularioMovimiento.jsx`
- **Spoofing:** se muestra solo dentro de `GuardiaSesion`, con sesión.
- **Tampering:** la validación del monto en el cliente es de usabilidad; el servidor vuelve a validar (R-03). La fecha de hoy se calcula con la fecha local y se envía como "AAAA-MM-DD", sin pasar por UTC.
- **Repudiation:** no aplica.
- **Information Disclosure:** ante un error muestra textos fijos ("No se pudo registrar el ingreso. Vuelva a intentarlo."). El detalle técnico va a `console.error` solo en desarrollo (R-06).
- **Denial of Service:** el doble clic en "Guardar" corresponde a FEAT-001e; aquí un segundo envío registraría otro ingreso propio, sin afectar a otros usuarios.
- **Elevation of Privilege:** los nombres de categoría se renderizan como texto de React, sin `dangerouslySetInnerHTML` (R-08).

### `src/paginas/SeccionCuenta.jsx`
- **Spoofing:** se muestra solo con sesión, dentro de `GuardiaSesion`.
- **Tampering:** el mensaje de éxito llega por `location.state`, que solo puede contener uno de los textos fijos que conoce la app. Se muestra como texto y se limpia con `navigate(..., { replace: true })`.
- **Repudiation:** no aplica.
- **Information Disclosure:** muestra solo los datos que RLS devuelve; los errores de carga usan el mensaje fijo de FEAT-001a.
- **Denial of Service:** el temporizador de 3 segundos de `MensajeExito` se cancela al desmontar.
- **Elevation of Privilege:** renderiza categorías y montos como texto de React (R-08).

## Data classification
| Data | Class | At rest | In transit |
|---|---|---|---|
| `bat_movimientos.monto`, `bat_cuentas.saldo` | financial | PostgreSQL de Supabase con cifrado de disco del proveedor; RLS solo del propietario | TLS (HTTPS a PostgREST) |
| `bat_movimientos.fecha`, `bat_categorias.nombre` | financial | igual que el monto | TLS |
| JWT de sesión | credentials | `localStorage` del navegador (supabase-js), igual que en FEAT-001a | TLS; nunca se escribe en la consola ni en mensajes |
| `id_usuario` (uuid anónimo) | PII | `auth.users` gestionado por Supabase, cifrado de disco del proveedor | TLS |

## Risks and mitigations
| ID | Risk | STRIDE | Likelihood | Impact | Mitigation |
|---|---|---|---|---|---|
| R-01 | A registra un movimiento en la cuenta de B | E | M | H | la función toma la cuenta de `auth.uid()` y no tiene parámetro de cuenta; insert directo en `bat_movimientos` sin privilegios; probado en `test_cuenta_ajena_rechazada` (AC-28) |
| R-02 | A usa una categoría de B o una categoría de gasto en un ingreso | T | M | H | la función exige `id_cuenta = v_id_cuenta` y `tipo = p_tipo` para la categoría; probado en `test_categoria_ajena_rechazada` y `test_categoria_de_otro_tipo_rechazada` |
| R-03 | monto 0, negativo o con más de dos decimales enviado por la API | T | M | M | validación en la función, `BACK_MOVIMIENTOS_MONTO_POSITIVO` y `numeric(14,2)`; probado en `test_monto_no_positivo_rechazado` |
| R-04 | saldo inconsistente por falla parcial o altas simultáneas | T | L | H | una sola función atómica, `for update` sobre la cuenta y suma relativa; probado con el script de ADR-003 (AC-31) |
| R-05 | secuestro de la función `SECURITY DEFINER` por `search_path` | E | L | C | `set search_path = ''` y nombres calificados con `public.` |
| R-06 | un mensaje de error revela detalles técnicos o la existencia de datos ajenos | I | M | L | mensajes fijos en la función y en la UI; detalle solo en `console.error` en desarrollo (AC-31, NFR-03) |
| R-07 | lectura de movimientos ajenos | I | L | H | RLS de FEAT-001a; AC-27 reforzado con un movimiento real de B |
| R-08 | XSS por el nombre de una categoría | E | L | M | render como texto de React; sin `dangerouslySetInnerHTML` |
| R-09 | inundación de altas por la API | D | L | L | cada alta afecta solo la cuenta propia; límites de la plataforma de Supabase |
| R-10 | el script de prueba deja datos o bloquea en producción | T | L | M | `begin`…`rollback` obligatorio y advertencia en el encabezado: se corre solo en el proyecto de desarrollo |

## Supply chain
Se agrega `react-router`, en su última versión estable, mantenido por Remix/Shopify. `npm audit --audit-level=high` y el SAST de CODE lo revisan. Lo demás ya estaba en FEAT-001a.

## Availability
El único vector nuevo es la llamada repetida a `basp_agregar_movimiento` (R-09), cuyo efecto queda en la cuenta del propio llamador. El bloqueo `for update` es por cuenta, así que un usuario no frena a otro. El trigger temporal del script (R-10) bloquea solo dentro de su transacción en el proyecto de desarrollo.
