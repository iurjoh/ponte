# Ponte - Fase 1

**Português (Brasil)** | [English](README.md)

Um workspace privado de busca de emprego sobre as planilhas Google já existentes do dono, com uma página estática pública de entrada. Interface em português/inglês.

**Prévia da interface:** https://ponte-vat.pages.dev/  
**Código:** repositório privado. Documentação revisada em 01/10/2026.

## Status

Publicado em 01/10/2026 (Europe/Stockholm) pela integração Git do Cloudflare Pages a partir deste repositório privado. Cloudflare gratuito; sem upgrade pago ou cartão. Deploys Git usam `main`, sem framework, build `npm test && npm run build`, saída `dist`. O deploy público contém apenas a interface, sem linhas de contatos ou candidaturas.

A configuração do Google OAuth e do Picker está pendente. Clicar em Conectar informa que o Google não está configurado e não carrega dado privado. Configuração em branco falha fechada; nunca carrega dados mock nem privados. **Ainda não aceito para uso.** O projeto vazio de direct upload `ponte-preview` sobrou de duas tentativas de ZIP que falharam; não é o app publicado.

Quadro/lista de candidaturas, status literais, rede de contatos somente leitura, dashboard e edição limitada de Status/Notas estão implementados na interface.

## Objetivo e planejamento

A Ponte organiza uma busca de emprego real sem tirar os dados das planilhas Google do dono: candidaturas ficam na planilha de tracker, contatos ficam nas abas de pessoas/empresas, e o app é uma janela cuidadosa sobre elas. A regra de design é falhar fechado: qualquer dúvida sobre configuração, esquema ou identidade significa que nenhum dado é carregado e nada é escrito.

## Arquitetura

