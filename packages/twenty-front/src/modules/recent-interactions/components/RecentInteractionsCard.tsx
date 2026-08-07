import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { Link } from 'react-router-dom';
import { Card, CardHeader } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { RecentInteractionsList } from '@/recent-interactions/components/RecentInteractionsList';

const PEOPLE_INDEX_PATH = '/objects/people';

const StyledContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const StyledCardHeader = styled(CardHeader)`
  align-items: center;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-weight: ${themeCssVariables.font.weight.semiBold};
  justify-content: space-between;
`;

const StyledSeeAllLink = styled(Link)`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.regular};
  text-decoration: none;

  &:hover {
    color: ${themeCssVariables.font.color.secondary};
  }
`;

export const RecentInteractionsCard = () => {
  return (
    <StyledContainer>
      <Card fullWidth rounded>
        <StyledCardHeader>
          {t`Recent Interactions`}
          <StyledSeeAllLink to={PEOPLE_INDEX_PATH}>{t`See all`}</StyledSeeAllLink>
        </StyledCardHeader>
        <RecentInteractionsList />
      </Card>
    </StyledContainer>
  );
};
