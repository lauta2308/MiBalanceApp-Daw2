# Verification FEAT-001c

| Field | Value |
|---|---|
| Module | `src/utilidades/ordenCategorias.js`, `src/servicios/categorias.js`, `src/utilidades/fechas.js`, `src/componentes/SelectorFecha.jsx`, `src/componentes/FormularioMovimiento.jsx` |
| Line coverage | 96.16% |
| Branch coverage | 89.45% |
| Function coverage | 96.35% |
| Coverage floor | 80% (method default — .daw/rules/testing.instructions.md) |
| Lint | `npx eslint .` — clean, 0 findings |

Cobertura de la suite completa (`docs/daw/reports/tests-FEAT-001c.md`, 220/220). Por archivo nuevo o modificado (proyecto `unidad`, medida por daw-module-verifier):

| Archivo | Líneas | Ramas | Funciones |
|---|---|---|---|
| `src/utilidades/ordenCategorias.js` (nuevo) | 100% | 100% | 100% |
| `src/servicios/categorias.js` | 100% | 100% | 100% |
| `src/utilidades/fechas.js` | 100% | 100% | 100% |
| `src/componentes/SelectorFecha.jsx` (nuevo) | 100% | 100% | 100% |
| `src/componentes/FormularioMovimiento.jsx` | 98.38% | 93.75% | 100% |

## Acceptance criteria
- ✅ AC-05 — `test_alta_con_categoria_elegida_flujo` (`FormularioMovimiento.jsx`: `select` de categoría y `ManejarEnvio`; `categorias.js:ObtenerCategoriasIngreso`)
- ✅ AC-10 — `test_selector_solo_categorias_ingreso`, `test_categorias_ingreso_por_defecto_primero` (`categorias.js:ObtenerCategoriasIngreso`, filtro `tipo = 'INGRESO'`)
- ✅ AC-11 — `test_ordenar_categorias_sin_mayusculas_ni_tildes`, `test_ordenar_categorias_por_defecto_primero`, `test_categorias_ingreso_por_defecto_primero` (`ordenCategorias.js:OrdenarCategorias`)
- ✅ AC-12 — `test_selector_fecha_hoy_preseleccionado`, `test_dia_futuro_rechazado`, `test_selector_fecha_elige_dia_y_cierra`, `test_formulario_fecha_de_hoy` (`SelectorFecha.jsx:SelectorFecha`)
- ✅ AC-13 — `test_fecha_local_a_las_22_utc_menos_3` (`fechas.js:ObtenerFechaHoy`, `ConvertirFechaATexto`, `ConvertirTextoAFecha`)
- ✅ AC-14 — `test_selector_fecha_navega_hasta_1900`, `test_fecha_antigua_se_envia`, `test_falla_alta_conserva_fecha_rechazado`, `test_alta_fecha_antigua_api` (`SelectorFecha.jsx`, `FormularioMovimiento.jsx`). Advertencia: cubierto por partes, ver hallazgo 1.
- ✅ AC-23 — `test_lista_ordenada_por_fecha_y_alta`, `test_movimientos_ordenados_api` (`movimientos.js:ObtenerMovimientos`, `SeccionCuenta`, `ListaMovimientos`, sin cambios en este ticket). Advertencia: el orden lo fijan el doble y la consulta repetida, ver hallazgo 2.

## Spec blocks
- ✅ Block 1 — orden de las categorías de ingreso: 5/5 archivos, 6/6 pruebas requeridas
- ✅ Block 2 — calendario `SelectorFecha`: 7/7 archivos, 8/8 pruebas requeridas (más `test_selector_fecha_teclado` y `test_selector_fecha_escape_cierra`, registradas en decisions)
- ✅ Block 3 — calendario en el formulario: 3/3 archivos, 5/5 pruebas requeridas
- ✅ Block 4 — flujo completo y orden de la lista: 2/2 archivos, 3/3 pruebas requeridas, sin cambios de producción

