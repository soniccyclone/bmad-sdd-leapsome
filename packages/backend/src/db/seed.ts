import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { getDb, closeDb } from './index.js';
import { todos } from './schema.js';

interface SeedTodo {
  id: string;
  description: string;
  completed: boolean;
}

async function seed() {
  console.log('Seeding database...');

  const db = getDb();

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

  // Item 21: exactly 2000 chars (boundary test)
  seedTodos.push({
    id: uuidv7(),
    description: 'B'.repeat(2000),
    completed: false,
  });

  // Item 22: XSS attempt — script tag (sanitizer should strip before insert in real app)
  seedTodos.push({
    id: uuidv7(),
    description: `<script>alert('xss')</script>`,
    completed: false,
  });

  // Item 23: XSS attempt — img onerror
  seedTodos.push({
    id: uuidv7(),
    description: `<img onerror="alert(1)">`,
    completed: false,
  });

  await db.insert(todos).values(seedTodos);

  console.log(`Seeded ${seedTodos.length} todos`);

  // Close the connection
  await closeDb();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
