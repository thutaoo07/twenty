import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { IconHistory } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { RecentInteractionsCard } from '@/recent-interactions/components/RecentInteractionsCard';
import { PageBody } from '@/ui/layout/page/components/PageBody';
import { PageContainer } from '@/ui/layout/page/components/PageContainer';
import { PageHeader } from '@/ui/layout/page/components/PageHeader';

const StyledContent = styled.div`
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  padding: ${themeCssVariables.spacing[6]};
  width: 100%;
`;

const StyledCardWrapper = styled.div`
  max-width: 480px;
  width: 100%;
`;

export const RecentInteractionsPage = () => {
  return (
    <PageContainer>
      <PageHeader title={t`Recent Interactions`} Icon={IconHistory} />
      <PageBody>
        <StyledContent>
          <StyledCardWrapper>
            <RecentInteractionsCard />
          </StyledCardWrapper>
        </StyledContent>
      </PageBody>
    </PageContainer>
  );
};
