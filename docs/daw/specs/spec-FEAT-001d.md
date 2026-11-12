# Spec FEAT-001d: Monto del ingreso y límites

| Field | Value |
|-------|-------|
| Ticket | FEAT-001d |
| PRD | docs/daw/prd/prd-FEAT-001d.md |
| Tier | FEATURE |
| Date | 2026-11-12 |
| Spec loops | 0 |
| Loops since last human decision | 0 |

## Summary
FEAT-001b dejó el campo "Monto" como texto libre: se valida recién al guardar y el punto se acepta como decimal. Este ticket hace cuatro cosas:
- Agrega una máscara propia sobre texto, sin librería (ADR-005). El campo solo acepta dígitos y una coma, con dos decimales como máximo, y muestra el punto de miles mientras se escribe.
- `ValidarMonto` lee el texto con formato y se suma el tope de 999.999.999.999,99 en el cliente.
- `BASP_AGREGAR_MOVIMIENTO` agrega en el servidor el tope del monto y el rechazo de fechas posteriores a mañana en UTC.
- Se prueba la precisión exacta de montos y saldo contra la API real y en el flujo de la interfaz.

El esquema no cambia: `BAT_MOVIMIENTOS.monto` sigue siendo `numeric(14,2)` y `BAT_CUENTAS.saldo` sigue siendo `numeric` sin tope de enteros. Con eso queda cerrado el pendiente de `decisions-FEAT-001b.md` (error 22003 con montos de 10^12 o más) y el riesgo de fecha futura de `threat-FEAT-001c.md`.

## Coverage: PRD → blocks
| Requirement | Covered by |
|---|---|
| FR-01 | Block 1, Block 2, Block 4 |
| FR-02 | Block 1, Block 2 |
| FR-03 | Block 1, Block 2, Block 4 |
| FR-04 | Block 3 |
| NFR-01 | Strategy: los montos y el saldo nunca pasan por `Number`. En la base son `numeric(14,2)` (monto) y `numeric` sin tope (saldo). Viajan como texto (`p_monto` texto, `monto::text`, `saldo::text`) y en JS se procesan con expresiones regulares y comparaciones de texto. Se prueba con 0,10 + 0,20 = 0,30 y con dos montos máximos contra la API real (Block 3, AC-29, AC-30) y en la interfaz (Block 4). |

| AC | Covered by |
|---|---|
| AC-15 | Block 1, Block 2 |
| AC-16 | Block 1, Block 2, Block 4 |
| AC-17 | Block 1, Block 2 |
| AC-19 | Block 1, Block 2, Block 3, Block 4 |
| AC-20 | Block 3 |
| AC-29 | Block 3, Block 4 |
| AC-30 | Block 3, Block 4 |

## Dependencies between blocks
- Block 1 y Block 3 son independientes entre sí.
- Block 2 depende de Block 1: el formulario usa `AplicarMascaraMonto`, `CalcularPosicionCursor`, `ValidarMonto` y `SuperaMontoMaximo`.
- Block 4 depende de Block 2: el flujo escribe en el campo con máscara.
- Orden de ejecución: 1 → 2 → 3 → 4.

## Block 1 — Máscara y validación del monto

**Files**
- `src/utilidades/mascaraMonto.js` (new) — `AplicarMascaraMonto(texto)`, `NormalizarMontoPegado(texto)` y `CalcularPosicionCursor(textoMostrado, cantidadSignificativosDespues)`.
- `src/utilidades/mascaraMonto.test.js` (new).
- `src/utilidades/validacionMonto.js` (modified) — `ValidarMonto` lee el texto con formato; nuevos `MENSAJE_MONTO_MAXIMO` y `ValidarMontoMaximo`.
- `src/utilidades/validacionMonto.test.js` (modified) — se rehace `test_validar_monto_punto_decimal` y se agregan las pruebas de abajo.

**Logic**
Implementa FR-01, FR-02 y la regla de FR-03 en el cliente (ADR-005). Todo se procesa como texto, nunca con `Number`.

