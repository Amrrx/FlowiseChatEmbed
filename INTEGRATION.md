# Chatbot Integration Guide

Simple guide to connect your app with the FlowiseChatEmbed chatbot using events.

## Two-Way Communication

- **App → Chatbot**: Send events with data, chatbot responds with AI
- **Chatbot → App**: Chatbot triggers actions in your UI

---

## Sending Events to Chatbot

Your app dispatches browser events. The chatbot receives them and responds.

### Event Format

```typescript
{
  type: 'UNIT_QUERIED',
  searchTerm: string,
  searchType: string
}
```

### Angular Example

```typescript
// In your component
onUnitSearched(unit: Unit) {
    this.eventBus.publish({
        type: 'UNIT_QUERIED',
        searchTerm: unit.plate,
        searchType: 'plate'
    });
}
```

### Vanilla JavaScript

```javascript
window.dispatchEvent(
  new CustomEvent('angular:event', {
    detail: {
      type: 'UNIT_QUERIED',
      searchTerm: 'ABC-123',
      searchType: 'plate',
    },
  }),
);
```

---

## Receiving Commands from Chatbot

The chatbot can trigger actions in your app.

### Command Format

```typescript
{
  type: 'QUERY_UNIT',
  searchTerm: string,
  searchType: string
}
```

### Angular Example

```typescript
// In your component
ngOnInit() {
    const sub = this.eventBus.onCommand('QUERY_UNIT', (cmd) => {
        this.performSearch(cmd.searchTerm, cmd.searchType);
    });
    this.subscriptions.push(sub);
}
```

### Vanilla JavaScript

```javascript
window.addEventListener('chatbot:command', (event) => {
  const command = event.detail;
  if (command.type === 'QUERY_UNIT') {
    performSearch(command.searchTerm, command.searchType);
  }
});
```

---

## Current Event Types

### Events (App → Chatbot)

- `UNIT_QUERIED` - User searched for a unit/vehicle

### Commands (Chatbot → App)

- `QUERY_UNIT` - Trigger a unit search

---

## Testing

Open browser console:

```javascript
// Test sending to chatbot
window.dispatchEvent(
  new CustomEvent('angular:event', {
    detail: { type: 'UNIT_QUERIED', searchTerm: 'TEST-123', searchType: 'plate' },
  }),
);

// Test receiving from chatbot
window.dispatchEvent(
  new CustomEvent('chatbot:command', {
    detail: { type: 'QUERY_UNIT', searchTerm: 'TEST-123', searchType: 'plate' },
  }),
);
```

---

## Adding New Event Types

1. Add type to `src/bridge/types.ts`
2. Add prompt template to `src/bridge/promptTemplates.ts` (for chatbot responses)
3. Use it in your app

That's it!