## Tests
Las 22 pruebas requeridas por la spec existen con su nombre exacto y pasan:
- ✅ `test_ordenar_categorias_por_defecto_primero`
- ✅ `test_ordenar_categorias_sin_mayusculas_ni_tildes`
- ✅ `test_ordenar_categorias_no_modifica_original`
- ✅ `test_categorias_ingreso_por_defecto_primero`
- ✅ `test_error_supabase_propagado`
- ✅ `test_selector_solo_categorias_ingreso`
- ✅ `test_convertir_texto_a_fecha_local`
- ✅ `test_convertir_texto_a_fecha_invalido_rechazado`
- ✅ `test_convertir_fecha_a_texto_local`
- ✅ `test_selector_fecha_nombre_accesible`
- ✅ `test_selector_fecha_hoy_preseleccionado`
- ✅ `test_dia_futuro_rechazado`
- ✅ `test_selector_fecha_elige_dia_y_cierra`
- ✅ `test_selector_fecha_navega_hasta_1900`
- ✅ `test_formulario_fecha_de_hoy`
- ✅ `test_fecha_local_a_las_22_utc_menos_3`
- ✅ `test_fecha_antigua_se_envia`
- ✅ `test_falla_alta_conserva_fecha_rechazado`
- ✅ `test_alta_fecha_antigua_api`
- ✅ `test_alta_con_categoria_elegida_flujo`
- ✅ `test_lista_ordenada_por_fecha_y_alta`
- ✅ `test_movimientos_ordenados_api`

- ✅ Sad-path tests: `test_convertir_texto_a_fecha_invalido_rechazado` (otro formato, 2026-02-30, 2026-13-01, `undefined`, un `Date`), `test_error_supabase_propagado`, `test_dia_futuro_rechazado`, `test_selector_fecha_escape_cierra` y `test_falla_alta_conserva_fecha_rechazado`

Evidencia TDD: las revisiones por bloque (`.daw-work/review-block-1..4.md`) registran el rojo previo. El Block 4 es de confirmación: su rojo se obtuvo por mutación temporal, como dice decisions-FEAT-001c.md.

## Warnings (no bloquean)
1. ⚠️ AC-14: ninguna prueba muestra en la interfaz el grupo "15/03/1990" con el saldo "USD 10.100,00" partiendo de USD 10.000,00. Lo cubren, por partes, el envío de la fecha desde el formulario, el alta contra la API (saldo 0 → 100) y la agrupación de `ListaMovimientos` de FEAT-001b.
2. ⚠️ AC-23: el orden lo fijan el doble `ObtenerMovimientosOrdenadosDeBase` y la consulta repetida en la prueba de API. Un cambio de orden en `ObtenerMovimientos` solo lo detecta `test_obtener_movimientos_ordenados` (FEAT-001b). Riesgo aceptado en decisions-FEAT-001c.md.
3. ⚠️ `ConvertirFechaATexto` (`src/utilidades/fechas.js`): con un `Invalid Date` devuelve `"NaN-NaN-NaN"` sin aviso. No hay riesgo hoy, porque sus únicos orígenes (`new Date()` y `DayPicker`) dan siempre fechas válidas.
4. ⚠️ `OrdenarCategorias` no tiene prueba de lista vacía, `null` ni `nombre` ausente. Su único origen es el servicio, que propaga el error antes de llamarla.
5. ⚠️ W-VER-03: `LeerGruposDeLista` (`src/flujoIngreso.test.jsx`) compara el `textContent` concatenado del ítem, así que la aserción está atada al marcado. Es el mismo patrón que ya se anotó en FEAT-001b.
6. ℹ️ El verificador no corrió las 2 pruebas de integración contra Supabase, por el límite de usuarios anónimos. Su verde sale de la corrida del cierre de CODE (`tests-FEAT-001c.md`, 220/220).

W-VER-01: sin código muerto ni imports sin usar. W-VER-02: la lógica de negocio (servicios y utilidades) está al 100%.

Verificación cruzada: daw-module-verifier, que no escribió el código. Resultado: PASS, 0 FAIL, 5 WARN y 1 nota.

Result: PASSED