`AplicarMascaraMonto(texto)` devuelve el texto que muestra el campo:
1. Si `texto` no es un string, devuelve `''`.
2. Quita todo lo que no sea un dígito o una coma: signos, letras, espacios y puntos. Los puntos solo pueden ser los separadores de miles que puso la propia máscara.
3. Conserva solo la primera coma y descarta las demás.
4. Parte entera: quita los ceros a la izquierda dejando uno si no queda nada. Si el texto empieza con coma, la parte entera es `0` (",5" → "0,5"; "05" → "5"; "00" → "0").
5. Parte decimal: conserva a lo sumo dos dígitos ("10,555" → "10,55").
6. Agrupa la parte entera con `.` cada tres dígitos, recorriéndola desde la derecha en tramos de tres caracteres con `slice`, en tiempo lineal. No reusa `POSICIONES_SEPARADOR_MILES` de `formatoMoneda.js`, que con su lookahead tarda un tiempo cuadrático en textos largos (threat R-04).
7. Arma `entera` + (`,` + `decimales` si había coma). Una coma final se conserva ("1500," → "1.500,") para poder seguir escribiendo decimales.
8. Texto vacío → `''`.

`CalcularPosicionCursor(textoMostrado, cantidadSignificativosDespues)` devuelve el menor índice de `textoMostrado` que tiene exactamente `cantidadSignificativosDespues` caracteres significativos (dígitos o coma) a su derecha. Con 0 devuelve `textoMostrado.length`, y si hay menos significativos que los pedidos devuelve 0. Se cuenta desde la derecha porque esa cantidad no cambia cuando la máscara agrega o quita un `0` inicial o los puntos de miles.

`NormalizarMontoPegado(texto)` se aplica solo al texto que el usuario pega, antes de insertarlo en el campo. Si el texto, sin espacios en los extremos, es `^\d+\.\d{1,2}$` (un solo punto seguido de uno o dos dígitos y sin coma), cambia ese punto por coma ("1500.50" → "1500,50"). En cualquier otro caso lo devuelve igual ("1.500" sigue siendo mil quinientos). Si no es un string devuelve `''`. No se aplica al tecleo: al borrar el último dígito de "1.000" queda "1.00", que tiene que seguir leyéndose como cien.

`ValidarMonto(texto)`:
- Acepta `^\d{1,3}(\.\d{3})*(,\d{1,2})?$` o `^\d+(,\d{1,2})?$`, después de `trim`.
- Quita los puntos y cambia la coma por punto.
- Rechaza si el resultado es solo ceros.
- Devuelve el monto normalizado ("1.500,50" → "1500.50") o `null`.
- El punto ya no se acepta como separador decimal.

`ValidarMontoMaximo(montoNormalizado)` recibe el resultado de `ValidarMonto`. Devuelve `false` si la parte entera, sin ceros a la izquierda, tiene más de 12 dígitos, y `true` en otro caso. Con 12 dígitos o menos el monto es como mucho 999.999.999.999,99, porque `ValidarMonto` ya limita los decimales a dos.

`MENSAJE_MONTO_MAXIMO = 'El monto máximo es 999.999.999.999,99.'` (FR-03). `MENSAJE_MONTO_INVALIDO` no cambia.

**Input validation**
- `texto` (lo que escribe o pega el usuario): string de cualquier largo. Solo sobreviven dígitos y una coma, con a lo sumo dos decimales.
- Lo que no es string se trata como vacío (`AplicarMascaraMonto`) o como inválido (`ValidarMonto` → `null`).
- Expresiones regulares ancladas y sin cuantificadores anidados ambiguos (threat R-04).

**Error handling**
- Entrada que no es string: `AplicarMascaraMonto` devuelve `''` y `ValidarMonto` devuelve `null`, sin lanzar.
- Monto vacío, solo ceros o con formato inválido: `ValidarMonto` devuelve `null` y el formulario muestra `MENSAJE_MONTO_INVALIDO`.
- Monto por encima del máximo: `ValidarMontoMaximo` devuelve `false` y el formulario muestra `MENSAJE_MONTO_MAXIMO`.

