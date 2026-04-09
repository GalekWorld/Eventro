"use client";

import { useActionState, useState } from "react";
import { purchaseEventTicketsAction } from "@/app/actions/tickets";
import type { ActionState } from "@/lib/http";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  calculateCheckoutAmounts,
  PLATFORM_MANAGEMENT_FEE_RATE,
  PLATFORM_REVENUE_SHARE_RATE,
} from "@/lib/payments";
import { formatPrice } from "@/lib/utils";

const initialState: ActionState = {};

export function TicketPurchaseForm({
  eventId,
  ticketTypeId,
  available,
  unitPrice,
}: {
  eventId: string;
  ticketTypeId: string;
  available: number;
  unitPrice: number | null;
}) {
  const [state, formAction] = useActionState(purchaseEventTicketsAction, initialState);
  const [quantity, setQuantity] = useState("1");
  const quantityValue = Math.max(1, Number(quantity) || 1);
  const amounts = calculateCheckoutAmounts(unitPrice == null ? 0 : Math.round(unitPrice * 100), quantityValue);

  return (
    <form action={formAction} className="mt-4 grid gap-3 rounded-2xl border border-neutral-200 bg-white p-3">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="ticketTypeId" value={ticketTypeId} />

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700" htmlFor={`quantity-${ticketTypeId}`}>
          Cantidad
        </label>
        <input
          id={`quantity-${ticketTypeId}`}
          name="quantity"
          className="app-input max-w-24"
          type="number"
          min="1"
          max={Math.min(available, 10)}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        />
      </div>

      <div className="rounded-2xl bg-neutral-50 p-3 text-sm text-slate-600">
        <div className="flex items-center justify-between gap-3">
          <span>Subtotal</span>
          <span>{formatPrice(amounts.baseAmount / 100) ?? "0 €"}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span>Gastos de gestión ({(PLATFORM_MANAGEMENT_FEE_RATE * 100).toFixed(2)}%)</span>
          <span>{formatPrice(amounts.managementFeeAmount / 100) ?? "0 €"}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>Comisión plataforma para la sala ({(PLATFORM_REVENUE_SHARE_RATE * 100).toFixed(2)}%)</span>
          <span>{formatPrice(amounts.revenueShareAmount / 100) ?? "0 €"}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-neutral-200 pt-2 font-semibold text-slate-950">
          <span>Total</span>
          <span>{formatPrice(amounts.totalAmount / 100) ?? "0 €"}</span>
        </div>
      </div>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

      <SubmitButton className="app-button-primary w-full disabled:opacity-60" pendingText="Preparando pago...">
        Ir al pago
      </SubmitButton>
    </form>
  );
}
