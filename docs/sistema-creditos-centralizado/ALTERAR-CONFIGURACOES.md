# ⚙️ Como Alterar Configurações do Sistema de Créditos

O sistema de créditos centralizado permite alterar configurações **sem modificar código**. Todas as configurações são armazenadas na tabela `credit_config` do banco de dados.

## 📊 Configurações Disponíveis

### 1. Custo por Crédito (cost_per_credit_brl)

**Valor atual**: R$ 0,04 = 1 crédito

**Como alterar**:

```sql
UPDATE credit_config
SET config_value = '0.05',
    updated_at = NOW()
WHERE config_key = 'cost_per_credit_brl';
```

Isso mudará a regra para **R$ 0,05 = 1 crédito**.

### 2. Taxa de Conversão USD → BRL (usd_to_brl_rate)

**Valor atual**: 5.0

**Como alterar**:

```sql
UPDATE credit_config
SET config_value = '5.5',
    updated_at = NOW()
WHERE config_key = 'usd_to_brl_rate';
```

### 3. Aviso de Créditos Baixos (min_credits_warning)

**Valor atual**: 10 créditos

**Como alterar**:

```sql
UPDATE credit_config
SET config_value = '20',
    updated_at = NOW()
WHERE config_key = 'min_credits_warning';
```

## 🔄 Como o Sistema Observa as Mudanças

### Sistema de Cache

O sistema utiliza um **cache inteligente** que:

1. **Cache de 5 minutos**: As configurações são armazenadas em memória por 5 minutos
2. **Atualização automática**: Após 5 minutos, busca novamente do banco
3. **Sem necessidade de reiniciar**: As aplicações detectam mudanças automaticamente

### Código (para referência)

```typescript
// Cache para configurações (evitar consultas repetidas ao banco)
let configCache: { costPerCredit: number; lastUpdated: number } | null = null;
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function getConfig(): Promise<{ costPerCredit: number }> {
    // Verificar cache
    if (configCache && Date.now() - configCache.lastUpdated < CONFIG_CACHE_TTL) {
        return { costPerCredit: configCache.costPerCredit };
    }

    // Buscar do banco
    const result = await creditosPool.query(
        "SELECT config_value FROM credit_config WHERE config_key = 'cost_per_credit_brl'"
    );

    const costPerCredit = result.rows.length > 0
        ? parseFloat(result.rows[0].config_value)
        : 0.04; // Fallback para valor padrão

    // Atualizar cache
    configCache = {
        costPerCredit,
        lastUpdated: Date.now()
    };

    return { costPerCredit };
}
```

## 📝 Exemplos Práticos

### Exemplo 1: Aumentar custo por crédito

**Cenário**: Você quer que os usuários gastem mais antes de deduzir 1 crédito.

```sql
-- De R$ 0,04 para R$ 0,10
UPDATE credit_config
SET config_value = '0.10',
    updated_at = NOW()
WHERE config_key = 'cost_per_credit_brl';
```

**Resultado**:
- Antes: 1000 tokens × R$ 0,0015 = R$ 0,0015 → acumula até R$ 0,04 → deduz 1 crédito
- Depois: 1000 tokens × R$ 0,0015 = R$ 0,0015 → acumula até R$ 0,10 → deduz 1 crédito

### Exemplo 2: Diminuir custo por crédito

**Cenário**: Você quer que os créditos sejam deduzidos mais frequentemente.

```sql
-- De R$ 0,04 para R$ 0,02
UPDATE credit_config
SET config_value = '0.02',
    updated_at = NOW()
WHERE config_key = 'cost_per_credit_brl';
```

**Resultado**:
- Antes: Precisava acumular R$ 0,04 para deduzir
- Depois: Precisa acumular apenas R$ 0,02 para deduzir

## ⏱️ Tempo de Propagação

| Ação | Tempo |
|------|-------|
| Alterar valor no banco | Imediato |
| Cache expirar | Até 5 minutos |
| Sistema usar novo valor | Próxima chamada após cache expirar |

