# Verification FEAT-001b

| Field | Value |
|---|---|
| Module | supabase/migrations/20261111000001_agregar_movimiento.sql, src/servicios/movimientos.js, src/servicios/categorias.js, src/utilidades/validacionMonto.js, src/utilidades/fechas.js, src/utilidades/formatoMoneda.js, src/componentes/FormularioMovimiento.jsx, src/componentes/ListaMovimientos.jsx, src/componentes/MensajeExito.jsx, src/paginas/SeccionCuenta.jsx, src/App.jsx |
| Line coverage | 95.85% |
| Branch coverage | 88.77% |
| Function coverage | 95.9% |
| Coverage floor | 80% (method default — .daw/rules/testing.instructions.md) |
| Lint | `npx eslint .` — clean, 0 findings |

Cobertura de la corrida completa (`npx vitest run --coverage`, unidad + integración): 21 archivos, 199/199 pruebas (`docs/daw/reports/tests-FEAT-001b.md`). La verificación cruzada la hizo daw-module-verifier, que no escribió el código. Repitió la corrida de unidad (181/181, líneas 96.12%, ramas 88.85%), el lint y `vite build`, todo sin errores. No repitió la de integración, por el límite de inicios de sesión anónimos.

La lista de AC sale de `docs/daw/prd/prd-FEAT-001b.md`, que define 7. Las referencias al PRD general que aparecen entre paréntesis quedan cubiertas por el AC que las cita: AC-55 por AC-07, AC-05 por AC-09, AC-45 y AC-112 por AC-18, AC-111 por AC-24, AC-118 por AC-28 y AC-123 por AC-31.

## Acceptance criteria
- ✅ AC-06 — `test_alta_ingreso_sube_saldo` (pruebas/movimientos.test.js, contra Supabase), `test_alta_ingreso_flujo_completo` (src/flujoIngreso.test.jsx), `test_formulario_guarda_y_navega`, `test_agregar_ingreso_envia_texto`, `test_monto_movimiento_con_signo`. Implementado en `BASP_AGREGAR_MOVIMIENTO`, `AgregarIngreso`, `FormularioMovimiento.jsx:ManejarEnvio`, `SeccionCuenta.jsx` y `ListaMovimientos.jsx`. Verifica la fila guardada, el saldo y lo que muestra la interfaz ("USD 500,00", "+500,00", el grupo de hoy).
- ✅ AC-07 — `test_formulario_preselecciona_pago_ingresado`, `test_sin_categoria_por_defecto_error`, `test_categorias_ingreso_por_defecto_primero`. La preselección sale de `es_defecto`, no de la posición, y no existe la opción vacía.
- ✅ AC-09 — `test_cancelar_vuelve_a_cuenta_sin_cambios` (Cancelar y flecha), `test_cancelar_y_flecha_no_guardan`. Comprueba que el saldo no cambia, que no hay movimientos, que no se llama al alta y que la ruta vuelve a "/".
- ✅ AC-18 — `test_monto_vacio_o_cero_rechazado`, `test_mensaje_error_validacion_hasta_aceptar`, `test_validar_monto_invalido_rechazado`, `test_monto_invalido_rechazado_api`. Exige el texto exacto con "Aceptar". La API rechaza 0, -5 y 1.234 sin cambiar el saldo.
- ✅ AC-24 — `test_mensaje_exito_se_cierra_a_los_3_segundos`, `test_mensaje_exito_en_modo_estricto`, `test_mensaje_desconocido_rechazado`, más las 7 pruebas de `MensajeExito.test.jsx`. A los 2999 ms el mensaje sigue y a los 3000 ms desaparece; no tiene botón.
- ✅ AC-28 — `test_categoria_ajena_rechazada`, `test_cuenta_ajena_rechazada`, `test_categoria_de_otro_tipo_rechazada`, `test_sin_sesion_rechazado_api`, `test_tipo_gasto_rechazado_api`, `test_lectura_no_autorizada`, contra la API real. La cuenta sale de `auth.uid()` y `execute` está revocado a `public` y `anon`.
- ✅ AC-31 — interfaz automática: `test_falla_alta_sin_cambios_rechazado` y `test_falla_alta_muestra_error_rechazado`, con mensaje fijo en español sin detalles técnicos y saldo y lista sin cambios. Base de datos manual (ADR-003): `supabase/scripts/pruebas_movimientos.sql` en el SQL Editor de Supabase. El usuario confirmó el 2026-11-11 que los casos (a) atomicidad cuando el update del saldo se interrumpe, (b) y (c) dieron PASÓ. La función no cambió desde `6c7cfa3`.