**Required tests**
- [ ] test_mascara_rechaza_signo_y_letras — "-50" y "abc50" dan "50"; signos y letras rechazados (AC-15)
- [ ] test_mascara_agrupa_miles — "1500,50" da "1.500,50" y "1234567" da "1.234.567" (AC-16)
- [ ] test_mascara_tercer_decimal_rechazado — "10,555" da "10,55" (AC-17)
- [ ] test_mascara_ceros_y_coma_inicial — ",5" da "0,5", "05" da "5", "00" da "0" y "1500," da "1.500,"
- [ ] test_mascara_quita_puntos_previos — "1.5005" (el usuario escribió un dígito más tras "1.500") da "15.005"
- [ ] test_mascara_no_texto_invalido — `undefined`, `null` y `5` dan `''`; entrada inválida sin excepción
- [ ] test_mascara_texto_largo_sin_retroceso — 10.000 caracteres mezclados se procesan en menos de 50 ms (threat R-04)
- [ ] test_monto_pegado_punto_decimal — "1500.50" da "1500,50" y " 12.5 " da "12,5"; "1.500", "1.500.000" y "1500,50" quedan igual; un valor que no es texto es inválido y da `''`
- [ ] test_posicion_cursor — en "1.500,50", 2 significativos a la derecha → 6, 0 → 8 y 99 → 0; en "1.500", 3 → 1
- [ ] test_validar_monto_con_miles — "1.500,50" → "1500.50", "999.999.999.999,99" → "999999999999.99", "10" → "10" (AC-16, AC-19)
- [ ] test_validar_monto_punto_decimal — "1.234" se lee como miles y da "1234"; "1.23" es inválido y da `null`
- [ ] test_validar_monto_invalido_rechazado — vacío, "   ", "0", "0,00", "-5", "abc", "1,234", "10,555" y "1..000" dan `null`
- [ ] test_validar_monto_maximo_rechazado — "1000000000000.00" → `false` (rechazado), "999999999999.99" → `true`, "000999999999999.99" → `true` (AC-19)
- [ ] test_mensaje_monto_maximo_texto_fijo — `MENSAJE_MONTO_MAXIMO` es "El monto máximo es 999.999.999.999,99." (FR-03)

**Completion criterion**
Pasan las 14 pruebas y siguen en verde las demás de `validacionMonto.test.js`.

## Block 2 — Campo de monto con máscara en el formulario

**Files**
- `src/componentes/FormularioMovimiento.jsx` (modified) — el `onChange` del monto aplica la máscara y conserva el cursor; `ManejarEnvio` agrega el tope.
- `src/componentes/FormularioMovimiento.test.jsx` (modified) — pruebas nuevas; se rehace `test_mensaje_error_validacion_hasta_aceptar`, que escribía "abc" y ahora el campo lo descarta.

**Logic**
Implementa FR-01, FR-02 y FR-03 en la interfaz.

**`ManejarCambioMonto(evento)`**, el `onChange` del campo "Monto", declarado como función con nombre:
1. Lee `evento.target.value` y `evento.target.selectionStart`.
2. Cuenta los dígitos y comas que hay después del cursor en el valor crudo.
3. Calcula `AplicarMascaraMonto(valor)`. Si la máscara descartó caracteres (un tercer decimal, una segunda coma), el conteo se recorta a los significativos que quedaron en el texto con máscara.
4. Guarda el texto con `EstablecerMontoTexto`, la posición en un `useRef` (`posicionCursorPendiente`) con `CalcularPosicionCursor` y suma 1 a un contador de estado (`versionMonto`, con `EstablecerVersionMonto`).
5. Un `useLayoutEffect` que depende de `versionMonto` aplica `setSelectionRange(posicion, posicion)` sobre el `input` (con `useRef`) si hay una posición pendiente, y después la limpia. Depende del contador y no de `montoTexto` porque, cuando la máscara rechaza un carácter, el texto queda igual y React no vuelve a renderizar por él: el contador asegura que el cursor vuelva a su lugar también en ese caso.

**`ManejarPegadoMonto(evento)`**, el `onPaste` del campo:
1. Lee el texto con `evento.clipboardData.getData('text')` y aplica `NormalizarMontoPegado`.
2. Si el texto normalizado es igual al pegado, no hace nada y el pegado sigue por `ManejarCambioMonto`.
3. Si cambió, llama a `evento.preventDefault()` y arma el valor crudo: el texto actual del campo, con lo seleccionado (`selectionStart` a `selectionEnd`) reemplazado por el texto normalizado. Lo pasa por el mismo camino de `ManejarCambioMonto` (máscara, cursor y `versionMonto`), con el cursor al final de lo pegado.

