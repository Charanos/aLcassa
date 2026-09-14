# Update for Brian — 14 September 2026

Hi Brian,

Quick update on where aLcassa has got to.

**The big one: customer separation is now proven.** This is the thing the whole
product rests on — that one customer cannot reach another customer's data. It is
no longer something we assert, it is something the system checks itself. 280
automated tests run against the real database on every change, and all 280 pass.
That was the gate on milestone M1 and it is met.

**Four of the eight milestones are complete.** Design lock, tenancy, accounts and
subscriptions are all finished and demonstrable. You can sign in, invite a
colleague, change someone's role, transfer ownership, assign a plan, and watch a
workspace be stopped at its seat limit — all working, all recorded.

**The admin console is the current work and it is roughly four-fifths there.**
Workspaces, revenue, plans, the activity record, support sessions and the
operator's own profile are all running on real data rather than placeholders.
This week the profile screen was finished properly — photo upload, device
management, the ability to sign a lost laptop out remotely, and a record of
every action the operator has taken. What remains on the console is a final pass
over four screens to bring their editing controls up to the same standard, plus a
design polish across the set.

**Assistant rules have unblocked.** That was waiting on a decision about how the
rules are structured; the decision is made and the work is moving again.

**Nothing is currently stuck.** Two things did stop us this week and both are
resolved: the Supabase project had been suspended for inactivity and needed
restoring, and a fault in our account setup was preventing sign-in. Both fixed.

**One thing needs your decision.** The database is on a free tier that goes to
sleep when it is idle, and when it sleeps the whole application is down. That is
what cost us time this week. Before any demonstration to a customer, it needs to
move to a paid tier — it is a small monthly cost and it removes the risk of the
product being unavailable at the worst possible moment.

**On timing.** I would expect the remaining console work to take four to six
working days, and the customer-facing settings screens another three to four,
plus a day for handover documentation and staging. So roughly two working weeks
to a state I would be comfortable putting in front of a paying customer.

The one thing that could move that is if a screen turns out to be drawn against
data the system does not actually hold. That has happened twice and cost about a
day each time. It is the main source of uncertainty in the estimate, and it is
also why we are checking every screen against the real database rather than
trusting the designs.

**On the point-of-sale project** — the remaining work here is repetitive rather
than uncertain. The hard problems are solved. If that timeline is tight, we could
bring forward the four screens a customer actually sees in a demonstration and
schedule the operator-only screens after, which would give us something
presentable in three to four days.

The live tracker at `/project-tracker` has the milestone detail if you want it.

Dennis
