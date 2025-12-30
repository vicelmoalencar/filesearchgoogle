# 📚 Sistema Centralizado de Créditos - Documentação

Esta pasta contém toda a documentação necessária para implementar o sistema centralizado de créditos em qualquer plataforma.

## 📋 Índice

1. **[SISTEMA-CREDITOS-CENTRALIZADO.md](SISTEMA-CREDITOS-CENTRALIZADO.md)**
   - Visão geral do sistema
   - Arquitetura e estrutura do banco de dados
   - Fluxo de funcionamento
   - Queries úteis e manutenção

2. **[GUIA-INTEGRACAO-CREDITOS.md](GUIA-INTEGRACAO-CREDITOS.md)**
   - Guia completo de integração
   - Exemplos de código em Node.js/TypeScript, Python e PHP
   - Passo a passo para implementação
   - Troubleshooting e boas práticas

3. **[002_create_creditos_system.sql](002_create_creditos_system.sql)**
   - Script SQL completo para criar o banco de dados
   - Tabelas, views, índices e dados iniciais
   - Pronto para executar em PostgreSQL

## 🎯 Regra de Funcionamento

**R$ 0,04 acumulado = 1 crédito deduzido**

O sistema acumula o custo de uso de IA (baseado nos tokens consumidos e preços dos modelos) até atingir R$ 0,04. Quando atinge esse valor, deduz automaticamente 1 crédito do usuário.

## 🏗️ Plataformas Suportadas

1. **FGTS Fácil** (`fgts_facil`)
2. **Chat CCT** (`chat_cct`) - ✅ Implementado
3. **Ponto Mágico** (`ponto_magico`)
4. **Contracheque Transparente** (`contracheque_transparente`)

## 🚀 Como Usar Esta Documentação

### Para implementar em uma nova plataforma:

1. **Leia primeiro**: [SISTEMA-CREDITOS-CENTRALIZADO.md](SISTEMA-CREDITOS-CENTRALIZADO.md)
   - Entenda a arquitetura e as tabelas

2. **Crie o banco** (se ainda não existe):
   - Execute o script [002_create_creditos_system.sql](002_create_creditos_system.sql)
   - Banco: `Creditos_Ensinoplus`

3. **Registre sua plataforma**:
   ```sql
   INSERT INTO platforms (platform_code, platform_name, description)
   VALUES ('sua_plataforma', 'Sua Plataforma', 'Descrição');
   ```

4. **Siga o guia**: [GUIA-INTEGRACAO-CREDITOS.md](GUIA-INTEGRACAO-CREDITOS.md)
   - Escolha sua linguagem (Node.js, Python ou PHP)
   - Copie e adapte os exemplos de código
   - Configure as variáveis de ambiente

5. **Teste a integração**:
   - Use os exemplos de teste fornecidos
   - Verifique os logs e a acumulação de custos

## 📊 Estrutura do Banco de Dados

```
Creditos_Ensinoplus
├── platforms              # Cadastro de plataformas
├── ai_models             # Modelos de IA e preços
├── users_credits         # Saldo de créditos (compartilhado)
├── usage_tracking        # Uso de IA por plataforma
├── cost_accumulation     # Acumulação até R$ 0,04
├── credit_deductions     # Histórico de deduções
└── credit_config         # Configurações do sistema
```

## 🔧 Tecnologias

- **Banco de dados**: PostgreSQL 13+
- **Node.js**: `pg` library
- **Python**: `psycopg2`
- **PHP**: `PDO`

## 💡 Exemplo de Uso

```typescript
import { trackUsage, checkAndDeductCredits } from '@/lib/creditos-centralizados';

// 1. Após cada uso de IA
await trackUsage({
    userEmail: 'usuario@exemplo.com',
    modelCode: 'gemini-2.5-flash',
    inputTokens: 1000,
    outputTokens: 500,
    audioTokens: 0,
    requestDurationMs: 2000,
    status: 'success'
});

// 2. Verificar e deduzir créditos
const result = await checkAndDeductCredits('usuario@exemplo.com');

if (result.creditsDeducted) {
    console.log(`Deduzido: ${result.creditsDeducted} crédito(s)`);
    console.log(`Saldo restante: ${result.creditsBalance}`);
}
```

## 📞 Suporte

Para dúvidas ou problemas:
1. Consulte a seção **Troubleshooting** no [GUIA-INTEGRACAO-CREDITOS.md](GUIA-INTEGRACAO-CREDITOS.md)
2. Verifique os exemplos de código fornecidos
3. Analise os logs de erro detalhados

## 📝 Changelog

- **2025-01-30**: Sistema criado
  - Migração de token-based (20k tokens) para cost-based (R$ 0,04)
  - Suporte a múltiplas plataformas
  - Integração com Chat CCT concluída
  - Barra de progresso implementada

## 🔐 Segurança

- Todas as conexões usam SSL quando disponível
- Connection pooling configurado
- RLS (Row Level Security) nas tabelas do Supabase
- Validação de dados em todas as camadas

## 📈 Próximos Passos

- [ ] Integrar FGTS Fácil
- [ ] Integrar Ponto Mágico
- [ ] Integrar Contracheque Transparente
- [ ] Criar painel administrativo
- [ ] Implementar alertas de saldo baixo
- [ ] Relatórios gerenciais

---

**Versão**: 1.0.0
**Última atualização**: 2025-01-30
**Mantido por**: Equipe Ensinoplus
