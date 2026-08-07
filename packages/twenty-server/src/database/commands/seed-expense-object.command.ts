import { Logger } from '@nestjs/common';

import { Command, CommandRunner } from 'nest-commander';
import {
  FieldMetadataType,
  type RelationCreationPayload,
  RelationType,
} from 'twenty-shared/types';

import { type CreateFieldInput } from 'src/engine/metadata-modules/field-metadata/dtos/create-field.input';
import { FieldMetadataService } from 'src/engine/metadata-modules/field-metadata/services/field-metadata.service';
import { type CreateObjectInput } from 'src/engine/metadata-modules/object-metadata/dtos/create-object.input';
import { ObjectMetadataService } from 'src/engine/metadata-modules/object-metadata/object-metadata.service';
import {
  SEED_APPLE_WORKSPACE_ID,
  SEED_YCOMBINATOR_WORKSPACE_ID,
} from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';

/**
 * Idempotently creates the custom `Expense` object (onboarding task 2):
 *   - Amount   (CURRENCY)
 *   - Category (TEXT)
 *   - Date     (DATE_TIME)
 *   - Company  (MANY_TO_ONE relation, reverse "Expenses" on Company)
 *
 * Custom objects live in workspace metadata, not code, so this command makes
 * the object reproducible from source (survives `database:reset`). Run with:
 *   nx run twenty-server:command -- workspace:seed:expense-object
 */
@Command({
  name: 'workspace:seed:expense-object',
  description:
    'Idempotently create the custom Expense object (Amount, Category, Date) and its relation to Company.',
})
export class SeedExpenseObjectCommand extends CommandRunner {
  private readonly logger = new Logger(SeedExpenseObjectCommand.name);

  constructor(
    private readonly objectMetadataService: ObjectMetadataService,
    private readonly fieldMetadataService: FieldMetadataService,
  ) {
    super();
  }

  async run(): Promise<void> {
    const workspaceIds = [SEED_APPLE_WORKSPACE_ID, SEED_YCOMBINATOR_WORKSPACE_ID];

    for (const workspaceId of workspaceIds) {
      try {
        await this.seedForWorkspace(workspaceId);
      } catch (error) {
        this.logger.error(
          `Failed to seed Expense object for workspace ${workspaceId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  private async seedForWorkspace(workspaceId: string): Promise<void> {
    const existingExpense =
      await this.objectMetadataService.findManyWithinWorkspace(workspaceId, {
        where: { nameSingular: 'expense' },
      });

    if (existingExpense.length > 0) {
      this.logger.log(
        `Expense object already exists in workspace ${workspaceId} — skipping.`,
      );

      return;
    }

    const [company] =
      await this.objectMetadataService.findManyWithinWorkspace(workspaceId, {
        where: { nameSingular: 'company' },
      });

    if (!company) {
      this.logger.warn(
        `No Company object found in workspace ${workspaceId} — skipping Expense seed.`,
      );

      return;
    }

    const createObjectInput: CreateObjectInput = {
      nameSingular: 'expense',
      namePlural: 'expenses',
      labelSingular: 'Expense',
      labelPlural: 'Expenses',
      icon: 'IconReceipt',
    };

    const expense = await this.objectMetadataService.createOneObject({
      createObjectInput,
      workspaceId,
    });

    const scalarFields: Omit<CreateFieldInput, 'workspaceId'>[] = [
      {
        name: 'amount',
        label: 'Amount',
        type: FieldMetadataType.CURRENCY,
        objectMetadataId: expense.id,
      },
      {
        name: 'category',
        label: 'Category',
        type: FieldMetadataType.TEXT,
        objectMetadataId: expense.id,
      },
      {
        name: 'expenseDate',
        label: 'Date',
        type: FieldMetadataType.DATE_TIME,
        objectMetadataId: expense.id,
        isLabelSyncedWithName: false,
      },
    ];

    for (const createFieldInput of scalarFields) {
      await this.fieldMetadataService.createOneField({
        createFieldInput,
        workspaceId,
      });
    }

    const companyRelationPayload: RelationCreationPayload = {
      type: RelationType.MANY_TO_ONE,
      targetObjectMetadataId: company.id,
      targetFieldLabel: 'Expenses',
      targetFieldIcon: 'IconReceipt',
    };

    await this.fieldMetadataService.createOneField({
      workspaceId,
      createFieldInput: {
        name: 'company',
        label: 'Company',
        type: FieldMetadataType.RELATION,
        objectMetadataId: expense.id,
        relationCreationPayload: companyRelationPayload,
      },
    });

    this.logger.log(
      `Created Expense object with fields + Company relation in workspace ${workspaceId}.`,
    );
  }
}
