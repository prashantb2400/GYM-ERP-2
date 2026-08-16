'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="text-zinc-400 hover:text-zinc-100 flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Button>
          </Link>
        </div>
        
        <article className="prose prose-invert prose-zinc max-w-none">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Terms of Service</h1>
          <p className="text-zinc-400 text-sm mb-8">Last updated: August 2026</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-100 mt-6 mb-4">1. Service Description</h2>
            <p className="text-zinc-300">
              GymERP ("Service", "we", "our", or "us") provides a cloud-based gym management software 
              platform designed to assist fitness centers in managing memberships, billing, attendance, 
              and member communications.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-100 mt-6 mb-4">2. Eligibility</h2>
            <p className="text-zinc-300">
              To use GymERP, you must be a legally recognized business entity operating in India. By registering 
              for an account, you represent and warrant that you have the authority to bind the business to these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-100 mt-6 mb-4">3. Account Responsibility</h2>
            <p className="text-zinc-300">
              The registered gym owner ("Subscriber") is solely responsible for maintaining the confidentiality 
              of their account credentials and for all activities that occur under their account. The Subscriber 
              must ensure that all data entered into the system complies with applicable laws and is accurate.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-100 mt-6 mb-4">4. Subscription & Billing</h2>
            <ul className="list-disc pl-5 text-zinc-300 space-y-2">
              <li><strong>Trials:</strong> We offer a 14-day free trial for new accounts. No credit card is required to start the trial.</li>
              <li><strong>Billing Cycle:</strong> Subscriptions are billed in advance on a monthly or annual basis, depending on the plan selected.</li>
              <li><strong>Auto-Renewal:</strong> Subscriptions automatically renew unless cancelled prior to the end of the current billing period.</li>
              <li><strong>Taxes:</strong> All fees are exclusive of applicable taxes (like GST), which will be added to the invoice as required by law.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-100 mt-6 mb-4">5. Cancellation & Termination</h2>
            <p className="text-zinc-300">
              You may cancel your subscription at any time through the billing dashboard. Upon cancellation, your 
              access will continue until the end of the current paid billing period. After termination, your data 
              will be retained for 30 days to allow for data export, after which it will be permanently deleted from our servers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-100 mt-6 mb-4">6. Acceptable Use</h2>
            <p className="text-zinc-300">
              You agree not to misuse the Service. This includes, but is not limited to:
            </p>
            <ul className="list-disc pl-5 text-zinc-300 mt-2 space-y-1">
              <li>Engaging in any illegal activities or violating any laws.</li>
              <li>Attempting to circumvent, disable, or interfere with security features or usage limits.</li>
              <li>Uploading malicious code, viruses, or harmful software.</li>
              <li>Spamming or sending unsolicited communications via our integrated messaging tools.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-100 mt-6 mb-4">7. Data Ownership & Processing</h2>
            <p className="text-zinc-300">
              The gym owner retains full ownership of all member data inputted into the Service. 
              By using GymERP, you grant us a worldwide, non-exclusive, royalty-free license to host, process, 
              and display this data strictly for the purpose of providing and operating the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-100 mt-6 mb-4">8. Limitation of Liability</h2>
            <p className="text-zinc-300">
              To the maximum extent permitted by law, GymERP shall not be liable for any indirect, incidental, 
              special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising 
              from your use of or inability to use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-100 mt-6 mb-4">9. Governing Law</h2>
            <p className="text-zinc-300">
              These Terms shall be governed by and construed in accordance with the laws of India. Any disputes 
              arising under these Terms shall be subject to the exclusive jurisdiction of the courts located in India.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-100 mt-6 mb-4">10. Changes to Terms</h2>
            <p className="text-zinc-300">
              We reserve the right to modify these Terms at any time. We will provide at least 30 days' notice 
              via email or an in-app notification prior to any material changes taking effect. Your continued use 
              of the Service after the effective date constitutes your acceptance of the revised Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-100 mt-6 mb-4">11. Contact Information</h2>
            <p className="text-zinc-300">
              If you have any questions about these Terms, please contact our legal team at:
              <br />
              <a href="mailto:legal@gymerp.com" className="text-purple-400 hover:text-purple-300 mt-2 inline-block">legal@gymerp.com</a>
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}
