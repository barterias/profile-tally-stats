
## Implementar Suporte ao Kwai via Apify

### Contexto
O `APIFY_API_TOKEN` já está configurado como secret. O ScrapeCreators não suporta Kwai, então usaremos o Apify (que já é usado para Instagram via `instagram-scrape-apify`). Vamos criar toda a infraestrutura necessária espelhando a arquitetura do TikTok.

### O que será criado

**1. Migração de banco de dados** — 3 novas tabelas:
- `kwai_accounts` — contas monitoradas (username, followers, views, etc.)
- `kwai_videos` — vídeos/posts de cada conta
- `kwai_metrics_history` — histórico de métricas ao longo do tempo

E a função `delete_social_account` será atualizada para suportar a plataforma `kwai`.

**2. Edge Function: `kwai-scrape`** — Responsável por:
- Iniciar um run no Apify usando o actor `apify/kwai-scraper` (ou equivalente disponível no Apify)
- Aguardar a conclusão (com polling)
- Mapear os dados retornados (perfil + vídeos)
- Salvar em `kwai_accounts`, `kwai_videos`, `kwai_metrics_history`
- Padrão idêntico ao `instagram-scrape-apify`

**3. Hook `useKwaiAccounts`** — Hooks React Query para:
- `useKwaiAccounts()` — busca contas do usuário atual
- `useAllKwaiAccounts()` — busca todas as contas (admin/client)
- `useAddKwaiAccount()` — adiciona + dispara sync
- `useSyncKwaiAccount()` — sincroniza uma conta
- `useSyncAllKwaiAccounts()` — sincroniza todas
- `useDeleteKwaiAccount()` — remove conta + dados

**4. Hook `useKwaiVideos`** — Busca vídeos de uma conta Kwai do banco.

**5. Componente `KwaiTab`** — Aba na tela Account Analytics com:
- Cards de métricas totais (seguidores, views, vídeos, contas)
- Tabela de contas para admin/client
- Lista simples para clippers
- Botões de adicionar, sincronizar, remover

**6. Atualização de `AccountAnalytics.tsx`** — Adicionar a aba "Kwai" ao lado de Instagram, YouTube e TikTok.

**7. Atualização de `AddAccountModal.tsx`** — Adicionar configuração para plataforma `kwai`.

**8. Atualização de `PlatformAccountsTable.tsx`** — Adicionar suporte para platform `kwai` (labels e URLs).

**9. Atualização de `AccountVideosModal.tsx`** — Suporte para `kwai` nos labels e links.

**10. Atualização de `approve_social_account` / `reject_social_account`** — Incluir caso `kwai` nas funções de banco.

### Fluxo técnico

```text
Usuário adiciona @conta Kwai
        ↓
useAddKwaiAccount() insere em kwai_accounts
        ↓
Invoca kwai-scrape Edge Function
        ↓
Apify inicia run (kwai-scraper actor)
        ↓
Polling até SUCCEEDED (max 120s)
        ↓
Dados do dataset mapeados → kwai_videos + kwai_accounts updated
        ↓
UI reflete métricas atualizadas
```

### Observação sobre o Actor do Apify para Kwai
O Apify marketplace possui actors para Kwai (ex: `curious_coder/kwai-scraper`). A edge function tentará o actor disponível e fará o mapeamento dos campos retornados. O padrão de polling é idêntico ao `instagram-scrape-apify` já existente no projeto.

### RLS Policies
Mesmas políticas dos outros platforms:
- Clippers veem/editam apenas suas próprias contas
- Admins/clients veem todas as contas

### Arquivos afetados
| Arquivo | Ação |
|---|---|
| `supabase/migrations/` | Nova migração SQL |
| `supabase/functions/kwai-scrape/index.ts` | Novo Edge Function |
| `src/hooks/useKwaiAccounts.ts` | Novo hook |
| `src/hooks/useKwaiVideos.ts` | Novo hook |
| `src/components/AccountAnalytics/KwaiTab.tsx` | Novo componente |
| `src/pages/AccountAnalytics.tsx` | Adicionar aba Kwai |
| `src/components/AccountAnalytics/AddAccountModal.tsx` | Suporte kwai |
| `src/components/AccountAnalytics/PlatformAccountsTable.tsx` | Suporte kwai |
| `src/components/AccountAnalytics/AccountVideosModal.tsx` | Suporte kwai |
