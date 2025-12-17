"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield, Lock, Eye, FileText, AlertTriangle, CheckCircle } from "lucide-react"

export default function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState("notice")

  const sections = [
    { id: "notice", title: "Notice of Privacy Practices", icon: FileText },
    { id: "policy", title: "Privacy Policy", icon: Shield },
    { id: "security", title: "Security Measures", icon: Lock },
    { id: "rights", title: "Patient Rights", icon: Eye },
    { id: "breach", title: "Breach Notification", icon: AlertTriangle },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy & Security</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            We are committed to protecting your health information in accordance with HIPAA regulations
          </p>
          <Badge variant="secondary" className="mt-4">
            <CheckCircle className="h-4 w-4 mr-2" />
            HIPAA Compliant
          </Badge>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {sections.map((section) => (
            <Button
              key={section.id}
              variant={activeSection === section.id ? "default" : "outline"}
              onClick={() => setActiveSection(section.id)}
              className="flex items-center gap-2"
            >
              <section.icon className="h-4 w-4" />
              {section.title}
            </Button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeSection === "notice" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notice of Privacy Practices
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Effective Date: {new Date().toLocaleDateString()}</h3>
                  <p className="text-blue-800">
                    This notice describes how medical information about you may be used and disclosed and how you can get access to this information. Please review it carefully.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Our Legal Duty</h3>
                  <p>
                    We are required by applicable federal and state law to maintain the privacy of your health information. We are also required to give you this Notice about our privacy practices, our legal duties, and your rights concerning your health information.
                  </p>

                  <h3 className="text-lg font-semibold">Uses and Disclosures of Health Information</h3>
                  <p>We may use and disclose your health information for the following purposes:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Treatment:</strong> To provide, coordinate, or manage your dental care and related services</li>
                    <li><strong>Payment:</strong> To bill and collect payment for services we provide to you</li>
                    <li><strong>Health Care Operations:</strong> To support the business activities of our practice</li>
                    <li><strong>Required by Law:</strong> When required by federal, state, or local law</li>
                    <li><strong>Public Health:</strong> For public health activities and safety</li>
                  </ul>

                  <h3 className="text-lg font-semibold">Your Rights</h3>
                  <p>You have the right to:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Request restrictions on certain uses and disclosures</li>
                    <li>Receive confidential communications</li>
                    <li>Inspect and copy your health information</li>
                    <li>Amend your health information</li>
                    <li>Receive an accounting of disclosures</li>
                    <li>Receive a paper copy of this notice</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "policy" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy Policy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Information We Collect</h3>
                  <p>We collect the following types of information:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Personal Health Information:</strong> Patient names, medical records, treatment plans, dental case information</li>
                    <li><strong>Contact Information:</strong> Names, addresses, phone numbers, email addresses</li>
                    <li><strong>Professional Information:</strong> Doctor credentials, license numbers, practice information</li>
                    <li><strong>Technical Information:</strong> IP addresses, browser information, usage data</li>
                  </ul>

                  <h3 className="text-lg font-semibold">How We Use Your Information</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>To provide dental laboratory services</li>
                    <li>To communicate with dental offices and practitioners</li>
                    <li>To process payments and billing</li>
                    <li>To maintain quality assurance and improvement</li>
                    <li>To comply with legal and regulatory requirements</li>
                  </ul>

                  <h3 className="text-lg font-semibold">Information Sharing</h3>
                  <p>We do not sell, trade, or rent your personal information. We may share information only as described in this policy or as required by law.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "security" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Security Measures
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Technical Safeguards</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Encryption:</strong> All data is encrypted in transit using SSL/TLS</li>
                    <li><strong>Access Controls:</strong> Role-based access with unique user credentials</li>
                    <li><strong>Authentication:</strong> Multi-factor authentication for sensitive operations</li>
                    <li><strong>Audit Logs:</strong> Comprehensive logging of all system access</li>
                    <li><strong>Backup Security:</strong> Encrypted backups with secure storage</li>
                  </ul>

                  <h3 className="text-lg font-semibold">Administrative Safeguards</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Regular security training for all staff</li>
                    <li>Incident response procedures</li>
                    <li>Regular security assessments</li>
                    <li>Business associate agreements with all vendors</li>
                    <li>Workforce sanctions for policy violations</li>
                  </ul>

                  <h3 className="text-lg font-semibold">Physical Safeguards</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Secure data center facilities</li>
                    <li>Environmental controls and monitoring</li>
                    <li>Physical access controls</li>
                    <li>Device and media controls</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "rights" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Your Rights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Right to Access</h3>
                  <p>You have the right to access and obtain copies of your health information. We will provide you with access within 30 days of your request.</p>

                  <h3 className="text-lg font-semibold">Right to Amend</h3>
                  <p>You have the right to request amendments to your health information if you believe it is incorrect or incomplete.</p>

                  <h3 className="text-lg font-semibold">Right to Restrict</h3>
                  <p>You have the right to request restrictions on how we use or disclose your health information.</p>

                  <h3 className="text-lg font-semibold">Right to Confidential Communications</h3>
                  <p>You have the right to request that we communicate with you about your health information in a certain way or at a certain location.</p>

                  <h3 className="text-lg font-semibold">Right to Accounting</h3>
                  <p>You have the right to receive an accounting of certain disclosures of your health information.</p>

                  <h3 className="text-lg font-semibold">How to Exercise Your Rights</h3>
                  <p>To exercise any of these rights, please contact us:</p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p><strong>Email:</strong> privacy@rxn3d.com</p>
                    <p><strong>Phone:</strong> 1-800-RXN3D-HELP</p>
                    <p><strong>Mail:</strong> Privacy Officer, Rxn3D, [Address]</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "breach" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Breach Notification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">What is a Breach?</h3>
                  <p>A breach is an impermissible use or disclosure under the Privacy Rule that compromises the security or privacy of protected health information.</p>

                  <h3 className="text-lg font-semibold">Our Breach Response Process</h3>
                  <ol className="list-decimal pl-6 space-y-2">
                    <li><strong>Immediate Response:</strong> Contain and assess the breach within 24 hours</li>
                    <li><strong>Investigation:</strong> Conduct thorough investigation to determine scope and impact</li>
                    <li><strong>Notification:</strong> Notify affected individuals within 60 days</li>
                    <li><strong>Regulatory Reporting:</strong> Report to HHS and state authorities as required</li>
                    <li><strong>Remediation:</strong> Implement corrective actions to prevent future breaches</li>
                  </ol>

                  <h3 className="text-lg font-semibold">Notification Timeline</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Individuals:</strong> Within 60 days of discovery</li>
                    <li><strong>HHS:</strong> Within 60 days for breaches affecting 500+ individuals</li>
                    <li><strong>Media:</strong> Within 60 days for breaches affecting 500+ individuals in a state</li>
                    <li><strong>Annual Report:</strong> For breaches affecting fewer than 500 individuals</li>
                  </ul>

                  <h3 className="text-lg font-semibold">Contact Information</h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">
                      <strong>To report a suspected breach:</strong><br />
                      Email: breach@rxn3d.com<br />
                      Phone: 1-800-RXN3D-BREACH<br />
                      Available 24/7 for emergency notifications
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <p>For questions about this privacy policy, contact us at privacy@rxn3d.com</p>
        </div>
      </div>
    </div>
  )
} 