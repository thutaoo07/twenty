import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { useContext, useMemo } from 'react';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { ThemeContext, themeCssVariables } from 'twenty-ui/theme-constants';

import { RecordChip } from '@/object-record/components/RecordChip';
import { useGenerateDepthRecordGqlFieldsFromObject } from '@/object-record/graphql/record-gql-fields/hooks/useGenerateDepthRecordGqlFieldsFromObject';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { beautifyPastDateRelativeToNow } from '~/utils/date-utils';

export const RECENT_INTERACTIONS_LIMIT = 5;

type RecentInteraction = {
  record: ObjectRecord;
  objectNameSingular: string;
};

const StyledRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};

  &:not(:last-child) {
    border-bottom: 1px solid ${themeCssVariables.border.color.light};
  }
`;

const StyledUpdatedAt = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  white-space: nowrap;
`;

const StyledPlaceholder = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledSkeletonRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};

  &:not(:last-child) {
    border-bottom: 1px solid ${themeCssVariables.border.color.light};
  }
`;

const RecentInteractionsSkeleton = () => {
  const { theme } = useContext(ThemeContext);

  return (
    <SkeletonTheme
      baseColor={theme.background.quaternary}
      highlightColor={theme.background.secondary}
    >
      {Array.from({ length: RECENT_INTERACTIONS_LIMIT }).map((_, index) => (
        <StyledSkeletonRow key={`recent-interactions-skeleton-${index}`}>
          <Skeleton circle width={16} height={16} />
          <div style={{ flex: 1 }}>
            <Skeleton width={120} height={12} />
          </div>
          <Skeleton width={72} height={12} />
        </StyledSkeletonRow>
      ))}
    </SkeletonTheme>
  );
};

export const RecentInteractionsList = () => {
  const { recordGqlFields: personGqlFields } =
    useGenerateDepthRecordGqlFieldsFromObject({
      objectNameSingular: CoreObjectNameSingular.Person,
      depth: 0,
    });
  const { recordGqlFields: noteGqlFields } =
    useGenerateDepthRecordGqlFieldsFromObject({
      objectNameSingular: CoreObjectNameSingular.Note,
      depth: 0,
    });

  const { records: people, loading: peopleLoading } =
    useFindManyRecords<ObjectRecord>({
      objectNameSingular: CoreObjectNameSingular.Person,
      orderBy: [{ updatedAt: 'DescNullsLast' }],
      limit: RECENT_INTERACTIONS_LIMIT,
      recordGqlFields: personGqlFields,
      fetchPolicy: 'cache-and-network',
    });

  const { records: notes, loading: notesLoading } =
    useFindManyRecords<ObjectRecord>({
      objectNameSingular: CoreObjectNameSingular.Note,
      orderBy: [{ updatedAt: 'DescNullsLast' }],
      limit: RECENT_INTERACTIONS_LIMIT,
      recordGqlFields: noteGqlFields,
      fetchPolicy: 'cache-and-network',
    });

  const loading = peopleLoading || notesLoading;

  // Merge both record types into a single feed, most-recently-updated first.
  const interactions = useMemo<RecentInteraction[]>(() => {
    return [
      ...people.map((record) => ({
        record,
        objectNameSingular: CoreObjectNameSingular.Person,
      })),
      ...notes.map((record) => ({
        record,
        objectNameSingular: CoreObjectNameSingular.Note,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.record.updatedAt).getTime() -
          new Date(a.record.updatedAt).getTime(),
      )
      .slice(0, RECENT_INTERACTIONS_LIMIT);
  }, [people, notes]);

  if (loading && interactions.length === 0) {
    return <RecentInteractionsSkeleton />;
  }

  if (interactions.length === 0) {
    return <StyledPlaceholder>{t`No recent interactions`}</StyledPlaceholder>;
  }

  return (
    <>
      {interactions.map(({ record, objectNameSingular }) => (
        <StyledRow key={`${objectNameSingular}-${record.id}`}>
          <RecordChip
            objectNameSingular={objectNameSingular}
            record={record}
          />
          <StyledUpdatedAt>
            {beautifyPastDateRelativeToNow(record.updatedAt)}
          </StyledUpdatedAt>
        </StyledRow>
      ))}
    </>
  );
};
