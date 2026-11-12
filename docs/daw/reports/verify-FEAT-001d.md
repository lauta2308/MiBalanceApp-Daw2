# Verification FEAT-001d

| Field | Value |
|---|---|
| Module | `src/utilidades/mascaraMonto.js`, `src/utilidades/validacionMonto.js`, `src/componentes/FormularioMovimiento.jsx`, `supabase/migrations/20261112000001_limites_movimiento.sql` |
| Line coverage | 96.74% |
| Branch coverage | 89.97% |
| Function coverage | 96.66% |
| Coverage floor | 80% (method default — .daw/rules/testing.instructions.md) |
| Lint | `npx eslint .` — clean, 0 findings |

Cobertura de la suite completa (`docs/daw/reports/tests-FEAT-001d.md`, 254/254 sobre `ff7d9a0`; `e2f936c` solo agrega reportes, `git diff ff7d9a0..HEAD -- src pruebas supabase` vacío). Por archivo nuevo o modificado (proyecto `unidad`, 226/226, medida por daw-module-verifier):

| Archivo | Líneas | Ramas | Funciones |
|---|---|---|---|
| `src/utilidades/mascaraMonto.js` (nuevo) | 100% | 100% | 100% |
| `src/utilidades/validacionMonto.js` | 100% | 100% | 100% |
| `src/componentes/FormularioMovimiento.jsx` | 98.91% | 86.66% | 100% |

La migración no tiene medida de cobertura: la cubren las pruebas de integración de `pruebas/movimientos.test.js` contra Supabase (17/17), con la migración aplicada por el usuario en el SQL Editor.

## Acceptance criteria
- ✅ AC-15 — `test_mascara_rechaza_signo_y_letras`, `test_campo_monto_rechaza_signo_y_letras` (`mascaraMonto.js:AplicarMascaraMonto`, `FormularioMovimiento.jsx:ManejarCambioMonto`)
- ✅ AC-16 — `test_mascara_agrupa_miles`, `test_validar_monto_con_miles`, `test_campo_monto_muestra_miles`, `test_alta_monto_con_miles_flujo` (`AplicarMascaraMonto`, `validacionMonto.js:ValidarMonto`)
- ✅ AC-17 — `test_mascara_tercer_decimal_rechazado`, `test_campo_monto_tercer_decimal_rechazado` (`AplicarMascaraMonto`)
- ✅ AC-19 — `test_validar_monto_maximo_rechazado`, `test_mensaje_monto_maximo_texto_fijo`, `test_monto_maximo_rechazado_sin_llamar_api`, `test_monto_maximo_exacto_se_envia`, `test_monto_maximo_flujo`, `test_monto_maximo_exacto_api` (`validacionMonto.js:ValidarMontoMaximo`, `FormularioMovimiento.jsx:ManejarEnvio`)
- ✅ AC-20 — `test_rechazos_api_saldo_sin_cambios`, `test_monto_maximo_superado_rechazado_api`, `test_monto_tres_decimales_rechazado_api`, `test_fecha_pasado_manana_utc_rechazada_api`, `test_fecha_manana_utc_aceptada_api`, `test_monto_invalido_rechazado_api` (migración `20261112000001_limites_movimiento.sql`, paso 2 de `BASP_AGREGAR_MOVIMIENTO`). Con "Pago Realizado"/"Pago Ingresado" en lugar de "Mercado"/"Ventas", desviación aprobada en `decisions-FEAT-001d.md`.
- ✅ AC-29 — `test_suma_decimales_exacta_api`, `test_suma_decimales_flujo` (montos `numeric` y como texto, nunca `Number`)
- ✅ AC-30 — `test_dos_montos_maximos_api`, `test_dos_montos_maximos_flujo`, `test_formatear_saldo_trece_enteros` (`saldo numeric` sin tope, `formatoMoneda.js`)

## Spec blocks
- ✅ Block 1 — máscara y validación del monto: 4/4 tareas, 14/14 pruebas requeridas
- ✅ Block 2 — campo de monto con máscara en el formulario: 5/5 tareas, 11/11 pruebas requeridas
- ✅ Block 3 — límites en el servidor: 4/4 tareas, 10/10 pruebas requeridas
- ✅ Block 4 — flujo de punta a punta del monto: 2/2 tareas, 5/5 pruebas requeridas, sin cambios de producción

