import 'server-only';
import { readUsageReconciliation } from '@/lib/db/serviceClient';

/** Called only after the scheduler's constant-time secret check. Reporting never repairs drift. */
export const reportScheduledUsage = readUsageReconciliation;
