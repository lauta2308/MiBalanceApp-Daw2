# Spec FEAT-004: Dependabot semanal para npm y github-actions

| Field | Value |
|-------|-------|
| Ticket | FEAT-004 |
| PRD | docs/daw/prd/prd-FEAT-004.md |
| Tier | FEATURE |
| Date | 2026-11-13 |
| Spec loops | 1 |
| Loops since last human decision | 0 |

## Summary
Un solo bloque. Se crea `.github/dependabot.yml` (versión 2) con dos entradas: `npm` en `/`, donde viven `package.json` y `package-lock.json`, y `github-actions` en `/`, que es como Dependabot ubica `.github/workflows/`. Las dos con `interval: weekly`, un grupo con el patrón `"*"` que junta todas las actualizaciones del ecosistema en un pull request, y `open-pull-requests-limit: 1`. Una prueba unitaria, `src/dependabot.test.js`, lee el archivo como texto y verifica ese contrato, con el mismo patrón que `src/integracionContinua.test.js`. No se agregan dependencias.

## Coverage: PRD → blocks
| Requirement | Covered by |
|---|---|
| FR-01 | Block 1 |
| FR-02 | Block 1 |
| FR-03 | Block 1 |
| FR-04 | Block 1 |
| FR-05 | Block 1 |
| FR-06 | Block 1 |
| NFR-01 | Strategy: 2 ecosistemas × 1 pull request agrupado por semana × `open-pull-requests-limit: 1`; la prueba `test_dependabot_limite_un_pr` falla si el límite sube o falta |
| NFR-02 | Strategy: el archivo no declara `registries` ni lee `secrets.`; la prueba `test_dependabot_secretos_rechazados` falla si aparece cualquiera de los dos |

## Dependencies between blocks
None — Block 1 stands alone.

## Block 1 — Configuración de Dependabot y su prueba de contrato

**Files**
- `.github/dependabot.yml` (new) — la configuración de Dependabot.
- `src/dependabot.test.js` (new) — lee `.github/dependabot.yml` como texto y verifica su contrato. Entra en el proyecto `unidad` de Vitest (`vite.config.js:13`, `src/**/*.test.{js,jsx}`), así que corre con `npm test` y en el CI.

**Logic**
Implementa FR-01 a FR-06. Contenido de `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 1
    groups:
      dependencias-npm:
        patterns:
          - "*"
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 1
    groups:
      acciones-github:
        patterns:
          - "*"
```

- `directory: /` en `npm` apunta a la raíz, donde están `package.json` y `package-lock.json` (FR-01). En `github-actions`, `/` hace que Dependabot lea `.github/workflows/` (FR-02).
- `interval: weekly` sin `day`: Dependabot usa el lunes por defecto (FR-03).
- Un grupo con `"*"` por ecosistema: todas las actualizaciones de versión del ecosistema van en un pull request (FR-04). Las actualizaciones de seguridad, ya activadas en el repositorio, siguen yendo aparte y fuera del límite (Out of Scope del PRD).
- `open-pull-requests-limit: 1`: Dependabot mantiene un solo pull request de versión abierto por ecosistema; lo actualiza o, si cambia el conjunto de dependencias del grupo, lo reemplaza por uno nuevo y cierra el anterior (FR-05, AC-05 corregido por decisión del usuario, 2026-11-13).
- Dependabot actualiza las acciones fijadas por SHA con el SHA de la versión nueva y el comentario `# vX.Y.Z` (FR-06). La prueba existente `test_ci_acciones_fijadas_por_sha` corre en ese pull request y falla si no.
- Sin `registries`, `secrets.`, `insecure-external-code-execution`, `labels`, `reviewers` ni `assignees`; la prueba `test_dependabot_secretos_rechazados` rechaza las seis.

`src/dependabot.test.js` lee el archivo con `readFileSync(new URL(rutaRelativaDependabot, import.meta.url), 'utf8')`, con la ruta en una constante (Vite reescribe un literal dentro de `new URL`, ver decisiones de FEAT-002). Divide el texto en las entradas de `updates` (cada línea que empieza con `-` seguido de `package-ecosystem:`, con cualquier sangría) y verifica cada una por separado. Los valores se aceptan con o sin comillas (`directory: /` o `directory: "/"`). No agrega un parser YAML. Las funciones auxiliares (`ObtenerLineas`, `ObtenerEntradas`) se definen localmente en este archivo; `src/integracionContinua.test.js` no se toca. Cada verificación es una función `Verificar…` que lanza un `Error` con mensaje en español, probada contra el archivo real y contra un ejemplo válido modificado, como en `src/integracionContinua.test.js`.

