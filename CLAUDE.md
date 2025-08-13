# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão Geral do Projeto

Este é um sistema de automação para o PJE (Processo Judicial Eletrônico) construído com Electron, projetado para automatizar o processo de vinculação de peritos e servidores aos órgãos julgadores do sistema judiciário brasileiro. A aplicação oferece uma interface gráfica moderna para gerenciar e executar fluxos automatizados usando Playwright para automação do navegador.

## Essential Development Commands

```bash
# Install dependencies
npm install

# Start application in development mode (opens DevTools)
npm run dev

# Start application in production mode
npm start

# Build application for distribution
npm run build

# Testing commands
npm test                 # Run all tests
npm run test:unit        # Run unit tests only
npm run test:integration # Run integration tests only  
npm run test:e2e         # Run end-to-end tests only
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report

# Code quality commands
npm run lint             # Run ESLint
npm run lint:fix         # Run ESLint with auto-fix
npm run format           # Format code with Prettier
npm run syntax-check     # Check syntax of main files

# Setup and utilities
npm run setup            # Install deps and create desktop shortcut
npm run create-shortcut  # Create desktop shortcut only
```

## Testing Framework

The project uses Jest with a multi-project configuration for different test types:

- **Unit Tests**: `src/tests/unit/` - Test individual modules in isolation
- **Integration Tests**: `src/tests/integration/` - Test module interactions
- **E2E Tests**: `src/tests/e2e/` - Test complete user workflows
- **Coverage**: Excludes renderer files and main.js from coverage reports
- **Test Timeout**: 30 seconds to accommodate browser automation tests

## Code Architecture Overview

### Core Components

**Electron Main Process (`src/main.js`)**:
- Entry point that creates main window and manages IPC communication
- Orchestrates browser automation using Playwright
- Manages data persistence for experts and court staff
- Handles file import/export functionality
- Contains two automation engines: legacy (v1) and modern (v2)

**Renderer Process (`src/renderer/`)**:
- `index.html`: Main interface with tabs (Experts, Staff, Settings, Automation)
- `script.js`: Frontend logic for form management, data display and automation controls
- `styles.css`: Modern CSS styling with professional appearance

**Automation Modules**:
- `login.js`: Manages PDPJ authentication with 9 different selector strategies
- `navigate.js`: Navigates to people management with 13 menu selectors and 29 edit icon selectors
- `vincularOJ.js`: Links judging bodies to users with retry logic
- `verificarOJVinculado.js`: Checks existing links to prevent duplicates
- `util.js`: Configuration management and utility functions

**Server Automation**:
- `src/main/servidor-automation.js`: Legacy automation engine for servers (v1)
- `src/main/servidor-automation-v2.js`: Modern automation engine with improved error handling and reporting

### Data Structure

**Expert Data (`data/perito.json`)**:
```json
[
  {
    "cpf": "000.000.000-00",
    "nome": "Expert Name",
    "ojs": ["Judging Body 1", "Judging Body 2"]
  }
]
```

**Server Data (`data/servidores.json`)**:
```json
[
  {
    "nome": "Server Name",
    "cpf": "000.000.000-00",
    "perfil": "Hearing Secretary",
    "localizacoes": ["Court Location"]
  }
]
```

## Key Technical Patterns

### Browser Automation Strategy
The system uses multiple fallback selectors for maximum compatibility:
- **Login**: 9 PDPJ selectors + 8 login button selectors
- **Navigation**: 13 menu selectors + 11 person selectors
- **Editing**: 29 different edit icon selectors (avoiding delete icons)
- **Debug**: Automatic element capture when selectors fail

### Error Handling and Resilience
- Retry logic for login (3 attempts)
- Timeout management (10-60 seconds based on operation)
- Duplicate detection and prevention
- Real-time status reporting with progress tracking
- Non-headless mode for debugging (browser stays open)

### IPC Communication
Main process exposes handlers for:
- `load-peritos`, `save-peritos`: Expert data management
- `load-data`, `save-data`: Generic data persistence
- `start-automation`, `stop-automation`: Expert automation control
- `start-servidor-automation-v2`: Modern server automation
- `import-file`, `export-file`: Data import/export

### Security Implementation
- Context isolation enabled (`contextIsolation: true`)
- Node integration disabled (`nodeIntegration: false`)
- Credentials stored in `.env` file (not committed)
- Secure preload script for IPC communication

## Development Workflow

### Adding New Automation Features
1. Create module in `src/` directory following existing patterns
2. Add multiple selector strategies for robustness
3. Implement debug logging and element capture
4. Add IPC handlers in `main.js`
5. Update renderer interface in `script.js`

### Testing Automation
- Use development mode (`npm run dev`) to open DevTools
- Browser automation runs in visible mode for debugging
- Check console logs for selector debug information
- Status panel provides real-time feedback

### Data Management
- JSON files in `data/` directory for persistence
- Import/export functionality for backup and migration
- Generic data handlers support multiple data types

### Running Tests
- Use `npm run test:watch` for continuous testing during development
- Run `npm run test:e2e` to test complete automation workflows
- Use `npm run test:coverage` to ensure adequate test coverage
- Individual test suites can be run separately (unit/integration/e2e)

## Configuration Management

**Environment Variables (`.env`)**:
```env
PJE_URL=https://pje.trt15.jus.br/primeirograu/login.seam
LOGIN=your_cpf
PASSWORD=your_password
```

**Judging Bodies**: Defined in `src/renderer/orgaos_pje.json` with 400+ court locations

## Automation Flow

1. **Authentication**: PDPJ login with automatic credential handling
2. **Navigation**: Menu traversal to people management section
3. **Search**: Direct URL navigation with CPF filtering
4. **Edit Mode**: Click edit icon and navigate to expert/server tab
5. **Linking**: Add judging body associations with role configuration
6. **Validation**: Check existing links to prevent duplicates
7. **Reporting**: Generate detailed success/failure reports

## Performance Considerations

- Optimized timeouts (5ms slowMo, 10-60s element waits)
- Parallel processing for multiple users
- Efficient DOM queries with fallback strategies
- Progress tracking for long-running operations
- Browser resource management (single instance, manual closure)

## Debugging and Troubleshooting

- Enable `--dev` flag for DevTools access
- Console logging captures all browser interactions
- Element debug system shows available selectors when failures occur
- Status reporting system provides detailed operation feedback
- Browser remains open after completion for manual inspection