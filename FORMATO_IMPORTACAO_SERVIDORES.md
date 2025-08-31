# Formato de Importação em Lote - Servidores

## Estrutura do Arquivo JSON

Para importar servidores em lote, utilize um arquivo JSON com a seguinte estrutura:

```json
[
  {
    "nome": "Nome Completo do Servidor",
    "cpf": "000.000.000-00",
    "perfil": "Perfil do Servidor",
    "ojs": [
      "Nome do Órgão Julgador 1",
      "Nome do Órgão Julgador 2",
      "Nome do Órgão Julgador 3"
    ]
  }
]
```

## Campos Obrigatórios

- **nome**: Nome completo do servidor (obrigatório)
- **cpf**: CPF no formato 000.000.000-00 (obrigatório)
- **ojs**: Array com os nomes dos órgãos julgadores (obrigatório)

## Campo Opcional

- **perfil**: Perfil do servidor no sistema PJe (opcional)
  - Se não informado, será usado "Assessor" como padrão
  - Opções disponíveis:
    - "Assessor"
    - "Secretário de Audiência"
    - "Administrador"
    - "Servidor"

## Exemplo Completo

Veja o arquivo `exemplo_importacao_servidores.json` para um exemplo prático com múltiplos servidores.

## Como Importar

1. Prepare seu arquivo JSON seguindo o formato acima
2. Na aba "Servidores" da aplicação
3. Clique no botão "Importar Servidores"
4. Selecione seu arquivo JSON
5. Os servidores serão importados automaticamente

## Observações Importantes

- O arquivo deve ser um JSON válido
- Todos os campos obrigatórios devem estar presentes
- Os nomes dos órgãos julgadores devem corresponder exatamente aos cadastrados no sistema
- CPFs duplicados não são permitidos
- Se o perfil não for especificado, "Assessor" será usado como padrão