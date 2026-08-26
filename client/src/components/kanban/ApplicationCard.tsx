import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Application } from "../../types";
import { ApplicationCardContent } from "./ApplicationCardContent";

interface Props {
  application: Application;
  onOpen: (id: string) => void;
}

export function ApplicationCard({ application, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: application.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(application.id)}
      className={`transition-opacity duration-150 ${isDragging ? "opacity-40" : ""}`}
    >
      <ApplicationCardContent application={application} />
    </div>
  );
}
