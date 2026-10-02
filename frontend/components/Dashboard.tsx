"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { PCBResponse, EventsResponse } from "@/types/api";
import { Panel } from "./Panel";
import { ProcessCreationForm } from "./ProcessCreationForm";
import { ProcessTable } from "./ProcessTable";
import { ProcessHierarchy } from "./ProcessHierarchy";
import { StateVisualizer } from "./StateVisualizer";
import { TransitionControls } from "./TransitionControls";
import { PCBViewer } from "./PCBViewer";
import { EventLog } from "./EventLog";
import { Header } from "./Header";

export function Dashboard() {
  const [processes, setProcesses] = useState<PCBResponse[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const loadProcesses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getProcesses();
      setProcesses(response.processes);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Failed to load processes");
      }
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
      if (err instanceof ApiError) {
        setEventsError(err.detail);
      } else {
        setEventsError("Failed to load events");
      }
    }
  };

  const refreshSimulation = async () => {
    await Promise.all([loadProcesses(), loadEvents()]);
  };

  const handleProcessCreated = () => {
    refreshSimulation();
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      setError(null);
      setEventsError(null);
      await api.resetSimulation();
      setSelectedPid(null);
      await refreshSimulation();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Failed to reset simulation");
      }
    } finally {
      setIsResetting(false);
    }
  };

  const handleSelectProcess = (pid: number) => {
    setSelectedPid(pid);
  };

  useEffect(() => {
    refreshSimulation();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header onReset={handleReset} isResetting={isResetting} />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="space-y-6 lg:col-span-1">
            <Panel
              title="Process Creation"
              subtitle="Create new processes with name, priority, and optional parent"
            >
              <ProcessCreationForm
                processes={processes}
                onCreated={handleProcessCreated}
              />
            </Panel>
            <Panel
              title="Process Table"
              subtitle="All processes with PID, name, state, priority, and parent"
            >
              <ProcessTable
                processes={processes}
                selectedPid={selectedPid}
                onSelect={handleSelectProcess}
                isLoading={isLoading}
                error={error}
              />
            </Panel>
            <ProcessHierarchy
              processes={processes}
              selectedPid={selectedPid}
              onSelect={handleSelectProcess}
              isLoading={isLoading}
              error={error}
            />
          </div>
          <div className="space-y-6 lg:col-span-1">
            <Panel
              title="Process State Machine"
              subtitle="Current process state and valid transitions"
            >
              <StateVisualizer
                processes={processes}
                selectedPid={selectedPid}
              />
            </Panel>
            <Panel
              title="Transition Controls"
              subtitle="Execute state transitions for the selected process"
            >
              <TransitionControls
                pid={selectedPid}
                processState={processes.find((p) => p.pid === selectedPid)?.state ?? null}
                onTransition={refreshSimulation}
              />
            </Panel>
            <Panel
              title="Process Control Block"
              subtitle="Detailed PCB information for selected process"
            >
              <PCBViewer
                process={processes.find((p) => p.pid === selectedPid) ?? null}
              />
            </Panel>
            <Panel
              title="Event Log"
              subtitle="Timestamped simulation events"
            >
              <EventLog
                events={events}
                isLoading={isLoading}
                error={eventsError}
                onRefresh={loadEvents}
              />
            </Panel>
          </div>
        </div>
      </main>
    </div>
  );
}