import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// La ruta va en una constante y no como literal dentro de `new URL(…)`: Vite reescribe
// `new URL('literal', import.meta.url)` como la URL de un recurso servido
// (http://localhost:3000/…), y readFileSync la rechaza por no ser file://.
const rutaRelativaDependabot = '../.github/dependabot.yml'
const rutaRelativaInexistente = '../.github/no-existe-dependabot.yml'
const rutaDependabot = new URL(rutaRelativaDependabot, import.meta.url)

const ecosistemasEsperados = ['npm', 'github-actions']

function LeerDependabot() {
  return readFileSync(rutaDependabot, 'utf8')
}

function ObtenerLineas(texto) {
  return texto.split(/\r?\n/)
}

function ObtenerSangria(linea) {
  return linea.length - linea.trimStart().length
}

// Quita un comentario final y las comillas que envuelven el valor: `"/"` y `/` valen lo mismo.
function LimpiarValor(valor) {
  const sinComentario = valor.replace(/\s+#.*$/, '').trim()
  const coincidencia = sinComentario.match(/^(["'])(.*)\1$/)
  return coincidencia ? coincidencia[2] : sinComentario
}

// Devuelve el valor de la primera línea `clave: valor` de las líneas dadas, o null si no está.
function ObtenerValor(lineas, clave) {
  const claveEscapada = clave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const expresion = new RegExp(`^\\s*(?:-\\s+)?${claveEscapada}:\\s*(.*)$`)
  for (const linea of lineas) {
    const coincidencia = linea.match(expresion)
    if (coincidencia) return LimpiarValor(coincidencia[1])
  }
  return null
}

// Divide `updates` en entradas: cada una empieza en una línea `- package-ecosystem:` (con
// cualquier sangría) y termina en la siguiente entrada o en una línea con sangría menor o
// igual a la del guion que no sea otra entrada.
function ObtenerEntradas(texto) {
  const lineas = ObtenerLineas(texto)
  const entradas = []
  let actual = null
  for (const linea of lineas) {
    if (/^\s*-\s+package-ecosystem:/.test(linea)) {
      actual = { sangria: ObtenerSangria(linea), lineas: [linea] }
      entradas.push(actual)
      continue
    }
    if (!actual) continue
    if (linea.trim() !== '' && ObtenerSangria(linea) <= actual.sangria) {
      actual = null
      continue
    }
    actual.lineas.push(linea)
  }
  return entradas.map((entrada) => ({
    ecosistema: ObtenerValor(entrada.lineas, 'package-ecosystem'),
    lineas: entrada.lineas,
  }))
}

function ObtenerEntradasConEcosistemas(texto) {
  const entradas = ObtenerEntradas(texto)
  if (entradas.length === 0) throw new Error('No hay entradas "package-ecosystem" en "updates".')
  return entradas
}

function VerificarEcosistemaEnRaiz(texto, ecosistema) {
  const entradas = ObtenerEntradas(texto).filter((entrada) => entrada.ecosistema === ecosistema)
  if (entradas.length === 0) throw new Error(`Falta la entrada del ecosistema "${ecosistema}".`)
  if (entradas.length > 1) throw new Error(`El ecosistema "${ecosistema}" está repetido.`)
  const directorio = ObtenerValor(entradas[0].lineas, 'directory')
  if (directorio === null) throw new Error(`La entrada "${ecosistema}" no tiene "directory".`)
  if (directorio !== '/') {
    throw new Error(`La entrada "${ecosistema}" usa directory "${directorio}" en lugar de "/".`)
  }
}

function VerificarEcosistemasExactos(texto) {
  const ecosistemas = ObtenerEntradas(texto).map((entrada) => entrada.ecosistema)
  for (const ecosistema of ecosistemasEsperados) {
    const cantidad = ecosistemas.filter((nombre) => nombre === ecosistema).length
    if (cantidad === 0) throw new Error(`Falta la entrada del ecosistema "${ecosistema}".`)
    if (cantidad > 1) throw new Error(`El ecosistema "${ecosistema}" está repetido.`)
  }
  const sobrantes = ecosistemas.filter((nombre) => !ecosistemasEsperados.includes(nombre))
  if (sobrantes.length > 0) throw new Error(`Hay ecosistemas no previstos: ${sobrantes.join(', ')}.`)
}

function VerificarFrecuenciaSemanal(texto) {
  for (const entrada of ObtenerEntradasConEcosistemas(texto)) {
    const intervalo = ObtenerValor(entrada.lineas, 'interval')
    if (intervalo === null) throw new Error(`La entrada "${entrada.ecosistema}" no tiene "interval".`)
    if (intervalo !== 'weekly') {
      throw new Error(`La entrada "${entrada.ecosistema}" usa interval "${intervalo}" en lugar de "weekly".`)
    }
  }
}

// Devuelve las líneas que siguen a `lineas[indice]` con más sangría que ella; corta en la
// primera línea no vacía con sangría menor o igual.
function ObtenerBloqueHijo(lineas, indice) {
  const sangria = ObtenerSangria(lineas[indice])
  const bloque = []
  for (const linea of lineas.slice(indice + 1)) {
    if (linea.trim() !== '' && ObtenerSangria(linea) <= sangria) break
    bloque.push(linea)
  }
  return bloque
}

// Cada entrada necesita un bloque `groups:` con un solo grupo y, dentro de él, `patterns:`
// con el patrón "*". Otras listas del grupo (como `exclude-patterns:`) no cuentan.
function VerificarAgrupaTodo(texto) {
  for (const entrada of ObtenerEntradasConEcosistemas(texto)) {
    const indiceGrupos = entrada.lineas.findIndex((linea) => /^\s*groups:\s*$/.test(linea))
    if (indiceGrupos === -1) throw new Error(`La entrada "${entrada.ecosistema}" no tiene "groups".`)
    const bloqueGrupos = ObtenerBloqueHijo(entrada.lineas, indiceGrupos)
    const lineasNoVacias = bloqueGrupos.filter((linea) => linea.trim() !== '')
    const sangriaNombres = lineasNoVacias.length > 0 ? ObtenerSangria(lineasNoVacias[0]) : -1
    const nombresDeGrupo = lineasNoVacias.filter((linea) => ObtenerSangria(linea) === sangriaNombres)
    if (nombresDeGrupo.length !== 1) {
      throw new Error(
        `La entrada "${entrada.ecosistema}" debe tener un solo grupo y tiene ${nombresDeGrupo.length}.`,
      )
    }
    const indicePatrones = bloqueGrupos.findIndex((linea) => /^\s*patterns:\s*$/.test(linea))
    const tieneComodin =
      indicePatrones !== -1 &&
      ObtenerBloqueHijo(bloqueGrupos, indicePatrones).some((linea) => /^\s*-\s+(["'])\*\1\s*$/.test(linea))
    if (!tieneComodin) {
      throw new Error(`La entrada "${entrada.ecosistema}" no tiene un grupo con el patrón "*".`)
    }
  }
}

function VerificarLimiteUnPr(texto) {
  for (const entrada of ObtenerEntradasConEcosistemas(texto)) {
    const limite = ObtenerValor(entrada.lineas, 'open-pull-requests-limit')
    if (limite === null) {
      throw new Error(`La entrada "${entrada.ecosistema}" no tiene "open-pull-requests-limit".`)
    }
    if (limite !== '1') {
      throw new Error(`La entrada "${entrada.ecosistema}" usa open-pull-requests-limit ${limite} en lugar de 1.`)
    }
  }
}

function VerificarVersion2(texto) {
  const lineaVersion = ObtenerLineas(texto).find((linea) => /^version:/.test(linea))
  if (!lineaVersion) throw new Error('Falta la clave "version:".')
  const version = LimpiarValor(lineaVersion.slice('version:'.length))
  if (version !== '2') throw new Error(`La versión es "${version}" en lugar de 2.`)
}

const elementosProhibidos = [
  { nombre: 'registries', expresion: /^\s*registries:/m },
  { nombre: 'secrets.', expresion: /secrets\./ },
  { nombre: 'insecure-external-code-execution', expresion: /insecure-external-code-execution/ },
  { nombre: 'labels', expresion: /^\s*labels:/m },
  { nombre: 'reviewers', expresion: /^\s*reviewers:/m },
  { nombre: 'assignees', expresion: /^\s*assignees:/m },
]

function VerificarSinElementosProhibidos(texto) {
  for (const { nombre, expresion } of elementosProhibidos) {
    if (expresion.test(texto)) throw new Error(`La configuración usa "${nombre}", que no está permitido.`)
  }
}

const dependabotDeEjemploValido = `version: 2
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
`

const entradaGithubActions = `  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 1
    groups:
      acciones-github:
        patterns:
          - "*"
`

function Reemplazar(buscado, reemplazo) {
  const resultado = dependabotDeEjemploValido.replace(buscado, reemplazo)
  if (resultado === dependabotDeEjemploValido) throw new Error(`El ejemplo no contiene ${buscado}.`)
  return resultado
}

// Reemplaza dentro de la entrada de github-actions, que va segunda en el ejemplo.
function ReemplazarEnGithubActions(buscado, reemplazo) {
  const entradaModificada = entradaGithubActions.replace(buscado, reemplazo)
  if (entradaModificada === entradaGithubActions) throw new Error(`La entrada no contiene ${buscado}.`)
  return Reemplazar(entradaGithubActions, entradaModificada)
}

describe('dependabot', () => {
  it('test_dependabot_npm_en_raiz: hay una entrada npm con directory: / (con o sin comillas)', () => {
    expect(() => VerificarEcosistemaEnRaiz(LeerDependabot(), 'npm')).not.toThrow()
    expect(() => VerificarEcosistemaEnRaiz(dependabotDeEjemploValido, 'npm')).not.toThrow()
    expect(() =>
      VerificarEcosistemaEnRaiz(Reemplazar('    directory: /', '    directory: "/"'), 'npm'),
    ).not.toThrow()
    expect(() =>
      VerificarEcosistemaEnRaiz(Reemplazar('    directory: /', "    directory: '/'"), 'npm'),
    ).not.toThrow()
    expect(() =>
      VerificarEcosistemaEnRaiz(Reemplazar('    directory: /', '    directory: /app'), 'npm'),
    ).toThrow(/\/app/)
    expect(() =>
      VerificarEcosistemaEnRaiz(Reemplazar('package-ecosystem: npm', 'package-ecosystem: pip'), 'npm'),
    ).toThrow(/npm/)
  })

  it('test_dependabot_github_actions_en_raiz: hay una entrada github-actions con directory: /', () => {
    expect(() => VerificarEcosistemaEnRaiz(LeerDependabot(), 'github-actions')).not.toThrow()
    expect(() => VerificarEcosistemaEnRaiz(dependabotDeEjemploValido, 'github-actions')).not.toThrow()
    expect(() =>
      VerificarEcosistemaEnRaiz(
        ReemplazarEnGithubActions('    directory: /', '    directory: "/"'),
        'github-actions',
      ),
    ).not.toThrow()
    expect(() =>
      VerificarEcosistemaEnRaiz(
        ReemplazarEnGithubActions('    directory: /', '    directory: /.github/workflows'),
        'github-actions',
      ),
    ).toThrow(/\.github\/workflows/)
  })

  it('test_dependabot_semanal_en_ambos: las dos entradas tienen interval: weekly', () => {
    expect(() => VerificarFrecuenciaSemanal(LeerDependabot())).not.toThrow()
    expect(() => VerificarFrecuenciaSemanal(dependabotDeEjemploValido)).not.toThrow()
    expect(() =>
      VerificarFrecuenciaSemanal(Reemplazar('      interval: weekly', '      interval: "weekly"')),
    ).not.toThrow()
    expect(() => VerificarFrecuenciaSemanal('version: 2\nupdates: []\n')).toThrow(/package-ecosystem/)
  })

  it('test_dependabot_agrupa_todo: cada entrada tiene un grupo con el patrón "*"', () => {
    expect(() => VerificarAgrupaTodo(LeerDependabot())).not.toThrow()
    expect(() => VerificarAgrupaTodo(dependabotDeEjemploValido)).not.toThrow()
    expect(() => VerificarAgrupaTodo(Reemplazar('          - "*"', "          - '*'"))).not.toThrow()
    expect(() =>
      VerificarAgrupaTodo(ReemplazarEnGithubActions('          - "*"', '          - "actions/*"')),
    ).toThrow(/github-actions/)
    expect(() =>
      VerificarAgrupaTodo(
        ReemplazarEnGithubActions(
          '          - "*"\n',
          '          - "actions/*"\n        exclude-patterns:\n          - "*"\n',
        ),
      ),
    ).toThrow(/github-actions.*"\*"/)
  })

  it('test_dependabot_limite_un_pr: cada entrada tiene open-pull-requests-limit: 1', () => {
    expect(() => VerificarLimiteUnPr(LeerDependabot())).not.toThrow()
    expect(() => VerificarLimiteUnPr(dependabotDeEjemploValido)).not.toThrow()
    expect(() =>
      VerificarLimiteUnPr(ReemplazarEnGithubActions('    open-pull-requests-limit: 1\n', '')),
    ).toThrow(/open-pull-requests-limit/)
    expect(() =>
      VerificarLimiteUnPr(
        ReemplazarEnGithubActions('open-pull-requests-limit: 1', 'open-pull-requests-limit: 2'),
      ),
    ).toThrow(/github-actions/)
  })

  it('test_dependabot_version_2: version: 2 presente; otra versión es inválida', () => {
    expect(() => VerificarVersion2(LeerDependabot())).not.toThrow()
    expect(() => VerificarVersion2(dependabotDeEjemploValido)).not.toThrow()
    expect(() => VerificarVersion2(Reemplazar('version: 2', 'version: 1'))).toThrow(/"1"/)
    expect(() => VerificarVersion2(Reemplazar('version: 2\n', ''))).toThrow(/version/)
  })

  it('test_dependabot_archivo_faltante_es_error: leer una ruta inexistente lanza error ENOENT', () => {
    const rutaInexistente = new URL(rutaRelativaInexistente, import.meta.url)
    expect(() => readFileSync(rutaInexistente, 'utf8')).toThrow(/ENOENT/)
    expect(() => LeerDependabot()).not.toThrow()
  })

  it('test_dependabot_ecosistema_faltante_rechazado: sin github-actions, o con npm repetido, la verificación es rechazada', () => {
    expect(() => VerificarEcosistemasExactos(LeerDependabot())).not.toThrow()
    expect(() => VerificarEcosistemasExactos(dependabotDeEjemploValido)).not.toThrow()
    expect(() => VerificarEcosistemasExactos(Reemplazar(entradaGithubActions, ''))).toThrow(
      /github-actions/,
    )
    expect(() =>
      VerificarEcosistemasExactos(
        ReemplazarEnGithubActions('package-ecosystem: github-actions', 'package-ecosystem: npm'),
      ),
    ).toThrow(/npm.*repetido/)
    expect(() =>
      VerificarEcosistemaEnRaiz(
        ReemplazarEnGithubActions('package-ecosystem: github-actions', 'package-ecosystem: npm'),
        'npm',
      ),
    ).toThrow(/npm.*repetido/)
    expect(() =>
      VerificarEcosistemasExactos(
        Reemplazar(
          entradaGithubActions,
          `${entradaGithubActions.replace('github-actions', 'docker')}${entradaGithubActions}`,
        ),
      ),
    ).toThrow(/docker/)
  })

  it('test_dependabot_frecuencia_invalida_rechazada: interval: daily en cualquier entrada es inválido y rechazado', () => {
    expect(() => VerificarFrecuenciaSemanal(LeerDependabot())).not.toThrow()
    expect(() =>
      VerificarFrecuenciaSemanal(Reemplazar('      interval: weekly', '      interval: daily')),
    ).toThrow(/npm.*daily/)
    expect(() =>
      VerificarFrecuenciaSemanal(ReemplazarEnGithubActions('      interval: weekly', '      interval: daily')),
    ).toThrow(/github-actions.*daily/)
    expect(() =>
      VerificarFrecuenciaSemanal(ReemplazarEnGithubActions('      interval: weekly', '      interval: monthly')),
    ).toThrow(/monthly/)
    expect(() =>
      VerificarFrecuenciaSemanal(Reemplazar('    schedule:\n      interval: weekly\n', '')),
    ).toThrow(/interval/)
  })

  it('test_dependabot_sin_grupo_o_limite_rechazado: una entrada sin grupo o con open-pull-requests-limit: 5 es rechazada', () => {
    expect(() => VerificarAgrupaTodo(LeerDependabot())).not.toThrow()
    expect(() => VerificarLimiteUnPr(LeerDependabot())).not.toThrow()
    expect(() =>
      VerificarAgrupaTodo(
        Reemplazar('    groups:\n      dependencias-npm:\n        patterns:\n          - "*"\n', ''),
      ),
    ).toThrow(/npm.*groups/)
    expect(() =>
      VerificarAgrupaTodo(
        ReemplazarEnGithubActions('    groups:\n      acciones-github:\n        patterns:\n          - "*"\n', ''),
      ),
    ).toThrow(/github-actions/)
    expect(() =>
      VerificarAgrupaTodo(
        Reemplazar(
          '          - "*"\n',
          '          - "*"\n      otro-grupo:\n        patterns:\n          - "react*"\n',
        ),
      ),
    ).toThrow(/npm.*un solo grupo/)
    expect(() =>
      VerificarLimiteUnPr(Reemplazar('open-pull-requests-limit: 1', 'open-pull-requests-limit: 5')),
    ).toThrow(/npm.*5/)
    expect(() =>
      VerificarLimiteUnPr(
        ReemplazarEnGithubActions('open-pull-requests-limit: 1', 'open-pull-requests-limit: 5'),
      ),
    ).toThrow(/github-actions.*5/)
  })

  it('test_dependabot_secretos_rechazados: registries:, secrets., insecure-external-code-execution, labels, reviewers o assignees presentes son rechazados', () => {
    expect(() => VerificarSinElementosProhibidos(LeerDependabot())).not.toThrow()
    expect(() => VerificarSinElementosProhibidos(dependabotDeEjemploValido)).not.toThrow()
    expect(() =>
      VerificarSinElementosProhibidos(
        Reemplazar(
          'updates:\n',
          'registries:\n  privado:\n    type: npm-registry\n    url: https://npm.ejemplo.com\nupdates:\n',
        ),
      ),
    ).toThrow(/registries/)
    expect(() =>
      VerificarSinElementosProhibidos(Reemplazar('    directory: /\n', '    directory: /\n    token: ${{ secrets.TOKEN }}\n')),
    ).toThrow(/secrets\./)
    expect(() =>
      VerificarSinElementosProhibidos(
        Reemplazar('    directory: /\n', '    directory: /\n    insecure-external-code-execution: allow\n'),
      ),
    ).toThrow(/insecure-external-code-execution/)
    expect(() =>
      VerificarSinElementosProhibidos(Reemplazar('    directory: /\n', '    directory: /\n    labels:\n      - dependencias\n')),
    ).toThrow(/labels/)
    expect(() =>
      VerificarSinElementosProhibidos(Reemplazar('    directory: /\n', '    directory: /\n    reviewers:\n      - alguien\n')),
    ).toThrow(/reviewers/)
    expect(() =>
      VerificarSinElementosProhibidos(Reemplazar('    directory: /\n', '    directory: /\n    assignees:\n      - alguien\n')),
    ).toThrow(/assignees/)
  })
})