**`ManejarEnvio`**
1. `ValidarMonto(montoTexto)`. Si da `null`, muestra `MENSAJE_MONTO_INVALIDO` (sin cambios).
2. `ValidarMontoMaximo(montoValidado)`. Si da `false`, muestra `MENSAJE_MONTO_MAXIMO` con `MensajeError` y no llama a `AgregarIngreso`. El texto del campo se conserva.
3. Llama a `AgregarIngreso` con `montoTexto: montoValidado` ("1500.50"), igual que antes.

El `input` sigue con `type="text"` e `inputMode="decimal"`.

**Input validation**
- Campo "Monto": solo dígitos y una coma, como mucho dos decimales y punto de miles automático (Block 1).
- Al guardar: formato válido, mayor a 0 y menor o igual a 999.999.999.999,99.

**Error handling**
- Monto inválido (vacío o 0) al guardar: `MensajeError` con "El monto debe ser mayor a 0.", que se cierra solo con "Aceptar"; no se llama a la API.
- Monto por encima del máximo al guardar: `MensajeError` con "El monto máximo es 999.999.999.999,99.", que se cierra solo con "Aceptar"; no se llama a la API y se conserva lo escrito.
- `AgregarIngreso` rechazado: "No se pudo registrar el ingreso. Vuelva a intentarlo." (FEAT-001b, sin cambios).

**Required tests**
- [ ] test_campo_monto_rechaza_signo_y_letras — escribir "-50" muestra "50" y escribir "abc50" muestra "50"; signo y letras rechazados (AC-15)
- [ ] test_campo_monto_muestra_miles — escribir "1500,50" muestra "1.500,50" y `AgregarIngreso` recibe "1500.50" (AC-16)
- [ ] test_campo_monto_tercer_decimal_rechazado — escribir "10,555" muestra "10,55" (AC-17)
- [ ] test_monto_maximo_rechazado_sin_llamar_api — con "1000000000000,00" "Guardar" muestra "El monto máximo es 999.999.999.999,99.", no llama a `AgregarIngreso` y el campo conserva "1.000.000.000.000,00" (AC-19)
- [ ] test_monto_maximo_exacto_se_envia — con "999999999999,99" `AgregarIngreso` recibe "999999999999.99" (AC-19)
- [ ] test_campo_monto_cursor_conservado — con "1.500" y el cursor después del "1", escribir "2" deja "12.500" con el cursor después del "2"
- [ ] test_campo_monto_pegado_punto_decimal — pegar "1500.50" en el campo vacío muestra "1.500,50" y "Guardar" envía "1500.50"; pegar "1.500" muestra "1.500"
- [ ] test_campo_monto_coma_inicial — en el campo vacío, escribir "," y después "5" deja "0,5" con el cursor al final
- [ ] test_campo_monto_letra_en_medio_rechazada — con "1.500" y el cursor después del "1", escribir "a" deja "1.500" con el cursor todavía después del "1"
- [ ] test_mensaje_error_validacion_hasta_aceptar — con "0", "Guardar" muestra "El monto debe ser mayor a 0."; sigue visible a los 10 s, se cierra solo con "Aceptar" y el campo conserva "0"; monto inválido rechazado sin llamar a la API
- [ ] test_falla_alta_muestra_error_rechazado — sigue pasando sin cambios (AgregarIngreso rechazado)

**Completion criterion**
Pasan las 11 pruebas y el resto de `FormularioMovimiento.test.jsx`.

## Block 3 — Límites en el servidor

**Files**
- `supabase/migrations/20261112000001_limites_movimiento.sql` (new) — `create or replace function public.BASP_AGREGAR_MOVIMIENTO` con la misma firma.
- `pruebas/movimientos.test.js` (modified) — pruebas contra Supabase.
- `pruebas/ayudantesPruebas.js` (modified) — `ObtenerFechaUtcMasDias(dias)`, solo para pruebas.

**Logic**
Implementa FR-04 y NFR-01 en el servidor.

La migración reescribe `BASP_AGREGAR_MOVIMIENTO(p_tipo text, p_monto numeric, p_fecha date, p_id_categoria uuid)` igual que en `20261111000001_agregar_movimiento.sql`, con `language plpgsql`, `security definer` y `set search_path = ''`. Solo cambia el paso 2 (parámetros), que rechaza con `22023` "Datos del movimiento inválidos." cuando se cumple cualquiera de estas condiciones:
- `p_tipo` es nulo o distinto de `'INGRESO'`.
- `p_monto` es nulo, `<= 0`, `> 999999999999.99` o distinto de `round(p_monto, 2)`.
- `p_fecha` es nula o `p_fecha > (now() at time zone 'UTC')::date + 1`.
- `p_id_categoria` es nulo.

