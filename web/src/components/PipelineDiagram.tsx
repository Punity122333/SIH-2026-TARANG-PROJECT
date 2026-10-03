import { useMachine } from "@xstate/react";
import { pipelineMachine, PIPE_LABELS, PIPE_STEPS } from "@/store/machine";
export function PipelineDiagram({ active }: { active: string }) {
  const [snap] = useMachine(pipelineMachine);
  void snap;
  const idx = PIPE_STEPS.indexOf(active);
  return (
    <nav aria-label="Pipeline progress" className="flex flex-wrap items-center gap-1 text-[10px]">
      {PIPE_LABELS.map((label, i) => {
        const on = idx >= 0 && i <= idx;
        return (
          <span key={label} className="flex items-center gap-1">
            <span
              className={
                "rounded border px-1.5 py-0.5 tracking-widest " +
                (on ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-100" : "border-slate-500/30 text-slate-300/50")
              }
            >
              {label}
            </span>
            {i < PIPE_LABELS.length - 1 ? <span aria-hidden="true" className="text-slate-500">→</span> : null}
          </span>
        );
      })}
    </nav>
  );
}
