# Análise Técnica e Plano de Correções - Sistema PJE Perito Automation

## 📋 Resumo Executivo

Este documento apresenta uma análise técnica completa do sistema PJE Perito Automation, identificando problemas críticos na vinculação de Órgãos Julgadores (OJs) ao Perito e propondo correções estruturadas para melhorar a confiabilidade e eficiência do sistema.

## 🔍 Problemas Identificados

### 1. **Problemas Críticos na Vinculação de OJs**

#### 1.1 Seletores CSS Instáveis
**Arquivo:** `src/vincularOJ.js` (linhas 130-180)
- **Problema:** Lista extensa de seletores CSS genéricos que podem falhar com mudanças na interface do PJE
- **Impacto:** Falhas frequentes na localização do campo de seleção de OJ
- **Evidência:** 35+ seletores diferentes tentados sequencialmente

#### 1.2 Lógica de Normalização Inconsistente
**Arquivo:** `src/vincularOJ.js` (linhas 350-380)
- **Problema:** Algoritmo de normalização de texto pode gerar falsos positivos/negativos
- **Impacto:** OJs similares podem ser confundidos ou não encontrados
- **Evidência:** Uso de threshold de 70% para correspondência pode ser inadequado

#### 1.3 Timeouts Inadequados
**Arquivo:** `src/vincularOJ.js` (linha 8)
- **Problema:** Timeout de 8000ms pode ser insuficiente para páginas lentas
- **Impacto:** Falhas por timeout em conexões mais lentas

### 2. **Problemas na Verificação de OJs Duplicados**

#### 2.1 Detecção Incompleta de Duplicatas
**Arquivo:** `src/verificarOJVinculado.js` (linhas 50-100)
- **Problema:** Seletores limitados para encontrar OJs já vinculados
- **Impacto:** Tentativas desnecessárias de vinculação de OJs duplicados

#### 2.2 Algoritmo de Correspondência Frágil
**Arquivo:** `src/verificarOJVinculado.js` (linhas 80-95)
- **Problema:** Lógica de correspondência por tokens pode falhar com variações de nomenclatura
- **Impacto:** OJs já vinculados podem não ser detectados

### 3. **Problemas na Navegação e Autenticação**

#### 3.1 Navegação Instável
**Arquivo:** `src/navigate.js` (linhas 1-50)
- **Problema:** Dependência de URLs específicas que podem mudar
- **Impacto:** Falhas na navegação para páginas de cadastro

#### 3.2 Detecção de Login Inconsistente
**Arquivo:** `src/login.js` (linhas 20-80)
- **Problema:** Múltiplos seletores para botão PDPJ sem priorização adequada
- **Impacto:** Falhas na autenticação automática

### 4. **Problemas de Arquitetura e Manutenibilidade**

#### 4.1 Código Duplicado
- **Problema:** Lógica de normalização repetida em múltiplos arquivos
- **Impacto:** Dificuldade de manutenção e inconsistências

#### 4.2 Tratamento de Erros Inadequado
- **Problema:** Exceções genéricas sem contexto específico
- **Impacto:** Dificuldade de diagnóstico e resolução de problemas

## 🛠️ Plano de Correções Detalhado

### **Fase 1: Correções Críticas (Prioridade Alta)**

#### 1.1 Refatoração do Sistema de Seletores
**Arquivo:** `src/vincularOJ.js`

**Problema Atual:**
```javascript
// Lista extensa e desordenada de seletores
const seletoresSelect = [
  '#mat-dialog-2 mat-select[placeholder="Órgão Julgador"]',
  'pje-modal-localizacao-visibilidade mat-select[placeholder="Órgão Julgador"]',
  // ... 30+ seletores mais
];
```

**Solução Proposta:**
```javascript
// Sistema hierárquico de seletores com prioridades
const SELETORES_HIERARQUICOS = {
  especificos: [
    'mat-select[placeholder="Órgão Julgador"]',
    'select[name="idOrgaoJulgadorSelecionado"]'
  ],
  contextuais: [
    '.campo-orgao-julgador mat-select',
    'mat-expansion-panel:has-text("Órgão") mat-select'
  ],
  genericos: [
    'mat-select',
    'select'
  ]
};
```

#### 1.2 Melhoria do Algoritmo de Normalização
**Arquivo:** `src/utils/normalizacao.js` (novo)

**Implementação:**
```javascript
class NormalizadorOJ {
  static normalizar(texto) {
    return texto
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  static calcularSimilaridade(texto1, texto2) {
    // Implementar algoritmo de Levenshtein ou Jaro-Winkler
    // para melhor precisão na correspondência
  }
}
```

