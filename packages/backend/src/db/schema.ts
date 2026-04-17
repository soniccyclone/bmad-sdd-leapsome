import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

export const todos = pgTable(
  'todos',
  {
    id: uuid('id').primaryKey(),
    description: text('description').notNull(),
    completed: boolean('completed').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    // Note: $onUpdate is application-level only — it does NOT create a
    // database trigger. The updatedAt column is set by Drizzle at query
    // time, not by Postgres itself.
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('todos_created_at_id_idx').on(table.createdAt, table.id),
  ],
);
