# Spec FEAT-001b: Registrar ingreso con Pago Ingresado por defecto

| Field | Value |
|-------|-------|
| Ticket | FEAT-001b |
| PRD | docs/daw/prd/prd-FEAT-001b.md |
| Tier | FEATURE |
| Date | 2026-11-11 |
| Spec loops | 0 |
| Loops since last human decision | 0 |
| ADR | docs/adr/adr-003-prueba-de-atomicidad-del-alta-por-script-sql.md |
| Threat model | docs/daw/security/threat-FEAT-001b.md |

## Summary
Una función SQL `BASP_AGREGAR_MOVIMIENTO` (`SECURITY DEFINER`, ADR-001) registra el ingreso y actualiza el saldo en una sola transacción. Toma la cuenta de `auth.uid()` y valida el tipo, el monto y que la categoría sea de la misma cuenta y del mismo tipo. El frontend agrega `react-router` con dos rutas: la sección Cuenta (`/`) y el formulario "Añadir Ingreso" (`/ingresos/nuevo`). El formulario preselecciona "Pago Ingresado" y la fecha local de hoy, valida el monto y envía todo como texto. La sección Cuenta muestra los movimientos agrupados por fecha y el mensaje de éxito, que se cierra solo a los 3 segundos.

Decisión del usuario en PLAN (2026-11-11), registrada en ADR-003: AC-31 se prueba con el script manual `supabase/scripts/pruebas_movimientos.sql` y con una prueba de UI que simula el error de la API. La función de producción no tiene ningún camino de prueba.

Pendientes de FEAT-001a (`decisions-FEAT-001a.md`) cubiertos aquí:
- AC-27 reforzado con un movimiento real de B (Block 1).
- Borrar un usuario con movimientos y rechazar el borrado de una categoría en uso, en el script manual (Block 1).
- Validar la categoría por cuenta y por tipo, con pruebas (Block 1).

Alcance derivado del PRD:
- La función rechaza todo `p_tipo` distinto de `'INGRESO'`, porque los gastos están fuera de alcance.
- Un monto con más de dos decimales se rechaza y no se redondea (RNF-04). Los mensajes y formatos del campo de monto llegan en FEAT-001d.

Deuda conocida: `ObtenerMovimientos` trae todos los movimientos de la cuenta sin límite. La paginación está fuera de alcance (`prd-FEAT-001a.md`) y se resuelve en su ticket, antes de medir RNF-02 con 5.000 movimientos.

## Coverage: PRD → blocks
| Requirement | Covered by |
|---|---|
| FR-01 | Block 1 (alta en la base de datos), Block 3 (formulario), Block 4 (botón "Añadir Ingreso") |
| FR-02 | Block 3 |
| FR-03 | Block 3 |
| FR-04 | Block 2 (`ObtenerFechaHoy`), Block 3 |
| FR-05 | Block 3 |
| FR-06 | Block 3, Block 4 |
| FR-07 | Block 2 (`ValidarMonto`), Block 3 |
| FR-08 | Block 1 |
| FR-09 | Block 2 (formato), Block 4 (lista) |
| FR-10 | Block 4 |
| FR-11 | Block 3 |
| NFR-01 | Block 1 — Strategy: la función toma la cuenta de `auth.uid()` y exige que la categoría sea de esa cuenta y del mismo tipo; el insert directo no tiene privilegios; 100% de los intentos ajenos rechazados en `pruebas/movimientos.test.js` contra la API real (AC-28) |
| NFR-02 | Block 1 — Strategy: el insert y la actualización del saldo van en una sola función, que PostgreSQL revierte entera; probado con 0 estados parciales por el script de ADR-003, más la UI en Block 4 (AC-31) |
| NFR-03 | Block 3, Block 4 — Strategy: todos los errores del alta muestran textos fijos en español que tratan de usted; las pruebas comparan el 100% del texto mostrado contra esos textos fijos |

