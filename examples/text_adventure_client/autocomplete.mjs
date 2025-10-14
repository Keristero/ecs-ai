/**
 * Dynamic autocomplete system for enhanced actions with entity validation
 */

import { getEntitySuggestions, getValueSuggestions, parseActionInput, getEntityIdByName } from './entity_helpers.mjs';

export class AutocompleteSystem {
    constructor(elements, state) {
        this.elements = elements;
        this.state = state;
        this.currentSuggestions = [];
        this.selectedIndex = -1;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.elements.terminal_input.addEventListener('input', (e) => {
            this.handleInput(e);
        });
        
        this.elements.terminal_input.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });
        
        // Hide autocomplete when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.elements.terminal_input.contains(e.target) && 
                !this.elements.autocomplete.contains(e.target)) {
                this.hideAutocomplete();
            }
        });
    }
    
    handleInput(e) {
        const input = e.target.value;
        this.updateAutocomplete(input);
    }
    
    handleKeydown(e) {
        if (!this.isAutocompleteVisible()) return;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectNext();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectPrevious();
                break;
            case 'Tab':
                e.preventDefault();
                if (this.selectedIndex >= 0) {
                    this.acceptSuggestion();
                } else if (this.currentSuggestions.length > 0) {
                    // Auto-select first suggestion and accept it
                    this.selectedIndex = 0;
                    this.acceptSuggestion();
                }
                break;
            case 'Enter':
                if (this.selectedIndex >= 0) {
                    e.preventDefault();
                    this.acceptSuggestion();
                }
                break;
            case 'Escape':
                e.preventDefault();
                this.hideAutocomplete();
                break;
        }
    }
    
    updateAutocomplete(input) {
        if (!input.trim()) {
            this.hideAutocomplete();
            return;
        }
        
        const suggestions = this.generateSuggestions(input);
        this.showSuggestions(suggestions);
    }
    
    generateSuggestions(input) {
        const parts = input.trim().split(/\s+/);
        const actionName = parts[0];
        
        // If we're still typing the action name
        if (parts.length === 1) {
            return this.getActionSuggestions(actionName);
        }
        
        // We're typing arguments for an action
        const action = this.findAction(actionName);
        if (!action) return [];
        
        return this.getArgumentSuggestions(action, parts);
    }
    
    getActionSuggestions(input) {
        const suggestions = [];
        const lowerInput = input.toLowerCase();
        
        for (const [key, action] of Object.entries(this.state.actions)) {
            // Check action name
            if (action.name.toLowerCase().includes(lowerInput)) {
                suggestions.push({
                    type: 'action',
                    value: action.name,
                    displayName: action.name,
                    description: action.description
                });
            }
            
            // Check aliases
            if (action.aliases) {
                for (const alias of action.aliases) {
                    if (alias.toLowerCase().includes(lowerInput)) {
                        suggestions.push({
                            type: 'action',
                            value: alias,
                            displayName: `${alias} (${action.name})`,
                            description: action.description
                        });
                    }
                }
            }
        }
        
        return suggestions.sort((a, b) => a.displayName.localeCompare(b.displayName));
    }
    
    getArgumentSuggestions(action, inputParts) {
        const argValues = inputParts.slice(1);
        
        // Since Zod schemas get serialized over WebSocket, we can't access .shape directly
        // Instead, use entityValidation to determine what arguments are expected
        const entityValidation = action.options?.entityValidation || {};
        const argNames = Object.keys(entityValidation).filter(name => 
            name !== 'actor_eid' && name !== 'room_eid' // These are auto-filled
        );
        
        if (argValues.length === 0 || argValues.length > argNames.length) {
            return [];
        }
        
        const currentArgIndex = argValues.length - 1;
        const currentArgName = argNames[currentArgIndex];
        const currentInput = argValues[currentArgIndex] || '';
        
        // Build current arguments for validation context
        const currentArgs = { actor_eid: this.state.player_eid };
        
        // Add room_eid if the action includes actor room
        if (action.options?.includeActorRoom) {
            currentArgs.room_eid = this.state.current_room_eid;
        }
        
        for (let i = 0; i < currentArgIndex; i++) {
            if (i < argNames.length) {
                const argName = argNames[i];
                const argValue = argValues[i];
                
                // Convert entity names to IDs if needed
                if (argName.endsWith('_eid') && argName !== 'actor_eid' && argName !== 'room_eid') {
                    const numericValue = parseInt(argValue);
                    if (!isNaN(numericValue)) {
                        currentArgs[argName] = numericValue;
                    } else {
                        const entityId = getEntityIdByName(this.state.room, argValue);
                        if (entityId !== null) {
                            currentArgs[argName] = entityId;
                        }
                    }
                } else {
                    currentArgs[argName] = argValue;
                }
            }
        }
        
        // Check if this is an entity argument by name pattern (any argument ending in _eid except actor_eid and room_eid)
        if (currentArgName && currentArgName.endsWith('_eid') && currentArgName !== 'actor_eid' && currentArgName !== 'room_eid') {
            
            // This is an entity argument, get entity suggestions
            const inventory = this.state.room[this.state.player_eid]?.Has || {};
            const entitySuggestions = getEntitySuggestions(
                this.state.room,
                inventory,
                action.options?.entityValidation,
                currentArgName,
                currentArgs,
                currentInput
            );
            
            return entitySuggestions.map(suggestion => ({
                type: 'entity',
                value: suggestion.displayName,
                displayName: suggestion.displayName,
                description: `Entity ID: ${suggestion.eid}`,
                eid: suggestion.eid
            }));
        }
        
        // Check if this argument has relationValues validation (for string arguments like direction)
        const argValidation = action.options?.entityValidation?.[currentArgName];
        if (currentArgName && argValidation && argValidation.relationValues) {
            
            // This is a string argument with relation value validation
            const inventory = this.state.room[this.state.player_eid]?.Has || {};
            
            // For room-based relation validation, we need to pass room_data directly
            const entitiesForValidation = { ...this.state.room };
            if (this.state.current_room_eid && this.state.room_data) {
                entitiesForValidation[this.state.current_room_eid] = this.state.room_data;
            }
            
            const valueSuggestions = getValueSuggestions(
                entitiesForValidation,
                inventory,
                action.options?.entityValidation,
                currentArgName,
                currentArgs,
                currentInput
            );
            
            return valueSuggestions.map(suggestion => ({
                type: 'value',
                value: suggestion.value,
                displayName: suggestion.displayName,
                description: `Direction: ${suggestion.value}`,
                eid: null
            }));
        }
        
        // For other non-entity arguments, return empty array
        return [];
    }
    
    findAction(actionName) {
        // Look for exact match first
        if (this.state.actions[actionName]) {
            return this.state.actions[actionName];
        }
        
        // Look for action by name or alias
        for (const action of Object.values(this.state.actions)) {
            if (action.name === actionName) {
                return action;
            }
            if (action.aliases && action.aliases.includes(actionName)) {
                return action;
            }
        }
        
        return null;
    }
    
    showSuggestions(suggestions) {
        this.currentSuggestions = suggestions;
        this.selectedIndex = -1;
        
        if (suggestions.length === 0) {
            this.hideAutocomplete();
            return;
        }
        
        this.elements.autocomplete.innerHTML = '';
        
        for (let i = 0; i < Math.min(suggestions.length, 10); i++) {
            const suggestion = suggestions[i];
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            div.innerHTML = `
                <div class="autocomplete-main">${suggestion.displayName}</div>
                <div class="autocomplete-desc">${suggestion.description || ''}</div>
            `;
            
            div.addEventListener('click', () => {
                this.selectedIndex = i;
                this.acceptSuggestion();
            });
            
            this.elements.autocomplete.appendChild(div);
        }
        
        this.elements.autocomplete.style.display = 'block';
    }
    
    hideAutocomplete() {
        this.elements.autocomplete.style.display = 'none';
        this.currentSuggestions = [];
        this.selectedIndex = -1;
    }
    
    selectNext() {
        if (this.currentSuggestions.length === 0) return;
        
        this.selectedIndex = (this.selectedIndex + 1) % this.currentSuggestions.length;
        this.updateSelectedVisual();
    }
    
    selectPrevious() {
        if (this.currentSuggestions.length === 0) return;
        
        this.selectedIndex = this.selectedIndex <= 0 
            ? this.currentSuggestions.length - 1 
            : this.selectedIndex - 1;
        this.updateSelectedVisual();
    }
    
    updateSelectedVisual() {
        const items = this.elements.autocomplete.querySelectorAll('.autocomplete-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });
    }
    
    acceptSuggestion() {
        if (this.selectedIndex < 0 || this.selectedIndex >= this.currentSuggestions.length) {
            return;
        }
        
        const suggestion = this.currentSuggestions[this.selectedIndex];
        const currentInput = this.elements.terminal_input.value;
        const parts = currentInput.trim().split(/\s+/);
        
        if (suggestion.type === 'action') {
            // Replace action name
            this.elements.terminal_input.value = suggestion.value + ' ';
        } else if (suggestion.type === 'entity') {
            // Replace the last argument
            parts[parts.length - 1] = suggestion.value;
            this.elements.terminal_input.value = parts.join(' ') + ' ';
        }
        
        this.hideAutocomplete();
        this.elements.terminal_input.focus();
        
        // Move cursor to end
        const input = this.elements.terminal_input;
        input.setSelectionRange(input.value.length, input.value.length);
    }
    
    isAutocompleteVisible() {
        return this.elements.autocomplete.style.display === 'block';
    }
}

export default AutocompleteSystem;