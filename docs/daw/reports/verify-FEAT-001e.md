# Verification FEAT-001e

| Field | Value |
|---|---|
| Module | `src/componentes/FormularioMovimiento.jsx`, `src/estilos.css` (producción); pruebas en `src/componentes/FormularioMovimiento.test.jsx`, `src/flujoIngreso.test.jsx` y `pruebas/movimientos.test.js` |
| Line coverage | 96.78% |
| Branch coverage | 90.08% |
| Function coverage | 96.66% |
| Coverage floor | 80% (method default — .daw/rules/testing.instructions.md) |
| Lint | `npx eslint .` — clean, 0 findings |

Cobertura de la suite completa (`docs/daw/reports/tests-FEAT-001e.md`, 263/263 sobre `789c834`; `d34afb4` solo agrega reportes). Por archivo de producción con lógica modificado (proyecto `unidad`, 234/234, medida por daw-module-verifier):

| Archivo | Líneas | Ramas | Funciones |
|---|---|---|---|
| `src/componentes/FormularioMovimiento.jsx` | 99% | 88.23% | 100% |

Todas las líneas y ramas nuevas de FEAT-001e están cubiertas; lo que falta (línea 128, guardia `cargaEnCurso`, y alternativas `??` del cursor y el pegado) es anterior al ticket. `src/estilos.css` no tiene medida: jsdom no calcula estilos.

## Acceptance criteria
- ✅ AC-08 — `test_formulario_limpio_al_volver_flujo` (`FormularioMovimiento.jsx`, ruta que se vuelve a montar en cada apertura): las tres salidas (flecha, "Cancelar" y guardar) vuelven a abrir con monto vacío, "Pago Ingresado" y la fecha de hoy
- ✅ AC-21 — `test_guardar_doble_clic_duplicado_rechazado`, `test_guardando_deshabilita_formulario`, `test_falla_alta_rehabilita_formulario_rechazado`, `test_doble_clic_guardar_flujo` (`FormularioMovimiento.jsx:ManejarEnvio`, guardia `envioEnCurso`, `fieldset` deshabilitado, "Guardando…"): un solo ingreso y "USD 11.500,00"
- ✅ AC-25 — `test_segundo_ingreso_con_mensaje_exito_flujo` (`MensajeExito`, región `role="status"`): segundo ingreso de 500 con el mensaje en pantalla, saldo "USD 1.000,00"
- ✅ AC-26 — `test_mensaje_error_monto_cero_diez_segundos_flujo`, `test_mensaje_error_validacion_hasta_aceptar` (`MensajeError`, se cierra solo con `alAceptar`): visible a los 10 s con temporizadores falsos completos
- ✅ AC-32 — `test_secuencia_veinte_altas_saldo_consistente_api` (`BASP_AGREGAR_MOVIMIENTO`, sin cambios): 20 altas, saldo = ingresos − gastos = esperado en centavos tras cada una; pasó en la corrida de cierre contra Supabase
- ✅ AC-33 — `test_error_carga_cuenta_sin_detalle_tecnico_flujo`, `test_falla_alta_sin_cambios_rechazado` (`MENSAJE_ERROR_ALTA` y el mensaje fijo de `SeccionCuenta`): texto fijo en español con "Aceptar" y sin el detalle técnico

## Spec blocks
- ✅ Block 1 — guardado en curso en el formulario: 6/6 pasos de lógica, CSS completo, 3/3 pruebas requeridas (commit `c50a7a8`)
- ✅ Block 2 — flujo del formulario y de los mensajes: 7/7 pruebas requeridas (5 nuevas, 2 existentes sin cambios), sin cambios de producción (commit `d7a62ab`)
- ✅ Block 3 — saldo consistente en una secuencia de 20 altas: 1/1 prueba requerida, `ayudantesPruebas.js` sin cambios (commit `789c834`)

## Tests
Las 11 pruebas requeridas por la spec existen con su nombre exacto y pasan:
- ✅ `test_guardar_doble_clic_duplicado_rechazado`
- ✅ `test_guardando_deshabilita_formulario`
- ✅ `test_falla_alta_rehabilita_formulario_rechazado`
- ✅ `test_formulario_limpio_al_volver_flujo`
- ✅ `test_doble_clic_guardar_flujo`
- ✅ `test_segundo_ingreso_con_mensaje_exito_flujo`
- ✅ `test_mensaje_error_monto_cero_diez_segundos_flujo`
- ✅ `test_error_carga_cuenta_sin_detalle_tecnico_flujo`
- ✅ `test_falla_alta_sin_cambios_rechazado`
- ✅ `test_mensaje_error_validacion_hasta_aceptar`
- ✅ `test_secuencia_veinte_altas_saldo_consistente_api`

- ✅ Sad-path tests: envío duplicado (`test_guardar_doble_clic_duplicado_rechazado`), alta rechazada (`test_falla_alta_rehabilita_formulario_rechazado`, `test_falla_alta_sin_cambios_rechazado`), monto 0 (`test_mensaje_error_monto_cero_diez_segundos_flujo`) y falla de carga de la cuenta (`test_error_carga_cuenta_sin_detalle_tecnico_flujo`)

## Calidad
- ✅ W-VER-01 — sin imports sin usar ni código muerto o comentado
- ⚠️ W-VER-02 — ramas de `FormularioMovimiento.jsx` en 88.23%, dentro de la franja 80–90%; las 4 ramas sin cubrir son anteriores al ticket y todas las nuevas están cubiertas
- ✅ W-VER-03 — temporizadores reales restaurados en `afterEach`; las altas pendientes se resuelven con promesas controladas; AC-25 y AC-26 no dependen del tiempo real

## Verificación cruzada (daw-module-verifier)
PASSED: 0 FAIL, 1 WARN, 4 INFO.
- WARN: W-VER-02, arriba.
- INFO: jsdom no permite comprobar que el mensaje de éxito no tape la interfaz (AC-25); limitación aceptada en `decisions-FEAT-001e.md`.
- INFO: la prueba de AC-32 no se volvió a correr en VERIFY por el límite de inicios de sesión anónimos de Supabase; cuenta la corrida de cierre.
- INFO: la evidencia TDD se leyó de los commits y de `decisions-FEAT-001e.md`; en CODE las revisiones por bloque la reprodujeron (`.daw-work/review-block-1.md` a `review-block-3.md`).
- INFO: los controles del calendario quedan deshabilitados durante el guardado pero no atenuados (`:not(.rdp-root *)`), decisión registrada.

## Rondas de verificación
- Ronda 1 (sobre `d34afb4`): la verificación cruzada dio PASSED, pero `validate_verify` rechazó el informe por dos motivos de formato. Uno, la palabra "error" en la línea de un criterio, que el validador lee como criterio no cumplido; se reescribió como "detalle técnico". Dos, ningún nombre de prueba legible en la spec, que escribía `test_x: …`. Bucle correctivo VERIFY → CODE → PLAN: la spec pasó a `test_x — …` sin cambios de contenido (`b540450`, validate_spec 13/0/2, validate_threat 7/0/0).
- Ronda 2 (sobre `09f2d03`): re-cierre de CODE con la suite completa otra vez 263/263, la misma cobertura y SAST 8/0/0. Sin cambios en `src/`, `pruebas/` ni `supabase/` desde `789c834`, así que la verificación cruzada de la ronda 1 sigue siendo válida para este código.

Result: PASSED
