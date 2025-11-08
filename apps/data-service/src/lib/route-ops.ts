import { getLink } from '@repo/data-ops/queries/links';
import { linkSchema, LinkSchemaType } from '@repo/data-ops/zod-schema/links';

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
