import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { Organization } from "@/server/models/Organization";
import { getSession, unauthorized } from "@/server/session";
import { orgSettingsSchema, parseBody } from "@/server/validation";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  await db();

  const org: any = await Organization.findById(session.orgId).lean();
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    name: org.name,
    settings: {
      gstin: org.settings?.gstin ?? "",
      address: org.settings?.address ?? "",
      phone: org.settings?.phone ?? "",
      email: org.settings?.email ?? "",
      currency: org.settings?.currency ?? "INR",
      defaultGstRate: org.settings?.defaultGstRate ?? 18,
      invoicePrefix: org.settings?.invoicePrefix ?? "INV-",
      paymentTerms: org.settings?.paymentTerms ?? "Net 15",
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const parsed = await parseBody(req, orgSettingsSchema);
  if (!parsed.ok) return parsed.response;

  await db();

  const org = await Organization.findById(session.orgId);
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.name) org.name = parsed.data.name;
  if (parsed.data.settings) {
    org.settings = { ...org.settings?.toObject?.(), ...parsed.data.settings };
  }
  await org.save();

  return NextResponse.json({ ok: true });
}