El tope del monto se compara antes del `insert`, así un monto de 10^12 o más da 22023 y no el 22003 de `numeric(14,2)`. La fecha límite es mañana en UTC (RF-107): el servidor no conoce la zona del usuario, y esto no cambia la fecha guardada. Los pasos 1 y 3 a 7 (sesión, cuenta con `for update`, categoría de la cuenta y del tipo con 42501, insert, saldo, resultado) quedan iguales. La migración repite `revoke execute ... from public, anon` y `grant execute ... to authenticated` (threat R-03).

Rollback: la migración no crea tablas ni cambia datos. Para revertirla se vuelve a ejecutar la definición de `20261111000001_agregar_movimiento.sql` como `create or replace function`, con sus `revoke` y `grant`. Esa instrucción queda escrita como comentario al final de la migración nueva.

En `pruebas/ayudantesPruebas.js`, `ObtenerFechaUtcMasDias(dias)` calcula "hoy UTC + N días" como `AAAA-MM-DD` con `Date.UTC` sobre `getUTCFullYear/Month/Date`. Es la única excepción de AGENTS.md: aquí se busca justamente el día UTC del servidor. No va en `src/utilidades/fechas.js`. Las pruebas de fecha anotan el día UTC antes y después de la llamada; si cambió (la corrida cruzó las 00:00 UTC), repiten la llamada una vez con la fecha recalculada.

**API contract**
- Method + path: `POST /rest/v1/rpc/basp_agregar_movimiento` (supabase-js `rpc('basp_agregar_movimiento')`).
- Request: `p_tipo` (text, `'INGRESO'`), `p_monto` (numeric enviado como texto, > 0, ≤ 999999999999.99, dos decimales como máximo), `p_fecha` (date `AAAA-MM-DD`, ≤ mañana UTC), `p_id_categoria` (uuid de una categoría `INGRESO` de la cuenta del usuario).
- Response: `uuid` del movimiento creado.
- Error codes: `42501` "Operación no permitida." (sin sesión, o categoría ajena, inexistente o de otro tipo); `22023` "Datos del movimiento inválidos." (tipo, monto o fecha inválidos, o algún parámetro nulo).
- Auth: JWT de Supabase; `execute` solo para `authenticated`. La cuenta sale de `auth.uid()`.

**Data model**
- Reuses `BAT_MOVIMIENTOS` from FEAT-001a — no schema change; constraints as declared there: `monto numeric(14,2) NOT NULL`, `BACK_MOVIMIENTOS_MONTO_POSITIVO` (`monto > 0`), `BACK_MOVIMIENTOS_TIPO`, `fecha date NOT NULL`, FK `BAFK_MOVIMIENTOS_CATEGORIA` y FK a `BAT_CUENTAS`, RLS por propietario.
- Reuses `BAT_CUENTAS` from FEAT-001a — no schema change; constraints as declared there: `saldo numeric NOT NULL default 0` sin tope de enteros, `BACK_CUENTAS_SALDO_DOS_DECIMALES` (`saldo = round(saldo, 2)`), `BAUQ_CUENTAS_USUARIO`, RLS por propietario.

**Input validation**
- `p_monto`: no nulo, > 0, ≤ 999999999999.99, igual a `round(p_monto, 2)`.
- `p_fecha`: no nula, ≤ `(now() at time zone 'UTC')::date + 1`.
- `p_tipo`: `'INGRESO'`.
- `p_id_categoria`: no nulo; de la cuenta de `auth.uid()` y de tipo `INGRESO`.

**Error handling**
- Monto inválido por la API (0, negativo, más de dos decimales o mayor al máximo): 22023, sin escribir el movimiento ni cambiar el saldo.
- Fecha posterior a mañana UTC por la API: 22023, sin escribir nada.
- Categoría de otro tipo, de otro usuario o inexistente: 42501 "Operación no permitida.", sin escribir nada (sin cambios).
- Llamada sin sesión: 42501 (sin cambios).

