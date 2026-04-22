import { CheckCircle, XCircle, AlertCircle, Cloud, Key, Link2, Server } from 'lucide-react';
import type { SetupState } from './types';

interface StatusDashboardProps {
  state: SetupState;
  onContinue: (step: 'envVars' | 'integrations' | 'final') => void;
}

export function StatusDashboard({ state, onContinue }: StatusDashboardProps) {
  const { envVars, integrations, workers, overallProgress } = state;

  const requiredVars = envVars.filter(v => v.isRequired);
  const missingRequired = requiredVars.filter(v => !v.isSet);

  const disconnectedIntegrations = integrations.filter(i => !i.connected);
  const notDeployedWorkers = workers.filter(w => !w.deployed);

  return (
    <div className="space-y-6">
      {/* Progress Ring */}
      <div className="flex flex-col items-center">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={`${overallProgress * 2.83} 283`}
              className="text-primary transition-all duration-500"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold">{overallProgress}%</span>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Setup Complete</p>
      </div>

      {/* Status Sections */}
      <div className="grid gap-4">
        {/* Environment Variables */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Key className="h-5 w-5" />
            <h3 className="font-semibold">Environment Variables</h3>
          </div>

          <div className="space-y-2">
            {requiredVars.map((env) => (
              <div key={env.name} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{env.name}</span>
                {env.isSet ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            ))}
          </div>

          {missingRequired.length > 0 && (
            <button
              onClick={() => onContinue('envVars')}
              className="mt-3 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Complete Setup
            </button>
          )}
        </div>

        {/* Integrations */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="h-5 w-5" />
            <h3 className="font-semibold">Integrations</h3>
          </div>

          <div className="space-y-2">
            {integrations.map((int) => (
              <div key={int.id} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{int.name}</span>
                {int.connected ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            ))}
          </div>

          {disconnectedIntegrations.length > 0 && (
            <button
              onClick={() => onContinue('integrations')}
              className="mt-3 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Connect Integrations
            </button>
          )}
        </div>

        {/* Workers */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Server className="h-5 w-5" />
            <h3 className="font-semibold">Workers</h3>
          </div>

          <div className="space-y-2">
            {workers.map((worker) => (
              <div key={worker.id} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{worker.name}</span>
                {worker.deployed ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Missing Items Summary */}
      {(missingRequired.length > 0 || disconnectedIntegrations.length > 0) && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">Action Required</h3>
          </div>
          <ul className="list-inside space-y-1 text-sm text-yellow-700">
            {missingRequired.map((v) => (
              <li key={v.name}>Set {v.name}</li>
            ))}
            {disconnectedIntegrations.map((i) => (
              <li key={i.id}>Connect {i.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
