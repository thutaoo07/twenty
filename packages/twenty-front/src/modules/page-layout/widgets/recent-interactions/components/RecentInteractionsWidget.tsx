import { styled } from '@linaria/react';

import { RecentInteractionsList } from '@/recent-interactions/components/RecentInteractionsList';

const StyledContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: auto;
  width: 100%;
`;

export const RecentInteractionsWidget = () => {
  return (
    <StyledContainer>
      <RecentInteractionsList />
    </StyledContainer>
  );
};
