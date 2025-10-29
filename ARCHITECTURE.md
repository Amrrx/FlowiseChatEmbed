# Architecture: 3-Project Event System

## Projects Overview

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│     Angular      │         │     Chatbot      │         │   MCP Server     │
│   (Separate)     │         │ (FlowiseChatEmbed│         │   (Separate)     │
└──────────────────┘         └──────────────────┘         └──────────────────┘
         │                            │                            │
         │                            │                            │
    Event Types                  Event Types                  Event Types
    (Manually                    (Manually                    (Reads from
     defined)                     defined)                     catalog.json)
         │                            │                            │
         │                            │◄───────────────────────────┤
         │                            │   Fetches catalog.json     │
         │                            │   (HTTP/git/npm)           │
         │                            │                            │
```

## Files Per Project

### Angular Project

- **Event Definitions** (TypeScript):
  ```typescript
  type UnitQueriedEvent = { type: 'UNIT_QUERIED'; searchTerm: string; searchType: string };
  type QueryUnitCommand = { type: 'QUERY_UNIT'; searchTerm: string; searchType: string };
  ```

### Chatbot Project (FlowiseChatEmbed)

- **`src/bridge/types.ts`** - Same type definitions as Angular
- **`src/bridge/catalog.json`** - Documents both directions for LLM
- **`src/bridge/catalog.validator.ts`** - Validates catalog against types

### MCP Server Project

- **Fetches `catalog.json`** from Chatbot (HTTP/git/npm)
- **Serves as MCP resource**: `flowise://event-catalog`

## Data Flow

### Flow 1: Angular → Chatbot → LLM

```
Angular Component
  └─> dispatchEvent('angular:event', {type: 'UNIT_QUERIED', ...})
         │
         ▼
      Chatbot (useChatbotBridge)
         └─> buildPromptFromEvent() → "User searched for plate ABC-123"
                │
                ▼
             LLM (Flowise)
```

### Flow 2: LLM → Chatbot → Angular

```
LLM reads catalog from MCP
  └─> Knows QUERY_UNIT command exists
         │
         ▼
      LLM generates: "[COMMAND]{"type":"QUERY_UNIT",...}[/COMMAND]"
         │
         ▼
      Chatbot (extractCommands)
         └─> Strips [COMMAND] markers
         └─> dispatchEvent('chatbot:command', {type: 'QUERY_UNIT', ...})
                │
                ▼
             Angular Component
                └─> Executes search
```

## Sync Strategy

**Manual sync required**:

1. Add event type to **Angular** TypeScript
2. Add same event type to **Chatbot** `types.ts`
3. Add to **Chatbot** `catalog.json`
4. TypeScript validates catalog matches types (compile-time check)
5. **MCP** fetches updated catalog (runtime)

**No automatic sync** - catalog is manually maintained documentation.

## Interaction Points

### Angular → Chatbot

- **Method**: Browser `CustomEvent`
- **Event Name**: `angular:event`
- **Payload**: `AngularEvent` type (e.g., `UNIT_QUERIED`)

### Chatbot → Angular

- **Method**: Browser `CustomEvent`
- **Event Name**: `chatbot:command`
- **Payload**: `ChatbotCommand` type (e.g., `QUERY_UNIT`)

### MCP → Chatbot

- **Method**: HTTP fetch / git submodule / npm package
- **Resource**: `catalog.json`
- **Serves As**: MCP resource `flowise://event-catalog`

### LLM → MCP

- **Method**: MCP protocol
- **Resource Read**: `flowise://event-catalog`
- **Gets**: Available commands it can generate
