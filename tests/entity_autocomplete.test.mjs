import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getValidEntitiesForArgument, getEntitySuggestions } from '../examples/text_adventure_client/entity_helpers.mjs';

describe('Entity Autocomplete Tests', () => {
    
    // Mock entity data that matches the structure from look command
    const mockEntities = {
        '10': {
            Name: { value: 'RustySword' },
            Description: { value: 'An old rusty sword' },
            Item: {}, // Has Item component - should be valid for pickup
            Usable: { uses: 10 }
        },
        '17': {
            Name: { value: 'Player' },
            Description: { value: 'A brave adventurer' },
            Actor: {},
            Player: {},
            Attributes: { strength: 10 }
            // No Item component - should be invalid for pickup
        },
        '25': {
            Name: { value: 'HealthPotion' },
            Description: { value: 'A red healing potion' },
            Item: {}, // Has Item component - should be valid for pickup
            Usable: { uses: 1 }
        }
    };

    // Mock validation rules from pickup action
    const pickupValidation = {
        components: ['Item'],
        isTargetOf: [{
            relation: 'Has',
            source: 'room_eid'
        }]
    };

    describe('getValidEntitiesForArgument', () => {
        
        it('should return entities that have required Item component', () => {
            const validIds = getValidEntitiesForArgument(mockEntities, 'target_eid', pickupValidation);
            
            // Should include entities 10 and 25 (both have Item component)
            // Should exclude entity 17 (no Item component)
            assert.deepStrictEqual(validIds.sort(), ['10', '25']);
        });

        it('should return all entities when no validation rules provided', () => {
            const validIds = getValidEntitiesForArgument(mockEntities, 'target_eid', null);
            
            assert.deepStrictEqual(validIds.sort(), ['10', '17', '25']);
        });

        it('should return empty array when no entities provided', () => {
            const validIds = getValidEntitiesForArgument({}, 'target_eid', pickupValidation);
            
            assert.deepStrictEqual(validIds, []);
        });

        it('should handle entities without required components', () => {
            const entitiesWithoutItem = {
                '20': {
                    Name: { value: 'Wall' },
                    Description: { value: 'A stone wall' },
                    Landmark: {}
                    // No Item component
                }
            };
            
            const validIds = getValidEntitiesForArgument(entitiesWithoutItem, 'target_eid', pickupValidation);
            
            assert.deepStrictEqual(validIds, []);
        });
    });

    describe('getEntitySuggestions', () => {
        
        it('should return suggestions for valid entities only', () => {
            const mockValidation = {
                target_eid: pickupValidation
            };
            
            const suggestions = getEntitySuggestions(mockEntities, mockValidation, 'target_eid', {}, '');
            
            // Should get suggestions for RustySword and HealthPotion only
            assert.strictEqual(suggestions.length, 2);
            
            const names = suggestions.map(s => s.displayName).sort();
            assert.deepStrictEqual(names, ['HealthPotion', 'RustySword']);
        });

        it('should filter suggestions by input text', () => {
            const mockValidation = {
                target_eid: pickupValidation
            };
            
            const suggestions = getEntitySuggestions(mockEntities, mockValidation, 'target_eid', {}, 'rust');
            
            // Should only return RustySword (matches "rust")
            assert.strictEqual(suggestions.length, 1);
            assert.strictEqual(suggestions[0].displayName, 'RustySword');
        });

        it('should return helpful message when no entities available', () => {
            const mockValidation = {
                target_eid: pickupValidation
            };
            
            const suggestions = getEntitySuggestions({}, mockValidation, 'target_eid', {}, '');
            
            assert.strictEqual(suggestions.length, 1);
            assert.strictEqual(suggestions[0].displayName, '(perform "look" command first)');
        });

        it('should handle case insensitive filtering', () => {
            const mockValidation = {
                target_eid: pickupValidation
            };
            
            const suggestions = getEntitySuggestions(mockEntities, mockValidation, 'target_eid', {}, 'HEALTH');
            
            assert.strictEqual(suggestions.length, 1);
            assert.strictEqual(suggestions[0].displayName, 'HealthPotion');
        });

        it('should return all valid entities when no input filter', () => {
            const mockValidation = {
                target_eid: pickupValidation
            };
            
            const suggestions = getEntitySuggestions(mockEntities, mockValidation, 'target_eid', {}, '');
            
            assert.strictEqual(suggestions.length, 2);
            const names = suggestions.map(s => s.displayName).sort();
            assert.deepStrictEqual(names, ['HealthPotion', 'RustySword']);
        });
    });

    describe('Edge Cases', () => {
        
        it('should handle entities with missing Name component', () => {
            const entitiesWithoutNames = {
                '30': {
                    Description: { value: 'A mysterious item' },
                    Item: {}
                    // No Name component
                }
            };
            
            const mockValidation = {
                target_eid: pickupValidation
            };
            
            const suggestions = getEntitySuggestions(entitiesWithoutNames, mockValidation, 'target_eid', {}, '');
            
            assert.strictEqual(suggestions.length, 1);
            // Should use entity ID as fallback when no name
            assert.strictEqual(suggestions[0].displayName, 'Entity 30');
        });

        it('should handle validation rules with no components array', () => {
            const noComponentValidation = {
                isTargetOf: [{
                    relation: 'Has',
                    source: 'room_eid'
                }]
            };
            
            const validIds = getValidEntitiesForArgument(mockEntities, 'target_eid', noComponentValidation);
            
            // Should return all entities since no component requirements
            assert.deepStrictEqual(validIds.sort(), ['10', '17', '25']);
        });
    });
});