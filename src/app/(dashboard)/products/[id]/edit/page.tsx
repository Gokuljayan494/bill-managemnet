"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ProductForm } from "@/features/products/ProductForm";
import { Button } from "@/components/ui/Button";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const [initial, setInitial] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/products/${id}`);
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
        <p className="text-sm font-medium text-slate-700">Product not found</p>
        <p className="mt-1 text-xs text-slate-400">
          It may have been deleted.
        </p>
        <Link href="/products" className="mt-4 inline-block">
          <Button variant="secondary">Back to products</Button>
        </Link>
      </div>
    );
  }

  if (!initial) {
    return (
      <p className="py-20 text-center text-sm text-slate-400">
        Loading product…
      </p>
    );
  }

  return <ProductForm productId={id} initial={initial} />;
}
