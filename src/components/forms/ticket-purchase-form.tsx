"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { purchaseEventTicketsAction } from "@/app/actions/tickets";
import type { ActionState } from "@/lib/http";
import { calculateCheckoutAmounts, PLATFORM_MANAGEMENT_FEE_RATE } from "@/lib/payments";
import { formatPrice } from "@/lib/utils";

const initialState: ActionState = {};

function PurchaseSubmitButton({ ownerMode }: { ownerMode: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className="app-button-primary w-full disabled:opacity-60" type="submit" disabled={pending}>
      {pending ? "Preparando..." : ownerMode ? "Reservar gratis" : "Ir al pago"}
    </button>
  );
}

export function TicketPurchaseForm({
  eventId,
  ticketTypeId,
  available,
  unitPrice,
  ownerMode = false,
}: {
  eventId: string;
  ticketTypeId: string;
  available: number;
  unitPrice: number | null;
  ownerMode?: boolean;
}) {
  const [state, formAction] = useActionState(purchaseEventTicketsAction, initialState);
  const [quantity, setQuantity] = useState("1");
  const quantityValue = Math.max(1, Number(quantity) || 1);
  const amounts = ownerMode
    ? {
        baseAmount: 0,
        managementFeeAmount: 0,
        totalAmount: 0,
      }
    : calculateCheckoutAmounts(unitPrice == null ? 0 : Math.round(unitPrice * 100), quantityValue);

  return (
    <form key={ticketTypeId} action={formAction} className="mt-4 grid gap-3 rounded-2xl border border-neutral-200 bg-white p-3">
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
        {ownerMode ? (
          <div className="space-y-2">
            <p className="font-medium text-slate-950">Entradas de cortesía para el local</p>
            <p>Estas entradas se emiten gratis para tu propia cartera.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <span>Subtotal</span>
              <span>{formatPrice(amounts.baseAmount / 100) ?? "0 EUR"}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>Gastos de gestión ({(PLATFORM_MANAGEMENT_FEE_RATE * 100).toFixed(2)}%)</span>
              <span>{formatPrice(amounts.managementFeeAmount / 100) ?? "0 EUR"}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-neutral-200 pt-2 font-semibold text-slate-950">
              <span>Total</span>
              <span>{formatPrice(amounts.totalAmount / 100) ?? "0 EUR"}</span>
            </div>
          </>
        )}
      </div>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

      <PurchaseSubmitButton ownerMode={ownerMode} />
    </form>
  );
}
