"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, FileText, AlertTriangle, CheckCircle } from "lucide-react"

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <FileText className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Terms and conditions for using our HIPAA-compliant dental laboratory management system
          </p>
          <Badge variant="secondary" className="mt-4">
            <CheckCircle className="h-4 w-4 mr-2" />
            HIPAA Compliant
          </Badge>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Terms of Service
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Effective Date: {new Date().toLocaleDateString()}</h3>
                <p className="text-blue-800">
                  By using our services, you agree to these terms and conditions. Please read them carefully.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">1. Acceptance of Terms</h3>
                <p>
                  By accessing and using the Rxn3D dental laboratory management system, you accept and agree to be bound by the terms and provision of this agreement.
                </p>

                <h3 className="text-lg font-semibold">2. HIPAA Compliance</h3>
                <p>As a covered entity or business associate under HIPAA, you agree to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Maintain the privacy and security of protected health information (PHI)</li>
                  <li>Use our services only for permitted purposes under HIPAA</li>
                  <li>Implement appropriate safeguards to protect PHI</li>
                  <li>Report any suspected breaches or security incidents</li>
                  <li>Comply with all applicable federal and state privacy laws</li>
                </ul>

                <h3 className="text-lg font-semibold">3. Business Associate Agreement</h3>
                <p>By using our services, you acknowledge that:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>We may have access to PHI in the course of providing services</li>
                  <li>We will use and disclose PHI only as permitted by HIPAA</li>
                  <li>We will implement appropriate safeguards to protect PHI</li>
                  <li>We will report any breaches of unsecured PHI</li>
                  <li>We will ensure our subcontractors comply with HIPAA requirements</li>
                </ul>

                <h3 className="text-lg font-semibold">4. User Responsibilities</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Maintain secure access credentials</li>
                  <li>Use the system only for authorized purposes</li>
                  <li>Report any security concerns immediately</li>
                  <li>Comply with all applicable laws and regulations</li>
                  <li>Maintain accurate and complete records</li>
                </ul>

                <h3 className="text-lg font-semibold">5. Data Security</h3>
                <p>We implement industry-standard security measures including:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Regular security assessments and updates</li>
                  <li>Access controls and authentication</li>
                  <li>Audit logging and monitoring</li>
                  <li>Backup and disaster recovery procedures</li>
                </ul>

                <h3 className="text-lg font-semibold">6. Breach Notification</h3>
                <p>In the event of a breach of unsecured PHI:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>We will notify you within 60 days of discovery</li>
                  <li>We will provide information about the breach</li>
                  <li>We will take steps to mitigate any harmful effects</li>
                  <li>We will report to HHS as required by law</li>
                </ul>

                <h3 className="text-lg font-semibold">7. Service Availability</h3>
                <p>We strive to maintain high availability but cannot guarantee uninterrupted service. We will provide reasonable notice for scheduled maintenance.</p>

                <h3 className="text-lg font-semibold">8. Limitation of Liability</h3>
                <p>Our liability is limited to the amount paid for services in the 12 months preceding the claim, except as required by law.</p>

                <h3 className="text-lg font-semibold">9. Termination</h3>
                <p>Either party may terminate this agreement with 30 days written notice. Upon termination:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>We will return or destroy all PHI</li>
                  <li>We will provide certification of destruction</li>
                  <li>We will retain records as required by law</li>
                </ul>

                <h3 className="text-lg font-semibold">10. Governing Law</h3>
                <p>This agreement is governed by the laws of the state where our principal place of business is located, and applicable federal law.</p>

                <h3 className="text-lg font-semibold">11. Changes to Terms</h3>
                <p>We may update these terms from time to time. We will notify you of material changes at least 30 days in advance.</p>

                <h3 className="text-lg font-semibold">12. Contact Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>For questions about these terms:</strong></p>
                  <p>Email: legal@rxn3d.com</p>
                  <p>Phone: 1-800-RXN3D-LEGAL</p>
                  <p>Mail: Legal Department, Rxn3D, [Address]</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <p>For questions about these terms, contact us at legal@rxn3d.com</p>
        </div>
      </div>
    </div>
  )
} 