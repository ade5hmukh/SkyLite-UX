import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const todos = await prisma.todo.findMany({
  select: { 
    id: true, 
    title: true, 
    recurring: true, 
    completed: true, 
    points: true,
    isChore: true
  },
  orderBy: { createdAt: 'desc' },
  take: 5
});

console.log("📋 Last 5 todos created:");
console.table(todos);

await prisma.$disconnect();