## Tests
Las 40 pruebas requeridas por la spec existen con su nombre exacto y pasan:
- ✅ `test_mascara_rechaza_signo_y_letras`
- ✅ `test_mascara_agrupa_miles`
- ✅ `test_mascara_tercer_decimal_rechazado`
- ✅ `test_mascara_ceros_y_coma_inicial`
- ✅ `test_mascara_quita_puntos_previos`
- ✅ `test_mascara_no_texto_invalido`
- ✅ `test_mascara_texto_largo_sin_retroceso`
- ✅ `test_monto_pegado_punto_decimal`
- ✅ `test_posicion_cursor`
- ✅ `test_validar_monto_con_miles`
- ✅ `test_validar_monto_punto_decimal`
- ✅ `test_validar_monto_invalido_rechazado`
- ✅ `test_validar_monto_maximo_rechazado`
- ✅ `test_mensaje_monto_maximo_texto_fijo`
- ✅ `test_campo_monto_rechaza_signo_y_letras`
- ✅ `test_campo_monto_muestra_miles`
- ✅ `test_campo_monto_tercer_decimal_rechazado`
- ✅ `test_monto_maximo_rechazado_sin_llamar_api`
- ✅ `test_monto_maximo_exacto_se_envia`
- ✅ `test_campo_monto_cursor_conservado`
- ✅ `test_campo_monto_pegado_punto_decimal`
- ✅ `test_campo_monto_coma_inicial`
- ✅ `test_campo_monto_letra_en_medio_rechazada`
- ✅ `test_mensaje_error_validacion_hasta_aceptar`
- ✅ `test_falla_alta_muestra_error_rechazado`
- ✅ `test_monto_maximo_superado_rechazado_api`
- ✅ `test_monto_tres_decimales_rechazado_api`
- ✅ `test_fecha_pasado_manana_utc_rechazada_api`
- ✅ `test_fecha_manana_utc_aceptada_api`
- ✅ `test_rechazos_api_saldo_sin_cambios`
- ✅ `test_monto_invalido_rechazado_api`
- ✅ `test_sin_sesion_rechazado_api`
- ✅ `test_monto_maximo_exacto_api`
- ✅ `test_suma_decimales_exacta_api`
- ✅ `test_dos_montos_maximos_api`
- ✅ `test_alta_monto_con_miles_flujo`
- ✅ `test_monto_maximo_flujo`
- ✅ `test_suma_decimales_flujo`
- ✅ `test_dos_montos_maximos_flujo`
- ✅ `test_formatear_saldo_trece_enteros`

Además existe `test_contar_significativos` (fuera de la spec, registrada en decisions).

- ✅ Sad-path tests: toda función con entrada tiene casos inválidos — `AplicarMascaraMonto` y `NormalizarMontoPegado` (no texto, signos, letras, tercer decimal), `ValidarMonto` (9 entradas inválidas), `ValidarMontoMaximo`, el formulario (monto 0, sobre el máximo, `AgregarIngreso` rechazado) y la RPC (0, -5, -50, 1.234, 10.555, 10^12, hoy UTC + 2, categoría de gasto, categoría de otro usuario, sin sesión).

## Reglas
- ✅ F-VER-01 — los 7 AC tienen prueba que verifica comportamiento real (valor del campo, argumentos de `AgregarIngreso`, saldo y lista mostrados, o código de error más saldo y movimientos sin cambios)
- ✅ F-VER-02 — 15/15 tareas de los 4 bloques
- ✅ F-VER-03 — 96.74% / 89.97% / 96.66% sobre un piso de 80/80/80
- ✅ F-VER-04 — sad paths, ver arriba
- ✅ F-VER-05 — ESLint limpio
- ✅ F-VER-06 — 40/40 pruebas requeridas
- ✅ W-VER-01 — sin código muerto ni importaciones sin uso
- ⚠️ W-VER-02 — ramas de `FormularioMovimiento.jsx` en 86.66%: faltan los fallbacks `??` de `selectionStart`/`selectionEnd` (líneas 100, 115 y 116, nuevas) y el `if (cargaEnCurso.current) return` de la línea 124 (anterior a este ticket)
- ⚠️ W-VER-03 — `test_mascara_texto_largo_sin_retroceso` mide tiempo de reloj (topes de 50 ms y 1000 ms) y ya falló de forma intermitente con el tope anterior de 200 ms; las pruebas de fecha UTC dependen del reloj, mitigado con `EjecutarConFechaUtc`

## Verificación cruzada (daw-module-verifier)
Veredicto: PASS, 0 FAIL, 4 WARN, 6 INFO. Además de los dos WARN de arriba:
- ⚠️ La evidencia TDD del Block 3 está reconstruida por análisis contra `20261111000001_agregar_movimiento.sql` (3 de 8 pruebas nuevas habrían fallado); no hay una corrida en rojo observada. Coherente con el disco y anotada en decisions.
- ⚠️ `docs/daw/reports/verify-FEAT-001a.md:42` cita el título viejo de la prueba renombrada a `test_formatear_saldo_trece_enteros`; es un reporte de un ticket cerrado y no se reescribe.
- INFO: `spec-FEAT-001d.md:42` nombra `SuperaMontoMaximo` (corregido en decisions; el código usa `ValidarMontoMaximo`).
- INFO: el verificador no volvió a correr `pruebas/` contra Supabase por el límite de inicios de sesión anónimos; se apoya en la corrida del cierre de CODE.
- INFO: sigue la limitación del cursor aceptada por el usuario (decimal escrito en el medio con dos decimales).
- INFO: `.vs/` no versionado ni en `.gitignore`; ajeno al ticket.
- INFO: dos líneas en blanco seguidas en `validacionMonto.test.js`, cosmético.

Result: PASSED
