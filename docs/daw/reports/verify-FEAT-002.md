# Verification FEAT-002

| Field | Value |
|---|---|
| Module | src/bloqueoRedPruebas.js, src/configuracionPruebas.js, .github/workflows/ci.yml |
| Line coverage | 92.23% |
| Branch coverage | 83.93% |
| Function coverage | 92.30% |
| Coverage floor | 80% (method default — .daw/rules/testing.instructions.md) |
| Lint | `npx eslint .` — clean, 0 findings |

Cobertura del código nuevo (`src/bloqueoRedPruebas.js`). Global del proyecto `unidad`: líneas 94.85%, ramas 87.24%, funciones 94.66%. La de `src/configuracionPruebas.js` no se puede medir porque Vitest excluye los `setupFiles`; se ejecuta en los 9 archivos de prueba. Corrida en una copia Linux idéntica a `f8514c5`, con la red cortada y sin `.env.local`: 9 archivos, 115/115 pruebas. Verificación cruzada hecha por daw-module-verifier, que no escribió el código; en esta segunda vuelta revisó además que los 22 nombres de la spec están al inicio de un título de `it(...)` y que el cambio solo tocó títulos.

## Acceptance criteria
- ✅ AC-01 — `test_ci_dispara_en_pull_request`, `test_ci_rechaza_pull_request_target` (.github/workflows/ci.yml:3); cubierto de forma estática, la ejecución real queda para el primer pull request
- ✅ AC-02 — `test_ci_instala_con_npm_ci`, `test_ci_node_22_y_timeout` (ci.yml:23-30)
- ✅ AC-03 — `test_ci_corre_lint_y_pruebas_en_orden` (ci.yml:32-33)
- ✅ AC-04 — `test_ci_corre_lint_y_pruebas_en_orden`, `test_npm_test_corre_solo_unidad` (ci.yml:35-36, package.json:11)
- ✅ AC-05 — `test_ci_sin_continue_on_error_ni_or_true`, `test_ci_archivo_faltante_es_error` (ci.yml no tiene la opción que deja seguir a un paso roto ni `|| true`); cubierto de forma estática, la ejecución real queda para el primer pull request
- ✅ AC-06 — `test_ci_sin_secretos_ni_credenciales`, `test_ci_acciones_fijadas_por_sha`, `test_ci_permisos_de_solo_lectura`, `test_ci_sin_contexto_del_autor_en_run` (ci.yml:5-6, 19-24)
- ✅ AC-07 — `test_ci_sin_pruebas_de_integracion`, `test_npm_test_corre_solo_unidad`, `test_permite_loopback`, suite completa sin credenciales y sin red
- ✅ AC-08 — `test_rechaza_conexion_tcp_externa`, `test_rechaza_fetch_externo`, `test_rechaza_https_externo`, `test_rechaza_udp_externo`, `test_rechaza_xhr_sincrono_externo`, `test_rechaza_host_que_imita_loopback`, `test_intento_registrado_marca_error_en_la_prueba`, `test_bloqueo_desinstalado_es_error`, `test_instalacion_idempotente`, `test_bloqueo_desinstalado_falla_con_sus_intentos` (src/bloqueoRedPruebas.js, src/configuracionPruebas.js:10-21)

## Spec blocks
- ✅ Block 1 — bloqueo de red: los 5 exports de la spec, más `ComprobarBloqueoTrasPrueba` (registrado en decisions-FEAT-002.md); `configuracionPruebas.js` instala el bloqueo y registra `afterEach`/`afterAll`; restricciones de lint cumplidas; títulos de prueba con prefijo `test_`
- ✅ Block 2 — workflow: `ci.yml` coincide con la Logic y con R-01 a R-05; `src/integracionContinua.test.js` lee el archivo como texto; `AGENTS.md` actualizado, incluida la regla de nombres `test_`

## Tests
- ✅ `test_rechaza_conexion_tcp_externa`
- ✅ `test_rechaza_fetch_externo`
- ✅ `test_rechaza_https_externo`
- ✅ `test_rechaza_udp_externo`
- ✅ `test_rechaza_xhr_sincrono_externo`
- ✅ `test_rechaza_host_que_imita_loopback`
- ✅ `test_permite_loopback`
- ✅ `test_intento_registrado_marca_error_en_la_prueba`
- ✅ `test_bloqueo_desinstalado_es_error`
- ✅ `test_instalacion_idempotente`
- ✅ Las 7 pruebas unitarias existentes pasan con el bloqueo y sin `.env.local`
- ✅ `test_ci_dispara_en_pull_request`
- ✅ `test_ci_rechaza_pull_request_target`
- ✅ `test_ci_instala_con_npm_ci`
- ✅ `test_ci_corre_lint_y_pruebas_en_orden`
- ✅ `test_ci_sin_continue_on_error_ni_or_true`
- ✅ `test_ci_sin_secretos_ni_credenciales`
- ✅ `test_ci_sin_pruebas_de_integracion`
- ✅ `test_ci_acciones_fijadas_por_sha`
- ✅ `test_ci_permisos_de_solo_lectura`
- ✅ `test_ci_sin_contexto_del_autor_en_run`
- ✅ `test_ci_node_22_y_timeout`
- ✅ `test_ci_archivo_faltante_es_error`
- ✅ Sad-path tests: puertos en texto no canónico, arreglo no normalizado, loopback con ceros, hosts que imitan loopback, `lookup` propio, URL ilegible y XHR síncrono con tercer argumento falso; cada `test_ci_*` rechaza además un `ci.yml` mutado

## Warnings (no bloquean)
- W-VER-01: sin código muerto; la rama UDP de socket ya conectado a un host externo es código defensivo que el flujo normal no alcanza.
- W-VER-03: algunas pruebas dependen de detalles internos de Node (`normalizedArgs`, el `RangeError` de UDP con connect en curso) y el CI usa Node 22 flotante; una 22.x nueva podría romperlas sin cambios en el código.
- El rechazo de una forma de argumentos no reconocida (`src/bloqueoRedPruebas.js:100-125`, destino `desconocido`) no tiene prueba propia.
- Ninguna prueba de la suite comprueba de punta a punta que la configuración real marque como fallida a la prueba que se conectó; lo confirmó la verificación cruzada con pruebas sonda temporales.
- La prueba del archivo faltante comprueba la lectura de Node más que el workflow; el quinto criterio queda cubierto por la prueba de pasos que no ignoran su resultado.
- AC-01 y AC-05 quedan por confirmar en la primera ejecución real de GitHub Actions.

Result: PASSED
