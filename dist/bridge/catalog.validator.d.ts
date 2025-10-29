/**
 * Validates catalog.json against TypeScript types
 *
 * This file will show TypeScript errors if catalog.json is out of sync with types.ts
 * Run `yarn build` to validate.
 */
export declare const CATALOG: {
    version: string;
    incomingEvents: {
        type: string;
        description: string;
        parameters: {
            searchTerm: {
                type: string;
                description: string;
            };
            searchType: {
                type: string;
                enum: string[];
                description: string;
            };
        };
    }[];
    availableCommands: {
        type: string;
        description: string;
        when: string;
        parameters: {
            searchTerm: {
                type: string;
                description: string;
                required: boolean;
            };
            searchType: {
                type: string;
                enum: string[];
                description: string;
                required: boolean;
            };
        };
        example: {
            type: string;
            searchTerm: string;
            searchType: string;
        };
    }[];
    usage: {
        format: string;
        rules: string[];
    };
};
//# sourceMappingURL=catalog.validator.d.ts.map