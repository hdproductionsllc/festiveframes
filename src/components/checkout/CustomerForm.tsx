"use client";

import { useOrderStore, type CustomerInfo } from "@/stores/order-store";

interface CustomerFormProps {
  onSubmit: () => void;
}

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
] as const;

function isFormValid(c: CustomerInfo): boolean {
  return (
    c.name.trim().length > 0 &&
    c.email.trim().length > 0 &&
    c.email.includes("@") &&
    c.street.trim().length > 0 &&
    c.city.trim().length > 0 &&
    c.state.length > 0 &&
    /^\d{5}(-\d{4})?$/.test(c.zip.trim())
  );
}

const inputClass =
  "w-full rounded-lg bg-surface-900 border border-surface-700 px-3 py-2.5 text-sm text-surface-100 " +
  "placeholder:text-surface-500 focus:outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/25 transition-colors";

export function CustomerForm({ onSubmit }: CustomerFormProps) {
  const customer = useOrderStore((s) => s.customer);
  const setCustomer = useOrderStore((s) => s.setCustomer);

  const valid = isFormValid(customer);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (valid) onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-surface-800 border border-surface-700 p-4 space-y-4">
      <h3 className="text-sm font-semibold text-surface-100">
        Shipping Information
      </h3>

      <div className="space-y-3">
        <input
          type="text"
          placeholder="Full name"
          value={customer.name}
          onChange={(e) => setCustomer({ name: e.target.value })}
          className={inputClass}
        />
        <input
          type="email"
          placeholder="Email address"
          value={customer.email}
          onChange={(e) => setCustomer({ email: e.target.value })}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="Street address"
          value={customer.street}
          onChange={(e) => setCustomer({ street: e.target.value })}
          className={inputClass}
        />
        <div className="grid grid-cols-6 gap-3">
          <input
            type="text"
            placeholder="City"
            value={customer.city}
            onChange={(e) => setCustomer({ city: e.target.value })}
            className={`col-span-3 ${inputClass}`}
          />
          <select
            value={customer.state}
            onChange={(e) => setCustomer({ state: e.target.value })}
            className={`col-span-1 ${inputClass}`}
          >
            <option value="">ST</option>
            {US_STATES.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="ZIP"
            value={customer.zip}
            onChange={(e) => setCustomer({ zip: e.target.value })}
            className={`col-span-2 ${inputClass}`}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!valid}
        className="w-full py-3 rounded-lg text-sm font-bold transition-all active:scale-[0.98]
          disabled:opacity-40 disabled:cursor-not-allowed
          bg-gradient-to-r from-brand-gold to-yellow-500 text-black
          hover:from-yellow-400 hover:to-yellow-500
          shadow-[0_0_12px_rgba(255,215,0,0.3)] hover:shadow-[0_0_20px_rgba(255,215,0,0.5)]"
      >
        Place Order
      </button>
    </form>
  );
}
