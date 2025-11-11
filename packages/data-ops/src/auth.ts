import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "./db/database";
import {
  user,
  session,
  account,
  verification,
} from "@/drizzle-out/auth-schema";

import Stripe from "stripe";
import { stripe } from "@better-auth/stripe";

type StripeConfig = {
  stripeWebhookSecret: string;
  plans: any[];
  stripeApiKey?: string;
};

let auth: ReturnType<typeof betterAuth>;

export function createBetterAuth(
  database: NonNullable<Parameters<typeof betterAuth>[0]>["database"],
  stripeConfig?: StripeConfig,
  google?: { clientId: string; clientSecret: string },
): ReturnType<typeof betterAuth> {
  return betterAuth({
    database,
    emailAndPassword: {
      enabled: false,
    },
    socialProviders: {
      google: {
        clientId: google?.clientId ?? "",
        clientSecret: google?.clientSecret ?? "",
      },
    },
    plugins: [
      stripe({
        stripeClient: new Stripe(
          stripeConfig?.stripeApiKey || process.env.STRIPE_SECRET_KEY!,
          {
            apiVersion: "2025-07-30.basil",
          },
        ),
        stripeWebhookSecret:
          stripeConfig?.stripeWebhookSecret ??
          process.env.STRIPE_WEBHOOK_SECRET!,
        createCustomerOnSignUp: true,
        subscription: {
          enabled: true,
          plans: stripeConfig?.plans || [],
        },
      }),
    ],
  });
}

export function getAuth(
  google: {
    clientId: string;
    clientSecret: string;
  },
  stripeConfig: StripeConfig,
): ReturnType<typeof betterAuth> {
  if (auth) return auth;

  auth = createBetterAuth(
    drizzleAdapter(getDb(), {
      provider: "sqlite",
      schema: {
        user,
        session,
        account,
        verification,
      },
    }),
    stripeConfig,
    google,
  );

  return auth;
}
