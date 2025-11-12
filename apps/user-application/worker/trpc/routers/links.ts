import { t } from "@/worker/trpc/trpc-instance";
import { z } from "zod";
import {
  createLinkSchema,
  destinationsSchema,
} from "@repo/data-ops/zod-schema/links";
import {
  activeLinksLastHour,
  createLink,
  getLast24and48HourClicks,
  getLast30DaysClicks,
  getLast30DaysClicksByCountry,
  getLink,
  getLinks,
  totalLinkClicksLastHour,
  updateLinkDestinations,
  updateLinkName,
} from "@repo/data-ops/queries/links";

import { TRPCError } from "@trpc/server";

export const linksTrpcRoutes = t.router({
  linkList: t.procedure
    .input(
      z.object({
        offset: z.number().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      return await getLinks(ctx.userInfo.userId, input.offset?.toString());
    }),

  createLink: t.procedure
    .input(createLinkSchema)
    .mutation(async ({ input, ctx }) => {
      const id = await createLink({
        accountId: ctx.userInfo.userId,
        ...input,
      });

      return id;
    }),

  updateLinkName: t.procedure
    .input(
      z.object({
        linkId: z.string(),
        name: z.string().min(1).max(300),
      }),
    )
    .mutation(async ({ input }) => {
      await updateLinkName(input.linkId, input.name);
    }),

  getLink: t.procedure
    .input(
      z.object({
        linkId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const data = await getLink(input.linkId);
      if (!data) throw new TRPCError({ code: "NOT_FOUND" });
      return data;
    }),

  updateLinkDestinations: t.procedure
    .input(
      z.object({
        linkId: z.string(),
        destinations: destinationsSchema,
      }),
    )
    .mutation(async ({ input }) => {
      await updateLinkDestinations(input.linkId, input.destinations);
    }),

  activeLinks: t.procedure.query(async ({ ctx }) => {
    return activeLinksLastHour(ctx.userInfo.userId);
  }),

  totalLinkClickLastHour: t.procedure.query(async ({ ctx }) => {
    return await totalLinkClicksLastHour(ctx.userInfo.userId);
  }),

  last24HourClicks: t.procedure.query(async ({ ctx }) => {
    return await getLast24and48HourClicks(ctx.userInfo.userId);
  }),

  last30DaysClicks: t.procedure.query(async ({ ctx }) => {
    return await getLast30DaysClicks(ctx.userInfo.userId);
  }),

  clicksByCountry: t.procedure.query(async ({ ctx }) => {
    return await getLast30DaysClicksByCountry(ctx.userInfo.userId);
  }),
});
