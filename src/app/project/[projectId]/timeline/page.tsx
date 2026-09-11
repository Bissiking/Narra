"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface TimelineEvent {
  id: string;
  title: string;
  description: string | null;
  narrativeDate: string | null;
  sortKey: string | null;
  order: number;
  location: { id: string; name: string } | null;
  characters: {
    character: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      alias: string | null;
      portraitUrl: string | null;
    };
    role: string | null;
  }[];
  organizations: { id: string; name: string }[];
  scenes: { id: string; title: string }[];
}

export default function TimelinePage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  useEffect(() => {
    async function loadTimeline() {
      const res = await fetch(`/api/projects/${projectId}/timeline`);
      if (res.ok) setEvents(await res.json());
      setLoading(false);
    }
    loadTimeline();
  }, [projectId]);

  const selected = events.find((e) => e.id === selectedEvent);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-narra-muted">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-narra-border flex flex-col">
        <div className="p-4 border-b border-narra-border">
          <Link href={`/project/${projectId}`} className="text-narra-muted hover:text-narra-text text-sm">
            ← Retour
          </Link>
          <div className="flex items-center justify-between mt-2">
            <h2 className="font-bold">Timeline</h2>
            <Link href={`/project/${projectId}/timeline/new`} className="text-narra-accent text-sm">
              + Ajouter
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
          {events.length === 0 ? (
            <p className="text-narra-muted text-sm p-2">Aucun événement.</p>
          ) : (
            events.map((event) => (
              <button
                key={event.id}
                onClick={() => setSelectedEvent(event.id)}
                className={`w-full text-left p-3 mb-1 transition-colors ${
                  selectedEvent === event.id
                    ? "bg-narra-accent/10 border-l-2 border-narra-accent"
                    : "hover:bg-narra-border/30"
                }`}
              >
                <div className="font-medium text-sm truncate">{event.title}</div>
                {event.narrativeDate && (
                  <div className="text-xs text-narra-muted">{event.narrativeDate}</div>
                )}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main - Timeline view */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          <h1 className="text-2xl font-bold mb-8">Timeline</h1>

          {events.length === 0 ? (
            <div className="card p-12 text-center text-narra-muted">
              <p className="mb-4">Aucun événement dans la timeline.</p>
              <Link href={`/project/${projectId}/timeline/new`} className="btn-primary">
                Ajouter le premier événement
              </Link>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-narra-border" />

              <div className="space-y-8">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="relative pl-12 cursor-pointer group"
                    onClick={() => setSelectedEvent(event.id)}
                  >
                    {/* Dot */}
                    <div className="absolute left-2.5 top-2 w-3 h-3 rounded-full bg-narra-border group-hover:bg-narra-accent transition-colors" />

                    <div
                      className={`card p-4 transition-colors ${
                        selectedEvent === event.id
                          ? "border-narra-accent"
                          : "group-hover:border-narra-border/80"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold">{event.title}</h3>
                          {event.narrativeDate && (
                            <span className="text-sm text-narra-accent">{event.narrativeDate}</span>
                          )}
                        </div>
                      </div>

                      {event.description && (
                        <p className="text-sm text-narra-muted mt-2 line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mt-3">
                        {event.characters.map((c) => (
                          <span key={c.character.id} className="badge border-narra-border text-xs">
                            {c.character.alias || `${c.character.firstName} ${c.character.lastName}`}
                          </span>
                        ))}
                        {event.organizations.map((o) => (
                          <span key={o.id} className="badge border-narra-border text-xs">
                            {o.name}
                          </span>
                        ))}
                        {event.location && (
                          <span className="badge border-narra-border text-xs">
                            📍 {event.location.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
