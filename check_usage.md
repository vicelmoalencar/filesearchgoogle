# Como Monitorar Uso e Custos da API Gemini

## 1. Verificar Custos no Google Cloud Console

### Via Web:
1. Acesse: https://console.cloud.google.com/billing
2. Navegue: **Billing → Reports**
3. Filtre por:
   - Service: "Generative Language API"
   - Time range: "Last 30 days"

### Via gcloud CLI:
```bash
# Listar projetos
gcloud projects list

# Ver custos do projeto
gcloud billing projects describe PROJECT_ID
```

## 2. APIs Habilitadas no seu Projeto

Para ver quais APIs estão ativas:
```bash
gcloud services list --enabled --project=YOUR_PROJECT_ID
```

## 3. Quotas e Limites

Verificar quotas atuais:
```
https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas
```

## 4. Custos Estimados

### Gemini 2.5 Flash (modelo atual):
- Input: $0.075 / 1M tokens
- Output: $0.30 / 1M tokens
- Cache: $0.01875 / 1M tokens (75% desconto)

### Calculadora de Custos:
- 1 página ≈ 1.500 tokens
- 1.000 perguntas médias ≈ 500k tokens input + 1M tokens output
- Custo estimado: ~$0.30-0.50

## 5. Otimizações para Reduzir Custos

1. **Use Cache**: Para documentos que se repetem
2. **Limite respostas**: Configure max_output_tokens
3. **Modelo mais barato**: Gemini Flash-Lite ($0.0375 input)
4. **Pré-processe**: Envie apenas trechos relevantes dos documentos

## 6. Alertas Recomendados

Configure alertas em:
- 50% do budget ($5 se budget = $10)
- 90% do budget ($9)
- 100% do budget ($10)

## 7. Ferramentas de Monitoramento

### Google Cloud Monitoring:
```
https://console.cloud.google.com/monitoring
```

### Logs de API:
```
https://console.cloud.google.com/logs/query
```

Filtro útil:
```
resource.type="audited_resource"
protoPayload.serviceName="generativelanguage.googleapis.com"
```
