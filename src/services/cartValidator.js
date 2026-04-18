import { auditLog } from './auditLog';

// Cart validation and tampering detection

export const cartValidator = {
  // Capture a trusted baseline when an item enters the cart
  createBaselineSnapshot: (product) => {
    const baselinePrice = Number(product.price) || 0;

    return {
      version: 1,
      timestamp: new Date().toISOString(),
      productId: product.id,
      title: product.title,
      baselinePrice,
      checksum: calculateBaselineChecksum({
        productId: product.id,
        title: product.title,
        baselinePrice,
      }),
    };
  },

  // Compare mutable cart prices against the trusted baseline snapshot
  verifyPriceIntegrity: (cartItems) => {
    const priceMismatches = [];

    cartItems.forEach((item) => {
      const baselineSnapshot = item.baselineSnapshot;

      if (!baselineSnapshot) {
        priceMismatches.push({
          itemId: item.id,
          title: item.title,
          reason: 'Missing baseline snapshot',
        });
        return;
      }

      const baselinePrice = Number(baselineSnapshot.baselinePrice);
      const baselineProductId = baselineSnapshot.productId ?? item.id;
      const baselineTitle = baselineSnapshot.title ?? item.title ?? '';

      if (!baselineSnapshot.checksum) {
        priceMismatches.push({
          itemId: item.id,
          title: item.title,
          reason: 'Missing baseline checksum',
        });
        return;
      }

      if (!Number.isFinite(baselinePrice)) {
        priceMismatches.push({
          itemId: item.id,
          title: item.title,
          reason: 'Invalid baseline price in snapshot',
          baselinePrice,
        });
        return;
      }

      const recomputedBaselineChecksum = calculateBaselineChecksum({
        productId: baselineProductId,
        title: baselineTitle,
        baselinePrice,
      });

      if (recomputedBaselineChecksum !== baselineSnapshot.checksum) {
        priceMismatches.push({
          itemId: item.id,
          title: item.title,
          reason: 'Baseline snapshot checksum mismatch',
          expectedChecksum: recomputedBaselineChecksum,
          storedChecksum: baselineSnapshot.checksum,
        });
        return;
      }

      const currentChecksum = calculateBaselineChecksum({
        productId: item.id,
        title: item.title ?? '',
        baselinePrice: Number(item.price) || 0,
      });

      if (currentChecksum !== baselineSnapshot.checksum) {
        priceMismatches.push({
          itemId: item.id,
          title: item.title,
          reason: 'Current cart item checksum mismatch against baseline',
          currentPrice: Number(item.price) || 0,
          baselinePrice,
          difference: (Number(item.price) || 0) - baselinePrice,
          expectedChecksum: baselineSnapshot.checksum,
          currentChecksum,
        });
      }
    });

    if (priceMismatches.length > 0) {
      auditLog('PRICE_BASELINE_MISMATCH', {
        itemCount: priceMismatches.length,
        mismatches: priceMismatches,
      });

      return {
        valid: false,
        reason: 'Price mismatch detected against trusted baseline snapshot',
        mismatches: priceMismatches,
      };
    }

    return { valid: true };
  },

  // Compare stale cart metadata against a fresh catalog snapshot
  verifyFreshCatalogConsistency: (cartItems, freshSnapshotItems) => {
    const changes = [];
    const freshMap = new Map(
      (freshSnapshotItems || []).map((item) => [String(item.cartItemId), item])
    );

    cartItems.forEach((cartItem) => {
      const cartItemKey = String(cartItem.id);
      const historic = cartItem.productSnapshot || {
        productId: cartItem.id,
        title: cartItem.title,
        category: cartItem.category || null,
        variant: 'default',
        price: Number(cartItem.baselineSnapshot?.baselinePrice ?? cartItem.price) || 0,
        stock: Number(cartItem.stock ?? 0),
      };

      const fresh = freshMap.get(cartItemKey);

      if (!fresh || fresh.isRemoved) {
        changes.push({
          type: 'product_removed',
          itemId: cartItem.id,
          title: historic.title,
          reason: fresh?.reason || 'Product missing in fresh catalog snapshot',
        });
        return;
      }

      if ((Number(historic.price) || 0) !== (Number(fresh.price) || 0)) {
        changes.push({
          type: 'price_changed',
          itemId: cartItem.id,
          title: historic.title,
          oldPrice: Number(historic.price) || 0,
          newPrice: Number(fresh.price) || 0,
        });
      }

      const oldStock = Number(historic.stock);
      const newStock = Number(fresh.stock);
      if (Number.isFinite(oldStock) && Number.isFinite(newStock) && oldStock !== newStock) {
        changes.push({
          type: 'stock_changed',
          itemId: cartItem.id,
          title: historic.title,
          oldStock,
          newStock,
        });
      }
    });

    if (changes.length > 0) {
      auditLog('STALE_CART_DETECTED', {
        changeCount: changes.length,
        changes,
      });

      return {
        valid: false,
        reason: 'Cart no longer matches refreshed product snapshot',
        changes,
      };
    }

    return { valid: true };
  },

  // Validate cart is not empty
  validateCartNotEmpty: (cartItems) => {
    if (!cartItems || cartItems.length === 0) {
      auditLog('EMPTY_CART_VALIDATION', {
        reason: 'Cannot checkout with empty cart',
      });
      return {
        valid: false,
        reason: 'Cart is empty',
      };
    }
    return { valid: true };
  },

  // Validate all items in cart
  validateCartItems: (cartItems) => {
    const errors = [];

    cartItems.forEach((item) => {
      if (!item.id || !item.quantity || !item.price) {
        errors.push({
          itemId: item.id,
          error: 'Missing required fields (id, quantity, price)',
        });
      }

      if (item.quantity < 1 || item.quantity > 999) {
        errors.push({
          itemId: item.id,
          error: 'Invalid quantity',
        });
      }

      if (item.price < 0) {
        errors.push({
          itemId: item.id,
          error: 'Invalid price (negative)',
        });
      }
    });

    if (errors.length > 0) {
      auditLog('CART_ITEM_VALIDATION_FAILED', { errors });
      return { valid: false, errors };
    }

    return { valid: true };
  },
};

// Calculate checksum for baseline snapshots
function calculateBaselineChecksum(snapshot) {
  const raw = `${snapshot.productId}:${snapshot.title}:${Number(snapshot.baselinePrice).toFixed(2)}`;
  return simpleHash(raw);
}

// Simple hash function for checksum
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export default cartValidator;
