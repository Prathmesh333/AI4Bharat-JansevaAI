// Tests for conversation state manager

import { transitionState, addMessageToContext, getNextState, resetContext } from '../../../src/services/conversation/stateManager';
import { ConversationState, Language, ConversationContext } from '../../../src/types';
import { JanSevaError } from '../../../src/utils/errors';

describe('State Manager', () => {
  describe('transitionState', () => {
    it('should allow valid state transitions', () => {
      const newState = transitionState(
        ConversationState.INITIATED,
        ConversationState.LANGUAGE_SELECTED
      );
      expect(newState).toBe(ConversationState.LANGUAGE_SELECTED);
    });

    it('should throw error for invalid state transitions', () => {
      expect(() => {
        transitionState(ConversationState.INITIATED, ConversationState.COMPLETED);
      }).toThrow(JanSevaError);
    });

    it('should allow profile collection after language selection', () => {
      const newState = transitionState(
        ConversationState.LANGUAGE_SELECTED,
        ConversationState.COLLECTING_PROFILE
      );
      expect(newState).toBe(ConversationState.COLLECTING_PROFILE);
    });

    it('should allow showing schemes after profile collection', () => {
      const newState = transitionState(
        ConversationState.COLLECTING_PROFILE,
        ConversationState.SHOWING_SCHEMES
      );
      expect(newState).toBe(ConversationState.SHOWING_SCHEMES);
    });

    it('should allow form filling from showing schemes', () => {
      const newState = transitionState(
        ConversationState.SHOWING_SCHEMES,
        ConversationState.FILLING_FORM
      );
      expect(newState).toBe(ConversationState.FILLING_FORM);
    });
  });

  describe('addMessageToContext', () => {
    it('should add user message to context', () => {
      const context: ConversationContext = { conversationHistory: [] };
      const updated = addMessageToContext(context, 'user', 'Hello', Language.ENGLISH);
      
      expect(updated.conversationHistory).toHaveLength(1);
      expect(updated.conversationHistory[0].role).toBe('user');
      expect(updated.conversationHistory[0].content).toBe('Hello');
      expect(updated.conversationHistory[0].language).toBe(Language.ENGLISH);
    });

    it('should add assistant message to context', () => {
      const context: ConversationContext = { conversationHistory: [] };
      const updated = addMessageToContext(context, 'assistant', 'Hi there', Language.HINDI);
      
      expect(updated.conversationHistory).toHaveLength(1);
      expect(updated.conversationHistory[0].role).toBe('assistant');
      expect(updated.conversationHistory[0].content).toBe('Hi there');
    });

    it('should maintain conversation order', () => {
      let context: ConversationContext = { conversationHistory: [] };
      context = addMessageToContext(context, 'user', 'Message 1', Language.ENGLISH);
      context = addMessageToContext(context, 'assistant', 'Message 2', Language.ENGLISH);
      context = addMessageToContext(context, 'user', 'Message 3', Language.ENGLISH);
      
      expect(context.conversationHistory).toHaveLength(3);
      expect(context.conversationHistory[0].content).toBe('Message 1');
      expect(context.conversationHistory[1].content).toBe('Message 2');
      expect(context.conversationHistory[2].content).toBe('Message 3');
    });

    it('should trim history to last 20 messages', () => {
      let context: ConversationContext = { conversationHistory: [] };
      
      // Add 25 messages
      for (let i = 0; i < 25; i++) {
        context = addMessageToContext(context, 'user', `Message ${i}`, Language.ENGLISH);
      }
      
      expect(context.conversationHistory).toHaveLength(20);
      expect(context.conversationHistory[0].content).toBe('Message 5');
      expect(context.conversationHistory[19].content).toBe('Message 24');
    });

    it('should include timestamp in messages', () => {
      const context: ConversationContext = { conversationHistory: [] };
      const before = Date.now();
      const updated = addMessageToContext(context, 'user', 'Test', Language.ENGLISH);
      const after = Date.now();
      
      expect(updated.conversationHistory[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(updated.conversationHistory[0].timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('getNextState', () => {
    it('should move from INITIATED to LANGUAGE_SELECTED', () => {
      const context: ConversationContext = { conversationHistory: [] };
      const nextState = getNextState(ConversationState.INITIATED, 'general_inquiry', context);
      expect(nextState).toBe(ConversationState.LANGUAGE_SELECTED);
    });

    it('should move from LANGUAGE_SELECTED to COLLECTING_PROFILE', () => {
      const context: ConversationContext = { conversationHistory: [] };
      const nextState = getNextState(ConversationState.LANGUAGE_SELECTED, 'general_inquiry', context);
      expect(nextState).toBe(ConversationState.COLLECTING_PROFILE);
    });

    it('should stay in COLLECTING_PROFILE if profile incomplete', () => {
      const context: ConversationContext = {
        conversationHistory: [],
        userProfile: { state: 'Maharashtra' }, // Missing age
      };
      const nextState = getNextState(ConversationState.COLLECTING_PROFILE, 'general_inquiry', context);
      expect(nextState).toBe(ConversationState.COLLECTING_PROFILE);
    });

    it('should move to SHOWING_SCHEMES when profile complete', () => {
      const context: ConversationContext = {
        conversationHistory: [],
        userProfile: { state: 'Maharashtra', age: 30 },
      };
      const nextState = getNextState(ConversationState.COLLECTING_PROFILE, 'general_inquiry', context);
      expect(nextState).toBe(ConversationState.SHOWING_SCHEMES);
    });

    it('should move to FILLING_FORM on apply intent', () => {
      const context: ConversationContext = { conversationHistory: [] };
      const nextState = getNextState(ConversationState.SHOWING_SCHEMES, 'apply_for_scheme', context);
      expect(nextState).toBe(ConversationState.FILLING_FORM);
    });

    it('should move to PROVIDING_LOCATION on find_location intent', () => {
      const context: ConversationContext = { conversationHistory: [] };
      const nextState = getNextState(ConversationState.SHOWING_SCHEMES, 'find_location', context);
      expect(nextState).toBe(ConversationState.PROVIDING_LOCATION);
    });
  });

  describe('resetContext', () => {
    it('should return empty context', () => {
      const context = resetContext();
      expect(context.conversationHistory).toEqual([]);
      expect(context.currentIntent).toBeUndefined();
      expect(context.userProfile).toBeUndefined();
    });
  });
});