## Dependencies between blocks
Block 1 → Block 2 → Block 3 → Block 4.
- Block 2 llama a la función del Block 1.
- Block 3 usa los servicios y utilidades del Block 2.
- Block 4 agrega a la sección Cuenta la navegación hacia el formulario del Block 3 y quita `ContarMovimientos`, el último paso para no dejar imports rotos entre bloques.

## Block 1 — Alta atómica en la base de datos

**Files**
- `supabase/migrations/20261111000001_agregar_movimiento.sql` (new) — función `BASP_AGREGAR_MOVIMIENTO`, permisos y comentario de rollback.
- `supabase/scripts/pruebas_movimientos.sql` (new) — script manual para el SQL Editor (ADR-003).
- `pruebas/movimientos.test.js` (new) — pruebas de integración del alta contra Supabase real.
- `pruebas/esquemaCuenta.test.js` (modified) — AC-27 siembra un movimiento real de B.

**Logic**
Implementa FR-01 y FR-08 del lado del servidor, NFR-01 y NFR-02.

`public.BASP_AGREGAR_MOVIMIENTO(p_tipo text, p_monto numeric, p_fecha date, p_id_categoria uuid) returns uuid` es `language plpgsql`, `security definer` y `set search_path = ''`. Todos los nombres van calificados (`public.BAT_CUENTAS`, `auth.uid()`). El orden es fijo:
1. Obtiene `v_id_usuario := auth.uid()`. Si es nulo, rechaza la llamada.
2. Valida los parámetros: `p_tipo = 'INGRESO'`; `p_monto` no nulo, `> 0` y `= round(p_monto, 2)`; `p_fecha` y `p_id_categoria` no nulos.
3. `select id into v_id_cuenta from public.BAT_CUENTAS where id_usuario = v_id_usuario for update`.
4. Comprueba que exista una categoría con `id = p_id_categoria`, `id_cuenta = v_id_cuenta` y `tipo = p_tipo`.
5. `insert into public.BAT_MOVIMIENTOS (id_cuenta, id_categoria, tipo, monto, fecha) ... returning id into v_id_movimiento`.
6. `update public.BAT_CUENTAS set saldo = saldo + p_monto where id = v_id_cuenta`.
7. Devuelve `v_id_movimiento`.

El insert va antes que el update a propósito: así el trigger temporal del script falla justo "después de escribir el movimiento y antes de actualizar el saldo" (AC-31). Permisos: `revoke execute on function public.BASP_AGREGAR_MOVIMIENTO(text, numeric, date, uuid) from public, anon;` y `grant execute ... to authenticated;`.

`pruebas_movimientos.sql` corre entero entre `begin;` y `rollback;`, como `postgres`, y avisa en el encabezado que es solo para el proyecto de desarrollo. Crea un usuario en `auth.users` con `raw_user_meta_data = '{"es_prueba": true}'`; el trigger de FEAT-001a le crea la cuenta. Cada caso va en un bloque `do $$ ... exception ... end $$` e imprime `PASÓ` o `FALLÓ` con `raise notice`:
- **(a) AC-31.** Como `postgres`, crea el trigger temporal `BATR_PRUEBA_FALLA_SALDO` (`before update on public.BAT_CUENTAS`), que ejecuta `BATF_PRUEBA_FALLA_SALDO()` y lanza una excepción. Pasa a `set local role authenticated` con `request.jwt.claims` del usuario y llama a la función real con 1000. Comprueba que la llamada falló, que el usuario tiene 0 movimientos y que el saldo sigue en 0. Vuelve a `postgres` y borra el trigger.
- **(b) Borrar un usuario con movimientos.** Registra un ingreso real y ejecuta `set constraints all immediate;` antes de `delete from auth.users`. Comprueba que el borrado funciona y que no quedan cuenta, categorías ni movimientos de ese usuario.
- **(c) Borrar una categoría en uso.** Con otro usuario que tiene un movimiento, ejecuta `set constraints all immediate;` y después `delete` de su categoría "Pago Ingresado". Comprueba que se rechaza con `foreign_key_violation`.