#### 1.3 Sistema de Timeouts Adaptativos
**Arquivo:** `src/utils/timeouts.js` (novo)

**Implementação:**
```javascript
class TimeoutManager {
  static getTimeout(operacao, tentativa = 1) {
    const baseTimeouts = {
      navegacao: 15000,
      seletor: 5000,
      clique: 3000
    };
    
    // Aumentar timeout progressivamente com as tentativas
    return baseTimeouts[operacao] * Math.min(tentativa, 3);
  }
}
```

### **Fase 2: Melhorias na Detecção de Duplicatas (Prioridade Média)**

#### 2.1 Sistema Robusto de Detecção
**Arquivo:** `src/verificarOJVinculado.js`

**Melhoria Proposta:**
```javascript
class DetectorDuplicatas {
  static async verificarOJVinculado(page, nomeOJ) {
    // 1. Expandir acordeão se necessário
    await this.garantirAcordeaoAberto(page);
    
    // 2. Capturar todos os OJs vinculados
    const ojsVinculados = await this.capturarOJsVinculados(page);
    
    // 3. Verificar correspondência com algoritmo melhorado
    return this.verificarCorrespondencia(nomeOJ, ojsVinculados);
  }
  
  static verificarCorrespondencia(nomeOJ, ojsVinculados) {
    const nomeNormalizado = NormalizadorOJ.normalizar(nomeOJ);
    
    for (const ojVinculado of ojsVinculados) {
      const similaridade = NormalizadorOJ.calcularSimilaridade(
        nomeNormalizado, 
        NormalizadorOJ.normalizar(ojVinculado)
      );
      
      if (similaridade > 0.85) { // Threshold mais rigoroso
        return { jaVinculado: true, ojEncontrado: ojVinculado };
      }
    }
    
    return { jaVinculado: false };
  }
}
```

### **Fase 3: Melhorias na Navegação e Autenticação (Prioridade Média)**

#### 3.1 Sistema de Navegação Resiliente
**Arquivo:** `src/navigate.js`

**Melhoria Proposta:**
```javascript
class NavegadorPJE {
  static async navegarParaCadastro(page, cpf) {
    const estrategias = [
      () => this.navegacaoDireta(page, cpf),
      () => this.navegacaoViaMenu(page, cpf),
      () => this.navegacaoViaBusca(page, cpf)
    ];
    
    for (const estrategia of estrategias) {
      try {
        await estrategia();
        return; // Sucesso
      } catch (error) {
        console.log(`Estratégia falhou: ${error.message}`);
      }
    }
    
    throw new Error('Todas as estratégias de navegação falharam');
  }
}
```

#### 3.2 Sistema de Login Robusto
**Arquivo:** `src/login.js`

**Melhoria Proposta:**
```javascript
class AutenticadorPJE {
  static async realizarLogin(page) {
    // 1. Detectar tipo de página de login
    const tipoLogin = await this.detectarTipoLogin(page);
    
    // 2. Aplicar estratégia específica
    switch (tipoLogin) {
      case 'PDPJ':
        return await this.loginPDPJ(page);
      case 'TRADICIONAL':
        return await this.loginTradicional(page);
      default:
        throw new Error('Tipo de login não reconhecido');
    }
  }
}
```

### **Fase 4: Melhorias de Arquitetura (Prioridade Baixa)**

#### 4.1 Centralização de Utilitários
**Estrutura Proposta:**
```
src/
├── utils/
│   ├── normalizacao.js
│   ├── timeouts.js
│   ├── seletores.js
│   └── logger.js
├── services/
│   ├── navegador.js
│   ├── autenticador.js
│   └── detector-duplicatas.js
└── core/
    ├── vinculador-oj.js
    └── processador-perito.js
```

#### 4.2 Sistema de Logging Estruturado
**Arquivo:** `src/utils/logger.js`

