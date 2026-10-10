import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(100),
  email: z.string().trim().email('Enter a valid email address.').max(254),
  subject: z.string().trim().min(3, 'Add a short subject.').max(160),
  message: z.string().trim().min(10, 'Write at least 10 characters.').max(5000),
  website: z.string().max(0, 'Please try again.').optional().default('')
}).strict();

export type ContactInput = z.infer<typeof contactSchema>;

/** A small additional process-local guard; the database enforces the durable limit. */
export class RequestLimiter {
  private readonly buckets = new Map<string, { count: number; until: number }>();
  constructor(private readonly limit = 5, private readonly windowMs = 600_000) {}
  consume(key: string, now = Date.now()) {
    for (const [bucketKey, bucket] of Array.from(this.buckets.entries())) {
      if (bucket.until <= now) this.buckets.delete(bucketKey);
    }
    const current = this.buckets.get(key);
    if (!current) {
      // Bound memory during bursts from many distinct clients.
      if (this.buckets.size >= 10_000) return false;
      this.buckets.set(key, { count: 1, until: now + this.windowMs });
      return true;
    }
    current.count += 1;
    return current.count <= this.limit;
  }
}