**Data model**
- No crea tablas. Escribe en `BAT_MOVIMIENTOS` y `BAT_CUENTAS` de FEAT-001a; constraints as declared there: `monto numeric(14,2)` NOT NULL con `BACK_MOVIMIENTOS_MONTO_POSITIVO`, `tipo` con `BACK_MOVIMIENTOS_TIPO`, `fecha date` NOT NULL, `BAFK_MOVIMIENTOS_CUENTA` on delete cascade, `BAFK_MOVIMIENTOS_CATEGORIA` deferrable initially deferred, `saldo numeric` NOT NULL con `BACK_CUENTAS_SALDO_DOS_DECIMALES`, índice `BAIX_MOVIMIENTOS_CUENTA_FECHA`.
- Rollback de la migración: `drop function public.BASP_AGREGAR_MOVIMIENTO(text, numeric, date, uuid);`, documentado como comentario al final.

**Input validation**
- `p_tipo`: text, exactamente `'INGRESO'`.
- `p_monto`: numeric, no nulo, `> 0`, a lo sumo dos decimales (`p_monto = round(p_monto, 2)`), sin redondear. Llega como texto desde el cliente y PostgREST lo convierte a numeric.
- `p_fecha`: date, no nula (el límite de RF-107 corresponde a FEAT-001d).
- `p_id_categoria`: uuid, no nulo, de la cuenta del llamador y de tipo `p_tipo`.

**Error handling**
- Llamada sin sesión (`anon` o `auth.uid()` nulo) — rechazado: PostgREST responde sin permiso de ejecución, o la función lanza `raise exception 'Operación no permitida.' using errcode = '42501'`; no se escribe nada.
- Categoría ajena o de otro tipo — rechazado con `raise exception 'Operación no permitida.' using errcode = '42501'`, sin confirmar si la categoría existe; no se escribe nada.
- Tipo, monto o fecha inválidos — rechazado con `raise exception 'Datos del movimiento inválidos.' using errcode = '22023'`; no se escribe nada.
- Insert directo en `bat_movimientos` desde la API — rechazado por falta de privilegios (`42501`).
- Falla después del insert y antes del update — PostgreSQL revierte la función completa; el movimiento no queda y el saldo no cambia (script, caso a).

**Required tests**
- [ ] `test_alta_ingreso_sube_saldo` — A con saldo 0 registra 500 con "Pago Ingresado" y la fecha dada: la función devuelve un id, A ve un movimiento `INGRESO` de "500.00" y su saldo pasa a "500" — validates AC-06
- [ ] `test_categoria_ajena_rechazada` — A llama a la función con la categoría "Pago Ingresado" de B: rechazado, y los saldos de A y B no cambian — validates AC-28
- [ ] `test_cuenta_ajena_rechazada` — A intenta un `insert` directo en `bat_movimientos` con la cuenta y la categoría de B: rechazado, y el saldo de B no cambia — validates AC-28
- [ ] `test_categoria_de_otro_tipo_rechazada` — A llama a la función con su categoría "Pago Realizado" (GASTO) en un ingreso: rechazado, y su saldo no cambia
- [ ] `test_monto_invalido_rechazado_api` — A llama a la función con monto `"0"`, `"-5"` y `"1.234"`: los tres son rechazados y su saldo no cambia
- [ ] `test_tipo_gasto_rechazado_api` — A llama a la función con `p_tipo = 'GASTO'` y su categoría de gasto: rechazado, y su saldo no cambia
- [ ] `test_sin_sesion_rechazado_api` — un cliente sin sesión llama a la función: rechazado
- [ ] `test_lectura_no_autorizada` (modified) — B registra un ingreso real; A consulta la cuenta, las categorías y ese movimiento de B por sus ids y recibe 0 filas en cada consulta — validates AC-27

**Completion criterion**
La migración corre sin errores sobre la base de FEAT-001a. Con `.env.local` y la migración aplicada, `npm run test:integracion` pasa (4 usuarios anónimos por corrida: 2 de `esquemaCuenta`, 2 de `movimientos`). `pruebas_movimientos.sql`, corrido en el SQL Editor, imprime `PASÓ` en los casos a, b y c y no deja filas nuevas.

