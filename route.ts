import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

// Next.js App Router route configuration to bypass automatic body parsing:
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("Stripe-Signature");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing stripe signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const session = event.data.object as any;

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const stripeSub = event.data.object as any;
        
        // Find organization by Stripe customer ID
        let org = await prisma.organization.findUnique({
          where: { stripeCustomerId: stripeSub.customer as string },
        });

        if (!org) {
          // Fallback: check metadata on customer/subscription
          const orgId = stripeSub.metadata.organizationId;
          if (orgId) {
            org = await prisma.organization.findUnique({ where: { id: orgId } });
            if (org) {
              await prisma.organization.update({
                where: { id: org.id },
                data: { stripeCustomerId: stripeSub.customer as string },
              });
            }
          }
        }

        if (!org) {
          console.error(`Organization not found for customer ${stripeSub.customer}`);
          break;
        }

        // Find Plan mapping to Stripe Price ID
        const priceId = stripeSub.items.data[0].price.id;
        let plan = await prisma.plan.findUnique({
          where: { stripePriceId: priceId },
        });

        if (!plan) {
          // If no plan matches, fallback to check metadata planId
          const planId = stripeSub.metadata.planId;
          if (planId) {
            plan = await prisma.plan.findUnique({ where: { id: planId } });
          }
        }

        if (!plan) {
          console.error(`Plan not found for stripe price ID ${priceId}`);
          break;
        }

        const startPeriod = new Date(stripeSub.current_period_start * 1000);
        const endPeriod = new Date(stripeSub.current_period_end * 1000);

        // Update or create subscription in our database
        await prisma.subscription.upsert({
          where: { stripeSubscriptionId: stripeSub.id },
          update: {
            status: stripeSub.status,
            planId: plan.id,
            currentPeriodStart: startPeriod,
            currentPeriodEnd: endPeriod,
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
          },
          create: {
            organizationId: org.id,
            stripeSubscriptionId: stripeSub.id,
            status: stripeSub.status,
            planId: plan.id,
            currentPeriodStart: startPeriod,
            currentPeriodEnd: endPeriod,
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
          },
        });

        console.log(`Synced subscription ${stripeSub.id} for organization ${org.name}`);
        break;
      }

      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as any;

        // Downgrade organization back to the Free plan
        const org = await prisma.organization.findUnique({
          where: { stripeCustomerId: stripeSub.customer as string },
        });

        if (org) {
          const freePlan = await prisma.plan.findFirst({
            where: { name: "Free" },
          });

          if (freePlan) {
            const currentStart = new Date();
            const currentEnd = new Date();
            currentEnd.setMonth(currentEnd.getMonth() + 1);

            // Revert active subscription back to Free plan
            await prisma.subscription.updateMany({
              where: { organizationId: org.id },
              data: {
                stripeSubscriptionId: null,
                status: "active",
                planId: freePlan.id,
                currentPeriodStart: currentStart,
                currentPeriodEnd: currentEnd,
                cancelAtPeriodEnd: false,
              },
            });

            console.log(`Downgraded organization ${org.name} to Free plan due to Stripe subscription cancellation.`);
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const stripeInvoice = event.data.object as any;

        if (!stripeInvoice.customer) {
          break;
        }

        const org = await prisma.organization.findUnique({
          where: { stripeCustomerId: stripeInvoice.customer as string },
        });

        if (org) {
          // Log the paid invoice in our records
          await prisma.invoice.upsert({
            where: { stripeInvoiceId: stripeInvoice.id as string },
            update: {
              status: "paid",
              pdfUrl: stripeInvoice.invoice_pdf,
            },
            create: {
              organizationId: org.id,
              stripeInvoiceId: stripeInvoice.id as string,
              amount: stripeInvoice.amount_paid / 100, // convert cents to dollars
              status: "paid",
              pdfUrl: stripeInvoice.invoice_pdf,
              billingDate: new Date(stripeInvoice.created * 1000),
            },
          });
          console.log(`Invoice ${stripeInvoice.id} payment_succeeded logged for organization ${org.name}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const stripeInvoice = event.data.object as any;

        if (!stripeInvoice.customer) {
          break;
        }

        const org = await prisma.organization.findUnique({
          where: { stripeCustomerId: stripeInvoice.customer as string },
        });

        if (org) {
          // Log failed invoice
          await prisma.invoice.upsert({
            where: { stripeInvoiceId: stripeInvoice.id as string },
            update: {
              status: "open", // payment failed, remaining open
            },
            create: {
              organizationId: org.id,
              stripeInvoiceId: stripeInvoice.id as string,
              amount: stripeInvoice.amount_due / 100,
              status: "open",
              pdfUrl: stripeInvoice.invoice_pdf || null,
              billingDate: new Date(stripeInvoice.created * 1000),
            },
          });

          // Mark subscription status as past_due in the DB
          if (stripeInvoice.subscription) {
            await prisma.subscription.updateMany({
              where: { stripeSubscriptionId: stripeInvoice.subscription as string },
              data: {
                status: "past_due",
              },
            });
          }

          console.log(`Invoice ${stripeInvoice.id} payment_failed logged for organization ${org.name}`);
        }
        break;
      }

      default:
        console.log(`Unhandled stripe webhook event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook event handler processing error:", err);
    return NextResponse.json({ error: "Webhook event handler processing failed" }, { status: 500 });
  }
}
