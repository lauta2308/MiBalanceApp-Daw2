# Decisiones de FEAT-004

Decisiones tomadas durante CODE que no están en la spec aprobada. Formato: decisión — quién la aprobó — fecha — bloque.

## Block 1 — Configuración de Dependabot y su prueba de contrato

- El patrón `"*"` se exige entre comillas (dobles o simples): sin comillas, `- *` es un alias YAML inválido. Los demás valores aceptan comillas opcionales. — supuesto del implementador, aceptado por las dos revisiones; mostrado al usuario — 2026-11-13 — Block 1
- Las pruebas de rechazo `test_dependabot_frecuencia_invalida_rechazada` y `test_dependabot_sin_grupo_o_limite_rechazado` también verifican el archivo real, para que fallen antes de implementar. — supuesto del implementador, aceptado por las dos revisiones; mostrado al usuario — 2026-11-13 — Block 1
- `VerificarEcosistemasExactos` rechaza cualquier ecosistema extra (por ejemplo `docker`), según "exactamente las dos entradas" de Input validation. — supuesto del implementador, aceptado por las dos revisiones; mostrado al usuario — 2026-11-13 — Block 1
- `labels`, `reviewers` y `assignees` se detectan como claves; `secrets.` e `insecure-external-code-execution` en cualquier parte del texto. La función se llama `VerificarSinElementosProhibidos` (no `VerificarSinSecretos`) porque rechaza más que secretos. — revisión de arquitectura, ronda 2; mostrado al usuario — 2026-11-13 — Block 1
- `VerificarAgrupaTodo` exige exactamente un grupo por entrada (contado por la sangría del primer hijo de `groups:`) y busca `"*"` solo dentro de su `patterns:`; nuevo auxiliar local `ObtenerBloqueHijo`. — revisiones de la ronda 1; mostrado al usuario — 2026-11-13 — Block 1
- Límites conocidos de la prueba, que lee el YAML como texto: un comentario `#` dentro de `groups:` con la sangría de un grupo cuenta como un segundo grupo, y una lista en línea (`patterns: ["*"]`) no se reconoce. El archivo actual no usa ninguna de las dos formas. — señalado por la revisión de arquitectura; mostrado al usuario — 2026-11-13 — Block 1
