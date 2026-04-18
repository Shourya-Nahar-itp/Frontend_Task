// Checkout token management for idempotency and double-click prevention

const TOKEN_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes
const activeTokens = new Map();

export const checkoutToken = {
  // Generate a unique checkout token
  generateToken: () => {
    const token = {
      id: `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      expiresAt: Date.now() + TOKEN_EXPIRY_TIME,
      used: false,
      result: null,
    };

    activeTokens.set(token.id, token);

    // Auto cleanup on expiry
    setTimeout(() => {
      activeTokens.delete(token.id);
    }, TOKEN_EXPIRY_TIME + 1000);

    return token.id;
  },

  // Check if token is valid and not used
  isTokenValid: (tokenId) => {
    const token = activeTokens.get(tokenId);

    if (!token) {
      return { valid: false, reason: 'Token not found' };
    }

    if (token.used) {
      return {
        valid: false,
        reason: 'Token already used (double checkout attempt)',
        previousResult: token.result,
      };
    }

    if (Date.now() > token.expiresAt) {
      activeTokens.delete(tokenId);
      return { valid: false, reason: 'Token expired' };
    }

    return { valid: true };
  },

  // Mark token as used
  useToken: (tokenId, result = null) => {
    const token = activeTokens.get(tokenId);

    if (!token) {
      throw new Error('Token not found');
    }

    token.used = true;
    token.result = result;
    token.usedAt = Date.now();

    return token;
  },

  // Get all active tokens (for debugging)
  getActiveTokens: () => {
    const now = Date.now();
    const tokens = [];

    activeTokens.forEach((token, id) => {
      if (now <= token.expiresAt) {
        tokens.push({
          id,
          createdAt: new Date(token.createdAt).toISOString(),
          expiresAt: new Date(token.expiresAt).toISOString(),
          used: token.used,
        });
      }
    });

    return tokens;
  },

  // Clear all tokens (for testing/reset)
  clearAllTokens: () => {
    activeTokens.clear();
  },
};

// Exporting for testing/debugging purposes
export { activeTokens };

export default checkoutToken;
