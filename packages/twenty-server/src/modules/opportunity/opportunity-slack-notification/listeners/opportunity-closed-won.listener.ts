import { Injectable, Scope } from '@nestjs/common';

import { type ObjectRecordUpdateEvent } from 'twenty-shared/database-events';

import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import {
  OpportunityClosedWonSlackJob,
  type OpportunityClosedWonSlackJobData,
} from 'src/modules/opportunity/opportunity-slack-notification/jobs/opportunity-closed-won-slack.job';
import { type OpportunityWorkspaceEntity } from 'src/modules/opportunity/standard-objects/opportunity.workspace-entity';

// The pipeline stage that counts as a won deal (SELECT option `value`).
const CLOSED_WON_STAGE = 'CLOSED_WON';

@Injectable({ scope: Scope.REQUEST })
export class OpportunityClosedWonListener {
  constructor(
    @InjectMessageQueue(MessageQueue.webhookQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {}

  @OnDatabaseBatchEvent('opportunity', DatabaseEventAction.UPDATED)
  async handleOpportunityUpdated(
    payload: WorkspaceEventBatch<
      ObjectRecordUpdateEvent<OpportunityWorkspaceEntity>
    >,
  ): Promise<void> {
    for (const event of payload.events) {
      const { updatedFields, before, after } = event.properties;

      // Only react when `stage` actually transitioned INTO Closed-Won, so we
      // don't re-notify on unrelated edits or when it was already won.
      const stageChanged = updatedFields?.includes('stage');
      const becameClosedWon =
        after?.stage === CLOSED_WON_STAGE &&
        before?.stage !== CLOSED_WON_STAGE;

      if (!stageChanged || !becameClosedWon) {
        continue;
      }

      await this.messageQueueService.add<OpportunityClosedWonSlackJobData>(
        OpportunityClosedWonSlackJob.name,
        {
          workspaceId: payload.workspaceId,
          opportunityId: after.id,
          opportunityName: after.name ?? 'Untitled opportunity',
          amountMicros: after.amount?.amountMicros ?? null,
          currencyCode: after.amount?.currencyCode ?? null,
          closeDate: after.closeDate
            ? new Date(after.closeDate).toISOString()
            : null,
        },
      );
    }
  }
}
