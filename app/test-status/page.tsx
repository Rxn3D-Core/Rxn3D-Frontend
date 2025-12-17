"use client"

import { StatusAssignmentTest } from '@/components/status-assignment-test';

export default function TestStatusPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Status Assignment Test</h1>
        <StatusAssignmentTest />
      </div>
    </div>
  );
}
