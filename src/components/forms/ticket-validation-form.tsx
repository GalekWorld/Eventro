"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertTriangle, Beer, CheckCircle2, QrCode, RefreshCw, XCircle } from "lucide-react";
import { redeemTicketDrinkAction, validateTicketAction } from "@/app/actions/tickets";
import { CameraQrScanner } from "@/components/camera-qr-scanner";
import { SubmitButton } from "@/components/forms/submit-button";
import type { ActionState } from "@/lib/http";

const initialState: ActionState = {};

function getFeedbackTone(state: ActionState) {
  if (state.success) {
    return {
      wrapper: "border-emerald-200 bg-emerald-50 text-emerald-900",
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
      title: "Entrada valida",
    };
  }

  if (state.code === "ALREADY_USED") {
    return {
      wrapper: "border-amber-200 bg-amber-50 text-amber-900",
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
      title: "Entrada ya usada",
    };
  }

  if (state.code) {
    return {
      wrapper: "border-red-200 bg-red-50 text-red-900",
      icon: <XCircle className="h-5 w-5 text-red-600" />,
      title: "Entrada incorrecta",
    };
  }

  return null;
}

export function TicketValidationForm({ eventId }: { eventId: string }) {
  const [scanState, scanAction] = useActionState(validateTicketAction, initialState);
  const [drinkState, drinkAction] = useActionState(redeemTicketDrinkAction, initialState);
  const [code, setCode] = useState("");

  const currentData = drinkState.data?.ticketId ? drinkState.data : scanState.data;
  const activeState = drinkState.success || drinkState.error ? drinkState : scanState;
  const tone = useMemo(() => getFeedbackTone(activeState), [activeState]);
  const canRedeemDrink = Boolean(currentData?.ticketId) && Number(currentData?.remainingDrinks ?? 0) > 0;

  return (
    <div className="grid gap-4">
      <form action={scanAction} className="grid gap-4 rounded-[28px] border border-neutral-200 bg-white p-4 sm:p-5">
        <input type="hidden" name="eventId" value={eventId} />
        <CameraQrScanner onCodeDetected={setCode} />

        <div>
          <h2 className="text-base font-semibold text-slate-950">Validar entrada</h2>
          <p className="mt-1 text-sm text-slate-500">
            Escanea el QR o pega el codigo. Te mostraremos al instante si es valida, ya usada o incorrecta.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            name="code"
            className="app-input"
            placeholder="Ejemplo: EVT-1A2B3C4D5E6F"
            autoCapitalize="characters"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
          />
          <SubmitButton className="app-button-primary w-full disabled:opacity-60 sm:w-auto" pendingText="Validando...">
            <QrCode className="h-4 w-4" />
            Validar
          </SubmitButton>
        </div>
      </form>

      {tone && (activeState.error || activeState.success) ? (
        <section className={`rounded-[28px] border p-4 sm:p-5 ${tone.wrapper}`}>
          <div className="flex items-start gap-3">
            {tone.icon}
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold">{tone.title}</p>
              <p className="mt-1 text-sm">{activeState.success ?? activeState.error}</p>
            </div>
          </div>
        </section>
      ) : null}

      {currentData ? (
        <section className="rounded-[28px] border border-neutral-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-950">{currentData.buyerName}</h3>
              <p className="mt-1 text-sm text-slate-500">{currentData.ticketName}</p>
              <p className="mt-2 text-sm text-slate-600">{currentData.ticketDescription}</p>
            </div>
            <button type="button" onClick={() => setCode("")} className="app-button-secondary">
              <RefreshCw className="h-4 w-4" />
              Nuevo escaneo
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-neutral-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Consumiciones</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{currentData.includedDrinks ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Gastadas</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{currentData.consumedDrinks ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Restantes</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{currentData.remainingDrinks ?? 0}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <form action={drinkAction}>
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="ticketId" value={String(currentData.ticketId ?? "")} />
              <SubmitButton
                className="app-button-primary disabled:opacity-60"
                pendingText="Registrando..."
                disabled={!canRedeemDrink}
              >
                <Beer className="h-4 w-4" />
                Descontar consumicion
              </SubmitButton>
            </form>

            {!canRedeemDrink ? (
              <span className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-2 text-sm text-slate-500">
                No quedan consumiciones disponibles
              </span>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