```text
Navegador -> interface estática (sem framework, sem dependências de produção)
          -> Google OAuth + Picker (token só em memória)
          -> API Google Sheets: lê tracker + abas de pessoas/empresas
          -> escritas limitadas: Status/Notas (colunas J:K) com confirmação por releitura
```

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html`, `style.css` | Estrutura e layout da interface estática. |
| `app.js` | Comportamento da UI, visões, troca de idioma. |
| `model.js` | Regras de dados: status, validação, correspondência. |
| `api.js` | Acesso a Google OAuth, Picker e Sheets. |
| `i18n.js` | Textos em português/inglês. |
| `config.js` | Identificadores públicos do Google (nunca segredos). |
| `build.js` | Build estático para `dist/`. |
| `model.test.js`, `api.test.js` | Testes unitários (`node --test`). |
| `ui-check.js` | Fluxos de UI sintéticos via Playwright (`npm run test:ui`). |

Node 22+, sem dependências de produção.

## Contrato de dados e limites

Tracker `Candidaturas!A:N`: cabeçalhos A:M exatos aprovados mais `ID Ponte` em N. IDs faltantes/duplicados falham fechado. Linhas/datas em branco permanecem em branco. Registros de networking nunca são candidaturas. Status literais permanecem separados; CV preparado não é candidatura enviada, suspenso/rejeitado não é oferta. Uma data sozinha não é evidência de recebimento.

Contatos usavam originalmente `Contatos!A:K`, depois `Pessoas - geral` mais três abas por empresa. Os testes devem usar dados inventados e contratos de schema, nunca registros do dono.

Antes de editar: validar conta/sessão, arquivos selecionados, abas e cabeçalhos exatos; recarregar todas as linhas, localizar o ID estável, comparar a linha A:N original completa. Escrever apenas J:K com input RAW. Ler de novo e confirmar os valores realmente gravados antes de mostrar sucesso. Cancelar nunca escreve. Repetir após um salvamento incerto exige recarregar para evitar escritas cegas.

**Limite de concorrência:** o Google Sheets não oferece atualizações condicionais aqui. As verificações reduzem conflitos, mas outro escritor pode alterar/reordenar uma linha entre a leitura e a escrita. Não tratar como seguro para concorrência. Evitar edições simultâneas; a limitação deve ser validada com o dono antes de liberar uso geral.

## Conexão Google

Verificar o projeto Google dedicado existente e que o faturamento está desativado; conferir Sheets, Drive e Picker em vez de criar projeto duplicado. Configurar OAuth externo em Testing, adicionar a conta real do dono como usuário de teste e registrar apenas a origem do app publicado. O `config.js` público aceita um OAuth client ID, número do projeto/app ID e uma chave de API do Picker restrita por HTTP-referrer/API. São identificadores públicos de navegador, nunca client secret. Tokens ficam apenas em memória; sem local/session storage, cookies ou linhas privadas no código.

Escopos: `openid email profile drive.file`. O Picker seleciona explicitamente tracker e depois contatos; sem escopos amplos de planilhas ou Drive. A permissão cobre os arquivos selecionados inteiros, enquanto o comportamento do app restringe escritas a J:K (Status/Notas). O dono confirma o e-mail na UI e o userinfo precisa coincidir. A expiração de sete dias do modo Testing exige reconexão; tokens de vida curta são limpos na expiração e na desconexão. Desconectar-e-revogar também revoga a concessão Google.

Estado do projeto Google/APIs/faturamento não verificado nesta revisão. Configuração do navegador vazia. Antes de ativar, conferir termos e limites atuais de custo; este draft não autoriza configuração paga.

## Segurança e privacidade

A construção do DOM usa textContent para todos os valores de planilha; nenhum HTML de planilha é executado. Apenas links HTTPS, com noreferrer/no-referrer. Sem dados privados no código, logs, HTML estático ou cache persistente. Expiração/desconexão limpa os dados privados renderizados. Sem analytics, service worker ou cache persistente. Headers de segurança configurados para Cloudflare. O deploy público contém apenas assets da interface e a configuração pública do Google. A privacidade depende também da conta Google do dono e das configurações de compartilhamento, não de uma promessa de sigilo absoluto.

## Testes

Os testes unitários cobrem status/tipo exatos, exclusão de networking, validação de datas, IDs faltantes/duplicados, incompatibilidade de esquema, busca após reordenação, bloqueio de conflito, URLs inseguras e campos em branco. 24 testes de model/API passaram. Fluxos sintéticos de OAuth/Picker/Sheets passaram em 390, 820 e 1440 px: conexão, escolha de arquivo, dashboard, quadro/lista, Cancelar (zero escritas), Salvar (uma escrita RAW e releitura), rede em duas visões (Pessoas/Empresas), troca de idioma e desconexão limpando linhas privadas. Os pixels reais das capturas dos fluxos sintéticos foram inspecionados.

Esses mocks não são evidência de que o OAuth real do Google funciona. OAuth ao vivo, acesso negado, escritas falhas, salvamento round-trip, verificações em celular/tablet/desktop com dados reais e leitores de tela ainda estão pendentes. Nenhuma alteração real de candidatura deve ser usada como massa de teste. Conjuntos de dados privados nunca devem ser versionados.

Os testes devem usar dados inventados e contratos de schema, nunca registros do dono.

## Rodar e publicar

```bash
npm test
npm run build
```

Servir `dist` por HTTPS. Cloudflare Pages: build `npm test && npm run build`, saída `dist`, sem framework. Manter o repositório privado. Sem faturamento/cartão, servidor, analytics ou integração Gemini.

## Exclusões da Fase 1 e roadmap

Sem novas/excluídas candidaturas, drag/drop, edição de contatos, lembretes, mensagens, downloads de CV, Gemini ou infraestrutura de pagamento. Os próximos passos são texto literal de contato, não lembretes agendados.

- [ ] Verificar o estado do projeto Google existente e concluir OAuth/Picker.
- [ ] Rodar as verificações ao vivo pendentes (OAuth, acesso negado, escritas falhas, salvamento round-trip, dispositivos reais, leitor de tela).
- [ ] Validar a limitação de concorrência com o dono antes do uso geral.
- [ ] Remover o projeto vazio `ponte-preview` de direct upload.

## Créditos e status de licença

Feito com JavaScript vanilla e o test runner do Node; Playwright para verificações sintéticas de UI. Nenhum arquivo `LICENSE` foi encontrado na raiz do repositório nesta revisão; esta atualização não introduz um.

## Revisão documental - 07/10/2026

Este é um draft de documentação, não uma release nem nova auditoria de runtime. Foram conferidos visibilidade atual do repo, READMEs, scripts e caminho da licença na raiz. Testes e benchmarks históricos acima não foram repetidos. Capturas precisam de criação, revisão de privacidade, upload e inspeção da imagem renderizada. Imagens ausentes não são substituídas por embeds quebrados.

O `config.js` atual tem `clientId`, `appId` e `pickerKey` vazios. Isso não comprova estado do projeto Google ou cobrança. OAuth real e fluxos com dados do usuário continuam sem validação. A consulta de `LICENSE` na raiz não retornou arquivo; não afirmamos MIT nem adicionamos licença.
