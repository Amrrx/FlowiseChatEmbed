/**
 * Angular Bridge Type Definitions
 *
 * Defines the contract between Angular and React chatbot for event communication.
 */
/**
 * Events: Angular → Chatbot
 */
/**
 * Event published when user queries a unit in Angular rightbar
 */
export type UnitQueriedEvent = {
    type: 'UNIT_QUERIED';
    searchTerm: string;
    searchType: string;
};
/**
 * Union type of all events Angular can publish
 */
export type AngularEvent = UnitQueriedEvent;
/**
 * Commands: Chatbot → Angular
 */
/**
 * Command to trigger a unit search in Angular
 */
export type QueryUnitCommand = {
    type: 'QUERY_UNIT';
    searchTerm: string;
    searchType: string;
};
/**
 * Union type of all commands Chatbot can send to Angular
 */
export type ChatbotCommand = QueryUnitCommand;
//# sourceMappingURL=types.d.ts.map