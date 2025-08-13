# Design Document

## Overview

Este documento apresenta o design técnico para as melhorias do sistema PJE Automation - Peritos e Servidores. O design foca em transformar o sistema atual em uma aplicação mais robusta, escalável e maintível, mantendo a compatibilidade com as funcionalidades existentes.

## Architecture

### Current Architecture Issues
- Código monolítico com responsabilidades misturadas
- Falta de separação entre camadas
- Tratamento de erro inconsistente
- Ausência de testes automatizados
- Logs não estruturados

### Proposed Architecture

```
src/
├── controllers/          # Controladores da aplicação
│   ├── PeritoController.js
│   ├── ServidorController.js
│   └── AutomationController.js
├── services/            # Lógica de negócio
│   ├── PJEService.js
│   ├── NavigationService.js
│   ├── ValidationService.js
│   └── ReportService.js
├── models/              # Modelos de dados
│   ├── Perito.js
│   ├── Servidor.js
│   └── AutomationResult.js
├── utils/               # Utilitários
│   ├── Logger.js
│   ├── ErrorHandler.js
│   ├── ConfigManager.js
│   └── BackupManager.js
├── automation/          # Módulos de automação
│   ├── BrowserManager.js
│   ├── ElementSelector.js
│   └── ActionExecutor.js
├── data/               # Camada de dados
│   ├── DataRepository.js
│   └── CacheManager.js
└── tests/              # Testes automatizados
    ├── unit/
    ├── integration/
    └── e2e/
```

## Components and Interfaces

### 1. Logger System

```javascript
class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.outputDir = options.outputDir || './logs';
    this.maxFileSize = options.maxFileSize || '10MB';
    this.maxFiles = options.maxFiles || 5;
  }

  info(message, context = {}) { /* ... */ }
  warn(message, context = {}) { /* ... */ }
  error(message, error, context = {}) { /* ... */ }
  debug(message, context = {}) { /* ... */ }
}
```

### 2. Error Handler

```javascript
class ErrorHandler {
  static handle(error, context = {}) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context
    };
    
    Logger.error('Application error', error, context);
    
    if (error.name === 'TimeoutError') {
      return this.handleTimeout(error, context);
    }
    
    if (error.name === 'ElementNotFoundError') {
      return this.handleElementNotFound(error, context);
    }
    
    return this.handleGenericError(error, context);
  }
}
```

### 3. Browser Manager

```javascript
class BrowserManager {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.options = {
      headless: options.headless || false,
      slowMo: options.slowMo || 50,
      timeout: options.timeout || 15000,
      ...options
    };
  }

  async initialize() { /* ... */ }
  async navigate(url) { /* ... */ }
  async close() { /* ... */ }
  async retry(operation, maxAttempts = 3) { /* ... */ }
}
```

### 4. Element Selector

```javascript
class ElementSelector {
  constructor(page, logger) {
    this.page = page;
    this.logger = logger;
    this.selectors = new Map();
  }

  async findElement(selectors, options = {}) {
    for (const selector of selectors) {
      try {
        const element = await this.page.waitForSelector(selector, {
          timeout: options.timeout || 5000
        });
        
        if (element) {
          this.logger.debug(`Element found with selector: ${selector}`);
          return element;
        }
      } catch (error) {
        this.logger.debug(`Selector failed: ${selector}`, { error: error.message });
      }
    }
    
    throw new ElementNotFoundError('No element found with provided selectors');
  }
}
```

### 5. Configuration Manager

```javascript
class ConfigManager {
  constructor() {
    this.config = {};
    this.validators = new Map();
    this.encryptionKey = this.generateEncryptionKey();
  }

  load() { /* Load from .env and validate */ }
  save(config) { /* Validate and save securely */ }
  encrypt(value) { /* Encrypt sensitive data */ }
  decrypt(value) { /* Decrypt sensitive data */ }
  validate(key, value) { /* Validate configuration values */ }
}
```

## Data Models

### Perito Model

```javascript
class Perito {
  constructor(data) {
    this.id = data.id || this.generateId();
    this.nome = data.nome;
    this.cpf = this.normalizeCPF(data.cpf);
    this.ojs = data.ojs || [];
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = new Date();
  }

  validate() {
    if (!this.nome || this.nome.trim().length < 2) {
      throw new ValidationError('Nome deve ter pelo menos 2 caracteres');
    }
    
    if (!this.isValidCPF(this.cpf)) {
      throw new ValidationError('CPF inválido');
    }
    
    return true;
  }

  normalizeCPF(cpf) {
    return cpf.replace(/\D/g, '');
  }

  isValidCPF(cpf) {
    // Implementar validação de CPF
    return cpf && cpf.length === 11;
  }
}
```

### Automation Result Model

```javascript
class AutomationResult {
  constructor() {
    this.id = this.generateId();
    this.startTime = new Date();
    this.endTime = null;
    this.status = 'running';
    this.processedItems = [];
    this.errors = [];
    this.metrics = {
      totalItems: 0,
      successCount: 0,
      errorCount: 0,
      skippedCount: 0
    };
  }

  addResult(item, status, message = '', error = null) {
    this.processedItems.push({
      item,
      status,
      message,
      error,
      timestamp: new Date()
    });
    
    this.metrics[`${status}Count`]++;
  }

  complete() {
    this.endTime = new Date();
    this.status = 'completed';
    this.calculateMetrics();
  }
}
```

## Error Handling

### Error Types

