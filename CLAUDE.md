# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ollama GUI is a Vue.js 3 web interface for interacting with local LLMs through Ollama. It's a privacy-focused chat application where all processing happens locally.

## Development Commands

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Start dev server with network access
yarn dev --host

# Build for production (includes TypeScript checking)
yarn build

# Preview production build
yarn preview

# Format code with Prettier
yarn format

# Run Ollama with CORS for hosted version
OLLAMA_ORIGINS=https://ollama-gui.vercel.app ollama serve

# Docker commands
docker compose up -d  # Start both Ollama and GUI
docker build -t ollama-gui .  # Build production image
```

### Development Proxy
The development server includes an automatic proxy that forwards `/api` requests to `http://localhost:11434`. This allows:
- Seamless local development without CORS issues
- Network access when using `yarn dev --host` - other devices can access both UI and API
- Zero configuration required

To disable the proxy (e.g., when using a custom Ollama endpoint):
```bash
VITE_NO_PROXY=true yarn dev
```

## Architecture Overview

### Component-Based Architecture
- **Presentation Layer**: Vue 3 components with Composition API
- **Service Layer**: Business logic in composables (`/services/*.ts`)
- **Data Layer**: IndexedDB via Dexie for local storage
- **API Layer**: HTTP client for Ollama integration

### Key Services
- `services/chat.ts`: Central chat management and state
- `services/api.ts`: Ollama API client with streaming support
- `services/database.ts`: Dexie schema for chats, messages, and configs
- `services/appConfig.ts`: App settings and configuration
- `services/useAI.ts`: AI generation orchestration

### Data Flow Pattern
1. User input → Component → Service composable
2. Service updates reactive state and persists to IndexedDB
3. API calls to Ollama (with streaming for AI responses)
4. Reactive updates propagate to UI components

### State Management
- Uses Vue 3 composables pattern (no Vuex/Pinia)
- Shared state via exported composables
- Settings in localStorage via `@vueuse/core`
- Chat data in IndexedDB

## Component Structure

```
App.vue (Root layout)
├── Sidebar.vue (Navigation, chat list)
├── ChatMessages.vue (Message display container)
│   └── ChatMessage.vue (Message wrapper)
│       ├── UserMessage.vue
│       ├── AiMessage.vue
│       └── SystemMessage.vue
├── ChatInput.vue (User input, regeneration)
├── ModelSelector.vue (Model switching)
├── SystemPrompt.vue (System message config)
└── Settings.vue (App configuration)
```

## TypeScript Considerations
- Strict mode enabled
- Full type coverage across the codebase
- Key interfaces in `services/database.ts`
- Vue components use `<script setup lang="ts">`

## Styling Guidelines
- Tailwind CSS with dark mode support (class-based)
- Typography plugin for markdown content
- JetBrains Mono font for code blocks
- Responsive design patterns using Tailwind utilities

## API Integration
- Ollama API endpoints: `/api/chat`, `/api/tags`, `/api/embeddings`
- Streaming responses handled via fetch with reader
- Abort controller for canceling requests
- CORS configuration required for hosted deployments

## Testing
No testing framework is currently configured. Manual testing recommended for:
- Chat creation and deletion
- Message streaming and cancellation
- Import/export functionality
- Model switching
- Dark mode toggle

## Build Process
- TypeScript checking runs before build (`vue-tsc --build --force`)
- Vite handles bundling and optimization
- Production build outputs to `dist/` directory
- Chunk size warning limit set to 1500KB

## Common Development Tasks

### Adding a New Feature
1. Create component in appropriate directory
2. Add service logic to relevant composable
3. Update database schema if needed (increment version)
4. Follow existing patterns for state management

### Modifying Chat Logic
- Primary logic in `services/chat.ts`
- Database operations abstracted through service layer
- Maintain reactive state consistency

### Working with Ollama API
- All API calls through `services/api.ts`
- Support streaming by default
- Handle errors gracefully with user feedback

## Important Notes
- All data stored locally in browser (privacy-first)
- No authentication or user management
- Ollama must be running locally or accessible via network
- Docker deployment includes both Ollama and GUI services

## Key File Locations
- Type definitions: `services/database.ts` (Chat, Message, OllamaConfig interfaces)
- Markdown rendering: `services/markdown.ts` (highlight.js integration)
- Error handling: Services return error states, components show user feedback
- Environment: No .env files - all configuration via UI or Docker compose