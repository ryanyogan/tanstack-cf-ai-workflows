import { getLink } from '@repo/data-ops/queries/links';
import { linkSchema, LinkSchemaType } from '@repo/data-ops/zod-schema/links';
import { LinkClickMessageType } from '@repo/data-ops/zod-schema/queue';
import moment from 'moment';

async function getLinkMetaFromKV(env: Env, id: string) {
	const linkInformation = await env.CACHE.get(id);
	if (!linkInformation) return null;

	try {
		const parsedLinkInformation = JSON.parse(linkInformation);
		return linkSchema.parse(parsedLinkInformation);
	} catch (error) {
		return null;
	}
}

async function saveLinkToKV(env: Env, id: string, linkInformation: LinkSchemaType) {
	const TTL_TIME = 60 * 60 * 24;

	try {
		await env.CACHE.put(id, JSON.stringify(linkInformation), {
			expirationTtl: TTL_TIME,
		});
	} catch (error) {
		console.error('Error saving link information to KV: ', error);
	}
}

export async function getRoutingDestinations(env: Env, id: string) {
	const linkInformation = await getLinkMetaFromKV(env, id);
	if (linkInformation) return linkInformation;

	const linkInformationFromDB = await getLink(id);
	if (!linkInformationFromDB) return null;

	await saveLinkToKV(env, id, linkInformationFromDB);
	return linkInformationFromDB;
}

export function getDestinationForCountry(linkInformation: LinkSchemaType, countryCode?: string) {
	if (!countryCode) {
		return linkInformation.destinations.default;
	}

	if (linkInformation.destinations[countryCode]) {
		return linkInformation.destinations[countryCode];
	}

	return linkInformation.destinations.default;
}

export async function scheduleEvaluationWorkflow(env: Env, event: LinkClickMessageType) {
	const doId = env.EVALUATION_SCHEDULER.idFromName(`${event.data.id}:${event.data.accountId}`);
	const stub = env.EVALUATION_SCHEDULER.get(doId);
	await stub.collectLinkClick(event.data.accountId, event.data.id, event.data.destination, event.data.country || 'UNKNOWN');
}

export async function captureLinkClickInBackground(env: Env, event: LinkClickMessageType) {
	await env.QUEUE.send(event);
	if (!event.data.latitude || !event.data.longitude || !event.data.country) return;

	const doId = env.LINK_CLICK_TRACKER_OBJECT.idFromName(event.data.accountId);
	const stub = env.LINK_CLICK_TRACKER_OBJECT.get(doId);
	await stub.addClick(event.data.latitude, event.data.longitude, event.data.country, moment().valueOf());
}
