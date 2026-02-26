// Conversation state machine management

import { ConversationState, ConversationContext, Message, Language } from '../../types';
import { createLogger } from '../../utils/logger';
import { JanSevaError, ErrorCodes } from '../../utils/errors';

const logger = createLogger('StateManager');

// Valid state transitions
const stateTransitions: Record<ConversationState, ConversationState[]> = {
  [ConversationState.INITIATED]: [ConversationState.LANGUAGE_SELECTED],
  [ConversationState.LANGUAGE_SELECTED]: [ConversationState.COLLECTING_PROFILE, ConversationState.SHOWING_SCHEMES],
  [ConversationState.COLLECTING_PROFILE]: [ConversationState.SHOWING_SCHEMES, ConversationState.COLLECTING_PROFILE],
  [ConversationState.SHOWING_SCHEMES]: [ConversationState.FILLING_FORM, ConversationState.PROVIDING_LOCATION, ConversationState.COLLECTING_PROFILE],
  [ConversationState.FILLING_FORM]: [ConversationState.PROVIDING_LOCATION, ConversationState.COMPLETED, ConversationState.FILLING_FORM],
  [ConversationState.PROVIDING_LOCATION]: [ConversationState.COMPLETED, ConversationState.FILLING_FORM],
  [ConversationState.COMPLETED]: [ConversationState.INITIATED],
  [ConversationState.ERROR]: [ConversationState.INITIATED],
};

export function transitionState(
  currentState: ConversationState,
  targetState: ConversationState
): ConversationState {
  const validTransitions = stateTransitions[currentState];
  
  if (!validTransitions.includes(targetState)) {
    logger.warn('Invalid state transition attempted', { currentState, targetState });
    throw new JanSevaError(
      ErrorCodes.CONV_INVALID_STATE,
      `Cannot transition from ${currentState} to ${targetState}`,
      false,
      { currentState, targetState }
    );
  }
  
  logger.info('State transition', { from: currentState, to: targetState });
  return targetState;
}

export function addMessageToContext(
  context: ConversationContext,
  role: 'user' | 'assistant',
  content: string,
  language: Language
): ConversationContext {
  const message: Message = {
    role,
    content,
    timestamp: Date.now(),
    language,
  };
  
  const updatedHistory = [...context.conversationHistory, message];
  
  // Keep only last 20 messages to manage context size
  const trimmedHistory = updatedHistory.slice(-20);
  
  return {
    ...context,
    conversationHistory: trimmedHistory,
  };
}

export function getNextState(
  currentState: ConversationState,
  intent: string,
  context: ConversationContext
): ConversationState {
  switch (currentState) {
    case ConversationState.INITIATED:
      return ConversationState.LANGUAGE_SELECTED;
      
    case ConversationState.LANGUAGE_SELECTED:
      return ConversationState.COLLECTING_PROFILE;
      
    case ConversationState.COLLECTING_PROFILE:
      if (hasCompleteProfile(context)) {
        return ConversationState.SHOWING_SCHEMES;
      }
      return ConversationState.COLLECTING_PROFILE;
      
    case ConversationState.SHOWING_SCHEMES:
      if (intent === 'apply_for_scheme' || intent === 'fill_form') {
        return ConversationState.FILLING_FORM;
      }
      if (intent === 'find_location') {
        return ConversationState.PROVIDING_LOCATION;
      }
      return ConversationState.SHOWING_SCHEMES;
      
    case ConversationState.FILLING_FORM:
      if (intent === 'find_location') {
        return ConversationState.PROVIDING_LOCATION;
      }
      if (isFormComplete(context)) {
        return ConversationState.COMPLETED;
      }
      return ConversationState.FILLING_FORM;
      
    case ConversationState.PROVIDING_LOCATION:
      return ConversationState.COMPLETED;
      
    case ConversationState.COMPLETED:
      return ConversationState.INITIATED;
      
    case ConversationState.ERROR:
      return ConversationState.INITIATED;
      
    default:
      return currentState;
  }
}

function hasCompleteProfile(context: ConversationContext): boolean {
  const profile = context.userProfile;
  if (!profile) return false;
  
  // Minimum required fields
  return !!(profile.state && profile.age);
}

function isFormComplete(context: ConversationContext): boolean {
  if (!context.formProgress) return false;
  
  const completionPercentage = Object.keys(context.formProgress).length;
  return completionPercentage >= 80; // 80% completion threshold
}

export function resetContext(): ConversationContext {
  return {
    conversationHistory: [],
  };
}
