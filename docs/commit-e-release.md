# Commit e release — Frontend (JV)

Guia operacional para os apps Next.js do workspace:

| Projeto              | Pasta                         |
| -------------------- | ----------------------------- |
| Dash Comercial       | `jveiga-dash-comercial`       |
| Dash Vendas          | `jveiga-dash-vendas`          |
| Dash Farol           | `jveiga-dash-farol`           |
| Painel Recepcionista | `jveiga-painel-recepcionista` |

Gerenciador padrão: **npm** (`package-lock.json`).

---

## Fluxo obrigatório (antes de commit/push)

Execute **nessa ordem**, na raiz do app frontend:

```bash
# 1) Formatação
npm run format

# 2) Lint
npm run lint

# 3) Build de produção
npm run build
```

| Script       | Comando              | Função                          |
| ------------ | -------------------- | ------------------------------- |
| format       | `prettier --write .` | aplica Prettier                 |
| format:check | `prettier --check .` | só valida (CI / conferência)    |
| lint         | `eslint`             | regras ESLint                   |
| lint:fix     | `eslint --fix`       | corrige o que for auto-fixável  |
| build        | `next build`         | valida TypeScript + bundle Next |

Se o lint falhar com erros simples:

```bash
npm run lint:fix
npm run lint
```

**Não faça commit/push** se `format`, `lint` ou `build` falharem.

---

## Checklist pré-commit

```text
[ ] npm run format
[ ] npm run lint        (ou lint:fix + lint de novo)
[ ] npm run build
[ ] git status / git diff revisados
[ ] sem .env, secrets, dumps ou artefatos locais no stage
[ ] versão bumpada quando for release (ver abaixo)
[ ] mensagem no estilo OpenCommit / Conventional Commits (pt-BR)
[ ] commit + push
```

---

## Subir versão (release)

A versão do app está em `package.json` → campo `"version"`.

### Quando bumpa

| Tipo      | SemVer              | Quando usar                      |
| --------- | ------------------- | -------------------------------- |
| **patch** | `1.0.10` → `1.0.11` | correção, ajuste pequeno, hotfix |
| **minor** | `1.0.11` → `1.1.0`  | feature compatível               |
| **major** | `1.1.0` → `2.0.0`   | breaking change                  |

### Como bumpa

1. Altere `"version"` em `package.json`.
2. Rode `npm install` (ou qualquer comando que sincronize o lock) para alinhar `package-lock.json` ao novo `version`.
3. Inclua **os dois arquivos** no mesmo commit da release:
   - `package.json`
   - `package-lock.json`

Exemplo de mensagem de release:

```txt
chore(release): sobe versão para 1.0.12
```

Ou, se a feature e o bump forem no mesmo commit (padrão observado no histórico):

```txt
feat(acompanhamento): migra tracking diário editável e bumpa para v1.0.12
```

---

## Estilo de commit (OpenCommit / Conventional Commits)

Mensagens em **português brasileiro**, linguagem **técnica**, objetiva. Foque no _porquê/impacto_, não na lista de arquivos.

### Formato

```txt
<tipo>(<escopo opcional>): <descrição curta>

[corpo opcional]

[rodapé opcional]
```

- Descrição em presente ou imperativo: `adiciona`, `corrige`, `migra`, `remove`, `alinha`.
- Escopo = módulo/área: `auth`, `dashboard`, `resumo`, `funil`, `ci`, etc.
- Breaking change: `feat(api)!: remove endpoint legado` ou rodapé `BREAKING CHANGE: ...`.

### Tipos

| Tipo       | Uso                                       |
| ---------- | ----------------------------------------- |
| `feat`     | nova funcionalidade                       |
| `fix`      | correção de bug                           |
| `refactor` | refatoração sem mudança funcional         |
| `perf`     | performance                               |
| `style`    | formatação / estilo sem lógica            |
| `chore`    | manutenção, deps, configs, bump de versão |
| `docs`     | documentação                              |
| `test`     | testes                                    |
| `build`    | bundler, Next, empacotamento              |
| `ci`       | pipelines e automações                    |

### Exemplos (bons)

```txt
feat(resumo): consolida PPC e ranking com plantão no checklist
fix(auth): corrige refresh de sessão após expiração do JWT
refactor(funil): delega taxas de cascata ao endpoint compartilhado
chore(release): sobe versão para 1.0.12
perf(dashboard): reduz refetch do React Query no ciclo de venda
```

### Exemplos (evitar)

```txt
ajustes
correções
update files
melhorias
wip
```

### Commit com corpo (quando o diff for amplo)

```bash
git commit -m "$(cat <<'EOF'
feat(ciclo): mede tempo real do funil de vendas

Calcula duração por etapa a partir dos eventos de tracking
e expõe o indicador no painel de acompanhamento.

EOF
)"
```

---

## Commit e push

```bash
# Revisar
git status
git diff --stat
git diff

# Stage só do que importa
git add <arquivos>

# Commit
git commit -m "$(cat <<'EOF'
tipo(escopo): descrição técnica em pt-BR

EOF
)"

# Push da branch atual
git push -u origin HEAD
```

### Regras

- Não commitar `.env`, credenciais, dumps, `node_modules`, `.next`.
- Não usar `--no-verify` salvo pedido explícito.
- Não fazer `push --force` em `main`/`master`.
- Se o pre-commit (husky / lint-staged) alterar arquivos, inclua essas mudanças e faça um **novo** commit se o anterior falhou; não force o hook.

Apps com Husky (`jveiga-dash-comercial`, `jveiga-dash-vendas`): o hook já roda ESLint/Prettier nos arquivos staged via `lint-staged`. Isso **não substitui** o `npm run build` manual antes do push.

---

## Sequência completa (copy-paste)

```bash
# Na raiz do app frontend
npm run format
npm run lint
npm run build

# Se for release: edite package.json (version) e sincronize o lock
# npm install

git status
git add <arquivos>
git commit -m "$(cat <<'EOF'
tipo(escopo): descrição técnica em pt-BR

EOF
)"
git push -u origin HEAD
```

---

## Referência rápida por app

```bash
cd jveiga-dash-comercial   # ou vendas | farol | painel-recepcionista
npm run format && npm run lint && npm run build
```

Portas de `dev` (só para contexto local):

| App           | Porta          |
| ------------- | -------------- |
| Comercial     | 3000 (default) |
| Vendas        | 3001           |
| Recepcionista | 3002           |
| Farol         | 3003           |
