import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>
        
        <article className="prose prose-invert prose-zinc max-w-none">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Privacy Policy</h1>
          <p className="text-zinc-400 text-sm mb-8">Last updated: August 2026</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-100 mt-6 mb-4">1. Company Information</h2>
            <p className="text-zinc-300">
              This Privacy Policy explains how GymERP ("we," "us," or "our") collects, uses, and discloses information 
              about you when you access or use our websites, mobile applications, and other online products and services 
              (collectively, the "Services").
            </p>
            <p className="text-zinc-300 mt-2">
              Contact us at: <a href="mailto:support@gymerp.com" className="text-primary hover:underline">support@gymerp.com</a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-100 mt-6 mb-4">2. Data We Collect</h2>
            <p className="text-zinc-300 mb-2">We collect the following types of information:</p>
            <ul className="list-disc pl-5 text-zinc-300 space-y-1">
              <li><strong>Personal Details:</strong> Name, phone number, and email address.</li>
              <li><strong>Usage Data:</strong> Attendance logs, check-in history, and app usage metrics.</li>
              <li><strong>Health & Fitness:</strong> Workout plans, dietary requirements, and fitness metrics provided by your gym.</li>
              <li><strong>Financial Data:</strong> Payment information for membership dues and transactions.</li>
              <li><strong>Biometric Data:</strong> Face encodings for automated CCTV attendance (subject to your explicit consent).</li>
              <li><strong>Media:</strong> Profile photos and identification documents uploaded by you or your gym.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-100 mt-6 mb-4">3. How We Use Data</h2>
            <p className="text-zinc-300">
              We use the collected data for the following purposes:
            </p>
            <ul className="list-disc pl-5 text-zinc-300 mt-2 space-y-1">
              <li>To provide, maintain, and improve our Service delivery.</li>
              <li>To send transactional and promotional communications via WhatsApp and SMS.</li>
              <li>To process payments and generate compliant invoices.</li>
              <li>To analyze platform usage and optimize performance.</li>
              <li>To provide customer support and respond to your requests.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-100 mt-6 mb-4">4. Data Sharing</h2>
            <p className="text-zinc-300">
              <strong>We do not sell your personal data.</strong> We may share your information only in the following circumstances:
            </p>
            <ul className="list-disc pl-5 text-zinc-300 mt-2 space-y-1">
              <li><strong>Payment Processors:</strong> With Razorpay or similar gateways to process transactions.</li>
              <li><strong>Communication Partners:</strong> With Meta (WhatsApp) to deliver automated messages.</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect the rights and safety of our users.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-100 mt-6 mb-4">5. Data Retention</h2>
            <p className="text-zinc-300">
              Your data is retained as long as your membership is active or as needed to provide you services.
              Specifically:
            </p>
            <ul className="list-disc pl-5 text-zinc-300 mt-2 space-y-1">
              <li>Member data is retained for the duration of your active subscription.</li>
              <li>WhatsApp communication logs are automatically pruned after 90 days.</li>
              <li>All personal data is permanently deleted within 30 days of receiving a verified account deletion request.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-100 mt-6 mb-4">6. Biometric Data & Consent</h2>
            <p className="text-zinc-300">
              If your gym utilizes our CCTV face attendance feature, face encodings are securely stored solely for the purpose 
              of automated check-ins. This feature requires your explicit, documented consent. Face encodings are immediately 
              and permanently deleted if you withdraw consent or if your member profile is removed from the gym's database.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-100 mt-6 mb-4">7. Cookies & Tracking</h2>
            <p className="text-zinc-300">
              We use essential cookies strictly for session management and security authentication (via Supabase). 
              We do not use tracking cookies for third-party advertising.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-zinc-100 mt-6 mb-4">8. Your Rights (DPDP Act Compliance)</h2>
            <p className="text-zinc-300">
              Under the Digital Personal Data Protection (DPDP) Act of India, you have the right to:
            </p>
            <ul className="list-disc pl-5 text-zinc-300 mt-2 space-y-1">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate or incomplete data.</li>
              <li>Request the erasure of your personal data.</li>
              <li>Withdraw your consent for data processing at any time.</li>
            </ul>
            <p className="text-zinc-300 mt-2">
              To exercise these rights, please contact our Privacy team at <a href="mailto:privacy@gymerp.com" className="text-primary hover:underline">privacy@gymerp.com</a>.
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}
