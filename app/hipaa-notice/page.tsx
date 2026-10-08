"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Lock, Eye, FileText, AlertTriangle, CheckCircle } from "lucide-react"

export default function HipaaNoticePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">HIPAA Compliance Notice</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            How Rxn3D protects protected health information in our dental laboratory and practice management platform
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
                Notice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Effective Date: {new Date().toLocaleDateString()}</h3>
                <p className="text-blue-800">
                  Rxn3D handles protected health information (PHI) for dental labs and offices. This notice describes the safeguards we apply and the responsibilities of people who use the system.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">What this covers</h3>
                <p>
                  PHI includes patient names, case details, treatment information, images, and other health information entered into Rxn3D. We use and disclose that information only to provide the service, support the account, and meet legal duties.
                </p>

                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Safeguards we apply
                </h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Encryption of data in transit over HTTPS</li>
                  <li>Role-based access so users see only the information their role allows</li>
                  <li>Unique sign-in credentials and automatic session timeout</li>
                  <li>Audit logging of access to patient and case information</li>
                  <li>Security headers and browser protections on the application</li>
                </ul>

                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Your responsibilities
                </h3>
                <p>If you use Rxn3D as a covered entity or business associate, you agree to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Use the system only for permitted treatment, payment, and health care operations</li>
                  <li>Keep login credentials private and sign out on shared devices</li>
                  <li>Limit access to the minimum information needed for the task</li>
                  <li>Report suspected unauthorized access or disclosure right away</li>
                </ul>

                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Breach notification
                </h3>
                <p>
                  If we discover a breach of unsecured PHI, we investigate, contain it, and notify affected customers and individuals as required by the HIPAA Breach Notification Rule, including notice to the U.S. Department of Health and Human Services when the law requires it.
                </p>

                <h3 className="text-lg font-semibold">Related policies</h3>
                <p>
                  Patient rights, permitted uses, and our privacy practices are described in the{" "}
                  <Link href="/privacy-policy" className="font-medium text-[#1162A8] hover:underline">
                    Privacy Policy
                  </Link>
                  . Business associate terms are in the{" "}
                  <Link href="/terms-of-service" className="font-medium text-[#1162A8] hover:underline">
                    Terms of Service
                  </Link>
                  .
                </p>

                <h3 className="text-lg font-semibold">Contact</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>Privacy questions:</strong> privacy@rxn3d.com</p>
                  <p><strong>Report a suspected breach:</strong> breach@rxn3d.com</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <p>For questions about this notice, contact us at privacy@rxn3d.com</p>
        </div>
      </div>
    </div>
  )
}