## Block 2 — Servicios y utilidades

**Files**
- `src/servicios/movimientos.js` (new) — `AgregarIngreso` y `ObtenerMovimientos`.
- `src/servicios/movimientos.test.js` (new).
- `src/servicios/categorias.js` (new) — `ObtenerCategoriasIngreso`.
- `src/servicios/categorias.test.js` (new).
- `src/utilidades/formatoMoneda.js` (modified) — agrega `FormatearMontoMovimiento`, que reutiliza la validación y el agrupado de miles de `FormatearSaldo`.
- `src/utilidades/formatoMoneda.test.js` (modified).
- `src/utilidades/fechas.js` (new) — `ObtenerFechaHoy` y `FormatearFecha`.
- `src/utilidades/fechas.test.js` (new).
- `src/utilidades/validacionMonto.js` (new) — `ValidarMonto` y `MENSAJE_MONTO_INVALIDO`.
- `src/utilidades/validacionMonto.test.js` (new).

**Logic**
Implementa la parte de cliente de FR-01, FR-04, FR-07 y FR-09.
- `AgregarIngreso({ montoTexto, fecha, idCategoria })` llama a `clienteSupabase.rpc('basp_agregar_movimiento', { p_tipo: 'INGRESO', p_monto: montoTexto, p_fecha: fecha, p_id_categoria: idCategoria })` y lanza el `error` si lo hay.
- `ObtenerMovimientos()` llama a `from('bat_movimientos').select('id, tipo, monto::text, fecha, bat_categorias(nombre)').order('fecha', { ascending: false }).order('fecha_alta', { ascending: false })` y devuelve `[{ id, tipo, monto, fecha, nombreCategoria }]`. No filtra por usuario, porque RLS lo hace.
- `ObtenerCategoriasIngreso()` llama a `from('bat_categorias').select('id, nombre, es_defecto').eq('tipo', 'INGRESO').order('es_defecto', { ascending: false }).order('nombre')`.
- `FormatearMontoMovimiento(montoTexto, tipo)` devuelve `"+"` o `"-"` seguido del número con `.` de miles y `,` decimal (`"+10.000,00"`). Trabaja solo con texto.
- `ObtenerFechaHoy(fecha = new Date())` arma "AAAA-MM-DD" con `getFullYear`, `getMonth` y `getDate` (local, sin `toISOString`).
- `FormatearFecha("AAAA-MM-DD")` devuelve "DD/MM/AAAA" partiendo el texto, sin `new Date`.
- `ValidarMonto(texto)` recorta espacios y acepta `^\d+([.,]\d{1,2})?$`. Devuelve el monto normalizado con punto ("500", "1500.5") o `null` si está vacío, no cumple el formato o todos sus dígitos son 0. Nunca usa `Number`, `parseFloat` ni `toFixed`.

**Data model**
- Reuses `bat_movimientos` and `bat_categorias` from FEAT-001a (Block 1 adds no schema) — no schema change; constraints as declared there: `monto numeric(14,2)` NOT NULL, `fecha date` NOT NULL, `tipo` with `BACK_MOVIMIENTOS_TIPO`/`BACK_CATEGORIAS_TIPO`, `es_defecto` NOT NULL default false, índice `BAIX_MOVIMIENTOS_CUENTA_FECHA`.

**Input validation**
- `ValidarMonto`: string; vacío, solo espacios, no numérico, negativo, más de dos decimales o cero → `null`.
- `FormatearMontoMovimiento`: `montoTexto` cumple `^\d+(\.\d{1,2})?$`; `tipo` es `'INGRESO'` o `'GASTO'`.
- `FormatearFecha`: string que cumple `^\d{4}-\d{2}-\d{2}$`.