**Input validation**
- Entrada: el texto de `.github/dependabot.yml`, leído como UTF-8.
- `version`: exactamente `2`.
- `package-ecosystem`: exactamente las dos entradas `npm` y `github-actions`, sin repetir.
- `directory`: `/` en las dos entradas.
- `schedule.interval`: `weekly` en las dos entradas; cualquier otro valor es inválido.
- `open-pull-requests-limit`: `1` en las dos entradas.
- `groups`: un grupo por entrada con el patrón `"*"`.

**Error handling**
- `.github/dependabot.yml` faltante: la lectura lanza `ENOENT` y la prueba falla.
- Ecosistema faltante o repetido: la prueba falla nombrando el ecosistema.
- Frecuencia distinta de `weekly`: la prueba falla nombrando el valor inválido.
- Entrada sin grupo `"*"` o sin `open-pull-requests-limit: 1`: la prueba falla, porque abriría más pull requests que los 2 por semana de NFR-01.
- `registries`, `secrets.`, `insecure-external-code-execution`, `labels`, `reviewers` o `assignees` presentes: la prueba falla, rechazados por NFR-02 y el Out of Scope del PRD.
- Configuración que GitHub no acepta: Dependabot muestra el error en Insights → Dependency graph → Dependabot y no abre pull requests (AC-07); se comprueba ahí después del merge.

**Required tests**
- [ ] `test_dependabot_npm_en_raiz` — hay una entrada `npm` con `directory: /` (con o sin comillas) — validates AC-01
- [ ] `test_dependabot_github_actions_en_raiz` — hay una entrada `github-actions` con `directory: /` — validates AC-02
- [ ] `test_dependabot_semanal_en_ambos` — las dos entradas tienen `interval: weekly` — validates AC-03
- [ ] `test_dependabot_agrupa_todo` — cada entrada tiene un grupo con el patrón `"*"` — validates AC-04
- [ ] `test_dependabot_limite_un_pr` — cada entrada tiene `open-pull-requests-limit: 1` — validates AC-05
- [ ] `test_dependabot_version_2` — `version: 2` presente; otra versión es inválida — validates AC-07
- [ ] `test_dependabot_archivo_faltante_es_error` — leer una ruta inexistente lanza error `ENOENT` — validates AC-07
- [ ] `test_dependabot_ecosistema_faltante_rechazado` — sin `github-actions`, o con `npm` repetido, la verificación es rechazada — validates AC-02
- [ ] `test_dependabot_frecuencia_invalida_rechazada` — `interval: daily` en cualquier entrada es inválido y rechazado — validates AC-03
- [ ] `test_dependabot_sin_grupo_o_limite_rechazado` — una entrada sin grupo o con `open-pull-requests-limit: 5` es rechazada — validates AC-04, AC-05
- [ ] `test_dependabot_secretos_rechazados` — `registries:`, `secrets.`, `insecure-external-code-execution`, `labels`, `reviewers` o `assignees` presentes son rechazados — validates AC-07
- [ ] `test_ci_acciones_fijadas_por_sha` (existente, FEAT-002) — sigue pasando sobre `ci.yml` — validates AC-06

**Completion criterion**
Las 11 pruebas nuevas y la existente pasan con `npm test`, y `npm run lint` termina sin errores.

## Final verification
- `npm ci`, `npm run lint` y `npm test` terminan sin errores en local, sin `.env.local`.
- `validate_spec.py --tier FEATURE` y `validate_threat.py` pasan sobre esta spec y su modelo de amenazas.
- El pull request de FEAT-004 termina con el check `Verificar` en verde.
- Después del merge, Insights → Dependency graph → Dependabot muestra las dos entradas sin errores (AC-07). La primera revisión semanal abre como máximo un pull request por ecosistema (AC-04, AC-05), y el de acciones conserva los SHA (AC-06). La evidencia de AC-06 y AC-07 en VERIFY es indirecta (pruebas sobre los archivos locales); el informe de VERIFY lo dice, y la confirmación real queda para después del merge.
