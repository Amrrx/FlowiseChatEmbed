# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flowise Embed is a JavaScript library that allows embedding Flowise chatbots on websites. It's built with SolidJS and TypeScript, providing both popup bubble and fullpage chat interfaces. The library includes an optional proxy server for enhanced security and domain-based access control.

## Build System & Development Commands

### Core Commands

- `yarn dev` - Start development server at http://localhost:5678 with live reload
- `yarn build` - Production build using Rollup, outputs to `dist/`
- `yarn start` - Start the proxy server at http://localhost:3001
- `yarn lint` - Run ESLint on TypeScript/TSX files
- `yarn lint-fix` - Auto-fix linting issues
- `yarn format` - Format code with Prettier
- `yarn format:check` - Check code formatting

### Development Workflow

1. Configure `.env` file for proxy server (see README for format)
2. Run `yarn start` for proxy server (required for full functionality)
3. Run `yarn dev` in separate terminal for development with live reload
4. Test at http://localhost:5678 (automatically opens)

### Build Configuration

- **Rollup** builds both ES modules (`web.js`) and UMD (`web.umd.js`)
- **TypeScript** generates declaration files in `dist/`
- **PostCSS** with Tailwind for styling, inlined into JavaScript bundle
- **Babel** with SolidJS preset for JSX transformation

## Architecture

### Entry Points & Registration

- `src/web.ts` - Main entry point, registers web components and exports chatbot API
- `src/register.tsx` - Registers custom elements (`<flowise-chatbot>`, `<flowise-fullchatbot>`)
- `src/window.ts` - Exports `init()`, `initFull()`, `destroy()` methods to global `window.Chatbot`

### Component Architecture

#### Core Components

- **Bot** (`src/components/Bot.tsx`) - Main chatbot logic with 2000+ lines handling:
  - Message management and history
  - File uploads and attachments
  - Audio recording and playback
  - Real-time streaming responses
  - Lead capture forms
  - Agent reasoning display
- **Bubble** (`src/features/bubble/`) - Popup chat interface with draggable button
- **Full** (`src/features/full/`) - Fullpage chat interface with viewport management

#### Message Types & Rendering

- **GuestBubble** - User messages with file attachment support
- **BotBubble** - AI responses with HTML rendering, feedback buttons, and source citations
- **AgentReasoningBubble** - Multi-agent workflow step visualization
- **LoadingBubble** - Typing indicators and loading states
- **StarterPromptBubble** - Quick-start conversation prompts
- **LeadCaptureBubble** - Form collection for user details

#### Input System

- **TextInput** - Multi-line input with file upload, audio recording, and attachment preview
- **FilePreview** - Image/file attachment display with removal capabilities
- **Audio Recording** - Voice message capture with waveform visualization

### Data Flow

1. **Initialization**: Web components register with default props from `constants.ts`
2. **Message Flow**: `sendMessageQuery.ts` handles API communication via fetch/EventSource
3. **State Management**: SolidJS signals for reactive UI updates
4. **File Handling**: FormData uploads through proxy server with MIME type validation

### Proxy Server (`server.js`)

- **Security Layer**: Hides Flowise API details from frontend
- **Domain Validation**: Restricts embedding to configured domains
- **Environment Config**: Maps identifiers to chatflow IDs and allowed domains
- **API Proxying**: Forwards requests to Flowise instance with authentication
- **File Handling**: Manages uploads and serves chat attachments

## Key Technical Patterns

### SolidJS Usage

- Custom elements via `solid-element` package
- Reactive signals for state management
- Component composition with prop splitting
- Effects for DOM manipulation and cleanup

### TypeScript Integration

- Path aliases: `@/*` maps to `src/*`
- Declaration files generated for library consumers
- Strict typing with proper JSX definitions
- Zod for runtime validation

### Styling & Theming

- Tailwind CSS compiled and inlined
- Comprehensive theming system for all UI elements
- Custom CSS injection support
- Responsive design with mobile optimizations

### File Upload Architecture

- Multi-constraint validation (type, size)
- Preview generation for images
- FormData streaming to proxy server
- MIME type detection and handling

### Real-time Communication

- EventSource for streaming responses
- Message chunking and reconstruction
- Connection management and error recovery
- Audio feedback with customizable sounds

## Testing & Quality

### Code Quality Tools

- **ESLint**: Configured with SolidJS-specific rules, TypeScript support
- **Prettier**: Code formatting with consistent style
- **Husky**: Git hooks for pre-commit validation
- **TypeScript**: Strict mode enabled with comprehensive type checking

### Common Lint Issues

- Solid reactivity warnings (use signals in JSX/effects only)
- Early returns in components (use `<Show>` instead)
- Unused variables in development code
- Missing function wrapping for reactive variables

## Configuration & Deployment

### Environment Variables (Proxy Server)

```bash
API_HOST=https://your-flowise-instance.com
FLOWISE_API_KEY=your-api-key
# Chatflow format: identifier=chatflowId,domain1,domain2
support=uuid-here,https://example.com
```

### Security Considerations

- Domain whitelist validation prevents unauthorized embedding
- API key authentication on proxy server
- CORS configuration with credential support
- File upload size and type restrictions

### Build Outputs

- `dist/web.js` - ES module for modern browsers
- `dist/web.umd.js` - UMD bundle for broader compatibility
- `dist/*.d.ts` - TypeScript declarations for library usage

## Development Notes

### Working with Components

- Follow existing prop patterns from `types.ts` and component interfaces
- Use `splitProps` for separating theme/config props
- Implement proper cleanup in `onCleanup` for effects and listeners
- Theme properties are deeply nested - check existing patterns

### Adding New Features

- Update `BotProps` interface in relevant type files
- Add theme configuration to bubble/full type definitions
- Consider mobile responsive behavior
- Test with both bubble and fullpage modes

### Proxy Server Extension

- Add new endpoints to `proxyEndpoints` object
- Implement validation in `validateApiKey` middleware
- Update domain parsing for new chatflow configurations
- Test security restrictions with different origins
