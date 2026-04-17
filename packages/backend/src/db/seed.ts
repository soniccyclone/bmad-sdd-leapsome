import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db, connection } from './index.js';
import { todos } from './schema.js';

interface SeedTodo {
  id: string;
  description: string;
  completed: boolean;
}

async function seed() {
  console.log('Seeding database...');

  // Truncate the table first
  await db.execute(sql`TRUNCATE TABLE ${todos}`);

  const seedTodos: SeedTodo[] = [];

  // Items 1-10: basic uncompleted todos
  for (let i = 1; i <= 10; i++) {
    seedTodos.push({
      id: uuidv7(),
      description: `Todo item ${i}`,
      completed: false,
    });
  }

  // Items 11-15: more uncompleted todos
  for (let i = 11; i <= 15; i++) {
    seedTodos.push({
      id: uuidv7(),
      description: `Todo item ${i}`,
      completed: false,
    });
  }

  // Items 16-18: completed tasks
  for (let i = 1; i <= 3; i++) {
    seedTodos.push({
      id: uuidv7(),
      description: `Completed task ${i}`,
      completed: true,
    });
  }

  // Item 19: long description (500 chars)
  seedTodos.push({
    id: uuidv7(),
    description: 'A'.repeat(500),
    completed: false,
  });

  // Item 20: special characters
  seedTodos.push({
    id: uuidv7(),
    description: `Special chars: & < > " '`,
    completed: false,
  });

  await db.insert(todos).values(seedTodos);

  console.log(`Seeded ${seedTodos.length} todos`);

  // Close the connection
  await connection.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