**Error handling**
- Supabase devuelve `error` en `rpc`, `ObtenerMovimientos` u `ObtenerCategoriasIngreso` — el servicio lanza ese error; quien lo llama (Blocks 3 y 4) muestra un mensaje fijo.
- `FormatearMontoMovimiento` con monto o tipo inválido — lanza `Error('Formato de monto inválido')`.
- `FormatearFecha` con texto inválido — lanza `Error('Formato de fecha inválido')`.
- `ValidarMonto` con monto inválido — devuelve `null`, sin lanzar.

**Required tests**
- [ ] `test_agregar_ingreso_envia_texto` — `AgregarIngreso` llama a `rpc('basp_agregar_movimiento')` con `p_tipo: 'INGRESO'` y `p_monto` como string (cliente simulado) — validates AC-06
- [ ] `test_obtener_movimientos_ordenados` — `ObtenerMovimientos` pide `monto::text` y ordena por `fecha` y `fecha_alta` descendentes, y devuelve `nombreCategoria` (cliente simulado)
- [ ] `test_categorias_ingreso_por_defecto_primero` — `ObtenerCategoriasIngreso` filtra `tipo = 'INGRESO'` y ordena por `es_defecto` descendente (cliente simulado) — validates AC-07
- [ ] `test_error_supabase_propagado` — error de Supabase en cada uno de los tres servicios: el servicio lanza el error
- [ ] `test_monto_movimiento_con_signo` — `FormatearMontoMovimiento('500', 'INGRESO')` → `"+500,00"`, `('10000', 'INGRESO')` → `"+10.000,00"`, `('1500.5', 'GASTO')` → `"-1.500,50"` — validates AC-06
- [ ] `test_monto_movimiento_invalido_rechazado` — `FormatearMontoMovimiento('abc', 'INGRESO')` y `('500', 'OTRO')` lanzan `Formato de monto inválido`
- [ ] `test_fecha_hoy_local` — `ObtenerFechaHoy(new Date(2026, 0, 5, 23, 30))` → `"2026-01-05"`, con hora local cerca de medianoche
- [ ] `test_formatear_fecha` — `FormatearFecha('2026-11-11')` → `"11/11/2026"`
- [ ] `test_fecha_invalida_rechazada` — `FormatearFecha('11/11/2026')` y `FormatearFecha('')` lanzan `Formato de fecha inválido`
- [ ] `test_validar_monto_valido` — `ValidarMonto('500')` → `"500"`, `('1500,5')` → `"1500.5"`, `(' 0,01 ')` → `"0.01"`
- [ ] `test_validar_monto_invalido_rechazado` — `ValidarMonto` devuelve `null` para `''`, `'   '`, `'0'`, `'0,00'`, `'-5'`, `'abc'` y `'1,234'` — validates AC-18

**Completion criterion**
`npm run lint` y `npm test` pasan con los tests nuevos. En `src/utilidades/` y `src/servicios/movimientos.js` no aparecen `parseFloat`, `Number(`, `toFixed`, `toISOString` ni `new Date('`.

## Block 3 — Navegación y formulario "Añadir Ingreso"

**Files**
- `package.json` / `package-lock.json` (modified) — agrega `react-router` en su última versión estable.
- `src/main.jsx` (modified) — envuelve `App` en `BrowserRouter`.
- `src/App.jsx` (modified) — dentro de `GuardiaSesion`, `Routes` con `/` → `SeccionCuenta`, `/ingresos/nuevo` → `FormularioMovimiento` y `*` → `Navigate to="/" replace`.
- `src/componentes/FormularioMovimiento.jsx` (new) — el formulario.
- `src/componentes/FormularioMovimiento.test.jsx` (new) — simula `../servicios/movimientos.js` y `../servicios/categorias.js` y renderiza dentro de `MemoryRouter`.
- `src/paginas/SeccionCuenta.test.jsx` (modified) — el `describe('App')` renderiza dentro de `MemoryRouter` y simula también `../servicios/movimientos.js` y `../servicios/categorias.js`, porque el CI corre sin variables `VITE_*`.
- `src/estilos.css` (modified) — estilos del formulario.