### Como forçar atualização imediata

Se você não quer esperar 5 minutos, pode:

**Opção 1: Reiniciar a aplicação**
```bash
# No servidor de produção
pm2 restart app-name
```

**Opção 2: Aguardar 5 minutos**
- Mais simples
- Não causa downtime
- Sistema atualiza automaticamente

## 🔍 Verificar Configuração Atual

```sql
SELECT * FROM credit_config;
```

**Resultado esperado**:
```
id | config_key           | config_value | description                                    | updated_at
---+----------------------+--------------+------------------------------------------------+------------------
1  | cost_per_credit_brl  | 0.04         | Custo em R$ para deduzir 1 crédito             | 2025-01-30 10:00
2  | usd_to_brl_rate      | 5.0          | Taxa de conversão USD para BRL                 | 2025-01-30 10:00
3  | min_credits_warning  | 10           | Aviso quando créditos estão abaixo deste valor | 2025-01-30 10:00
```

## 📊 Impacto de Mudanças

### Mudança no `cost_per_credit_brl`

**Afeta**:
- ✅ Novas acumulações (imediatamente após cache expirar)
- ✅ Cálculo de porcentagem na barra de progresso
- ✅ Verificação de quando deduzir créditos

**NÃO afeta**:
- ❌ Acumulações já existentes (custo já registrado)
- ❌ Histórico de deduções anteriores
- ❌ Créditos já deduzidos

### Exemplo de Comportamento

**Estado atual**:
- Usuário acumulou R$ 0,03
- Configuração: R$ 0,04 = 1 crédito
- Barra de progresso: 75%

**Após alterar para R$ 0,05**:
- Usuário ainda tem R$ 0,03 acumulado
- Nova configuração: R$ 0,05 = 1 crédito
- Barra de progresso: 60% (0,03 / 0,05 = 60%)
- Precisará acumular mais R$ 0,02 para deduzir

## 🚨 Cuidados

### ⚠️ Não use valores zerados ou negativos

```sql
-- ❌ NUNCA FAÇA ISSO
UPDATE credit_config SET config_value = '0' WHERE config_key = 'cost_per_credit_brl';
```

Isso causará divisão por zero e erros no sistema.

### ✅ Valores recomendados

```sql
-- Valores razoáveis para cost_per_credit_brl
-- Mínimo: 0.01 (R$ 0,01 = 1 crédito)
-- Máximo: 1.00 (R$ 1,00 = 1 crédito)
-- Atual: 0.04 (R$ 0,04 = 1 crédito)
```

## 📝 Adicionar Novas Configurações

Se você quiser adicionar uma nova configuração:

```sql
INSERT INTO credit_config (config_key, config_value, description)
VALUES ('nova_config', 'valor', 'Descrição da configuração');
```

E então atualizar o código para usar essa configuração.

## 🔄 Reverter Mudanças

Se você mudou e quer voltar ao padrão:

```sql
UPDATE credit_config
SET config_value = '0.04',
    updated_at = NOW()
WHERE config_key = 'cost_per_credit_brl';
```

## 📊 Monitorar Impacto

Após alterar a configuração, você pode monitorar o impacto:

```sql
-- Ver acumulações ativas
SELECT
    user_email,
    accumulated_cost_brl,
    accumulated_tokens,
    FLOOR(accumulated_cost_brl / 0.04) as credits_ready_old_config,
    FLOOR(accumulated_cost_brl / 0.05) as credits_ready_new_config
FROM cost_accumulation
WHERE status = 'accumulating'
ORDER BY accumulated_cost_brl DESC;
```

## 💡 Dicas

1. **Teste em desenvolvimento primeiro**: Altere a configuração no ambiente de dev antes de produção
2. **Comunique aos usuários**: Se a mudança for significativa, avise os usuários
3. **Monitore após mudança**: Observe os logs para ver se tudo está funcionando
4. **Documente**: Anote a data e motivo da mudança

---

**Última atualização**: 2025-01-30
**Versão do sistema**: 1.0.0
