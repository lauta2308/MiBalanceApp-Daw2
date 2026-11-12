# SAST FEAT-001e

| Field | Value |
|-------|-------|
| Ticket | FEAT-001e |
| Tools | revisión de código por modelo con búsqueda de patrones (grep), npm audit |
| Date | 2026-11-12 |

Alcance: los archivos que la rama `feat/FEAT-001e-formulario-mensajes` cambia fuera de `docs/` respecto de `main`, sobre `789c834` (los 3 bloques commiteados): `src/componentes/FormularioMovimiento.jsx`, `src/estilos.css`, `src/componentes/FormularioMovimiento.test.jsx`, `src/flujoIngreso.test.jsx` y `pruebas/movimientos.test.js`. El único cambio de producción es el guardado en curso del formulario (guardia por referencia, `fieldset` deshabilitado y "Guardando…"). No hay migraciones, dependencias nuevas ni cambios en `package.json`. Revisado de nuevo en el re-cierre de CODE sobre `b540450`, después del bucle correctivo de la spec: `git diff 789c834 HEAD -- src pruebas supabase package.json package-lock.json` está vacío y `npm audit` no cambió.

| Rule | Verdict | Notes |
|---|---|---|
| F-SAST-01 | ✅ | sin claves, JWT ni `service_role` en el diff; `.env`, `.env.local` y `.env.*.local` están en `.gitignore` (líneas 18-20) |
| F-SAST-02 | ✅ | sin SQL nuevo; el alta sigue por `AgregarIngreso` → `rpc('basp_agregar_movimiento')` con parámetros; la prueba nueva lee con `select('tipo, monto::text')` del cliente supabase-js, sin concatenar |
| F-SAST-03 | ✅ | sin `exec`, `spawn` ni `child_process` |
| F-SAST-04 | ✅ | sin `eval`, `new Function` ni deserialización insegura |
| F-SAST-05 | ✅ | sin rutas de archivo construidas con datos del usuario |
| F-SAST-06 | ✅ | sin `dangerouslySetInnerHTML` ni `innerHTML`; "Guardando…" es un literal renderizado como texto de React |
| F-SAST-07 | ✅ | sin peticiones salientes nuevas |
| F-SAST-08 | ✅ | el proyecto no implementa criptografía propia |
| F-SAST-09 | ✅ | sin modo de depuración en producción; el único `console.error` (`FormularioMovimiento.jsx:31`) es preexistente y está condicionado a `import.meta.env.DEV` |
| F-SAST-10 | ✅ | no se registra nada nuevo |
| F-SAST-11 | ✅ | no hay carga de archivos |
| F-SAST-12 | ✅ | la sesión viaja en el encabezado Authorization, no en cookies |
| F-SAST-13 | ✅ | `npm audit --omit=dev`: 0 vulnerabilidades; `npm audit`: 0 altas y 0 críticas |
| F-SAST-14 | ✅ | validación de monto sin cambios (`ValidarMonto`, `ValidarMontoMaximo`) y la del servidor de FEAT-001d; el doble envío, que podía duplicar un alta (threat R-01), lo corta la guardia `envioEnCurso` antes de validar (`FormularioMovimiento.jsx:163-165`), probado con `test_guardar_doble_clic_duplicado_rechazado` y `test_doble_clic_guardar_flujo` |
| F-SAST-15 | ✅ | los errores muestran textos fijos (`MENSAJE_ERROR_ALTA`, "No se pudo cargar su cuenta. Vuelva a intentarlo."), sin el error técnico; probado en `test_falla_alta_rehabilita_formulario_rechazado` y `test_error_carga_cuenta_sin_detalle_tecnico_flujo` |
| F-SAST-16 | ⚠️ | Medium, preexistente: `minimatch` (GHSA-g3hv-75wg-m249) vía `eslint` y `@eslint/config-array` (dependencias de desarrollo), `package-lock.json:2620`; suprimido como riesgo aceptado, ver abajo. Sin dependencias nuevas en este ticket |
| F-SAST-17 | ✅ | sin funciones inseguras ni rutas de código dinámico |

## Suppressions

### Suppression: F-SAST-16

| Field | Value |
|---|---|
| File | package-lock.json:2620 (`node_modules/minimatch`, requerido por `node_modules/eslint` y `node_modules/@eslint/config-array`, devDependencies) |
| Category | F-SAST-16 — CVE Medium en una dependencia (GHSA-g3hv-75wg-m249, denegación de servicio por amplificación de globparts) |
| Disposition | ACCEPTED_RISK |
| Reviewer | Lautaro (aceptado en FEAT-001a, FEAT-002 y FEAT-001b; renovado sin cambios por el orquestador en modo minimal en FEAT-001c, FEAT-001d y FEAT-001e) |
| Date | 2026-11-12 |
| Justification | Es el mismo hallazgo que el usuario aceptó en FEAT-001a (2026-11-09), FEAT-002 (2026-11-10) y FEAT-001b (2026-11-11), sin cambios: solo afecta a ESLint en desarrollo y CI, no a la app publicada (`npm audit --omit=dev` da 0). Los patrones que procesa vienen de `eslint.config.js`, que es código del repositorio. La única corrección disponible baja ESLint a la versión 9, y eso va contra la regla del proyecto de usar la última versión estable. |
| Compensating control | El job de CI tiene `timeout-minutes: 15` y un token de solo lectura, sin secretos. Un cambio a `eslint.config.js` se ve en la revisión del pull request, y `npm audit` se repite en cada ticket. |
| Review by | 2027-05-09, o antes si ESLint publica una versión que use `minimatch` 11.0.1 o superior |

Total: 16 clean, 0 vulnerabilities (0 critical, 0 high), 1 Medium suprimido
Result: PASSED
