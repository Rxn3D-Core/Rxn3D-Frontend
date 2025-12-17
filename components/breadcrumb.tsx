"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/auth-context"

interface BreadcrumbItem {
  name: string
  path: string
}

export function Breadcrumb() {
  const pathname = usePathname() || "";
  const { t, i18n } = useTranslation();
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const { currentLanguage } = useLanguage()
  const { user } = useAuth()
  
  useEffect(() => {
    const getBreadcrumbs = (): BreadcrumbItem[] => {
      const paths = pathname?.split("/").filter(Boolean) || []
      const userRoles = user?.roles || (user?.role ? [user.role] : [])
      const isLabAdmin = userRoles.includes("lab_admin")
      
      const pathMap: Record<string, string> = {
        "lab-administrator": t("breadcrumb.labAdmin","Lab Admin"),
        "staff-management": t("breadcrumb.staffManagement", { defaultValue: "Staff Management" }),
        "global-product-library": t("breadcrumb.globalProductLibrary", { defaultValue: "Global Product Library" }),
        "lab-product-library": t("breadcrumb.labProductLibrary", { defaultValue: "Lab Product Library" }),
        "products": t("breadcrumb.products", { defaultValue: "Products" }),
        "product-category": t("breadcrumb.productCategories", { defaultValue: "Product Categories" }),
        "case-pans": t("breadcrumb.casePans", "Case Pans" ),
        "add-ons": t("breadcrumb.addOns", { defaultValue: "Add Ons" }),
        "add-ons-category": t("breadcrumb.addOnsCategory", { defaultValue: "Add Ons Category" }),
        "stages": t("breadcrumb.stages", { defaultValue: "Stages" }),
        "grades": t("breadcrumb.grades", { defaultValue: "Grades" }),
        "impression": t("breadcrumb.impression", { defaultValue: "Impression" }),
        "teeth-shade": t("breadcrumb.teethShade", { defaultValue: "Teeth Shade" }),
        "gum-shade": t("breadcrumb.gumShade", { defaultValue: "Gum Shade" }),
        "material": t("breadcrumb.material", { defaultValue: "Material" }),
        "retention": t("breadcrumb.retention", { defaultValue: "Retention" }),
        "visibility-manager": t("breadcrumb.visibility", { defaultValue: "Visibility" }),
        "case-management": t("breadcrumb.caseManagement", { defaultValue: "Case Management" }),
        "case-list": t("breadcrumb.caseList", { defaultValue: "Case List" }),
        "virtual-slip": t("breadcrumb.virtualSlip", { defaultValue: "Virtual Slip" }),

        // Billing & Subscription paths
        "billing": t("breadcrumb.billing", { defaultValue: "Billing & Subscription" }),
        "subscriptions": t("breadcrumb.subscriptions", { defaultValue: "Subscriptions" }),
        "charge-management": t("breadcrumb.chargeManagement", { defaultValue: "Charge Management" }),
        "generate-statements": t("breadcrumb.generateStatements", { defaultValue: "Generate Statements" }),
        "integrations": t("breadcrumb.integrations", { defaultValue: "Integrations" }),

        //for lab office management
        "lab-office-management": t("breadcrumb.labOfficeManagement", { defaultValue: "Lab & Office Management" }),
        "all-labs": t("breadcrumb.allLabs", { defaultValue: "All Labs" }),
        "all-offices": t("breadcrumb.allOffices", { defaultValue: "All Offices" }),
        "all-users": t("breadcrumb.allUsers", { defaultValue: "All Users" }),
        "invite-new-entity": t("breadcrumb.inviteNewEntity", { defaultValue: "Invite New Entity" }),

        // Advance Mode paths
        "lab-advance-mode": t("breadcrumb.advanceMode", { defaultValue: "Advance Mode" }),
        "global-advance-mode": t("breadcrumb.globalAdvanceMode", { defaultValue: "Global Advance Mode" }),
        "category": t("breadcrumb.category", { defaultValue: "Category" }),
        "sub-category": t("breadcrumb.subCategory", { defaultValue: "Sub Category" }),
        "fields": t("breadcrumb.fields", { defaultValue: "Fields" }),
        "implant-library": t("breadcrumb.implantLibrary", { defaultValue: "Implant Library" }),
        "abutment-library": t("breadcrumb.abutmentLibrary", { defaultValue: "Abutment Library" }),
      }

      const breadcrumbs = [{ name: t("breadcrumb.home", { defaultValue: "Home" }), path: "/" }]

      if (paths.includes("lab-administrator")) {
        breadcrumbs.push({ name: t("breadcrumb.labAdmin", { defaultValue: "Lab Admin" }), path: "" })

        if (paths.includes("staff-management")) {
          breadcrumbs.push({ name: t("breadcrumb.labManagement", { defaultValue: "Lab Management" }), path: "/lab-administrator" })
          breadcrumbs.push({ name: t("breadcrumb.staffManagement", { defaultValue: "Staff Management" }), path: "/lab-administrator/staff-management" })
        }
      }

      if (paths.includes("global-product-library")) {
        breadcrumbs.push({ name: t("breadcrumb.platformConfiguration", { defaultValue: "Platform Configuration" }), path: "/platform-configuration" })
      }

      if (paths.includes("lab-product-library")) {
        breadcrumbs.push({ name: t("breadcrumb.productManagement", { defaultValue: "Product Management" }), path: "/lab-product-library" })
      }

      if (paths.includes("lab-office-management")) {
        breadcrumbs.push({ name: t("breadcrumb.labOfficeManagement", { defaultValue: "Lab & Office Management" }), path: "/lab-office-management" })
      }

      if (paths.includes("global-advance-mode")) {
        breadcrumbs.push({ name: t("breadcrumb.platformConfiguration", { defaultValue: "Platform Configuration" }), path: "/platform-configuration" })
      }

      if (paths.includes("lab-advance-mode")) {
        breadcrumbs.push({ name: t("breadcrumb.advanceMode", { defaultValue: "Advance Mode" }), path: "/lab-advance-mode" })
      }

      // Handle virtual slip path
      if (paths.includes("virtual-slip")) {
        breadcrumbs.push({ name: t("breadcrumb.labAdmin", { defaultValue: "Lab Admin" }), path: "/dashboard" })
        breadcrumbs.push({ name: t("breadcrumb.caseManagement", { defaultValue: "Case Management" }), path: "/lab-case-management" })
        breadcrumbs.push({ name: t("breadcrumb.caseList", { defaultValue: "Case List" }), path: "/lab-case-management/case-list" })
        breadcrumbs.push({ name: t("breadcrumb.virtualSlip", { defaultValue: "Virtual Slip" }), path: pathname || "" })
        return breadcrumbs
      }

      // Only add other paths if we don't have the specific lab-administrator/staff-management case
      if (!paths.includes("staff-management")) {
        let currentPath = ""
        paths.forEach((path) => {
          currentPath += `/${path}`
          if (pathMap[path] && !breadcrumbs.find((b) => b.name === pathMap[path])) {
            breadcrumbs.push({ name: pathMap[path], path: currentPath })
          }
        })
      }

      return breadcrumbs
    }

    setBreadcrumbs(getBreadcrumbs())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, i18n.language, t, currentLanguage, user])

  return (
    <div className="flex items-center text-sm text-[#a19d9d] flex-wrap">
      {breadcrumbs.map((crumb, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
          {index === breadcrumbs.length - 1 ? (
            <span className="text-[#1162a8] font-medium">{crumb.name}</span>
          ) : (
            <Link href={crumb.path} className="hover:text-gray-700">
              {crumb.name}
            </Link>
          )}
        </div>
      ))}
    </div>
  )
}
