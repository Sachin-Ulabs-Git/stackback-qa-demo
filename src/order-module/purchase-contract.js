/**
 * Order Module — Purchase Contract
 * Manages the subscription contract state: active, paused, cancelled.
 */

export class PurchaseContract {
  constructor(data) {
    this.id = data.id;
    this.customerId = data.customerId;
    this.storeId = data.storeId;
    this.status = data.status; // active | paused | cancelled
    this.lines = data.lines || [];
    this.nextOrderDate = data.nextOrderDate;
    this.billingPolicy = data.billingPolicy;
    this.deliveryPolicy = data.deliveryPolicy;
    this.createdAt = data.createdAt;
  }

  isActive() {
    return this.status === 'active';
  }

  isPaused() {
    return this.status === 'paused';
  }

  async pause() {
    if (!this.isActive()) {
      throw new Error('Can only pause an active subscription');
    }
    return this.updateStatus('paused');
  }

  async resume() {
    if (!this.isPaused()) {
      throw new Error('Can only resume a paused subscription');
    }
    return this.updateStatus('active');
  }

  async cancel(reason) {
    if (this.status === 'cancelled') {
      throw new Error('Subscription is already cancelled');
    }
    return this.updateStatus('cancelled', { cancellationReason: reason });
  }

  async updateStatus(newStatus, extras = {}) {
    const res = await fetch(`/api/contracts/${this.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, ...extras }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Status update failed');
    }

    const updated = await res.json();
    this.status = updated.status;
    return updated;
  }

  /**
   * Get a summary of the current order state.
   * BUG: After a product swap via edit drawer, this returns stale cached data
   * instead of the updated contract lines.
   */
  async getOrderSummary() {
    const res = await fetch(`/api/contracts/${this.id}/summary`);
    return res.json();
  }

  addLine(productId, variantId, quantity, price) {
    this.lines.push({ productId, variantId, quantity, price });
  }

  removeLine(variantId) {
    this.lines = this.lines.filter(l => l.variantId !== variantId);
  }

  get totalValue() {
    return this.lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  }
}
