import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CART_ITEM_EXISTS,
  CART_ITEM_EXISTS_MESSAGE,
  cartAddFeedback,
  duplicateCartAdd,
} from './cartItems.mjs';

const state = (overrides = {}) => ({
  cartId: 'Tel-1',
  cart: [],
  addingProductIds: [],
  ...overrides,
});

test('duplicate guard blocks an existing line without changing its quantity', () => {
  const cart = state({ cart: [{ productId: 'phone-1', quantity: 3 }] });
  const duplicate = duplicateCartAdd(cart, 'phone-1', 'Tel-1');
  assert.equal(duplicate.code, CART_ITEM_EXISTS);
  assert.equal(duplicate.message, CART_ITEM_EXISTS_MESSAGE);
  assert.equal(cart.cart[0].quantity, 3);
});

test('duplicate guard closes the same-tick race while the first add is pending', () => {
  const duplicate = duplicateCartAdd(state({ addingProductIds: ['phone-1'] }), 'phone-1', 'Tel-1');
  assert.equal(duplicate.code, CART_ITEM_EXISTS);
  assert.deepEqual(cartAddFeedback(duplicate), { message: CART_ITEM_EXISTS_MESSAGE, type: 'info' });
});

test('duplicate guard is scoped to the active cart and product', () => {
  const cart = state({ cart: [{ productId: 'phone-1', quantity: 1 }], addingProductIds: ['phone-2'] });
  assert.equal(duplicateCartAdd(cart, 'phone-1', 'Tel-other'), null);
  assert.equal(duplicateCartAdd(cart, 'phone-3', 'Tel-1'), null);
  assert.equal(duplicateCartAdd(cart, '', 'Tel-1'), null);
});

test('non-duplicate add failures remain errors', () => {
  assert.deepEqual(cartAddFeedback(new Error('Network unavailable')), {
    message: 'Network unavailable', type: 'error',
  });
});
