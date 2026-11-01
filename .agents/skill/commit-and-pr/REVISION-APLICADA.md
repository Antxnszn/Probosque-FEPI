# commit-and-pr — cómo se aplicó la revisión

> **Aviso importante:** el archivo `SKILL.md` que subiste contenía el script de pruebas, no la skill. Esta versión está **reconstruida desde cero** a partir de los fragmentos citados en la revisión y de tu script de pruebas. Compárala con tu original para detectar cualquier comportamiento tuyo que deba conservarse.

## Contenido

```
commit-and-pr/
├── SKILL.md                 instrucciones del agente (Partes 1–4 + protocolo de seguridad)
├── scripts/
│   ├── lib.sh               utilidades comunes y convención de códigos de salida
│   ├── preflight.sh         repo bare, HEAD desacoplado, operaciones en curso, gh
│   ├── check-secrets.sh     barrera de secretos sobre TODO lo staged
│   ├── resolve-repos.sh     repo base/remoto base verificables (fork-aware)
│   ├── check-diff.sh        bloquea PR vacío (commits que se anulan entre sí)
│   ├── verify-push.sh       local vs git ls-remote en vivo
│   ├── select-pr.sh         identifica UN PR (lista → filtro JSON → un solo gh pr view)
│   ├── create-pr.sh         crea el PR con todas las guardas y --repo fijo
│   └── post-merge-cleanup.sh  Fail-Safe Post-Merge Cleanup
└── tests/
    ├── run-tests.sh         28 pruebas sobre los scripts reales
    └── fake-gh/gh           gh simulado (no toca la red)
```

## Observación por observación

| # | Observación | Decisión | Dónde |
|---|---|---|---|
| 1 | `gh pr view owner:branch` no está documentado | **Aplicada.** La limpieza ya no consulta por rama: lista, filtra y lee por número. **Corrección a la revisión:** afirma que `gh pr list --head` *sí* admite `owner:branch`; es falso (ver punto 3). | `select-pr.sh`, `post-merge-cleanup.sh` |
| 2 | Falta `--repo` en `gh pr create` | **Aplicada.** `create-pr.sh` siempre pasa `--repo "$BASE_REPO"`. Para forks usa `--head owner:branch`, que **sí** está soportado en `gh pr create` (lo confirmé en su ayuda). | `create-pr.sh` |
| 3 | `gh pr list --head` no admite `owner:branch` | **Aplicada y verificada** con `gh 2.89.0`: su ayuda dice textualmente que la sintaxis no está soportada. Se filtra por nombre de rama y luego por `headRepositoryOwner`/`headRepository` en el JSON. Con varios candidatos termina con rc 11; nunca elige el primero. | `select-pr.sh` |
| 4 | `upstream` no demuestra ser el repo base | **Aplicada.** El repo base sale del padre del fork en GitHub (o de `--base-repo`), y el remoto local se busca por **URL**, no por nombre. Si ninguno coincide: rc 3 y se detiene. Se compara la URL cruda (`git config --get`), no la reescrita por `insteadOf`. | `resolve-repos.sh` |
| 5 | Contradicción con "NEVER update git config" | **Aplicada** con tu redacción. Además hay una prueba que falla si algún script escribe configuración. | `SKILL.md`, prueba 28 |
| 6 | Barrera real contra secretos | **Aplicada con un matiz.** Escanea todo lo staged (nombres + líneas añadidas), también lo que ya estaba en el índice, sin imprimir el secreto. **No** escanea el índice completo del repo: eso marcaría para siempre secretos históricos ya commiteados y volvería la herramienta inutilizable. Alta confianza bloquea (rc 1); sospechas son `REVIEW`. | `check-secrets.sh` |
| 7 | `mergeCommit` ancestro de la base + renombrar a Fail-Safe | **Aplicada.** Para `-D` se exige que el `mergeCommit` exista localmente y sea ancestro de `<remoto>/<base>` tras un `fetch`. Renombrado a *Fail-Safe*, documentando que no es transaccional. | `post-merge-cleanup.sh` |

## Mejoras que no estaban en la revisión

- **Las pruebas ahora ejercitan los scripts reales.** Tu suite original reimplementaba la lógica dentro del propio test, así que no habría detectado una regresión en la skill. Los 5 casos originales se conservan, ahora contra el código real.
- **Límite de seguridad en `-D` más estricto:** además del OID exacto, se exige un único PR que coincida con rama + repo de cabeza + commit exacto (cubre ramas reutilizadas).
- **`-d` no necesita GitHub:** si la rama ya es ancestro de la base, Git prueba por sí mismo que no se pierde nada.
- **Borrado con comprobación final:** se vuelve a leer el OID de la rama justo antes de borrarla y se imprime `git branch <rama> <oid>` para recuperarla.
- **`eval "$(script)"` esconde el código de salida;** el `SKILL.md` usa `R=$(script) && eval "$R"` (lo comprobé: el patrón inseguro devuelve 0 aunque el script falle).

## Cómo se verificó

- 28/28 pruebas pasan (`bash tests/run-tests.sh`).
- **Prueba de mutación:** rompí a propósito 12 guardas, una a una, más 1 combinación de dos (quitar el chequeo de ancestría del `mergeCommit`, el de estado `MERGED`, el filtro por OID, usar `owner:branch` en `pr list`, quitar `--repo`, desactivar reglas de secretos, ignorar el diff vacío, ignorar la desincronización, asumir `upstream` por nombre…). La primera pasada dejó **3 mutantes vivos**, lo que mostró pruebas débiles; las reforcé (aislé el chequeo de estado del PR y añadí el caso de rama reutilizada). Ahora todos los mutantes hacen fallar al menos una prueba. Los dos chequeos de OID se solapan a propósito, por eso solo se detectan rompiéndolos juntos.

## Límites que conviene conocer

- **No se probó contra GitHub real.** `gh` está simulado; reproduce el filtro por nombre de rama y los campos JSON que usa la skill, pero el comportamiento de `mergeCommit` en *rebase merge* y la forma exacta de `headRepository` conviene confirmarlos con un PR de prueba real antes de despliegue autónomo.
- **GitHub Enterprise:** el análisis de URL ignora el host (solo `OWNER/REPO`).
- **Los patrones de secretos son heurísticos.** No sustituyen a una herramienta dedicada (gitleaks, push protection de GitHub); son una última barrera del agente.
- **Un fallo a mitad de la limpieza** puede dejarte en la rama base y ya actualizada; nunca con una rama borrada sin verificar.
- `shellcheck` no estaba disponible en el entorno; los scripts solo pasaron `bash -n` y las pruebas.
