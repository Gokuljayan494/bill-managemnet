"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { InvoiceBuilder } from "@/features/billing/InvoiceBuilder";
import { Button } from "@/components/ui/Button";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [initial, setInitial] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      setInitial(data.raw);
    })();
  }, [id]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-sm font-medium text-slate-700">Invoice not found</p>
        <p className="mt-1 text-xs text-slate-400">It may have been deleted.</p>
        <Link href="/invoices" className="mt-4 inline-block">
          <Button variant="secondary">Back to billing</Button>
        </Link>
      </div>
    );
  }

  if (!initial) {
    return (
      <p className="py-20 text-center text-sm text-slate-400">
        Loading invoice…
      </p>
    );
  }

  return <InvoiceBuilder invoiceId={id} initial={initial} />;
}
