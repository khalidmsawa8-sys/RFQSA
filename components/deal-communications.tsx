"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const supabase = createClient();

interface Communication {
  id: string;
  message: string;
  sender_role: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface DealCommunicationsProps {
  orderId: string;
  userRole: "client" | "vendor";
  initialCommunications: Communication[];
}

export function DealCommunications({
  orderId,
  userRole,
  initialCommunications,
}: DealCommunicationsProps) {
  const [communications, setCommunications] = useState(initialCommunications);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const channel = supabase
      .channel(`deal-communications-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "deal_communications",
          filter: `order_id=eq.${orderId}`,
        },
        (payload: any) => {
          setCommunications((prev) => [payload.new as Communication, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, supabase]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setIsSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { error } = await supabase.from("deal_communications").insert({
      order_id: orderId,
      sender_id: user.id,
      sender_role: userRole,
      message: newMessage.trim(),
    });

    if (!error) {
      setNewMessage("");
      router.refresh();
    }

    setIsSending(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          المحادثات
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Message input */}
        <div className="mb-6 flex gap-2">
          <Textarea
            placeholder="اكتب رسالتك هنا..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <Button
            onClick={handleSend}
            disabled={isSending || !newMessage.trim()}
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages list */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {communications.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              لا توجد رسائل بعد
            </p>
          ) : (
            communications.map((comm) => {
              const isMyMessage = comm.sender_role === userRole;
              return (
                <div
                  key={comm.id}
                  className={`flex gap-3 ${
                    isMyMessage ? "flex-row-reverse" : ""
                  }`}
                >
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div
                    className={`flex-1 ${
                      isMyMessage ? "text-right" : "text-left"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">
                        {comm.profiles?.full_name || "مستخدم"}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs"
                      >
                        {comm.sender_role === "client" ? "عميل" : "مورد"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comm.created_at).toLocaleString("ar-SA")}
                      </span>
                    </div>
                    <div
                      className={`p-3 rounded-lg ${
                        isMyMessage
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {comm.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