**Logic**
Implementa FR-01 a FR-07 y FR-11 en la interfaz.

Al montar, `FormularioMovimiento` llama a `ObtenerCategoriasIngreso()` y muestra "Cargando…" mientras espera. Estructura:
- Encabezado con un botón de flecha (`←`, `aria-label="Volver"`) y el título `h1` "Añadir Ingreso".
- Campo "Monto": `input type="text"`, `inputMode="decimal"`, vacío.
- Campo "Categoría": `select` con las categorías de ingreso de la cuenta, preseleccionada la que tiene `es_defecto` ("Pago Ingresado"). No tiene opción vacía.
- Campo "Fecha": valor `ObtenerFechaHoy()`, mostrado como `FormatearFecha(...)` en un campo de solo lectura.
- Botones "Guardar" (`type="submit"`) y "Cancelar".

`ManejarEnvio`:
1. Llama a `ValidarMonto`. Si devuelve `null`, muestra `MensajeError` con `MENSAJE_MONTO_INVALIDO` y no llama al servicio; "Aceptar" cierra el mensaje y deja los datos cargados.
2. Si el monto es válido, llama a `AgregarIngreso({ montoTexto, fecha, idCategoria })`.
   - Si sale bien, navega a `/` con `{ state: { mensajeExito: 'Ingreso registrado con éxito.' } }`.
   - Si falla, muestra `MensajeError` con `'No se pudo registrar el ingreso. Vuelva a intentarlo.'`. El formulario sigue abierto y "Aceptar" cierra el mensaje.

"Cancelar" y la flecha navegan a `/` sin guardar. Los textos se renderizan como texto de React, sin `dangerouslySetInnerHTML`. El detalle técnico va a `console.error` solo si `import.meta.env.DEV`.

**Input validation**
- Monto: string libre del usuario; se acepta solo lo que `ValidarMonto` devuelve distinto de `null`.
- Categoría: uno de los `id` devueltos por `ObtenerCategoriasIngreso`; el servidor vuelve a validar la propiedad y el tipo (Block 1).
- Fecha: no editable en este ticket; siempre `ObtenerFechaHoy()`.

**Error handling**
- Monto vacío, cero o inválido — rechazado en el cliente: `MensajeError` "El monto debe ser mayor a 0." con "Aceptar"; no se llama a `AgregarIngreso`.
- `AgregarIngreso` lanza un error — `MensajeError` "No se pudo registrar el ingreso. Vuelva a intentarlo." con "Aceptar"; no se navega.
- `ObtenerCategoriasIngreso` lanza un error, o no hay una categoría por defecto de ingreso — `MensajeError` "No se pudo cargar el formulario. Vuelva a intentarlo." con "Aceptar", que reintenta la carga.
- Ruta desconocida — `Navigate` a `/`.

**Required tests**
- [ ] `test_formulario_preselecciona_pago_ingresado` — el formulario muestra "Añadir Ingreso" con "Pago Ingresado" seleccionada y sin una opción vacía ni "sin categoría" — validates AC-07
- [ ] `test_formulario_fecha_de_hoy` — el campo "Fecha" muestra la fecha local de hoy en "DD/MM/AAAA" y se envía como "AAAA-MM-DD"
- [ ] `test_formulario_guarda_y_navega` — monto 500 y "Guardar": `AgregarIngreso` recibe `montoTexto: '500'`, la categoría por defecto y la fecha de hoy, y se navega a `/` con el mensaje de éxito en el state — validates AC-06
- [ ] `test_monto_vacio_o_cero_rechazado` — con monto vacío y con monto 0, "Guardar" muestra exactamente "El monto debe ser mayor a 0." con "Aceptar" y no llama a `AgregarIngreso` — validates AC-18
- [ ] `test_mensaje_error_validacion_hasta_aceptar` — el mensaje de validación sigue visible después de avanzar 10 s con temporizadores simulados y se cierra solo al presionar "Aceptar"
- [ ] `test_falla_alta_muestra_error_rechazado` — si `AgregarIngreso` es rechazado, se muestra exactamente "No se pudo registrar el ingreso. Vuelva a intentarlo." con "Aceptar", sin el texto del error técnico, y no se navega — validates AC-31
- [ ] `test_error_carga_categorias` — si `ObtenerCategoriasIngreso` falla, se muestra "No se pudo cargar el formulario. Vuelva a intentarlo." y "Aceptar" reintenta
- [ ] `test_sin_categoria_por_defecto_error` — si no hay una categoría con `es_defecto`, se muestra el mismo error de carga
- [ ] `test_cancelar_y_flecha_no_guardan` — "Cancelar" y la flecha "Volver" navegan a `/` sin llamar a `AgregarIngreso` — validates AC-09
- [ ] `test_ruta_desconocida_redirige` — `App` en `/otra` muestra la sección Cuenta

