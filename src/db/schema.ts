import { pgTable, text, real, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core'

export const logRows = pgTable('log_rows', {
  generationId: text('generation_id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  model: text('model').notNull(),
  app: text('app').notNull().default(''),
  costTotal: real('cost_total').notNull().default(0),
  tokensPrompt: integer('tokens_prompt').notNull().default(0),
  tokensCompletion: integer('tokens_completion').notNull().default(0),
  requests: integer('requests').notNull().default(1),
  tokensReasoning: integer('tokens_reasoning'),
  tokensCached: integer('tokens_cached'),
  costCache: real('cost_cache'),
  generationTimeMs: real('generation_time_ms'),
  timeToFirstTokenMs: real('time_to_first_token_ms'),
  providerName: text('provider_name'),
  apiKeyName: text('api_key_name'),
}, (table) => [
  index('log_rows_created_at_idx').on(table.createdAt),
  index('log_rows_model_idx').on(table.model),
])

export const activitySnapshots = pgTable('activity_snapshots', {
  id: text('id').primaryKey(), // date + model compound key
  date: text('date').notNull(),
  model: text('model').notNull(),
  app: text('app').notNull().default(''),
  costTotal: real('cost_total').notNull().default(0),
  tokensPrompt: integer('tokens_prompt').notNull().default(0),
  tokensCompletion: integer('tokens_completion').notNull().default(0),
  requests: integer('requests').notNull().default(0),
  providerName: text('provider_name'),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('activity_date_idx').on(table.date),
])

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
