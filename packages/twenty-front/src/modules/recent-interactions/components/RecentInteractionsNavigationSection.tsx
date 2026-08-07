import { t } from '@lingui/core/macro';
import { useLocation } from 'react-router-dom';
import { IconHistory } from 'twenty-ui/icon';

import { NavigationDrawerItem } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';
import { NavigationDrawerSection } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSection';

export const RECENT_INTERACTIONS_PATH = '/recent-interactions';

export const RecentInteractionsNavigationSection = () => {
  const { pathname } = useLocation();

  return (
    <NavigationDrawerSection>
      <NavigationDrawerItem
        label={t`Recent Interactions`}
        to={RECENT_INTERACTIONS_PATH}
        Icon={IconHistory}
        active={pathname === RECENT_INTERACTIONS_PATH}
      />
    </NavigationDrawerSection>
  );
};