**Completion criterion**
`npm run lint` y `npm test` pasan, incluido el `describe('App')` de `SeccionCuenta.test.jsx` sin variables `VITE_*`. `npm run build` termina sin errores.

## Block 4 — Sección Cuenta con lista y mensaje de éxito

**Files**
- `src/paginas/SeccionCuenta.jsx` (modified) — botón "Añadir Ingreso"; usa `ObtenerMovimientos` en lugar de `ContarMovimientos`; muestra `ListaMovimientos` o "Aquí verá sus movimientos."; muestra `MensajeExito`.
- `src/componentes/ListaMovimientos.jsx` (new) — agrupa por fecha.
- `src/componentes/MensajeExito.jsx` (new) — mensaje de éxito temporal.
- `src/servicios/cuentas.js` (modified) — se elimina `ContarMovimientos`.
- `src/servicios/cuentas.test.js` (modified) — se elimina el import y el `describe('ContarMovimientos')`; quedan las pruebas de `ObtenerCuenta`.
- `src/paginas/SeccionCuenta.test.jsx` (modified) — simula `ObtenerMovimientos` de `../servicios/movimientos.js` en lugar de `ContarMovimientos`, y envuelve cada render (incluido el de `StrictMode`) en `MemoryRouter`.
- `src/componentes/ListaMovimientos.test.jsx` (new).
- `src/componentes/MensajeExito.test.jsx` (new).
- `src/flujoIngreso.test.jsx` (new) — flujos completos con `App` dentro de `MemoryRouter` y servicios simulados.
- `src/estilos.css` (modified) — estilos de la lista y del mensaje de éxito.

**Logic**
Implementa FR-01 (botón), FR-06 (vuelta a Cuenta), FR-09 y FR-10.

`SeccionCuenta` carga `ObtenerCuenta()` y `ObtenerMovimientos()` en paralelo, con el mismo manejo de errores de FEAT-001a. Cada movimiento se prepara con `FormatearFecha(fecha)` y `FormatearMontoMovimiento(monto, tipo)`; si alguno lanza, se trata como error de carga. El botón "Añadir Ingreso" navega a `/ingresos/nuevo`.

El mensaje de éxito se captura una sola vez con el inicializador de `useState`, desde `location.state?.mensajeExito`. Solo se acepta si es exactamente "Ingreso registrado con éxito." Después, un efecto limpia el state con `navigate(location.pathname, { replace: true, state: null })`. Así, la doble ejecución de `StrictMode` no pierde el mensaje.

`ListaMovimientos` recibe los movimientos ya ordenados y los agrupa en orden por fecha. Cada grupo es una `section` con un `h2` "DD/MM/AAAA" y una `ul`; cada `li` muestra el nombre de la categoría y el monto con signo.

`MensajeExito` usa `role="status"`, no tiene botón y llama a `alCerrar` a los 3000 ms con un `setTimeout` que se cancela al desmontar.

**Data model**
- Reuses `bat_movimientos`, `bat_categorias` and `bat_cuentas` from FEAT-001a — no schema change; constraints as declared there: `monto numeric(14,2)` NOT NULL, `fecha date` NOT NULL, `saldo numeric` NOT NULL default 0, índice `BAIX_MOVIMIENTOS_CUENTA_FECHA`, RLS `select` solo del propietario.

