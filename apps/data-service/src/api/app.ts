import { getDestinationForCountry, getRoutingDestinations } from '@/lib/route-ops';
import { cloudflareInfoSchema } from '@repo/data-ops/zod-schema/links';
import { LinkClickMessageType } from '@repo/data-ops/zod-schema/queue';
import { Hono } from 'hono';

export const App = new Hono<{ Bindings: Env }>();

App.get('/:id', async (c) => {
	const id = c.req.param('id');
	const linkInformation = await getRoutingDestinations(c.env, id);

	if (!linkInformation) {
		return c.text('Destination not found', 404);
	}

	const cfHeaders = cloudflareInfoSchema.safeParse(c.req.raw.cf);
	if (!cfHeaders.success) {
		return c.text('Invalid Cloudflare Headers', 400);
	}

	const headers = cfHeaders.data;
	const destination = getDestinationForCountry(linkInformation, headers.country);

	const queueMessage: LinkClickMessageType = {
		type: 'LINK_CLICK',
		data: {
			id,
			country: headers.country,
			destination,
			accountId: linkInformation.accountId,
			latitude: headers.latitude,
			longitude: headers.longitude,
			timestamp: new Date().toISOString(),
		},
	};

	c.executionCtx.waitUntil(c.env.QUEUE.send(queueMessage));

	return c.redirect(destination);
});
