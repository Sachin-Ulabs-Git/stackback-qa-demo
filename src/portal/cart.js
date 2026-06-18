/**
 * Portal Surface — Cart
 * Manages the subscription cart during new purchase and edit flows.
 */

export class SubscriptionCart {
  constructor() {
    this.items = [];
    this.discountCode = null;
  }

  addItem(product, variant, plan, quantity = 1) {
    const existing = this.items.find(
      i => i.variantId === variant.id && i.planId === plan.id
    );

    if (existing) {
      existing.quantity += quantity;
    } else {
      this.items.push({
        productId: product.id,
        variantId: variant.id,
        planId: plan.id,
        title: product.title,
        variantTitle: variant.title,
        price: variant.price,
        quantity,
      });
    }
  }

  removeItem(variantId, planId) {
    this.items = this.items.filter(
      i => !(i.variantId === variantId && i.planId === planId)
    );
  }

  updateQuantity(variantId, planId, quantity) {
    const item = this.items.find(
      i => i.variantId === variantId && i.planId === planId
    );
    if (item) {
      item.quantity = Math.max(1, quantity);
    }
  }

  applyDiscount(code) {
    this.discountCode = code;
  }

  // BUG: During an edit flow, adding a product triggers cart transform
  // which fails if the subscription is in a locked state (e.g. order processing)
  async transform(subscriptionId) {
    const res = await fetch(`/api/cart/transform`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionId,
        items: this.items,
        discountCode: this.discountCode,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Cart transform failed');
    }

    return res.json();
  }

  get total() {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  get itemCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  clear() {
    this.items = [];
    this.discountCode = null;
  }
}
