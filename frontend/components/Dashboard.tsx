"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { EventsResponse, PCBResponse } from "@/types/api";
import { EventLog } from "./EventLog";
import { Header } from "./Header";
import { ProcessCreationForm } from "./ProcessCreationForm";
import { ProcessExplorer } from "./ProcessExplorer";
import { ProcessInspector } from "./ProcessInspector";
import { ProcessStateGraph } from "./ProcessStateGraph";
import { ProcessTable } from "./ProcessTable";
import { TransitionControls } from "./TransitionControls";

type BottomTab = "table" | "events";

export function Dashboard() {
  const [processes, setProcesses] = useState<PCBResponse[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [validActions, setValidActions] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState<BottomTab>("table");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadProcesses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getProcesses();
      setProcesses(response.processes);
      setSelectedPid((current) => current !== null && response.processes.some((process) => process.pid === current) ? current : response.processes[0]?.pid ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to load processes");
    } finally {
      setIsLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      setEventsError(null);
      const response: EventsResponse = await api.getEvents();
      setEvents(response.events);
    } catch (err) {
      setEventsError(err instanceof ApiError ? err.detail : "Failed to load events");
    }
  };

  const refreshSimulation = async () => {
    await Promise.all([loadProcesses(), loadEvents()]);
  };

  const handleSelectProcess = (pid: number) => {
    setPendingAction(null);
    setValidActions([]);
    setSelectedPid(pid);
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      setError(null);
      setEventsError(null);
      await api.resetSimulation();
      setSelectedPid(null);
      setValidActions([]);
      setPendingAction(null);
      await refreshSimulation();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Failed to reset simulation");
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    refreshSimulation();
  }, []);

  const selectedProcess = processes.find((process) => process.pid === selectedPid) ?? null;

  return (
    <div className="flex h-screen min-h-[600px] flex-col overflow-hidden bg-base-200 text-base-content">
      <Header onReset={handleReset} isResetting={isResetting} />
      <main className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_190px]">
        <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[minmax(210px,24%)_minmax(0,1fr)_minmax(260px,26%)]">
          <aside className="min-h-0 overflow-y-auto border-b border-base-300 bg-base-100 lg:border-b-0 lg:border-r">
            <ProcessExplorer processes={processes} selectedPid={selectedPid} onSelect={handleSelectProcess} onCreate={() => setIsCreateOpen(true)} isLoading={isLoading} error={error} />
          </aside>

          <section className="flex min-h-0 min-w-0 flex-col bg-base-200" aria-labelledby="state-machine-title">
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-base-300 px-4">
              <div>
                <h2 id="state-machine-title" className="ui-panel-title">Process State Machine</h2>
                <p className="ui-meta">Directed transition workspace</p>
              </div>
              <span className="ui-meta font-mono font-medium">5 STATES · 6 EDGES</span>
            </div>
            <div className="min-h-0 flex-1 p-2 sm:p-4">
              <ProcessStateGraph processes={processes} selectedPid={selectedPid} validActions={validActions} pendingAction={pendingAction} />
            </div>
          </section>

          <aside className="min-h-0 overflow-y-auto border-t border-base-300 bg-base-100 lg:border-l lg:border-t-0">
            <div className="border-b border-base-300 px-3 py-2">
              <p className="ui-section-label">Inspector</p>
              <ProcessInspector process={selectedProcess} />
            </div>
            <div className="px-3 py-2">
              <p className="ui-section-label mb-2">Transition Controls</p>
              <TransitionControls pid={selectedPid} processState={selectedProcess?.state ?? null} onTransition={refreshSimulation} onActionStart={setPendingAction} onActionEnd={() => setPendingAction(null)} onValidActions={setValidActions} />
            </div>
          </aside>
        </div>

        <section className="min-h-0 border-t border-base-300 bg-base-100" aria-label="Auxiliary workspace">
          <div className="flex h-9 items-center border-b border-base-300 px-3">
            <div className="tabs tabs-bordered h-full" role="tablist" aria-label="Auxiliary workspace tabs">
              <button role="tab" aria-selected={bottomTab === "table"} className={`tab h-full text-sm font-medium ${bottomTab === "table" ? "tab-active" : ""}`} onClick={() => setBottomTab("table")}>Process Table</button>
              <button role="tab" aria-selected={bottomTab === "events"} className={`tab h-full text-sm font-medium ${bottomTab === "events" ? "tab-active" : ""}`} onClick={() => setBottomTab("events")}>Event Timeline</button>
            </div>
          </div>
          <div className="h-[calc(100%-2.25rem)] overflow-auto px-3 py-1">
            {bottomTab === "table" ? <ProcessTable processes={processes} selectedPid={selectedPid} onSelect={handleSelectProcess} isLoading={isLoading} error={error} /> : <EventLog events={events} isLoading={isLoading} error={eventsError} onRefresh={loadEvents} />}
          </div>
        </section>
      </main>

      {isCreateOpen && (
        <dialog open aria-modal="true" aria-labelledby="create-process-title" className="modal modal-bottom sm:modal-middle" onCancel={() => setIsCreateOpen(false)}>
          <div className="modal-box max-w-xl border border-base-300 bg-base-100 p-0">
            <div className="flex items-center justify-between border-b border-base-300 px-4 py-3">
              <div><h2 id="create-process-title" className="ui-panel-title">Create Process</h2><p className="ui-meta">Add a simulated process to the process tree</p></div>
              <button type="button" className="btn btn-ghost btn-sm btn-square" aria-label="Close create process dialog" onClick={() => setIsCreateOpen(false)}>✕</button>
            </div>
            <div className="p-4">
              <ProcessCreationForm processes={processes} onCreated={() => { setIsCreateOpen(false); void refreshSimulation(); }} />
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setIsCreateOpen(false)}>close</button></form>
        </dialog>
      )}
    </div>
  );
}
