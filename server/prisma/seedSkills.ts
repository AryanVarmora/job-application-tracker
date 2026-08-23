import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const VERIFIED_SKILLS: { name: string; category?: string; proficiency?: string; yearsExperience?: number }[] = [
  // Languages
  { name: "Python", category: "language" },
  { name: "JavaScript", category: "language" },
  { name: "Java", category: "language" },
  { name: "C#", category: "language" },
  { name: "C++", category: "language" },
  { name: "Scala", category: "language" },
  { name: "Swift", category: "language" },
  { name: "SQL", category: "language" },
  { name: "Bash", category: "language" },

  // Web & APIs
  { name: "React", category: "framework" },
  { name: "Node.js", category: "framework" },
  { name: "Express", category: "framework" },
  { name: "ASP.NET", category: "framework" },
  { name: "REST APIs", category: "web" },
  { name: "JWT", category: "web" },
  { name: "HTML5", category: "web" },
  { name: "CSS3", category: "web" },

  // Databases
  { name: "MongoDB", category: "data" },
  { name: "MySQL", category: "data" },
  { name: "NoSQL", category: "data" },

  // Cloud & DevOps
  { name: "GCP", category: "cloud" },
  { name: "Docker", category: "devops" },
  { name: "Git", category: "tooling" },
  { name: "GitHub Actions", category: "devops" },
  { name: "CI/CD", category: "devops" },
  { name: "Linux", category: "devops" },
  { name: "Agile", category: "process" },

  // AI / ML
  { name: "PyTorch", category: "ml" },
  { name: "TensorFlow", category: "ml" },
  { name: "scikit-learn", category: "ml" },
  { name: "Keras", category: "ml" },
  { name: "Hugging Face Transformers", category: "ml" },
  { name: "OpenAI API", category: "ml" },
  { name: "FinBERT", category: "ml" },
  { name: "NLP", category: "ml" },
  { name: "Neural Networks", category: "ml" },

  // Data & Scientific Computing
  { name: "Apache Spark", category: "data" },
  { name: "CuPy", category: "data" },
  { name: "NumPy", category: "data" },
  { name: "Pandas", category: "data" },
  { name: "OpenCV", category: "data" },
  { name: "Recharts", category: "data" },

  // Mobile
  { name: "SwiftUI", category: "mobile" },
  { name: "CoreData", category: "mobile" },
];

async function main() {
  console.log("Seeding verified skills...");

  for (const s of VERIFIED_SKILLS) {
    const skill = await prisma.skill.upsert({
      where: { name: s.name },
      update: { category: s.category ?? null },
      create: { name: s.name, category: s.category ?? null },
    });

    await prisma.userSkill.upsert({
      where: { skillId: skill.id },
      update: {
        proficiency: s.proficiency ?? null,
        yearsExperience: s.yearsExperience ?? null,
      },
      create: {
        skillId: skill.id,
        proficiency: s.proficiency ?? null,
        yearsExperience: s.yearsExperience ?? null,
      },
    });
  }

  console.log(`Seeded ${VERIFIED_SKILLS.length} verified skills.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
