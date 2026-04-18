// State Machine for Order Lifecycle
// Defines explicit states and valid transitions

const ORDER_STATES = {
  CART_READY: 'CART_READY',
  CHECKOUT_VALIDATED: 'CHECKOUT_VALIDATED',
  ORDER_SUBMITTED: 'ORDER_SUBMITTED',
  ORDER_SUCCESS: 'ORDER_SUCCESS',
  ORDER_FAILED: 'ORDER_FAILED',
  ORDER_INCONSISTENT: 'ORDER_INCONSISTENT',
  ROLLED_BACK: 'ROLLED_BACK',
};

const VALID_TRANSITIONS = {
  [ORDER_STATES.CART_READY]: [
    ORDER_STATES.CHECKOUT_VALIDATED,
  ],
  [ORDER_STATES.CHECKOUT_VALIDATED]: [
    ORDER_STATES.ORDER_SUBMITTED,
    ORDER_STATES.CART_READY, // Back to cart
  ],
  [ORDER_STATES.ORDER_SUBMITTED]: [
    ORDER_STATES.ORDER_SUCCESS,
    ORDER_STATES.ORDER_FAILED,
    ORDER_STATES.ORDER_INCONSISTENT,
  ],
  [ORDER_STATES.ORDER_FAILED]: [
    ORDER_STATES.ROLLED_BACK,
    ORDER_STATES.CHECKOUT_VALIDATED, // Retry checkout
  ],
  [ORDER_STATES.ORDER_INCONSISTENT]: [
    ORDER_STATES.ROLLED_BACK,
    ORDER_STATES.CHECKOUT_VALIDATED, // Retry checkout
  ],
  [ORDER_STATES.ROLLED_BACK]: [
    ORDER_STATES.CART_READY,
  ],
  [ORDER_STATES.ORDER_SUCCESS]: [
    // Terminal state - no transitions
  ],
};

class StateMachine {
  constructor(initialState = ORDER_STATES.CART_READY) {
    this.currentState = initialState;
    this.history = [
      {
        state: initialState,
        timestamp: new Date().toISOString(),
        reason: 'Initialized',
      },
    ];
    this.listeners = [];
  }

  canTransition(toState) {
    const validStates = VALID_TRANSITIONS[this.currentState] || [];
    return validStates.includes(toState);
  }

  transition(toState, reason = 'Manual transition') {
    if (!this.canTransition(toState)) {
      const error = new Error(
        `Invalid transition from ${this.currentState} to ${toState}. Reason: ${reason}`
      );
      error.code = 'INVALID_TRANSITION';
      throw error;
    }

    const previousState = this.currentState;
    this.currentState = toState;

    const historyEntry = {
      from: previousState,
      to: toState,
      timestamp: new Date().toISOString(),
      reason,
    };

    this.history.push(historyEntry);
    this.notifyListeners(historyEntry);

    return historyEntry;
  }
// add listener support for external components to react to state changes
// it returns an unsubscribe function to allow cleanup when listener
//  is no longer needed
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
// notify all listeners of a state change 
// with the history->entry of that change
  notifyListeners(entry) {
    this.listeners.forEach(listener => listener(entry));
  }

  getState() {
    return this.currentState;
  }

  getHistory() {
    return this.history;
  }

  isTerminalState() {
    return ORDER_STATES.ORDER_SUCCESS === this.currentState;
  }

  reset() {
    this.currentState = ORDER_STATES.CART_READY;
    this.history = [
      {
        state: ORDER_STATES.CART_READY,
        timestamp: new Date().toISOString(),
        reason: 'Reset',
      },
    ];
  }
}

export { ORDER_STATES, StateMachine, VALID_TRANSITIONS };
