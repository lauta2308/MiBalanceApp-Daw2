# Verification FEAT-004

| Field | Value |
|---|---|
| Module | `.github/dependabot.yml`, `src/dependabot.test.js` |
| Line coverage | 97% |
| Branch coverage | 90.16% |
| Function coverage | 97.1% |
| Coverage floor | 80% (method default — .daw/rules/testing.instructions.md) |
| Lint | `npx eslint .` — clean, 0 findings |

Cobertura: la de la suite `unidad` completa (`docs/daw/reports/tests-FEAT-004.md`, 245/245). El ticket no agrega código de la aplicación: `.github/dependabot.yml` es configuración y `src/dependabot.test.js` es la prueba de contrato que la verifica.

## Acceptance criteria
- ✅ AC-01 — `test_dependabot_npm_en_raiz` (src/dependabot.test.js:225): entrada `npm` con `directory: /` (.github/dependabot.yml:3-4)
- ✅ AC-02 — `test_dependabot_github_actions_en_raiz` (src/dependabot.test.js:242) y `test_dependabot_ecosistema_faltante_rechazado` (:311): entrada `github-actions` con `directory: /` (.github/dependabot.yml:12-13)
- ✅ AC-03 — `test_dependabot_semanal_en_ambos` (:259) y `test_dependabot_frecuencia_invalida_rechazada` (:338): `interval: weekly` en las dos entradas
- ✅ AC-04 — `test_dependabot_agrupa_todo` (:268) y `test_dependabot_sin_grupo_o_limite_rechazado` (:354): un solo grupo con `"*"` por ecosistema
- ✅ AC-05 — `test_dependabot_limite_un_pr` (:285) y `test_dependabot_sin_grupo_o_limite_rechazado` (:354): `open-pull-requests-limit: 1` por ecosistema
- ⚠️ AC-06 — `test_ci_acciones_fijadas_por_sha` (src/integracionContinua.test.js:344) sigue en verde sobre `ci.yml`; evidencia indirecta: la confirmación real es el primer pull request de acciones que abra Dependabot después del merge, que corre esa misma prueba en el CI
- ⚠️ AC-07 — `test_dependabot_version_2` (:298), `test_dependabot_archivo_faltante_es_error` (:305) y `test_dependabot_secretos_rechazados` (:385) validan el archivo local; evidencia indirecta: la aceptación por GitHub se confirma después del merge en Insights → Dependency graph → Dependabot

## Spec blocks
- ✅ Block 1 — `.github/dependabot.yml` idéntico al YAML de la spec y `src/dependabot.test.js` con las 11 pruebas requeridas; revisado en dos rondas (verifier PASS, arch APROBADO)

## Tests
- ✅ `test_dependabot_npm_en_raiz`
- ✅ `test_dependabot_github_actions_en_raiz`
- ✅ `test_dependabot_semanal_en_ambos`
- ✅ `test_dependabot_agrupa_todo`
- ✅ `test_dependabot_limite_un_pr`
- ✅ `test_dependabot_version_2`
- ✅ `test_dependabot_archivo_faltante_es_error`
- ✅ `test_dependabot_ecosistema_faltante_rechazado`
- ✅ `test_dependabot_frecuencia_invalida_rechazada`
- ✅ `test_dependabot_sin_grupo_o_limite_rechazado`
- ✅ `test_dependabot_secretos_rechazados`
- ✅ `test_ci_acciones_fijadas_por_sha`
- ✅ Sad-path tests: `test_dependabot_ecosistema_faltante_rechazado`, `test_dependabot_frecuencia_invalida_rechazada`, `test_dependabot_sin_grupo_o_limite_rechazado`, `test_dependabot_secretos_rechazados` y `test_dependabot_archivo_faltante_es_error` cubren cada caso inválido de Input validation y Error handling

## Warnings
- W: AC-06 y AC-07 tienen evidencia indirecta (pruebas sobre los archivos del repositorio). Quedan para confirmar después del merge, como dice la Final verification de la spec.
- W: límites conocidos de la prueba de texto, anotados en `docs/daw/specs/decisions-FEAT-004.md`: un comentario `#` con la sangría de un grupo cuenta como un segundo grupo (rechazo falso), y una lista en línea `patterns: ["*"]` no se reconoce. El archivo actual no usa ninguna de las dos formas.

Cruce independiente (daw-module-verifier, VERIFY): PASS, 0 FAIL / 0 WARN / 3 INFO; referencias de línea y números confirmados.

Result: PASSED
