/**
 * Portal Surface — Edit Drawer
 * Handles subscription edits: swap product, add freebie, reschedule, change quantity.
 */

export class EditDrawer {
  constructor(subscription) {
    this.subscription = subscription;
    this.pendingChanges = {};
    this.isOpen = false;
  }

  open() {
    this.isOpen = true;
    this.pendingChanges = {};
    this.render();
  }

  close() {
    this.isOpen = false;
    this.pendingChanges = {};
  }

  swapProduct(newProductId, newVariantId) {
    this.pendingChanges.productSwap = { newProductId, newVariantId };
    // Refresh the order summary after a product swap
    this.refreshOrderSummary();
  }

  addFreebie(freebieVariantId) {
    this.pendingChanges.freebie = { variantId: freebieVariantId };
  }

  reschedule(newDate) {
    if (new Date(newDate) < new Date()) {
      throw new Error('Cannot reschedule to a past date');
    }
    this.pendingChanges.reschedule = { date: newDate };
  }

  async save() {
    if (!Object.keys(this.pendingChanges).length) {
      return { success: false, message: 'No changes to save' };
    }

    try {
      // BUG: When freebie + product swap happen together, the checkout link
      // fires before the freebie is saved — primary action should be save, not checkout
      if (this.pendingChanges.freebie && this.pendingChanges.productSwap) {
        await this.generateCheckoutLink(); // This fires too early
        await this.saveFreebie(this.pendingChanges.freebie);
      } else {
        if (this.pendingChanges.freebie) {
          await this.saveFreebie(this.pendingChanges.freebie);
        }
        if (this.pendingChanges.productSwap) {
          await this.saveProductSwap(this.pendingChanges.productSwap);
        }
      }

      if (this.pendingChanges.reschedule) {
        await this.saveReschedule(this.pendingChanges.reschedule);
      }

      this.close();
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async saveFreebie({ variantId }) {
    const res = await fetch(`/api/subscriptions/${this.subscription.id}/freebie`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId }),
    });
    return res.json();
  }

  async saveProductSwap({ newProductId, newVariantId }) {
    const res = await fetch(`/api/subscriptions/${this.subscription.id}/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newProductId, newVariantId }),
    });
    return res.json();
  }

  async saveReschedule({ date }) {
    const res = await fetch(`/api/subscriptions/${this.subscription.id}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    });
    return res.json();
  }

  async generateCheckoutLink() {
    const res = await fetch(`/api/subscriptions/${this.subscription.id}/checkout`, {
      method: 'POST',
    });
    return res.json();
  }

  refreshOrderSummary() {
    // Re-fetches the order summary after a product swap
    // BUG: Summary shows stale state — does not await the swap completion
    fetch(`/api/subscriptions/${this.subscription.id}/summary`)
      .then(r => r.json())
      .then(summary => this.renderOrderSummary(summary));
  }

  renderOrderSummary(summary) {
    // Render updated order summary in drawer
  }

  render() {
    // Render drawer UI
  }
}
