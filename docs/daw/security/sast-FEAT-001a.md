# SAST FEAT-001a

| Field | Value |
|-------|-------|
| Ticket | FEAT-001a |
| Tools | revisión de código por modelo con búsqueda de patrones (grep), npm audit |
| Date | 2026-11-09 |

Alcance: `src/`, `pruebas/`, `supabase/`, `index.html`, `vite.config.js`, `eslint.config.js`, `.env.example` y `package-lock.json`.

| Rule | Verdict | Notes |
|---|---|---|
| F-SAST-01 | ✅ | sin claves, JWT ni `service_role` en el código; `.env.local` está ignorado por git y `.env.example` no tiene valores |
| F-SAST-02 | ✅ | sin SQL dinámico: el frontend usa el constructor de consultas de supabase-js y la función del trigger no recibe datos del cliente |
| F-SAST-03 | ✅ | sin `exec`, `spawn` ni `child_process` |
| F-SAST-04 | ✅ | sin `eval` ni deserialización insegura |
| F-SAST-05 | ✅ | sin rutas de archivo construidas con datos del usuario |
| F-SAST-06 | ✅ | sin `dangerouslySetInnerHTML` ni `innerHTML`; los textos se renderizan como texto de React |
| F-SAST-07 | ✅ | sin peticiones salientes controladas por el usuario; la URL de Supabase es de configuración |
| F-SAST-08 | ✅ | el proyecto no implementa criptografía propia |
| F-SAST-09 | ✅ | sin modo de depuración en producción; `console.error` queda condicionado a `import.meta.env.DEV` |
| F-SAST-10 | ✅ | no se registran datos sensibles en producción; `console.error` solo en desarrollo |
| F-SAST-11 | ✅ | no hay carga de archivos |
| F-SAST-12 | ✅ | la sesión viaja en el encabezado Authorization, no en cookies, y el cliente no tiene operaciones de escritura |
| F-SAST-13 | ✅ | `npm audit --audit-level=high`: 0 altas y 0 críticas |
| F-SAST-14 | ✅ | el usuario no ingresa datos en este ticket; saldo y moneda se validan con patrones al formatear |
| F-SAST-15 | ✅ | los errores muestran un texto fijo, sin detalles técnicos |
| F-SAST-16 | ⚠️ | Medium: GHSA-g3hv-75wg-m249 en `minimatch` 10.2.6, solo en la cadena de desarrollo de ESLint — package-lock.json:2590 (suprimido, ver abajo) |
| F-SAST-17 | ✅ | sin funciones inseguras |

## Suppressions

### Suppression: F-SAST-16

| Field | Value |
|---|---|
| File | package-lock.json:2590 |
| Category | Medium CVE in a dependency (GHSA-g3hv-75wg-m249, minimatch) |
| Disposition | ACCEPTED_RISK |
| Reviewer | Lautaro |
| Date | 2026-11-09 |
| Justification | La dependencia solo la usa ESLint como herramienta de desarrollo sobre archivos propios del repositorio; no entra en el build ni en producción (`npm audit --omit=dev` da 0 vulnerabilidades). La única corrección ofrecida baja ESLint a la versión 9, contra la regla del proyecto de usar la última estable. |
| Compensating control | ESLint no procesa entradas externas ni corre en producción; `npm audit` se repite en cada ticket. |
| Review by | 2027-05-09 |

Total: 16 clean, 1 suppressed, 0 vulnerabilities (0 critical, 0 high)
Result: PASSED
