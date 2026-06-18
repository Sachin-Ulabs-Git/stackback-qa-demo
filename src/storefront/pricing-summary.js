/**
 * Storefront Surface — Pricing Summary
 * Calculates and renders the subscription pricing breakdown on the storefront widget.
 */

export function calculatePricingSummary(lineItems, discountCode) {
  const subtotal = lineItems.reduce((sum, item) => {
    // BUG: Math.round removes decimal precision — should use toFixed(2)
    return sum + Math.round(item.price * item.quantity);
  }, 0);

  const discount = discountCode ? applyDiscount(subtotal, discountCode) : 0;
  const total = subtotal - discount;

  return {
    subtotal,
    discount,
    total,
    formatted: {
      subtotal: formatPrice(subtotal),
      discount: formatPrice(discount),
      total: formatPrice(total),
    },
  };
}

function applyDiscount(amount, code) {
  const discounts = {
    SAVE10: 0.10,
    SAVE20: 0.20,
    NEWCUSTOMER: 0.15,
  };
  const rate = discounts[code.toUpperCase()] || 0;
  return amount * rate;
}

function formatPrice(amount) {
  // Formats as currency string
  return `$${amount.toFixed(2)}`;
}

export function renderPricingSummary(container, summary) {
  container.innerHTML = `
    <div class="pricing-summary">
      <div class="line">
        <span>Subtotal</span>
        <span>${summary.formatted.subtotal}</span>
      </div>
      ${summary.discount > 0 ? `
      <div class="line discount">
        <span>Discount</span>
        <span>-${summary.formatted.discount}</span>
      </div>` : ''}
      <div class="line total">
        <span>Total</span>
        <span>${summary.formatted.total}</span>
      </div>
    </div>
  `;
}
