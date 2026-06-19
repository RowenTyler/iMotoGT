import { Suspense } from "react";
import type { Metadata } from "next";
import ClientPage from "./client-page";

export const metadata: Metadata = {
  title: "Contact Us - iMoto GT",
  description: "Get in touch with the iMoto GT team.",
  alternates: { canonical: "https://imotogt.co.za/contact" },
};

export const dynamic = "force-dynamic";

export default function ContactPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <ClientPage />
    </Suspense>
  );
}