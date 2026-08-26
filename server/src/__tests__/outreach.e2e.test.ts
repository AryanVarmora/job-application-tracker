import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";

const app = createApp();
const createdIds: string[] = [];

afterAll(async () => {
  await prisma.outreachContact.deleteMany({ where: { id: { in: createdIds } } });
  await prisma.$disconnect();
});

function uniqueName(label: string) {
  return `Outreach Test ${label} ${Date.now()}-${Math.random()}`;
}

describe("POST /outreach", () => {
  it("creates a contact from just personName + platform", async () => {
    const personName = uniqueName("minimal");
    const res = await request(app).post("/outreach").send({ personName, platform: "linkedin" });

    expect(res.status).toBe(201);
    createdIds.push(res.body.id);
    expect(res.body.personName).toBe(personName);
    expect(res.body.platform).toBe("linkedin");
    expect(res.body.isLead).toBe(false);
    expect(res.body.company).toBeNull();
    expect(res.body.linkedApplicationId).toBeNull();
    expect(res.body.messagedAt).toBeTruthy();
  });

  it("rejects a missing platform", async () => {
    const res = await request(app)
      .post("/outreach")
      .send({ personName: uniqueName("no-platform") });
    expect(res.status).toBe(400);
  });

  it("accepts all optional fields when provided", async () => {
    const personName = uniqueName("full");
    const res = await request(app).post("/outreach").send({
      personName,
      platform: "email",
      company: "Acme",
      isLead: true,
      notes: "Met at career fair",
    });
    expect(res.status).toBe(201);
    createdIds.push(res.body.id);
    expect(res.body.company).toBe("Acme");
    expect(res.body.isLead).toBe(true);
    expect(res.body.notes).toBe("Met at career fair");
  });
});

describe("GET /outreach", () => {
  it("lists created contacts and supports leadsOnly", async () => {
    const leadName = uniqueName("lead");
    const nonLeadName = uniqueName("non-lead");

    const leadRes = await request(app)
      .post("/outreach")
      .send({ personName: leadName, platform: "linkedin", isLead: true });
    const nonLeadRes = await request(app)
      .post("/outreach")
      .send({ personName: nonLeadName, platform: "linkedin", isLead: false });
    createdIds.push(leadRes.body.id, nonLeadRes.body.id);

    const all = await request(app).get("/outreach");
    expect(all.status).toBe(200);
    const allNames = all.body.map((c: { personName: string }) => c.personName);
    expect(allNames).toContain(leadName);
    expect(allNames).toContain(nonLeadName);

    const leadsOnly = await request(app).get("/outreach?leadsOnly=true");
    expect(leadsOnly.status).toBe(200);
    const leadsOnlyNames = leadsOnly.body.map((c: { personName: string }) => c.personName);
    expect(leadsOnlyNames).toContain(leadName);
    expect(leadsOnlyNames).not.toContain(nonLeadName);
  });
});

describe("PATCH /outreach/:id", () => {
  it("toggles isLead and edits notes", async () => {
    const personName = uniqueName("patch");
    const createRes = await request(app)
      .post("/outreach")
      .send({ personName, platform: "other" });
    createdIds.push(createRes.body.id);

    const patchRes = await request(app)
      .patch(`/outreach/${createRes.body.id}`)
      .send({ isLead: true, notes: "Follow up next week" });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.isLead).toBe(true);
    expect(patchRes.body.notes).toBe("Follow up next week");
  });

  it("links and then unlinks an application", async () => {
    const companyName = `Outreach Link Co ${Date.now()}`;
    const appRes = await request(app).post("/applications").send({
      companyName,
      role: "SWE",
      appliedDate: "2026-08-01",
      status: "applied",
    });
    expect(appRes.status).toBe(201);

    const contactRes = await request(app)
      .post("/outreach")
      .send({ personName: uniqueName("linked"), platform: "linkedin" });
    createdIds.push(contactRes.body.id);

    const linkRes = await request(app)
      .patch(`/outreach/${contactRes.body.id}`)
      .send({ linkedApplicationId: appRes.body.id });
    expect(linkRes.status).toBe(200);
    expect(linkRes.body.linkedApplicationId).toBe(appRes.body.id);

    const unlinkRes = await request(app)
      .patch(`/outreach/${contactRes.body.id}`)
      .send({ linkedApplicationId: null });
    expect(unlinkRes.status).toBe(200);
    expect(unlinkRes.body.linkedApplicationId).toBeNull();

    await request(app).delete(`/applications/${appRes.body.id}`);
  });

  it("404s for an unknown id", async () => {
    const res = await request(app)
      .patch("/outreach/00000000-0000-0000-0000-000000000000")
      .send({ isLead: true });
    expect(res.status).toBe(404);
  });
});
