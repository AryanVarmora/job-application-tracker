import { PrismaClient, ApplicationStatus } from "@prisma/client";

const prisma = new PrismaClient();

type SeedApplication = {
  company: { name: string; industry: string; size: string };
  role: string;
  status: ApplicationStatus;
  appliedDate: Date;
  jobUrl: string;
  resumeVariant: string;
  notes: string;
  contacts?: { name: string; role: string; email?: string; linkedinUrl?: string }[];
};

const applications: SeedApplication[] = [
  {
    company: { name: "Stripe", industry: "Fintech", size: "5000+" },
    role: "Backend Engineer",
    status: ApplicationStatus.interviewing,
    appliedDate: new Date("2026-06-02"),
    jobUrl: "https://stripe.com/jobs/listing/backend-engineer/1234",
    resumeVariant: "backend-focused-v2",
    notes: "Phone screen went well, waiting on onsite scheduling.",
    contacts: [
      {
        name: "Maria Chen",
        role: "Technical Recruiter",
        email: "maria.chen@stripe.com",
        linkedinUrl: "https://linkedin.com/in/mariachen",
      },
    ],
  },
  {
    company: { name: "Notion", industry: "SaaS / Productivity", size: "501-1000" },
    role: "Full Stack Engineer",
    status: ApplicationStatus.applied,
    appliedDate: new Date("2026-07-15"),
    jobUrl: "https://notion.so/careers/full-stack-engineer",
    resumeVariant: "fullstack-general",
    notes: "Applied via referral from a former coworker.",
  },
  {
    company: { name: "Datadog", industry: "Observability / DevTools", size: "5000+" },
    role: "Software Engineer, Infrastructure",
    status: ApplicationStatus.rejected,
    appliedDate: new Date("2026-05-20"),
    jobUrl: "https://careers.datadoghq.com/detail/1111",
    resumeVariant: "infra-focused-v1",
    notes: "Rejected after recruiter screen, not enough distributed systems experience.",
  },
  {
    company: { name: "Figma", industry: "Design Tools", size: "1001-5000" },
    role: "Frontend Engineer",
    status: ApplicationStatus.offer,
    appliedDate: new Date("2026-04-10"),
    jobUrl: "https://figma.com/careers/frontend-engineer",
    resumeVariant: "frontend-focused-v3",
    notes: "Offer received, negotiating comp. Deadline to respond is Sept 1.",
    contacts: [
      {
        name: "Devon Park",
        role: "Engineering Manager",
        email: "devon.park@figma.com",
        linkedinUrl: "https://linkedin.com/in/devonpark",
      },
      {
        name: "Priya Nair",
        role: "Recruiting Coordinator",
        email: "priya.nair@figma.com",
      },
    ],
  },
  {
    company: { name: "Anthropic", industry: "AI Research", size: "501-1000" },
    role: "Software Engineer, Applied AI",
    status: ApplicationStatus.applied,
    appliedDate: new Date("2026-08-01"),
    jobUrl: "https://anthropic.com/careers/software-engineer-applied-ai",
    resumeVariant: "ai-focused-v1",
    notes: "Cover letter emphasized tooling and agent work.",
  },
  {
    company: { name: "Shopify", industry: "E-commerce", size: "5000+" },
    role: "Production Engineer",
    status: ApplicationStatus.interviewing,
    appliedDate: new Date("2026-06-25"),
    jobUrl: "https://shopify.com/careers/production-engineer",
    resumeVariant: "backend-focused-v2",
    notes: "Completed take-home, interview loop scheduled for next week.",
    contacts: [
      {
        name: "Sam Okafor",
        role: "Hiring Manager",
        email: "sam.okafor@shopify.com",
      },
    ],
  },
  {
    company: { name: "Duolingo", industry: "EdTech", size: "501-1000" },
    role: "Backend Engineer",
    status: ApplicationStatus.rejected,
    appliedDate: new Date("2026-03-14"),
    jobUrl: "https://duolingo.com/careers/backend-engineer",
    resumeVariant: "backend-focused-v1",
    notes: "Rejected after onsite, feedback was positive but no headcount.",
  },
  {
    company: { name: "Vercel", industry: "DevTools / Cloud", size: "201-500" },
    role: "Full Stack Engineer",
    status: ApplicationStatus.applied,
    appliedDate: new Date("2026-08-10"),
    jobUrl: "https://vercel.com/careers/full-stack-engineer",
    resumeVariant: "fullstack-general",
    notes: "Excited about this one, strong culture fit based on blog posts.",
  },
];

async function main() {
  console.log("Seeding database...");

  for (const app of applications) {
    const company = await prisma.company.upsert({
      where: { name: app.company.name },
      update: { industry: app.company.industry, size: app.company.size },
      create: app.company,
    });

    await prisma.application.create({
      data: {
        companyId: company.id,
        role: app.role,
        status: app.status,
        appliedDate: app.appliedDate,
        jobUrl: app.jobUrl,
        resumeVariant: app.resumeVariant,
        notes: app.notes,
        contacts: app.contacts
          ? {
              create: app.contacts,
            }
          : undefined,
      },
    });
  }

  console.log(`Seeded ${applications.length} applications.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
