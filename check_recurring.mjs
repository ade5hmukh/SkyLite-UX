import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const todos = await prisma.todo.findMany({
  where: { recurring: true },
  select: { id: true, title: true, recurring: true, completed: true, points: true }
});

console.log("📋 Recurring chores:");
console.table(todos);
console.log(`\nTotal: ${todos.length} recurring chores`);
console.log(`Completed: ${todos.filter(t => t.completed).length}`);

await prisma.$disconnect();
