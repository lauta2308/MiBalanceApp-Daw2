# Verification FEAT-001a

| Field | Value |
|---|---|
| Module | src/, pruebas/, supabase/ |
| Line coverage | 99.05% |
| Branch coverage | 100% |
| Function coverage | 100% |
| Coverage floor | 80% (method default — .daw/rules/testing.instructions.md) |
| Lint | `npm run lint` — clean, 0 findings |

Segunda ronda de verificación. La primera quedó FAILED por F-VER-06: los tests requeridos de la spec estaban escritos como frases y la regla no podía leerlos. Se volvió a PLAN para agregarles identificadores (commit `a6878b5`), sin cambios en el código.

Corrida de referencia (orquestador, repetida sobre `a6878b5` con el mismo resultado que en `41154ef`): `npx vitest run --coverage --coverage.provider=v8 --coverage.reporter=text --coverage.include='src/**'`, 88 de 88, incluidos los 11 tests de integración contra el proyecto de Supabase real. La verificación cruzada (daw-module-verifier) repitió lint, build y los 77 tests unitarios, y no ejecutó el proyecto de integración.

## Acceptance criteria
- ✅ AC-01 — `SeccionCuenta.test.jsx` "AC-01: con la cuenta nueva y 0 movimientos muestra..."; `pruebas/esquemaCuenta.test.js` "AC-01: un usuario nuevo tiene una cuenta..."
- ✅ AC-02 — `pruebas/esquemaCuenta.test.js` "AC-02: un usuario nuevo tiene exactamente sus dos categorías por defecto"
- ✅ AC-03 — `sesion.test.js` "AC-03: con sesión existente la devuelve y no inicia otra"; `pruebas/sesionPersistente.test.js` "AC-03: al volver a abrir con el mismo almacenamiento..."
- ✅ AC-04 — `GuardiaSesion.test.jsx` "AC-04: si se rechaza el inicio muestra exactamente el mensaje..."; `MensajeError.test.jsx` "AC-04: sigue visible a los 10 segundos..."
- ✅ AC-22 — `SeccionCuenta.test.jsx` "AC-22: con 0 movimientos muestra..." y "AC-22: con 3 movimientos no muestra..."
- ⚠️ AC-27 — `pruebas/esquemaCuenta.test.js` "AC-27: A recibe 0 filas al consultar por sus ids la cuenta, las categorías y los movimientos de B". Cobertura parcial: cuenta y categorías se prueban de verdad; en movimientos el test da 0 filas con o sin RLS, porque B no tiene movimientos en este ticket. Se refuerza en FEAT-001b.

## Spec blocks
- ✅ Block 1 — 15 de 15 archivos y todos los tests requeridos presentes
- ✅ Block 2 — 4 de 4 archivos y todos los tests requeridos presentes; migración aplicada en Supabase real
- ✅ Block 3 — 8 de 8 archivos y todos los tests requeridos presentes
- ✅ Block 4 — 5 de 5 archivos y todos los tests requeridos presentes

## Tests
- ✅ Tests requeridos por la spec: 24 de 24 existen y pasan en la corrida de referencia
- ✅ Sad-path tests: `formatoMoneda.test.js` (saldo y moneda inválidos), `clienteSupabase.test.js` (variables faltantes), `cuentas.test.js` (rechazos de la API y conteo ausente), `sesion.test.js` (inicio rechazado y sesión vacía), `esquemaCuenta.test.js` (escrituras rechazadas)

## Correspondencia de los tests requeridos
Los identificadores son etiquetas de la spec y no existen en el código; cada uno corresponde a estos tests reales.

