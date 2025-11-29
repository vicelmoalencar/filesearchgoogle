# Changelog - Sistema de API Keys

## [2.0.0] - 2025-11-29

### 🔄 BREAKING CHANGES

#### Migração para Variáveis de Ambiente

O sistema de armazenamento de chaves de API foi completamente reformulado para usar variáveis de ambiente em vez de arquivos JSON.

**Motivo da mudança:**
- Maior segurança (chaves não ficam em arquivos)
- Melhor integração com Easypanel
- Facilita deploy e configuração
- Previne vazamento de chaves no controle de versão

### ✨ Novidades

#### Sistema de API Keys via Ambiente
- Novo módulo `src/lib/api-keys-env.ts` para leitura de chaves do ambiente
- Suporte a múltiplas chaves através de variáveis numeradas (`API_KEY_1_*`, `API_KEY_2_*`, etc.)
- Chave padrão via `GEMINI_API_KEY` e configurações opcionais `DEFAULT_KEY_*`

#### Páginas Admin Atualizadas

**`/admin/api-keys`:**
- Convertida para página informativa (read-only)
- Mostra chaves configuradas sem expor as API keys reais
- Instruções detalhadas de configuração via variáveis de ambiente
- Exemplos práticos de configuração

**`/admin/prompt`:**
- Editor para prompt padrão do sistema mantido
- Visualização de prompts customizados por chave (read-only)
- Instruções de configuração de prompts via variáveis `API_KEY_N_PROMPT`

#### Documentação

**`.env.example`:**
- Arquivo completo com exemplos de todas as variáveis
- Documentação inline explicando cada campo
- Exemplos de múltiplas chaves configuradas

**`MIGRATION.md`:**
- Guia completo de migração do sistema antigo
- Passo a passo para configurar no Easypanel
- Conversão de chaves do JSON para variáveis de ambiente
- Troubleshooting e verificação

### 🔧 Modificações

#### APIs Atualizadas
- `src/app/api/chat/route.ts` - Usa novo sistema de chaves
- `src/app/api/files/route.ts` - Usa novo sistema de chaves
- `src/app/api/upload/route.ts` - Usa novo sistema de chaves
- `src/app/api/api-keys/route.ts` - Retorna chaves do ambiente (read-only)
- `src/app/api/api-keys/[id]/route.ts` - Apenas operações GET

### ⚠️ Funcionalidades Removidas

#### Interface de Gerenciamento de Chaves
- Remoção de criação de chaves via UI
- Remoção de edição de chaves via UI
- Remoção de exclusão de chaves via UI
- Remoção de edição de prompts customizados via UI

**Razão:** Todas essas operações agora são feitas via variáveis de ambiente no Easypanel.

### 📝 Estrutura de Variáveis de Ambiente

#### Chave Padrão (Obrigatória)
```env
GEMINI_API_KEY=sua-chave-api
DEFAULT_KEY_NAME=Nome da Chave (opcional)
DEFAULT_KEY_THEME=Tema (opcional)
DEFAULT_KEY_DESCRIPTION=Descrição (opcional)
DEFAULT_KEY_PROMPT=Prompt customizado (opcional)
```

#### Chaves Adicionais (Opcional)
```env
API_KEY_1_NAME=Nome (obrigatório)
API_KEY_1_KEY=Chave API (obrigatório)
API_KEY_1_THEME=Tema (obrigatório)
API_KEY_1_DESCRIPTION=Descrição (opcional)
API_KEY_1_PROMPT=Prompt (opcional)
```

### 🗑️ Arquivos Obsoletos

Os seguintes arquivos foram mantidos como backup (`.old`) e podem ser removidos após confirmação:
- `src/lib/api-keys-storage.ts` → Substituído por `api-keys-env.ts`
- `src/app/api/api-keys/route.old.ts` → Rota antiga de gerenciamento
- `src/app/api/api-keys/[id]/route.old.ts` → Rota antiga de edição
- `src/app/admin/api-keys/page.old.tsx` → Página antiga de gerenciamento
- `src/app/admin/prompt/page.old.tsx` → Página antiga de edição
- `data/api-keys.json` → Arquivo de dados antigo (se existir)

### ✅ Checklist de Migração

Para migrar do sistema antigo:

1. [ ] Copiar chaves de `data/api-keys.json` (se existir)
2. [ ] Configurar variáveis de ambiente no Easypanel
3. [ ] Reiniciar aplicação no Easypanel
4. [ ] Verificar `/admin/api-keys` - chaves aparecem
5. [ ] Verificar `/admin/prompt` - prompts aparecem
6. [ ] Testar chat com diferentes chaves
7. [ ] Testar upload de arquivos
8. [ ] (Opcional) Remover arquivos `.old`
9. [ ] (Opcional) Remover `data/api-keys.json`

### 🔒 Melhorias de Segurança

1. **Chaves não expostas em arquivos**
   - Não há mais arquivos JSON com chaves
   - Reduz risco de commit acidental

2. **Visualização segura**
   - APIs não retornam chaves reais
   - Interface mostra apenas metadados

3. **Configuração centralizada**
   - Todas as chaves em variáveis de ambiente
   - Gerenciadas pelo Easypanel

### 📚 Documentação Adicionada

- `.env.example` - Exemplos de configuração
- `MIGRATION.md` - Guia de migração
- `CHANGELOG.md` - Este arquivo
- Documentação inline nas páginas admin

### 🐛 Correções

- Corrigido problema onde chat não respeitava a chave selecionada
- Melhorado isolamento de arquivos por chave/tema

### 🚀 Performance

- Leitura de chaves mais rápida (ambiente vs arquivo)
- Menos operações de I/O no sistema de arquivos

### 💡 Próximos Passos Recomendados

1. Teste completo do sistema após migração
2. Backup das variáveis de ambiente configuradas
3. Documentação interna sobre configuração no Easypanel
4. Remoção dos arquivos `.old` após validação

### 📞 Suporte

Em caso de problemas:
1. Verifique configuração das variáveis de ambiente
2. Consulte `MIGRATION.md` para troubleshooting
3. Verifique logs do servidor
4. Revise `.env.example` para exemplos

---

## Como usar este changelog

Este arquivo documenta todas as mudanças importantes do sistema. Para cada release:
- **BREAKING CHANGES** - Mudanças que quebram compatibilidade
- **Novidades** - Novas funcionalidades
- **Modificações** - Alterações em funcionalidades existentes
- **Correções** - Bugs corrigidos
- **Removido** - Funcionalidades removidas
