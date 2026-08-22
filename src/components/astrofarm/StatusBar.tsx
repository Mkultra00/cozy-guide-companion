import { Badge } from "@/components/ui/badge";
import { relativeTime } from "@/lib/astrofarm/format";
import type { AgentStatus } from "@/lib/astrofarm/types";

interface StatusBarProps {
  status: AgentStatus;
  now: number;
  planVersion: number | null;
}

export function StatusBar({ status, now, planVersion }: StatusBarProps) {
  return (
    <div className="panel flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="live-dot" aria-hidden />
        <div>
          <p className="label-caps">Agent worker</p>
          <p className="metric text-sm text-foreground">
            {status.online ? "Running" : "Stopped"} · heartbeat every{" "}
            {Math.round(status.heartbeatIntervalSec / 60)} min
          </p>
        </div>
      </div>

      <Field label="Last action" value={relativeTime(status.lastHeartbeatTs, now)} />
      <Field label="Plan version" value={planVersion ? `v${planVersion}` : "—"} />
      <Field label="Local model" value={status.modelName} />
      <Field label="State store" value={`mongod ${status.mongoReplicaSet}`} />

      <div className="ml-auto flex items-center gap-2">
        <Badge variant="outline" className="metric border-success/40 text-success">
          egress: none
        </Badge>
        <Badge
          variant="outline"
          className={
            status.source === "live"
              ? "metric border-primary/40 text-primary"
              : "metric border-warning/40 text-warning"
          }
        >
          {status.source === "live" ? `live · ${status.endpoint}` : "reference snapshot"}
        </Badge>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-caps">{label}</p>
      <p className="metric text-sm text-foreground">{value}</p>
    </div>
  );
}
