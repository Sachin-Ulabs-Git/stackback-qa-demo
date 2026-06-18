/**
 * CX Module — Customer Portal
 * Settings and config for the merchant-facing customer portal (Portal Surface).
 */

export class CustomerPortalConfig {
  constructor(storeId) {
    this.storeId = storeId;
    this.settings = null;
  }

  async load() {
    const res = await fetch(`/api/cx/portal-config/${this.storeId}`);
    this.settings = await res.json();
    return this.settings;
  }

  async save(updates) {
    const merged = { ...this.settings, ...updates };

    const res = await fetch(`/api/cx/portal-config/${this.storeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to save portal config');
    }

    // BUG: Brand colour updates are saved to the API but not applied
    // to the portal preview — requires a hard reload to see changes
    this.settings = await res.json();
    return this.settings;
  }

  async resetToDefaults() {
    const res = await fetch(`/api/cx/portal-config/${this.storeId}/reset`, {
      method: 'POST',
    });
    this.settings = await res.json();
    return this.settings;
  }

  getBrandColour() {
    return this.settings?.brandColour || '#000000';
  }

  getPortalTitle() {
    return this.settings?.portalTitle || 'My Subscriptions';
  }

  isFeatureEnabled(feature) {
    return this.settings?.features?.[feature] ?? false;
  }
}
