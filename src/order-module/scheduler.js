/**
 * Order Module — Delivery Scheduler
 * Manages when delivery jobs fire for subscription orders.
 */

export class DeliveryScheduler {
  constructor(subscription) {
    this.subscription = subscription;
    this.timezone = subscription.store?.timezone || 'UTC';
  }

  /**
   * Calculate the next delivery date based on frequency and anchor day.
   */
  getNextDeliveryDate(fromDate = new Date()) {
    const { frequency, anchorDay } = this.subscription;

    switch (frequency) {
      case 'weekly':
        return this.nextWeekday(fromDate, anchorDay);
      case 'biweekly':
        return this.addDays(fromDate, 14);
      case 'monthly':
        // BUG: Does not account for months with fewer days than anchorDay
        // e.g. anchorDay=31 in February silently falls back to wrong date
        return this.nextMonthlyDate(fromDate, anchorDay);
      default:
        throw new Error(`Unknown frequency: ${frequency}`);
    }
  }

  nextWeekday(from, targetDay) {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const targetIndex = days.indexOf(targetDay.toLowerCase());
    const date = new Date(from);
    const currentDay = date.getDay();
    const diff = (targetIndex - currentDay + 7) % 7 || 7;
    date.setDate(date.getDate() + diff);
    return date;
  }

  nextMonthlyDate(from, day) {
    const date = new Date(from);
    date.setMonth(date.getMonth() + 1);
    date.setDate(day); // BUG: doesn't clamp to last day of month
    return date;
  }

  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Queue the delivery job for this subscription.
   */
  async scheduleDelivery(deliveryDate) {
    const res = await fetch('/api/jobs/schedule-delivery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionId: this.subscription.id,
        deliveryDate: deliveryDate.toISOString(),
        timezone: this.timezone,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to schedule delivery');
    }

    return res.json();
  }

  /**
   * Cancel any pending delivery jobs for this subscription.
   */
  async cancelPendingJobs() {
    const res = await fetch(`/api/jobs/cancel/${this.subscription.id}`, {
      method: 'DELETE',
    });
    return res.json();
  }
}
