import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { APPLICATION_STATUSES, type Application, type ApplicationStatus } from "../../types";
import { KanbanColumn } from "./KanbanColumn";
import { ApplicationCardContent } from "./ApplicationCardContent";

interface Props {
  applications: Application[];
  onOpen: (id: string) => void;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onQuickAdd: (status: ApplicationStatus) => void;
}

export function KanbanBoard({ applications, onOpen, onStatusChange, onQuickAdd }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Require a few pixels of movement before a drag starts, so a plain click to open
  // the detail modal isn't swallowed as an accidental drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const newStatus = over.id as ApplicationStatus;
    const application = applications.find((a) => a.id === active.id);
    if (application && application.status !== newStatus) {
      onStatusChange(application.id, newStatus);
    }
  }

  const activeApplication = applications.find((a) => a.id === activeId) ?? null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {APPLICATION_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            applications={applications.filter((a) => a.status === status)}
            onOpen={onOpen}
            onQuickAdd={onQuickAdd}
          />
        ))}
      </div>
      <DragOverlay>
        {activeApplication ? (
          <div className="w-72 rotate-2 scale-105 rounded-xl shadow-2xl shadow-violet-900/30 ring-1 ring-violet-500/25">
            <ApplicationCardContent application={activeApplication} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