| Identificador | Archivo | Test real |
|---|---|---|
| `test_saldo_cero` | `formatoMoneda.test.js` | "formatea el saldo cero con dos decimales" |
| `test_saldo_miles_y_decimales` | `formatoMoneda.test.js` | "agrupa los miles con punto" y "completa los decimales a dos con ceros" |
| `test_saldo_negativo` | `formatoMoneda.test.js` | "coloca el signo negativo después de la moneda" |
| `test_saldo_sin_perder_digitos` | `formatoMoneda.test.js` | "no pierde dígitos en montos mayores que la precisión de un float" |
| `test_saldo_invalido_rechazado` | `formatoMoneda.test.js` | "rechaza el saldo inválido: %s" |
| `test_moneda_invalida_rechazada` | `formatoMoneda.test.js` | "rechaza la moneda inválida: %s" |
| `test_variable_faltante` | `clienteSupabase.test.js` | "lanza el error que nombra VITE_SUPABASE_URL si no hay variables" |
| `test_lint_y_audit` | comandos | `npm run lint` y `npm audit --audit-level=high` |
| `test_cuenta_inicial` | `pruebas/esquemaCuenta.test.js` | "AC-01: un usuario nuevo tiene una cuenta..." |
| `test_categorias_por_defecto` | `pruebas/esquemaCuenta.test.js` | "AC-02: un usuario nuevo tiene exactamente sus dos categorías por defecto" |
| `test_lectura_no_autorizada` | `pruebas/esquemaCuenta.test.js` | "AC-27: A recibe 0 filas al consultar por sus ids..." |
| `test_escritura_rechazada` | `pruebas/esquemaCuenta.test.js` | "rechaza las escrituras directas de A y los datos no cambian" |
| `test_configuracion_faltante` | `pruebas/esquemaCuenta.test.js` | "devuelve null e informa qué falta sin..." y "deja marcadas como salteadas las pruebas..." |
| `test_sesion_existente` | `sesion.test.js` | "AC-03: con sesión existente la devuelve y no inicia otra" |
| `test_llamada_duplicada_concurrente` | `sesion.test.js` | "dos llamadas simultáneas sin sesión inician una sola y comparten el resultado" |
| `test_inicio_de_sesion_rechazado` | `GuardiaSesion.test.jsx` | "AC-04: si se rechaza el inicio muestra exactamente el mensaje..." |
| `test_error_de_reintento` | `GuardiaSesion.test.jsx` | "AC-04: \"Aceptar\" se deshabilita mientras reintenta..." y "AC-04: si el reintento funciona muestra los children" |
| `test_mensaje_sigue_visible` | `MensajeError.test.jsx` | "AC-04: sigue visible a los 10 segundos..." |
| `test_sesion_persistente` | `pruebas/sesionPersistente.test.js` | "AC-03: al volver a abrir con el mismo almacenamiento..." |
| `test_pantalla_cuenta_nueva` | `SeccionCuenta.test.jsx` | "AC-01: con la cuenta nueva y 0 movimientos muestra..." |
| `test_mensaje_sin_movimientos` | `SeccionCuenta.test.jsx` | "AC-22: con 0 movimientos muestra..." y "AC-22: con 3 movimientos no muestra..." |
| `test_error_de_carga` | `SeccionCuenta.test.jsx` | "si ObtenerCuenta es rechazada muestra solo el mensaje..." y "al presionar \"Aceptar\" reintenta la carga..." |
| `test_cuenta_faltante_o_saldo_invalido` | `SeccionCuenta.test.jsx` | "con %s muestra el mismo mensaje y ningún saldo" |
| `test_consultas_saldo_texto_y_conteo` | `cuentas.test.js` | "pide la cuenta con saldo::text..." y "cuenta con head: true y count exact..." |

## Warnings
Hallazgos de la verificación cruzada. Ninguno bloquea.

1. ⚠️ `pruebas/esquemaCuenta.test.js:154`: la parte de movimientos de AC-27 y NFR-01 no demuestra RLS (W: cobertura parcial).
2. ⚠️ Los pendientes para FEAT-001b existen solo en `decisions-FEAT-001a.md`; ningún AC de FEAT-001b los recoge todavía.
3. ⚠️ `src/servicios/cuentas.js`: la suite no ejecuta estas funciones con supabase-js real; los tests usan un cliente simulado.
4. ⚠️ `src/utilidades/formatoMoneda.test.js:29`: el título promete detectar float, pero el valor elegido cabe en un double (decisión aceptada en Block 1).
5. ⚠️ W-VER-01 `src/componentes/GuardiaSesion.jsx:26`: la guarda `activo` no tiene efecto observable.
6. ⚠️ W-VER-01 `src/utilidades/formatoMoneda.js:8-9`: los controles de tipo no están fijados por tests.
7. ⚠️ W-VER-03 `pruebas/esquemaCuenta.test.js:146,162`: varias llamadas de red con el límite de tiempo por defecto de 5 segundos.
8. ⚠️ W-VER-03 `pruebas/esquemaCuenta.test.js:51-54`: depende de campos internos de Vitest.
9. ⚠️ `.gitignore` y `eslint.config.js` no ignoran `coverage/`.
10. ⚠️ `src/utilidades/formatoMoneda.js:1-3`: constantes de módulo en camelCase, contra la decisión de usar MAYÚSCULAS_CON_GUIONES.

El agente de verificación cruzada ejecutó además la migración en PGlite, por iniciativa propia y fuera del repositorio: el borrado de un usuario con movimientos funcionó y la política RLS de movimientos aisló una fila sembrada. No forma parte de la suite ni reemplaza a Supabase real.

Result: PASSED
