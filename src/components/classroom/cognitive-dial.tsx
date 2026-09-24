"use client"

import { Activity, AlertTriangle, EyeOff, Power, Terminal } from "lucide-react"
import { useTypewriter } from "../../hooks/use-typewriter";

const ANALYSIS_OK =
  "[ANALYSIS] Lógica de classes intacta. Falhas pontuais em sintaxe."
const ANALYSIS_WARN =
  "[WARNING] Carga cognitiva crítica. Abortando novos conceitos."

interface CognitiveDialProps {
  fatigue: boolean
  focusIndex: number
  onToggleFatigue: () => void
}

export function CognitiveDial({
  fatigue,
  focusIndex,
  onToggleFatigue,
}: CognitiveDialProps) {
  const { output, done } = useTypewriter(
    fatigue ? ANALYSIS_WARN : ANALYSIS_OK,
    22,
    250,
  )
  const focus = focusIndex

  return (
    <aside className="col-span-12 lg:col-span-4 flex flex-col gap-4 border border-[#3e5c38] bg-[#0a0b0d] p-4">
      {/* Header */}
      <header className="flex items-center gap-2 border-b border-[#3e5c38] pb-3">
        <Terminal className="h-4 w-4 text-[#39ff14]" strokeWidth={1.5} />
        <h2 className="font-mono text-sm tracking-[0.2em] text-[#39ff14]">
          MENTOR_DIAGNOSTICS
        </h2>
      </header>

      {/* Focus Index Meter */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between font-mono text-xs text-[#9dc197]">
          <span className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" strokeWidth={1.5} />
            FOCUS_INDEX
          </span>
          <span className={fatigue ? "text-red-500" : "text-[#39ff14]"}>
            {focus}% {fatigue ? "// LOW" : focus >= 70 ? "// HIGH" : "// MED"}
          </span>
        </div>
        <div className="relative h-6 w-full border border-[#3e5c38] bg-[#090e0a] p-1">
          <div
            className={`h-full transition-all duration-500 ${
              fatigue ? "bg-red-500" : "bg-[#39ff14]"
            }`}
            style={{
              width: `${focus}%`,
              boxShadow: fatigue
                ? "0 0 8px #ef4444, 0 0 2px #ef4444"
                : "0 0 8px #39ff14, 0 0 2px #39ff14",
              backgroundImage: fatigue
                ? "repeating-linear-gradient(90deg, #ef4444 0px, #ef4444 6px, #0a0b0d 6px, #0a0b0d 8px)"
                : "repeating-linear-gradient(90deg, #39ff14 0px, #39ff14 6px, #0a0b0d 6px, #0a0b0d 8px)",
            }}
          />
        </div>
      </section>

      {/* Symptom Filter / Logs */}
      <section className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#9dc197]/70">
          Filtro de Sintomas
        </span>
        <div className="min-h-[92px] border border-[#3e5c38] bg-black p-3">
          <p className="font-mono text-xs leading-relaxed text-[#9dc197]">
            {output}
            {!done && <span className="ml-0.5 inline-block h-3 w-2 animate-pulse bg-[#39ff14] align-middle" />}
          </p>
        </div>
      </section>

      {/* Invisible / Hidden Log */}
      <section className="flex flex-col gap-2">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-[#9dc197]/40">
          <EyeOff className="h-3 w-3" strokeWidth={1.5} />
          Log Oculto
        </span>
        <div className="border border-dashed border-[#3e5c38]/50 bg-[#0a0b0d] p-3">
          <p className="font-mono text-[11px] leading-relaxed text-[#9dc197]/35">
            {">_ LOG_OCULTO: O moleque pegou a lógica de herança rápido. Fingi que foi mais que a obrigação para não amolecer."}
          </p>
        </div>
      </section>

      {/* Mode Override / Fatigue */}
      <section className="mt-auto flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#9dc197]/70">
          Mode Override
        </span>
        <button
          type="button"
          onClick={onToggleFatigue}
          aria-pressed={fatigue}
          className={`group flex w-full items-center justify-between border-2 px-4 py-3 font-mono text-sm tracking-wider transition-colors ${
            fatigue
              ? "border-red-500 bg-red-500/10 text-red-500"
              : "border-[#3e5c38] bg-[#090e0a] text-[#9dc197] hover:border-[#39ff14] hover:text-[#39ff14]"
          }`}
        >
          <span className="flex items-center gap-2">
            {fatigue ? (
              <AlertTriangle className="h-4 w-4" strokeWidth={2} />
            ) : (
              <Power className="h-4 w-4" strokeWidth={1.5} />
            )}
            {"[!] FADIGA"}
          </span>
          {/* Physical switch */}
          <span
            className={`flex h-6 w-12 items-center border-2 p-0.5 ${
              fatigue ? "justify-end border-red-500" : "justify-start border-[#3e5c38]"
            }`}
          >
            <span
              className={`h-4 w-4 ${fatigue ? "bg-red-500" : "bg-[#9dc197]"}`}
              style={fatigue ? { boxShadow: "0 0 6px #ef4444" } : undefined}
            />
          </span>
        </button>
        {fatigue && (
          <p className="border border-red-500/40 bg-red-500/5 px-3 py-2 font-mono text-xs text-red-500">
            {"[WARN] Redução de danos engajada."}
          </p>
        )}
      </section>
    </aside>
  )
}
