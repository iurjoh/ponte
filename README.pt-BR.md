# Ponte

**Português (Brasil)** | [English](README.md)

## Demo

[![Abrir demo](https://img.shields.io/badge/demo-live-2ea44f)](https://ponte-vat.pages.dev/)

Abra no navegador, sem instalar nada ou usar o terminal.

Para entrar com Google e escolher as planilhas, abra a Ponte em um navegador normal (Chrome ou Safari), não dentro do WhatsApp.

Um organizador de busca de emprego, gratuito e de código aberto. Suas candidaturas e contatos ficam nas suas próprias planilhas do Google; a Ponte é uma janela cuidadosa sobre elas. Interface em português e inglês, sem servidor, sem analytics, sem custo.

**Política de privacidade:** https://ponte-vat.pages.dev/privacy.html  
**Dúvidas e ideias:** [issues do GitHub](https://github.com/iurjoh/ponte/issues)

## Status

Público e publicado. O app OAuth do Google está em produção (não em modo de teste) e a página pública é publicada a partir da `main` pelo Cloudflare Pages Free (build `npm test && npm run build`, saída `dist`). O login real, a seleção no Picker e o salvamento de ponta a ponta com uma planilha real ainda estão sendo verificados pelo dono. Veja o roteiro abaixo.

## O que faz

- Quadro e lista de candidaturas com status literais.
- Rede de contatos somente leitura: pessoas por empresa.
- Painel.
- Edição limitada: apenas Status e Notas (colunas J:K) de uma candidatura, confirmada relendo a célula.

Todo o resto fica intocado. A regra de projeto é falhar fechado: qualquer dúvida sobre configuração, esquema ou identidade significa que nada é carregado e nada é escrito.

## Como seus dados são tratados

- Os dados ficam só nas suas planilhas do Google. O repositório e a página pública não têm dados pessoais. Todos os testes e exemplos usam dados inventados.
- O login usa Google OAuth com o escopo `drive.file` mais `openid email profile`. Você escolhe os arquivos de candidaturas e contatos no Google Picker; a Ponte não vê outros arquivos. A permissão do Google vale para os arquivos inteiros, mas o app só escreve Status e Notas.
- O token de acesso fica só na memória. Sem cookies, sem guardar conteúdo das planilhas, sem analytics, sem servidor.
- Detalhes: a [política de privacidade](https://ponte-vat.pages.dev/privacy.html).

## Arquitetura

```text
Navegador -> interface estática (sem framework, sem dependências de produção)
          -> Google OAuth + Picker (token só na memória)
          -> Google Sheets API: lê candidaturas + abas de pessoas/empresas
          -> escritas limitadas: Status/Notas (colunas J:K) com releitura de confirmação
```

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html`, `style.css` | Estrutura e layout da interface estática. |
| `app.js` | Comportamento da interface, telas, troca de idioma. |
| `model.js` | Regras de dados: status, validação, correspondência. |
| `api.js` | Google OAuth, Picker e acesso ao Sheets. |
| `i18n.js` | Textos em português/inglês. |
| `config.js` | Identificadores públicos do Google (client ID, chave do Picker). Nunca segredos. |
| `build.js` | Build estático em `dist/`. |
| `*.test.js` | Testes unitários (`node --test`). |
| `ui-check.js` | Fluxos de interface sintéticos via Playwright (`npm run test:ui`). |

Node 22+, sem dependências de produção.

## Contrato de dados

Candidaturas `Candidaturas!A:N`: cabeçalhos aprovados A:M mais `ID Ponte` em N. IDs ausentes ou duplicados falham fechado. Registros de rede nunca são candidaturas. Os contatos são lidos de abas separadas de pessoas/empresas e nunca modificados.

Antes de editar: validar sessão, arquivos, abas e cabeçalhos exatos; recarregar as linhas, achar o ID estável, comparar a linha original completa; escrever só J:K com entrada RAW; ler de novo e confirmar antes de mostrar sucesso.

**Limite de concorrência:** o Google Sheets não tem atualização condicional aqui. As checagens reduzem conflitos, mas outra pessoa ainda pode alterar uma linha entre a leitura e a escrita. Evite editar a mesma linha de dois lugares ao mesmo tempo.

## Rodar por conta própria

```bash
npm test
npm run build
```

Sirva `dist` por HTTPS. Para usar seu próprio projeto Google, crie um cliente OAuth web e uma chave da API do Picker e coloque client ID, número do projeto e chave em `config.js`. Restrinja a chave à API do Picker e ao seu site. Nunca coloque um client secret no repositório.

## Roteiro

Feito:
- [x] Interface, regras de dados e testes (31 passando, só dados sintéticos).
- [x] Publicação, política de privacidade, identidade no Google, app OAuth publicado.
- [x] Client ID e chave do Picker configurados.

Próximo:
- [ ] Testes reais com uma conta: login, acesso negado, falha de escrita, salvamento de ponta a ponta, celular/tablet/desktop, leitor de tela.
- [ ] Decidir como tratar o limite de concorrência.
- [ ] Ideias registradas como issues `future` (não são compromissos): leitura de alertas do Gmail, encaminhamento de alertas do LinkedIn, e-mail de contato dedicado, verificação de marca no Google.

## Histórico de desenvolvimento

A Ponte começou como uma ideia para organizar uma busca de emprego sem entregar os dados a outro serviço. O histórico de commits foi mantido desde os primeiros documentos até o app público e mostra todo o caminho:

- 2026-09-30: privacidade, escopo e configuração definidos; modelo, camada de API, interface bilíngue, build, testes, telas de rede com pessoas por empresa.
- 2026-10-01: primeira prévia no Cloudflare Pages, README reestruturado, README em português adicionado.
- 2026-10-07/08: padrão de documentação bilíngue, notas de configuração do Google, testes de recuperação e escritas ambíguas.
- 2026-10-10: repositório público com histórico reescrito usando nomes inventados, página de privacidade, identidade OAuth, app publicado, configuração do Google no lugar. O repositório privado anterior foi mantido como arquivo.

## Licença

[MIT](LICENSE) (c) 2026 Iuri Johansson.
