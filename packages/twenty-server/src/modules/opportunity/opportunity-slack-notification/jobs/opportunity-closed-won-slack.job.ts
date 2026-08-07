import { Logger, Scope } from '@nestjs/common';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';

export type OpportunityClosedWonSlackJobData = {
  workspaceId: string;
  opportunityId: string;
  opportunityName: string;
  amountMicros: number | null;
  currencyCode: string | null;
  closeDate: string | null;
};

@Processor({
  queueName: MessageQueue.webhookQueue,
  scope: Scope.REQUEST,
})
export class OpportunityClosedWonSlackJob {
  private readonly logger = new Logger(OpportunityClosedWonSlackJob.name);

  @Process(OpportunityClosedWonSlackJob.name)
  async handle(data: OpportunityClosedWonSlackJobData): Promise<void> {
    const webhookUrl = process.env.OPPORTUNITY_SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
      this.logger.warn(
        `OPPORTUNITY_SLACK_WEBHOOK_URL is not set — skipping Slack notification for won deal "${data.opportunityName}".`,
      );

      return;
    }

    const formattedAmount = this.formatAmount(
      data.amountMicros,
      data.currencyCode,
    );

    const message = {
      text: `:tada: Deal Closed-Won: ${data.opportunityName}${
        formattedAmount ? ` (${formattedAmount})` : ''
      }`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:tada: *Deal Closed-Won!*\n*${data.opportunityName}*`,
          },
        },
        {
          type: 'section',
          fields: [
            ...(formattedAmount
              ? [{ type: 'mrkdwn', text: `*Amount:*\n${formattedAmount}` }]
              : []),
            ...(data.closeDate
              ? [
                  {
                    type: 'mrkdwn',
                    text: `*Close date:*\n${new Date(
                      data.closeDate,
                    ).toLocaleDateString('en-US')}`,
                  },
                ]
              : []),
          ],
        },
      ],
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const body = await response.text();

        this.logger.error(
          `Slack webhook returned ${response.status} for won deal "${data.opportunityName}": ${body}`,
        );

        return;
      }

      this.logger.log(
        `Sent Slack Closed-Won notification for "${data.opportunityName}".`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to POST Slack notification for "${data.opportunityName}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private formatAmount(
    amountMicros: number | null,
    currencyCode: string | null,
  ): string | null {
    if (amountMicros === null || amountMicros === undefined) {
      return null;
    }

    const amount = amountMicros / 1_000_000;

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode ?? 'USD',
      }).format(amount);
    } catch {
      return `${amount} ${currencyCode ?? ''}`.trim();
    }
  }
}
