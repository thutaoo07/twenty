import { Module } from '@nestjs/common';

import { OpportunityClosedWonSlackJob } from 'src/modules/opportunity/opportunity-slack-notification/jobs/opportunity-closed-won-slack.job';
import { OpportunityClosedWonListener } from 'src/modules/opportunity/opportunity-slack-notification/listeners/opportunity-closed-won.listener';

@Module({
  imports: [],
  providers: [OpportunityClosedWonListener, OpportunityClosedWonSlackJob],
  exports: [],
})
export class OpportunitySlackNotificationModule {}
