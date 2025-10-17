import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Get all chores/todos
const all = await prisma.todo.findMany({
  select: { 
    id: true, 
    title: true, 
    recurring: true, 
    completed: true, 
    points: true,
    isChore: true,
    createdAt: true
  },
  orderBy: { createdAt: 'desc' }
});

console.log("\n📋 ALL TODOS/CHORES:");
console.table(all);

console.log("\n🔄 Recurring chores:", all.filter(t => t.recurring).length);
console.log("✅ Completed:", all.filter(t => t.completed).length);
console.log("🎯 With points:", all.filter(t => t.points > 0).length);

// Check if "Help with Dishes" has recurring flag
const dishes = all.filter(t => t.title.includes("Dish"));
if (dishes.length > 0) {
  console.log("\n🍽️  'Dishes' chores:");
  console.table(dishes);
}

await prisma.$disconnect();
