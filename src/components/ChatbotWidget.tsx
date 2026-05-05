import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'bot' | 'user';
  text: string;
  suggestions?: string[];
}

interface FaqEntry {
  keywords: string[];
  answer: string;
  followUps?: string[];
}

const FAQS: FaqEntry[] = [
  {
    keywords: ['book', 'booking', 'order', 'how do i book', 'place an order'],
    answer:
      'To book a service, click **Book Now** at the top of any page or on a vendor profile. Choose a category (e.g. Laundry, Sofa Cleaning), fill in your address and preferred time, and we\'ll either send the request to your selected vendor or broadcast it to nearby providers.',
    followUps: ['How do I cancel?', 'How is pricing calculated?'],
  },
  {
    keywords: ['cancel', 'cancellation', 'refund'],
    answer:
      'You can cancel a booking anytime before the provider marks it as **In Progress**. Open **My Bookings**, select the booking, and tap **Cancel**. Cancellations after work has started may incur a small fee.',
  },
  {
    keywords: ['price', 'pricing', 'cost', 'how much', 'rate'],
    answer:
      'Pricing varies by service category and provider. Vendors list base prices on their profile, and you\'ll get a final quote once the provider confirms your booking. There are no platform fees for customers.',
  },
  {
    keywords: ['payment', 'pay', 'mpesa', 'cash'],
    answer:
      'Payments are made directly to the provider — usually via M-Pesa or cash on delivery. Confirm preferred payment with the provider before booking.',
  },
  {
    keywords: ['vendor', 'list business', 'become vendor', 'sign up vendor', 'register'],
    answer:
      'To list your laundry shop or cleaning business, click **List Your Business** at the top. You\'ll complete a 14-step onboarding (business details, services, hours, photos, location). Admins review and approve within 24-48 hours.',
  },
  {
    keywords: ['provider', 'mamafua', 'independent', 'become provider'],
    answer:
      'Independent providers (like Mamafua) can sign up at **/provider/onboarding**. You\'ll receive on-demand job broadcasts within your service radius and accept on a first-come basis.',
  },
  {
    keywords: ['areas', 'neighborhood', 'location', 'where', 'serve'],
    answer:
      'We currently serve all major Nairobi neighborhoods including Westlands, Kilimani, Lavington, Karen, Runda, Parklands, Eastleigh, South B, South C, Embakasi, Donholm, and more. Browse by neighborhood from the **Neighborhoods** page.',
  },
  {
    keywords: ['service', 'services', 'what do you', 'offer', 'category'],
    answer:
      'We support **Laundry**, **Dry Cleaning**, **Ironing**, **Pickup & Delivery**, **Sofa & Upholstery Cleaning**, **Carpet Cleaning**, **Mattress Cleaning**, **House Cleaning**, **Office Cleaning**, **Mamafua (Domestic Help)**, and **Move-in/Move-out Cleaning**.',
  },
  {
    keywords: ['contact', 'support', 'help', 'human', 'agent'],
    answer:
      'I can connect you with our support team. Click **Talk to a human** below to send a message — we usually respond within a few hours.',
  },
  {
    keywords: ['review', 'rating', 'rate'],
    answer:
      'You can leave a review after a booking is marked **Completed**. Open the booking detail page and tap **Write a review**. Reviews help other customers and reward great providers.',
  },
];

const QUICK_PROMPTS = [
  'How do I book a service?',
  'How much does it cost?',
  'How do I become a vendor?',
  'What areas do you serve?',
];

const findAnswer = (text: string): FaqEntry | null => {
  const t = text.toLowerCase();
  let best: { entry: FaqEntry; hits: number } | null = null;
  for (const entry of FAQS) {
    const hits = entry.keywords.filter((k) => t.includes(k)).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { entry, hits };
  }
  return best?.entry ?? null;
};

const ChatbotWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: "Hi! I'm the LaundryLink assistant. Ask me anything about bookings, vendors, or our services.",
      suggestions: QUICK_PROMPTS,
    },
  ]);
  const [input, setInput] = useState('');
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketEmail, setTicketEmail] = useState('');
  const [ticketName, setTicketName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, showTicketForm]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text };
    const entry = findAnswer(text);
    const botMsg: Message = entry
      ? {
          id: crypto.randomUUID(),
          role: 'bot',
          text: entry.answer,
          suggestions: entry.followUps,
        }
      : {
          id: crypto.randomUUID(),
          role: 'bot',
          text:
            "I'm not sure about that one. You can pick a topic below or **Talk to a human** and our support team will reply.",
          suggestions: QUICK_PROMPTS,
        };
    setMessages((m) => [...m, userMsg, botMsg]);
    setInput('');
  };

  const submitTicket = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      toast.error('Please fill in subject and message');
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('support_tickets').insert({
        user_id: user?.id ?? null,
        customer_name: ticketName || user?.user_metadata?.full_name || null,
        customer_email: ticketEmail || user?.email || null,
        subject: ticketSubject,
        message: ticketMessage,
      });
      if (error) throw error;
      toast.success('Message sent! Our team will respond shortly.');
      setShowTicketForm(false);
      setTicketSubject('');
      setTicketMessage('');
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'bot',
          text: "Thanks! Your message is in. We'll be in touch via email soon.",
        },
      ]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-4 z-50 flex h-[560px] max-h-[80vh] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:right-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3">
              <div>
                <p className="font-display text-sm font-semibold text-primary-foreground">LaundryLink Assistant</p>
                <p className="text-xs text-primary-foreground/80">Typically replies instantly</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-primary-foreground hover:bg-primary-foreground/10"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'rounded-br-sm bg-primary text-primary-foreground'
                        : 'rounded-bl-sm bg-secondary text-secondary-foreground'
                    }`}
                    dangerouslySetInnerHTML={{
                      __html: m.text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'),
                    }}
                  />
                </div>
              ))}
              {/* Suggestions */}
              {messages.length > 0 && messages[messages.length - 1].role === 'bot' && messages[messages.length - 1].suggestions && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {messages[messages.length - 1].suggestions!.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground transition-colors hover:border-primary hover:bg-secondary"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {showTicketForm && (
                <div className="space-y-2 rounded-xl border border-border bg-background p-3">
                  <p className="text-xs font-semibold text-foreground">Talk to a human</p>
                  <Input
                    placeholder="Your name (optional)"
                    value={ticketName}
                    onChange={(e) => setTicketName(e.target.value)}
                    className="h-8 text-xs"
                    maxLength={120}
                  />
                  <Input
                    placeholder="Email (so we can reply)"
                    type="email"
                    value={ticketEmail}
                    onChange={(e) => setTicketEmail(e.target.value)}
                    className="h-8 text-xs"
                    maxLength={160}
                  />
                  <Input
                    placeholder="Subject"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    className="h-8 text-xs"
                    maxLength={200}
                  />
                  <Textarea
                    placeholder="How can we help?"
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    className="text-xs"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => setShowTicketForm(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" className="flex-1 h-8 text-xs" onClick={submitTicket} disabled={submitting}>
                      {submitting && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      Send
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer / Input */}
            <div className="border-t border-border bg-background p-3">
              {!showTicketForm && (
                <button
                  onClick={() => setShowTicketForm(true)}
                  className="mb-2 w-full rounded-md border border-dashed border-border py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  💬 Talk to a human
                </button>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question..."
                  className="h-9 text-sm"
                  maxLength={300}
                />
                <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={!input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        className="fixed bottom-5 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:bg-primary/90 sm:right-6"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
};

export default ChatbotWidget;