**Input validation**
- `location.state.mensajeExito`: se acepta solo el texto fijo "Ingreso registrado con éxito."; cualquier otro valor se ignora.
- Datos de `ObtenerMovimientos`: se validan con `FormatearFecha` y `FormatearMontoMovimiento`, que rechazan formatos inválidos.

**Error handling**
- `ObtenerCuenta` u `ObtenerMovimientos` lanza un error — `MensajeError` "No se pudo cargar su cuenta. Vuelva a intentarlo." con "Aceptar", que reintenta (comportamiento de FEAT-001a).
- Un movimiento con monto o fecha en formato inválido — se trata como error de carga, con el mismo mensaje; nunca se muestra un monto incorrecto.
- `location.state` con un mensaje desconocido — se ignora y no se muestra ningún mensaje.

**Required tests**
- [ ] `test_alta_ingreso_flujo_completo` — usuario con saldo "0": "Añadir Ingreso" → monto 500 → "Guardar" muestra la sección Cuenta con "USD 500,00", el grupo de la fecha de hoy y el movimiento "Pago Ingresado" "+500,00" — validates AC-06
- [ ] `test_cancelar_vuelve_a_cuenta_sin_cambios` — saldo "10000": abrir "Añadir Ingreso", escribir 500 y presionar "Cancelar" (y en otro caso la flecha) vuelve a la sección Cuenta con "USD 10.000,00", sin movimientos nuevos y sin llamar a `AgregarIngreso` — validates AC-09
- [ ] `test_falla_alta_sin_cambios_rechazado` — saldo "10000" y `AgregarIngreso` rechazado al guardar 1000: se muestra el mensaje de error en español sin detalles técnicos; al aceptar y cancelar, la sección Cuenta sigue con "USD 10.000,00" y sin movimientos nuevos — validates AC-31
- [ ] `test_mensaje_exito_se_cierra_a_los_3_segundos` — después de registrar, "Ingreso registrado con éxito." se ve con `role="status"`, sin botón "Aceptar", sigue visible a los 2999 ms y desaparece a los 3000 ms — validates AC-24
- [ ] `test_mensaje_exito_en_modo_estricto` — con `StrictMode`, el mensaje de éxito se muestra una vez y el state de la navegación queda limpio
- [ ] `test_mensaje_desconocido_rechazado` — `location.state.mensajeExito` con otro texto no muestra ningún mensaje
- [ ] `test_lista_agrupada_por_fecha` — movimientos de dos fechas se muestran bajo sus encabezados "DD/MM/AAAA", en el orden recibido, con categoría y monto con signo
- [ ] `test_lista_vacia_mensaje` — sin movimientos se muestra "Aquí verá sus movimientos." y no se muestra la lista
- [ ] `test_error_carga_movimientos` — si `ObtenerMovimientos` falla, se muestra "No se pudo cargar su cuenta. Vuelva a intentarlo." con "Aceptar"
- [ ] `test_movimiento_invalido_error_carga` — un movimiento con monto `"abc"` o fecha `"11/11/2026"` muestra el error de carga y no un monto incorrecto

**Completion criterion**
`npm run lint`, `npm test` y `npm run build` pasan. `ContarMovimientos` no aparece en `src/`. Cobertura de líneas de los archivos nuevos y modificados ≥ 80%.

## Final verification
- `validate_spec.py --tier FEATURE` pasa sobre este documento y `validate_threat.py` pasa sobre `threat-FEAT-001b.md`.
- `npm run lint`, `npm test`, `npm run build` y, con `.env.local`, `npm run test:integracion` pasan.
- `supabase/scripts/pruebas_movimientos.sql` imprime `PASÓ` en sus tres casos; el resultado queda registrado en el reporte de VERIFY.
- Los 7 AC del PRD (AC-06, AC-07, AC-09, AC-18, AC-24, AC-28, AC-31) tienen al menos un test requerido que los valida.
