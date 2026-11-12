# Threat model FEAT-001d: Monto del ingreso y límites

| Field | Value |
|-------|-------|
| Ticket | FEAT-001d |
| Spec | docs/daw/specs/spec-FEAT-001d.md |
| Tier | FEATURE |
| Date | 2026-11-12 |

## Components
| Component | Source in the spec |
|---|---|
| `src/utilidades/mascaraMonto.js` | Block 1 |
| `src/utilidades/validacionMonto.js` | Block 1 |
| `src/componentes/FormularioMovimiento.jsx` | Block 2 |
| `supabase/migrations/20261112000001_limites_movimiento.sql` | Block 3 |

## Trust boundaries
- Navegador del usuario → API de Supabase (PostgREST): `rpc('basp_agregar_movimiento')` lleva `p_monto` como texto, `p_fecha` y `p_id_categoria` con el JWT del usuario. Todo lo que valida la interfaz se puede saltear llamando directamente a la API con ese JWT.
- PostgREST → PostgreSQL: `BASP_AGREGAR_MOVIMIENTO` corre como `security definer` con `search_path = ''`. Es la única frontera que de verdad protege el saldo.
- Teclado o portapapeles → campo "Monto": la entrada del usuario cruza a `AplicarMascaraMonto` y `ValidarMonto`.

## STRIDE analysis
### `src/utilidades/mascaraMonto.js`
- **Spoofing:** no maneja identidad; es una función pura sobre texto.
- **Tampering:** solo deja dígitos y una coma; cualquier otro carácter pegado o tecleado se descarta antes de llegar al estado del formulario. No es un control de seguridad: el servidor vuelve a validar (R-01).
- **Repudiation:** no registra acciones; no aplica a una transformación de texto local.
- **Information Disclosure:** no lee ni muestra datos de otros usuarios.
- **Denial of Service:** un texto pegado muy largo se recorre en tiempo lineal: filtrado con expresiones regulares sin retroceso y agrupación de miles por tramos con `slice`, sin el lookahead cuadrático de `formatoMoneda.js` (R-04).
- **Elevation of Privilege:** no ejecuta ni interpreta la entrada; React la muestra como texto.

### `src/utilidades/validacionMonto.js`
- **Spoofing:** no maneja identidad.
- **Tampering:** trabaja solo con texto, nunca con `Number`, para que un monto grande no cambie por redondeo de punto flotante (RNF-04). `ValidarMontoMaximo` compara la cantidad de dígitos enteros como texto.
- **Repudiation:** no aplica; no persiste nada.
- **Information Disclosure:** los mensajes son fijos ("El monto máximo es 999.999.999.999,99.", "El monto debe ser mayor a 0.") y no exponen detalles técnicos.
- **Denial of Service:** expresiones regulares ancladas y sin cuantificadores anidados ambiguos (R-04).
- **Elevation of Privilege:** no otorga permisos; solo decide si se llama a la API.

### `src/componentes/FormularioMovimiento.jsx`
- **Spoofing:** la identidad sale de la sesión de Supabase (JWT); el formulario no envía id de usuario ni de cuenta.
- **Tampering:** un usuario puede modificar el estado en DevTools y mandar un monto inválido; el servidor lo rechaza (R-01).
- **Repudiation:** cada alta queda en `BAT_MOVIMIENTOS` con `fecha_alta`; el formulario no agrega otro registro.
- **Information Disclosure:** los errores de la API se muestran con un mensaje fijo y el detalle técnico va a `console.error` solo en desarrollo (FEAT-001b).
- **Denial of Service:** un monto por encima del máximo se rechaza en el cliente sin llamar a la API.
- **Elevation of Privilege:** la posición del cursor se calcula sobre el texto del campo; no hay `dangerouslySetInnerHTML` ni evaluación de la entrada.

### `supabase/migrations/20261112000001_limites_movimiento.sql`
- **Spoofing:** la cuenta sale de `auth.uid()`; sin sesión la función devuelve 42501 y `anon` no tiene `execute`.
- **Tampering:** se rechaza con 22023, sin escribir nada, un monto nulo, menor o igual a 0, mayor a 999999999999.99 o con más de dos decimales, y una fecha posterior a `(now() at time zone 'UTC')::date + 1` (R-01, R-02). La categoría debe ser de la cuenta del llamador y de tipo `INGRESO` (FEAT-001b, se mantiene).
- **Repudiation:** el movimiento guarda `fecha_alta` con la hora del servidor; la fecha elegida por el usuario no la reemplaza.
- **Information Disclosure:** una categoría ajena y una inexistente devuelven el mismo 42501 "Operación no permitida.", sin revelar si existe.
- **Denial of Service:** la función bloquea solo la fila de la cuenta del llamador (`for update`); un usuario no puede bloquear la cuenta de otro.
- **Elevation of Privilege:** `security definer` con `search_path = ''` y nombres calificados con `public.`; `create or replace` conserva el `revoke` a `public, anon` y el `grant` a `authenticated`, que la migración vuelve a declarar (R-03).

## Data classification
| Data | Class | At rest | In transit |
|---|---|---|---|
| monto del movimiento | financial | `numeric(14,2)` en `BAT_MOVIMIENTOS`, cifrado en disco administrado por Supabase, RLS por propietario | TLS 1.2+ entre navegador y Supabase |
| saldo de la cuenta | financial | `numeric` sin tope de enteros en `BAT_CUENTAS`, cifrado en disco administrado por Supabase, RLS por propietario | TLS 1.2+ |
| fecha del movimiento | financial | `date` en `BAT_MOVIMIENTOS`, RLS por propietario | TLS 1.2+ |
| JWT de sesión anónima | credentials | lo guarda supabase-js en el almacenamiento del navegador (FEAT-001a); este ticket no lo cambia | TLS 1.2+, cabecera `Authorization` |

## Risks and mitigations
| ID | Risk | STRIDE | Likelihood | Impact | Mitigation |
|---|---|---|---|---|---|
| R-01 | Un monto inválido (0, negativo, más de dos decimales, mayor al máximo) llega por la API saltando la interfaz | T | H | H | `BASP_AGREGAR_MOVIMIENTO` rechaza con 22023 antes de leer la cuenta; probado contra Supabase en `pruebas/movimientos.test.js` (AC-20) |
| R-02 | Un ingreso con fecha futura entra por la API | T | M | M | Rechazo de `p_fecha > (now() at time zone 'UTC')::date + 1`; probado con hoy UTC + 2 días |
| R-03 | `create or replace` deja la función ejecutable por `anon` o con un `search_path` mutable | E | L | H | La migración repite `security definer`, `set search_path = ''`, `revoke ... from public, anon` y `grant ... to authenticated`; `test_sin_sesion_rechazado_api` sigue en la suite |
| R-04 | Expresión regular con retroceso catastrófico ante un texto pegado enorme | D | L | L | Expresiones ancladas sin cuantificadores anidados ambiguos y agrupación de miles lineal por tramos; prueba con un texto de 10.000 caracteres en menos de 50 ms |
| R-05 | Pérdida de precisión al sumar montos grandes o decimales | T | M | H | Montos y saldo como `numeric` en SQL y como texto en JS; probado con 0,10 + 0,20 y con dos montos máximos (AC-29, AC-30) |

## Supply chain
No se agregan dependencias: la máscara del monto es código propio (ADR-005), sin librerías de formato numérico.

## Availability
La función toma un `for update` sobre una sola fila, la de la cuenta del propio llamador. Supabase limita los pedidos por IP. Un monto por encima del máximo se corta en el cliente antes de llegar a la red.