**Required tests**
- [ ] test_monto_maximo_superado_rechazado_api — monto inválido "1000000000000.00" rechazado con 22023, sin dejar movimiento (AC-20)
- [ ] test_monto_tres_decimales_rechazado_api — monto inválido "10.555" rechazado con 22023 (AC-20)
- [ ] test_fecha_pasado_manana_utc_rechazada_api — fecha hoy UTC + 2 días rechazada con 22023 (AC-20)
- [ ] test_fecha_manana_utc_aceptada_api — hoy UTC + 1 día se registra (límite de RF-107)
- [ ] test_rechazos_api_saldo_sin_cambios — A con saldo 10000.00 intenta por la API montos 0, -50, 1000000000000.00 y 10.555, su "Pago Realizado" (categoría de gasto), el "Pago Ingresado" de B (categoría de ingreso de otro usuario) y hoy UTC + 2 días. Todas las operaciones son rechazadas, A no tiene movimientos nuevos y el saldo sigue en "10000.00" (AC-20). La creación de categorías propias está fuera de este ticket, así que la categoría de gasto de A y la de ingreso de B son las de por defecto, con las mismas condiciones que nombra AC-20 ("Mercado" y "Ventas").
- [ ] test_monto_invalido_rechazado_api — montos inválidos "0", "-5" y "1.234" rechazados, sin cambios
- [ ] test_sin_sesion_rechazado_api — sigue pasando sin cambios (no autorizado tras el `create or replace`)
- [ ] test_monto_maximo_exacto_api — A con saldo 0 registra "999999999999.99" y `saldo::text` es "999999999999.99" (AC-19)
- [ ] test_suma_decimales_exacta_api — A con saldo 0 registra "0.10" y "0.20", y `saldo::text` es "0.30" (AC-29)
- [ ] test_dos_montos_maximos_api — A con saldo 0 registra dos veces "999999999999.99" y `saldo::text` es "1999999999999.98" (AC-30)

**Completion criterion**
Con la migración aplicada, pasan las 10 pruebas requeridas de `npm run test:integracion` y el resto de `pruebas/`.

## Block 4 — Flujo de punta a punta del monto

**Files**
- `src/flujoIngreso.test.jsx` (modified) — pruebas de flujo con los servicios simulados del archivo.
- `src/utilidades/formatoMoneda.test.js` (modified) — saldo con 13 dígitos enteros.

**Logic**
Implementa las comprobaciones de interfaz de FR-01, FR-03 y NFR-01: el monto escrito con máscara llega a la lista y al saldo con el formato y la precisión exactos. No hay código de producción nuevo: el bloque prueba lo que dejan Block 1, Block 2 y `formatoMoneda.js` (FEAT-001b), con la simulación de `AgregarIngreso` que suma en centavos con BigInt.

**Error handling**
- Sin condiciones de error propias: es un bloque solo de pruebas sobre los Block 1 y Block 2, cuyos errores ya cubren sus propias pruebas.

**Required tests**
- [ ] test_alta_monto_con_miles_flujo — con saldo 10000.00 escribe "1500,50", el campo muestra "1.500,50" y al guardar la cuenta muestra "+1.500,50" y "USD 11.500,50" (AC-16)
- [ ] test_monto_maximo_flujo — con saldo 0, "1000000000000,00" muestra "El monto máximo es 999.999.999.999,99." y no registra nada; después "999999999999,99" registra y la cuenta muestra "USD 999.999.999.999,99" (AC-19)
- [ ] test_suma_decimales_flujo — con saldo 0, registrar "0,10" y "0,20" muestra "USD 0,30" (AC-29)
- [ ] test_dos_montos_maximos_flujo — con saldo 0, registrar dos veces "999999999999,99" muestra "USD 1.999.999.999.999,98" (AC-30)
- [ ] test_formatear_saldo_trece_enteros — `FormatearSaldo("1999999999999.98", "USD")` da "USD 1.999.999.999.999,98" (AC-30)

**Completion criterion**
Pasan las 5 pruebas y toda la suite de `npm test`.

## Final verification
- `npm test`, `npm run lint` y, con la migración `20261112000001_limites_movimiento.sql` aplicada, `npm run test:integracion` en verde.
- Los 7 AC del PRD (AC-15, AC-16, AC-17, AC-19, AC-20, AC-29, AC-30) cubiertos por al menos una prueba requerida que pasa.
- `validate_spec.py --tier FEATURE` pasa sobre este documento.
