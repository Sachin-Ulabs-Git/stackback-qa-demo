/**
 * Storefront Surface — Subscription Widget
 * Renders the subscription plan selector on the product page.
 */

import { calculatePricingSummary, renderPricingSummary } from './pricing-summary.js';

export class SubscriptionWidget {
  constructor(container, product) {
    this.container = container;
    this.product = product;
    this.selectedPlan = null;
    this.selectedFrequency = null;
  }

  init() {
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="subscription-widget" data-product-id="${this.product.id}">
        <h3>Subscribe & Save</h3>
        <div class="plan-selector">
          ${this.product.plans.map(plan => `
            <label class="plan-option">
              <input type="radio" name="plan" value="${plan.id}" />
              <span class="plan-name">${plan.name}</span>
              <span class="plan-price">${plan.price}</span>
            </label>
          `).join('')}
        </div>
        <div class="frequency-selector">
          <select name="frequency">
            <option value="weekly">Every week</option>
            <option value="biweekly">Every 2 weeks</option>
            <option value="monthly" selected>Every month</option>
          </select>
        </div>
        <div class="pricing-summary-container"></div>
        <button class="add-to-cart-btn" disabled>Select a plan</button>
      </div>
    `;
  }

  bindEvents() {
    const planInputs = this.container.querySelectorAll('input[name="plan"]');
    const frequencySelect = this.container.querySelector('select[name="frequency"]');
    const addBtn = this.container.querySelector('.add-to-cart-btn');

    planInputs.forEach(input => {
      input.addEventListener('change', () => {
        this.selectedPlan = this.product.plans.find(p => p.id === input.value);
        this.updateSummary();
        addBtn.disabled = false;
        addBtn.textContent = 'Add subscription';
      });
    });

    frequencySelect.addEventListener('change', () => {
      this.selectedFrequency = frequencySelect.value;
      this.updateSummary();
    });

    addBtn.addEventListener('click', () => this.addToCart());
  }

  updateSummary() {
    if (!this.selectedPlan) return;
    const summaryContainer = this.container.querySelector('.pricing-summary-container');
    const summary = calculatePricingSummary([
      { price: this.selectedPlan.price, quantity: 1 }
    ]);
    renderPricingSummary(summaryContainer, summary);
  }

  addToCart() {
    if (!this.selectedPlan) return;
    // Dispatch custom event for Shopify cart integration
    this.container.dispatchEvent(new CustomEvent('subscription:add', {
      bubbles: true,
      detail: {
        planId: this.selectedPlan.id,
        frequency: this.selectedFrequency || 'monthly',
        productId: this.product.id,
      }
    }));
  }
}
