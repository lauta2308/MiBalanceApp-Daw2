# Fix FIX-003: Ignorar .vs/ y coverage/ en git

- **Bug**: `.vs/` (Visual Studio) y `coverage/` (`vitest --coverage`) aparecen como archivos sin seguimiento: el hook de DAW reporta `.vs/` como cambio de código del producto en cada paso y un `git add -A` los metería en un commit.
- **Change**: `.gitignore`:20 — agregar las líneas `.vs/` y `coverage/` después de `.env.*.local`.
- **Regression test**: `git check-ignore .vs/ coverage/` sale con código 1 sin listar nada antes del cambio, y con código 0 listando las dos rutas después; `git status --short` deja de listar `.vs/`.
- **Risk**: ninguno; ninguno de los dos directorios tiene archivos versionados (`git ls-files .vs coverage` vacío).