```javascript
class PJEError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = 'PJEError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

class TimeoutError extends PJEError {
  constructor(message, timeout, context = {}) {
    super(message, 'TIMEOUT', context);
    this.name = 'TimeoutError';
    this.timeout = timeout;
  }
}

class ElementNotFoundError extends PJEError {
  constructor(message, selectors, context = {}) {
    super(message, 'ELEMENT_NOT_FOUND', context);
    this.name = 'ElementNotFoundError';
    this.selectors = selectors;
  }
}

class ValidationError extends PJEError {
  constructor(message, field, value, context = {}) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}
```

### Retry Strategy

```javascript
class RetryStrategy {
  static async withExponentialBackoff(operation, maxAttempts = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        Logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, {
          error: error.message,
          attempt,
          maxAttempts
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}
```

## Testing Strategy

### Unit Tests Structure

```javascript
// tests/unit/services/PJEService.test.js
describe('PJEService', () => {
  let pjeService;
  let mockBrowser;
  let mockLogger;

  beforeEach(() => {
    mockBrowser = new MockBrowserManager();
    mockLogger = new MockLogger();
    pjeService = new PJEService(mockBrowser, mockLogger);
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      // Test implementation
    });

    it('should retry on timeout', async () => {
      // Test implementation
    });

    it('should throw error on invalid credentials', async () => {
      // Test implementation
    });
  });
});
```

### Integration Tests

```javascript
// tests/integration/automation.test.js
describe('Automation Integration', () => {
  let app;
  let testData;

  beforeAll(async () => {
    app = new PJEAutomationApp();
    await app.initialize();
    testData = await loadTestData();
  });

  afterAll(async () => {
    await app.cleanup();
  });

  it('should complete full perito automation flow', async () => {
    const result = await app.automatePeritos(testData.peritos);
    expect(result.status).toBe('completed');
    expect(result.metrics.successCount).toBeGreaterThan(0);
  });
});
```

### E2E Tests

```javascript
// tests/e2e/user-interface.test.js
describe('User Interface E2E', () => {
  let electronApp;

  beforeAll(async () => {
    electronApp = await electron.launch({ args: ['src/main.js'] });
  });

  afterAll(async () => {
    await electronApp.close();
  });

  it('should allow user to add and edit peritos', async () => {
    const window = await electronApp.firstWindow();
    
    // Click add perito button
    await window.click('#add-perito');
    
    // Fill form
    await window.fill('#nome', 'Test Perito');
    await window.fill('#cpf', '12345678901');
    
    // Submit
    await window.click('#save-perito');
    
    // Verify perito was added
    const peritoRow = await window.locator('.perito-row').first();
    expect(await peritoRow.textContent()).toContain('Test Perito');
  });
});
```

## Performance Optimizations

### Caching Strategy

```javascript
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
  }

  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttl);
  }

  get(key) {
    if (this.isExpired(key)) {
      this.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  isExpired(key) {
    const expiry = this.ttl.get(key);
    return expiry && Date.now() > expiry;
  }
}
```

### Parallel Processing

```javascript
class ParallelProcessor {
  constructor(concurrency = 3) {
    this.concurrency = concurrency;
    this.queue = [];
    this.running = 0;
  }

  async process(items, processor) {
    const results = [];
    const promises = [];

    for (const item of items) {
      const promise = this.processItem(item, processor);
      promises.push(promise);
      
      if (promises.length >= this.concurrency) {
        const batch = await Promise.allSettled(promises.splice(0, this.concurrency));
        results.push(...batch);
      }
    }

    if (promises.length > 0) {
      const batch = await Promise.allSettled(promises);
      results.push(...batch);
    }

    return results;
  }
}
```

## Security Enhancements

### Credential Encryption

```javascript
class CredentialManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyPath = path.join(os.homedir(), '.pje-automation', 'key');
  }

  encrypt(text) {
    const key = this.getOrCreateKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData) {
    const key = this.getOrCreateKey();
    const decipher = crypto.createDecipher(
      this.algorithm, 
      key, 
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

## Monitoring and Metrics

### Metrics Collection

```javascript
class MetricsCollector {
  constructor() {
    this.metrics = {
      counters: new Map(),
      timers: new Map(),
      gauges: new Map()
    };
  }

  increment(name, value = 1, tags = {}) {
    const key = this.createKey(name, tags);
    const current = this.metrics.counters.get(key) || 0;
    this.metrics.counters.set(key, current + value);
  }

  timing(name, duration, tags = {}) {
    const key = this.createKey(name, tags);
    const timings = this.metrics.timers.get(key) || [];
    timings.push(duration);
    this.metrics.timers.set(key, timings);
  }

  gauge(name, value, tags = {}) {
    const key = this.createKey(name, tags);
    this.metrics.gauges.set(key, value);
  }

  getReport() {
    return {
      counters: Object.fromEntries(this.metrics.counters),
      timers: this.calculateTimerStats(),
      gauges: Object.fromEntries(this.metrics.gauges),
      timestamp: new Date().toISOString()
    };
  }
}
```

## Migration Strategy

### Phase 1: Foundation
1. Implementar sistema de logging estruturado
2. Criar classes de erro customizadas
3. Implementar configuração segura
4. Adicionar testes unitários básicos

### Phase 2: Refactoring
1. Extrair serviços da lógica principal
2. Implementar padrão Repository para dados
3. Criar controllers para separar responsabilidades
4. Adicionar cache e otimizações de performance

### Phase 3: Enhancement
1. Implementar monitoramento e métricas
2. Adicionar testes de integração e E2E
3. Criar sistema de backup automático
4. Implementar processamento paralelo

### Phase 4: Polish
1. Melhorar interface do usuário
2. Adicionar documentação completa
3. Implementar CI/CD pipeline
4. Otimizar performance final