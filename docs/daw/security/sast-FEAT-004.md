# SAST FEAT-004

| Field | Value |
|-------|-------|
| Ticket | FEAT-004 |
| Tools | revisión de código por modelo con búsqueda de patrones (grep), npm audit |
| Date | 2026-11-13 |

Alcance: los archivos que la rama `feat/FEAT-004-dependabot` cambia fuera de `docs/` respecto de `main`, sobre `94b7ad9`: `.github/dependabot.yml` (configuración nueva) y `src/dependabot.test.js` (prueba de contrato que lee ese archivo como texto). No hay código de la aplicación, migraciones, dependencias nuevas ni cambios en `package.json` o `package-lock.json`.

| Rule | Verdict | Notes |
|---|---|---|
| F-SAST-01 | ✅ | sin claves ni tokens; `.github/dependabot.yml` no declara `registries` ni lee `secrets.`, y la prueba lo exige (`src/dependabot.test.js:165`); `.env`, `.env.local` y `.env.*.local` están en `.gitignore` (líneas 18-20). Los `secrets.TOKEN` de `src/dependabot.test.js:397` son texto de un caso de rechazo, no un secreto |
| F-SAST-02 | ✅ | sin consultas SQL ni NoSQL |
| F-SAST-03 | ✅ | sin `exec`, `spawn` ni `child_process` |
| F-SAST-04 | ✅ | sin `eval`, `new Function` ni deserialización insegura; el YAML se lee como texto, sin parser |
| F-SAST-05 | ✅ | las rutas que lee la prueba son constantes relativas al módulo (`src/dependabot.test.js:7-9`, `:306`), sin datos externos |
| F-SAST-06 | ✅ | sin salida HTML |
| F-SAST-07 | ✅ | sin peticiones salientes; el bloqueo de red de FEAT-002 rige en el proceso de pruebas |
| F-SAST-08 | ✅ | sin criptografía |
| F-SAST-09 | ✅ | sin modo de depuración ni `console.*` |
| F-SAST-10 | ✅ | no se registra nada |
| F-SAST-11 | ✅ | no hay carga de archivos |
| F-SAST-12 | ✅ | sin formularios ni cookies nuevas |
| F-SAST-13 | ✅ | `npm audit --omit=dev`: 0 vulnerabilidades; `npm audit`: 0 altas y 0 críticas |
| F-SAST-14 | ✅ | la entrada de la prueba (el texto del YAML) se valida campo por campo: versión, ecosistemas exactos, directorio, frecuencia, grupo y límite; los casos inválidos son rechazados |
| F-SAST-15 | ✅ | los errores de la prueba son mensajes fijos en español con el ecosistema y el valor; no exponen datos internos |
| F-SAST-16 | ⚠️ | Medium, preexistente: `minimatch` (GHSA-g3hv-75wg-m249) vía `eslint` y `@eslint/config-array` (dependencias de desarrollo), `package-lock.json:2620`; suprimido como riesgo aceptado, ver abajo. Sin dependencias nuevas en este ticket |
| F-SAST-17 | ✅ | sin funciones inseguras ni rutas de código dinámico; la clave que arma un `RegExp` se escapa (`src/dependabot.test.js:34-35`) |

## Suppressions

### Suppression: F-SAST-16

| Field | Value |
|---|---|
| File | package-lock.json:2620 (`node_modules/minimatch`, requerido por `node_modules/eslint` y `node_modules/@eslint/config-array`, devDependencies) |
| Category | F-SAST-16 — CVE Medium en una dependencia (GHSA-g3hv-75wg-m249, denegación de servicio por amplificación de globparts) |
| Disposition | ACCEPTED_RISK |
| Reviewer | Lautaro (aceptado en FEAT-001a, FEAT-002 y FEAT-001b; renovado sin cambios por el orquestador en modo minimal en FEAT-001c, FEAT-001d, FEAT-001e y FEAT-004) |
| Date | 2026-11-13 |
| Justification | Es el mismo hallazgo que el usuario aceptó en FEAT-001a (2026-11-09), FEAT-002 (2026-11-10) y FEAT-001b (2026-11-11), sin cambios: solo afecta a ESLint en desarrollo y CI, no a la app publicada (`npm audit --omit=dev` da 0). Los patrones que procesa vienen de `eslint.config.js`, que es código del repositorio. La única corrección disponible baja ESLint a la versión 9, y eso va contra la regla del proyecto de usar la última versión estable. |
| Compensating control | El job de CI tiene `timeout-minutes: 15` y un token de solo lectura, sin secretos. Desde este ticket, Dependabot propone cada semana las versiones nuevas de ESLint y sus dependencias, así que el arreglo llega como pull request en cuanto exista. `npm audit` se repite en cada ticket. |
| Review by | 2027-05-09, o antes si ESLint publica una versión que use `minimatch` 11.0.1 o superior |

Total: 16 clean, 0 vulnerabilities (0 critical, 0 high), 1 Medium suprimido
Result: PASSED
