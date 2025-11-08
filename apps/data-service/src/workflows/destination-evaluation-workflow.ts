import { WorkflowEntrypoint, WorkflowStep } from 'cloudflare:workers';
import { collectDestinationInformation } from '@/lib/browser-render';
import { aiDestinationEvaluator } from '@/lib/ai-destination-evaluation';
import { addEvaluation } from '@repo/data-ops/queries/evaluations';
import { initDatabase } from '@repo/data-ops/database';
import { v4 as uuidv4 } from 'uuid';

export class DestinationEvaluationWorkflow extends WorkflowEntrypoint<Env, DestinationStatusEvaluationParams> {
	async run(event: Readonly<CloudflareWorkersModule.WorkflowEvent<DestinationStatusEvaluationParams>>, step: WorkflowStep) {
		initDatabase(this.env.DB);

		const evaluationInformation = await step.do(
			'Collect rendered destination page data',
			{
				retries: {
					limit: 1,
					delay: 1000,
				},
			},
			async () => {
				const evaluationId = uuidv4();
				const data = await collectDestinationInformation(this.env, event.payload.destinationUrl);
				const accountId = event.payload.accountId;
				const r2pathHtml = `evaluations/${accountId}/html/${evaluationId}`;
				const r2pathBodyText = `evaluations/${accountId}/body-text/${evaluationId}`;
				const r2pathScreenshot = `evaluations/${accountId}/screenshots/${evaluationId}.png`;

				// Convert base64 data URL to buffer for R2 storage
				const screenshotBase64 = data.screenshotDataUrl.replace(/^data:image\/png;base64,/, '');
				const screenshotBuffer = Buffer.from(screenshotBase64, 'base64');

				await this.env.EVAL_BUCKET.put(r2pathHtml, data.html);
				await this.env.EVAL_BUCKET.put(r2pathBodyText, data.bodyText);
				await this.env.EVAL_BUCKET.put(r2pathScreenshot, screenshotBuffer);

				return {
					bodyText: data.bodyText,
					evaluationId,
				};
			},
		);

		const aiStatus = await step.do(
			'Use AI to check status of page',
			{
				retries: {
					limit: 0,
					delay: 0,
				},
			},
			async () => {
				return await aiDestinationEvaluator(this.env, evaluationInformation.bodyText);
			},
		);

		await step.do('Save evaluation data in D1', async () => {
			return await addEvaluation({
				evaluationId: evaluationInformation.evaluationId,
				linkId: event.payload.linkId,
				status: aiStatus.status,
				reason: aiStatus.statusReason,
				accountId: event.payload.accountId,
				destinationUrl: event.payload.destinationUrl,
			});
		});
	}
}