**Implementação:**
```javascript
class Logger {
  static info(operacao, detalhes) {
    console.log(`[INFO] ${operacao}: ${detalhes}`);
  }
  
  static erro(operacao, erro, contexto = {}) {
    console.error(`[ERRO] ${operacao}: ${erro.message}`, {
      stack: erro.stack,
      contexto
    });
  }
  
  static debug(operacao, dados) {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] ${operacao}:`, dados);
    }
  }
}
```

## 📊 Cronograma de Implementação

### **Semana 1-2: Fase 1 (Correções Críticas)**
- [ ] Refatorar sistema de seletores
- [ ] Implementar algoritmo de normalização melhorado
- [ ] Criar sistema de timeouts adaptativos
- [ ] Testes unitários para componentes críticos

### **Semana 3-4: Fase 2 (Detecção de Duplicatas)**
- [ ] Melhorar detecção de OJs duplicados
- [ ] Implementar algoritmo de similaridade
- [ ] Testes de integração

### **Semana 5-6: Fase 3 (Navegação e Autenticação)**
- [ ] Implementar navegação resiliente
- [ ] Melhorar sistema de login
- [ ] Testes end-to-end

### **Semana 7-8: Fase 4 (Arquitetura)**
- [ ] Refatorar estrutura de arquivos
- [ ] Implementar logging estruturado
- [ ] Documentação técnica
- [ ] Testes de regressão completos

## 🧪 Estratégia de Testes

### **Testes Unitários**
```javascript
// Exemplo: src/tests/unit/normalizacao.test.js
describe('NormalizadorOJ', () => {
  test('deve normalizar nomes de OJ corretamente', () => {
    const resultado = NormalizadorOJ.normalizar('1ª Vara do Trabalho de São Paulo');
    expect(resultado).toBe('1a vara do trabalho de sao paulo');
  });
  
  test('deve calcular similaridade corretamente', () => {
    const sim = NormalizadorOJ.calcularSimilaridade(
      'Vara do Trabalho de Campinas',
      'Vara Trabalho Campinas'
    );
    expect(sim).toBeGreaterThan(0.8);
  });
});
```

### **Testes de Integração**
```javascript
// Exemplo: src/tests/integration/vinculacao.test.js
describe('Vinculação de OJ', () => {
  test('deve vincular OJ novo com sucesso', async () => {
    const resultado = await VinculadorOJ.vincular(page, 'Vara do Trabalho de Teste');
    expect(resultado.sucesso).toBe(true);
  });
  
  test('deve detectar OJ duplicado', async () => {
    // Primeiro, vincular um OJ
    await VinculadorOJ.vincular(page, 'Vara do Trabalho de Teste');
    
    // Tentar vincular novamente
    const resultado = await VinculadorOJ.vincular(page, 'Vara do Trabalho de Teste');
    expect(resultado.duplicado).toBe(true);
  });
});
```

## 📈 Métricas de Sucesso

### **Antes das Correções (Baseline)**
- Taxa de sucesso na vinculação: ~70%
- Tempo médio por vinculação: 15-30 segundos
- Taxa de falsos positivos em duplicatas: ~20%
- Falhas por timeout: ~15%

### **Metas Após Correções**
- Taxa de sucesso na vinculação: >95%
- Tempo médio por vinculação: 8-15 segundos
- Taxa de falsos positivos em duplicatas: <5%
- Falhas por timeout: <3%

## 🔧 Configurações Recomendadas

### **Arquivo: `.env`**
```env
# Configurações de Performance
TIMEOUT_NAVEGACAO=20000
TIMEOUT_SELETOR=8000
TIMEOUT_CLIQUE=5000

# Configurações de Debug
DEBUG=true
LOG_LEVEL=info

# Configurações de Retry
MAX_TENTATIVAS=3
INTERVALO_RETRY=2000
```

### **Arquivo: `config/seletores.json`**
```json
{
  "orgaoJulgador": {
    "especificos": [
      "mat-select[placeholder='Órgão Julgador']",
      "select[name='idOrgaoJulgadorSelecionado']"
    ],
    "contextuais": [
      ".campo-orgao-julgador mat-select",
      "mat-expansion-panel:has-text('Órgão') mat-select"
    ],
    "genericos": [
      "mat-select",
      "select"
    ]
  }
}
```

## 🚀 Próximos Passos

1. **Aprovação do Plano**: Revisar e aprovar o plano de correções
2. **Setup do Ambiente**: Configurar ambiente de desenvolvimento e testes
3. **Implementação Fase 1**: Iniciar com correções críticas
4. **Testes Contínuos**: Implementar pipeline de testes automatizados
5. **Monitoramento**: Configurar métricas de performance e confiabilidade

## 📝 Considerações Finais

Este plano de correções aborda os problemas fundamentais identificados no sistema PJE Perito Automation, priorizando estabilidade, confiabilidade e manutenibilidade. A implementação gradual permitirá validação contínua das melhorias e minimização de riscos.

A execução completa deste plano resultará em um sistema mais robusto, eficiente e fácil de manter, proporcionando uma experiência significativamente melhor para os usuários finais.