## Spec blocks
- ✅ Block 1 — alta atómica en la base de datos: 4/4 archivos, 8/8 pruebas requeridas y el script manual con los casos a, b y c. El rollback de la migración está documentado.
- ✅ Block 2 — servicios y utilidades: 10/10 archivos y 11/11 pruebas requeridas. Sin `parseFloat`, `Number(`, `toFixed`, `toISOString` ni `new Date('`.
- ✅ Block 3 — navegación y formulario "Añadir Ingreso": 7/7 archivos y 10/10 pruebas requeridas; `react-router` 8.5.1 agregado y el build pasa.
- ✅ Block 4 — sección Cuenta con lista y mensaje de éxito: 10/10 archivos y 10/10 pruebas requeridas; se quitó `ContarMovimientos`.

Evidencia TDD: registrada por bloque en las revisiones de CODE (`.daw-work/review-block-1.md` a `review-block-4.md`, línea `verifier:`).

## Tests
- ✅ `test_alta_ingreso_sube_saldo`
- ✅ `test_categoria_ajena_rechazada`
- ✅ `test_cuenta_ajena_rechazada`
- ✅ `test_categoria_de_otro_tipo_rechazada`
- ✅ `test_monto_invalido_rechazado_api`
- ✅ `test_tipo_gasto_rechazado_api`
- ✅ `test_sin_sesion_rechazado_api`
- ✅ `test_lectura_no_autorizada`
- ✅ `test_agregar_ingreso_envia_texto`
- ✅ `test_obtener_movimientos_ordenados`
- ✅ `test_categorias_ingreso_por_defecto_primero`
- ✅ `test_error_supabase_propagado`
- ✅ `test_monto_movimiento_con_signo`
- ✅ `test_monto_movimiento_invalido_rechazado`
- ✅ `test_fecha_hoy_local`
- ✅ `test_formatear_fecha`
- ✅ `test_fecha_invalida_rechazada`
- ✅ `test_validar_monto_valido`
- ✅ `test_validar_monto_invalido_rechazado`
- ✅ `test_formulario_preselecciona_pago_ingresado`
- ✅ `test_formulario_fecha_de_hoy`
- ✅ `test_formulario_guarda_y_navega`
- ✅ `test_monto_vacio_o_cero_rechazado`
- ✅ `test_mensaje_error_validacion_hasta_aceptar`
- ✅ `test_falla_alta_muestra_error_rechazado`
- ✅ `test_error_carga_categorias`
- ✅ `test_sin_categoria_por_defecto_error`
- ✅ `test_cancelar_y_flecha_no_guardan`
- ✅ `test_ruta_desconocida_redirige`
- ✅ `test_alta_ingreso_flujo_completo`
- ✅ `test_cancelar_vuelve_a_cuenta_sin_cambios`
- ✅ `test_falla_alta_sin_cambios_rechazado`
- ✅ `test_mensaje_exito_se_cierra_a_los_3_segundos`
- ✅ `test_mensaje_exito_en_modo_estricto`
- ✅ `test_mensaje_desconocido_rechazado`
- ✅ `test_lista_agrupada_por_fecha`
- ✅ `test_lista_vacia_mensaje`
- ✅ `test_error_carga_movimientos`
- ✅ `test_movimiento_invalido_error_carga`
- ✅ Sad-path tests: rechazos de la API (categoría ajena o de otro tipo, insert directo, sin sesión, tipo GASTO, montos inválidos), fallas de carga de categorías y movimientos, falta de la categoría por defecto, datos con formato inválido, un `state` de navegación desconocido y la falla del alta.

## Warnings
- ⚠️ W-VER-03 — algunas pruebas comparan el `textContent` completo (`${MENSAJE}Aceptar` en `FormularioMovimiento.test.jsx` y `flujoIngreso.test.jsx`; `ObtenerTextoSeccion` en `SeccionCuenta.test.jsx`). Sirven para probar que todo el texto mostrado es fijo, pero quedan atadas al marcado.
- ⚠️ W-VER-03 — `VaciarPromesas` en `src/flujoIngreso.test.jsx` da 10 vueltas fijas de microtareas con relojes falsos. Si el flujo del alta suma pasos asíncronos, la prueba falla por tiempos y no por conducta.
- ⚠️ Rama sin probar: la guardia `cargaEnCurso` de `src/componentes/FormularioMovimiento.jsx:56`, que evita la carga doble en `StrictMode`, no tiene prueba en modo estricto. La cobertura del archivo es 98.36%.
- W-VER-01 — sin código muerto ni imports sin usar.
- ⚠️ W-VER-02 — la cobertura de ramas es 88.77%, entre el 80% y el 90%; líneas y funciones superan el 90%. Se recomienda subirla a más del 90%.

Pendiente fuera de alcance, ya registrado en `decisions-FEAT-001b.md`: un monto de 10^12 o más devuelve 22003 en lugar de 22023. Queda para FEAT-001d; la interfaz muestra igual el mensaje fijo.

Result: PASSED
