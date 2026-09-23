"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckCircle,
  Package,
  Truck,
  Star,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface TimelineEvent {
  id: string;
  event_type: string;
  event_title: string;
  event_description?: string;
  created_at: string;
  created_by?: string;
  metadata?: any;
}

interface DealTimelineProps {
  events: TimelineEvent[];
}

const eventIcons: Record<string, React.ReactNode> = {
  order_created: <CheckCircle className="h-5 w-5 text-green-600" />,
  status_changed: <Clock className="h-5 w-5 text-blue-600" />,
  item_updated: <Package className="h-5 w-5 text-purple-600" />,
  shipped: <Truck className="h-5 w-5 text-orange-600" />,
  delivered: <CheckCircle className="h-5 w-5 text-green-700" />,
  cancelled: <XCircle className="h-5 w-5 text-red-600" />,
  note_added: <AlertCircle className="h-5 w-5 text-yellow-600" />,
  rating_submitted: <Star className="h-5 w-5 text-amber-500" />,
};

export function DealTimeline({ events }: DealTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          سجل الأحداث
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute right-[1.4rem] top-2 bottom-2 w-0.5 bg-border" />

          <div className="space-y-6">
            {events.map((event, index) => (
              <div key={event.id} className="relative flex gap-4">
                {/* Timeline dot */}
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-background border-2 border-primary">
                  {eventIcons[event.event_type] || (
                    <Clock className="h-5 w-5 text-primary" />
                  )}
                </div>

                {/* Event content */}
                <div className="flex-1 pb-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-semibold">{event.event_title}</h4>
                      {event.event_description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {event.event_description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(event.created_at).toLocaleString("ar-SA")}
                    </span>
                  </div>

                  {event.metadata && (
                    <div className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      {JSON.stringify(event.metadata, null, 2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
