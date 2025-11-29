# Migração para API Keys via Variáveis de Ambiente

## O que mudou?

O sistema foi atualizado para usar variáveis de ambiente para armazenar as chaves de API do Gemini, em vez de arquivos JSON. Isso traz mais segurança e facilita o deploy no Easypanel.

## Principais mudanças

### Antes (Sistema Antigo)
- Chaves armazenadas em `data/api-keys.json`
- Gerenciamento via interface web (criar, editar, excluir)
- Chaves persistidas em arquivo no servidor

### Agora (Sistema Novo)
- Chaves configuradas via variáveis de ambiente
- Interface web apenas para **visualização**
- Mais seguro: chaves não ficam em arquivos
- Melhor integração com Easypanel

## Como configurar no Easypanel

### 1. Acesse as variáveis de ambiente

No painel do Easypanel:
1. Acesse seu projeto/aplicação
2. Vá em "Environment Variables" ou "Variáveis de Ambiente"

### 2. Configure a chave padrão (obrigatória)

```env
GEMINI_API_KEY=sua-chave-api-do-gemini
DEFAULT_KEY_NAME=Pje-calc
DEFAULT_KEY_THEME=Geral
DEFAULT_KEY_DESCRIPTION=Chave principal do sistema
DEFAULT_KEY_PROMPT=Atue como um especialista em cálculos trabalhistas...
```

### 3. Configure chaves adicionais (opcional)

Para cada chave adicional, use o padrão `API_KEY_N_*`:

```env
# Primeira chave adicional
API_KEY_1_NAME=Jurisprudência
API_KEY_1_KEY=AIza-sua-chave-aqui
API_KEY_1_THEME=Direito Trabalhista
API_KEY_1_DESCRIPTION=Chave para consultas jurídicas
API_KEY_1_PROMPT=Atue como um especialista em jurisprudência...

# Segunda chave adicional
API_KEY_2_NAME=Cálculos Especializados
API_KEY_2_KEY=AIza-outra-chave-aqui
API_KEY_2_THEME=Cálculos Trabalhistas
API_KEY_2_DESCRIPTION=Cálculos complexos
API_KEY_2_PROMPT=Atue como um especialista em cálculos...
```

### 4. Reinicie a aplicação

Após configurar as variáveis, reinicie a aplicação no Easypanel para aplicar as mudanças.

## Migração das chaves existentes

Se você já tem chaves configuradas no arquivo `data/api-keys.json`:

1. Abra o arquivo `data/api-keys.json`
2. Para cada chave, crie variáveis de ambiente correspondentes
3. Exemplo de conversão:

**Arquivo JSON:**
```json
{
  "id": "key_123",
  "name": "Jurisprudência",
  "apiKey": "AIza...",
  "theme": "Direito",
  "description": "Chave para consultas jurídicas",
  "customPrompt": "Atue como especialista..."
}
```

**Variáveis de ambiente:**
```env
API_KEY_1_NAME=Jurisprudência
API_KEY_1_KEY=AIza...
API_KEY_1_THEME=Direito
API_KEY_1_DESCRIPTION=Chave para consultas jurídicas
API_KEY_1_PROMPT=Atue como especialista...
```

## Estrutura das variáveis

### Chave Padrão
- `GEMINI_API_KEY` - A chave de API (obrigatório)
- `DEFAULT_KEY_NAME` - Nome da chave (opcional)
- `DEFAULT_KEY_THEME` - Tema/categoria (opcional)
- `DEFAULT_KEY_DESCRIPTION` - Descrição (opcional)
- `DEFAULT_KEY_PROMPT` - Prompt customizado (opcional)

### Chaves Adicionais
- `API_KEY_N_NAME` - Nome da chave (obrigatório)
- `API_KEY_N_KEY` - A chave de API (obrigatório)
- `API_KEY_N_THEME` - Tema/categoria (obrigatório)
- `API_KEY_N_DESCRIPTION` - Descrição (opcional)
- `API_KEY_N_PROMPT` - Prompt customizado (opcional)

Onde `N` é o número sequencial: 1, 2, 3, etc.

## Páginas admin atualizadas

### `/admin/api-keys`
- **Antes:** Criação, edição e exclusão de chaves
- **Agora:** Apenas visualização das chaves configuradas
- Mostra instruções de como configurar via variáveis de ambiente

### `/admin/prompt`
- **Antes:** Edição de prompts customizados por chave
- **Agora:**
  - Edita apenas o prompt padrão do sistema
  - Visualiza prompts customizados (read-only)
  - Mostra instruções de configuração via variáveis de ambiente

### `/admin`
- Continua funcionando normalmente
- Upload de arquivos associados à chave selecionada

## Vantagens do novo sistema

1. **Segurança:** Chaves não ficam em arquivos no servidor
2. **Facilidade:** Configuração centralizada no Easypanel
3. **Backup:** Variáveis de ambiente são incluídas no backup do Easypanel
4. **Versionamento:** Não há risco de comitar chaves no Git
5. **Simplicidade:** Menos código de gerenciamento de arquivos

## Arquivos criados/modificados

### Novos arquivos:
- `src/lib/api-keys-env.ts` - Sistema de leitura de chaves do ambiente
- `.env.example` - Documentação completa das variáveis

### Arquivos modificados:
- `src/app/api/api-keys/route.ts` - Retorna chaves do ambiente
- `src/app/api/api-keys/[id]/route.ts` - Apenas leitura
- `src/app/api/chat/route.ts` - Usa novo sistema
- `src/app/api/files/route.ts` - Usa novo sistema
- `src/app/api/upload/route.ts` - Usa novo sistema
- `src/app/admin/api-keys/page.tsx` - Página informativa
- `src/app/admin/prompt/page.tsx` - Visualização apenas

### Arquivos de backup (podem ser removidos):
- `src/lib/api-keys-storage.ts.old` - Sistema antigo
- `src/app/api/api-keys/route.old.ts` - Rota antiga
- `src/app/api/api-keys/[id]/route.old.ts` - Rota antiga
- `src/app/admin/api-keys/page.old.tsx` - Página antiga
- `src/app/admin/prompt/page.old.tsx` - Página antiga
- `data/api-keys.json` - Arquivo de dados antigo

## Verificação

Após a migração, verifique:

1. Acesse `/admin/api-keys` - deve mostrar as chaves configuradas
2. Acesse `/admin/prompt` - deve mostrar os prompts
3. Teste o chat - deve funcionar com as chaves corretas
4. Teste o upload de arquivos - deve associar à chave selecionada

## Suporte

Se encontrar problemas:

1. Verifique se todas as variáveis obrigatórias estão configuradas
2. Verifique se a aplicação foi reiniciada após configurar as variáveis
3. Verifique os logs do servidor para erros
4. Certifique-se de que os números N são sequenciais (1, 2, 3...)
