import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';

export const AuditLog: React.FC = () => {
  const anchors = [
    { id: 'gateway-requests', label: 'Gateway Requests' },
    { id: 'system-actions', label: 'System Actions' },
  ];

  return (
    <MainLayout rightPanelLinks={anchors} rightPanelActiveId="gateway-requests">
      <PageHeader
        title="Audit Log"
        description="Comprehensive audit logs of all API requests, responses, and administrative actions."
      />
      <div className="space-y-8">
        <section id="gateway-requests" className="scroll-mt-20">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Gateway Requests</h2>
            <p className="text-sm text-gray-500">History of LLM transactions processed by the proxy.</p>
          </div>
          <Card title="Request History" description="All data flows are logged here.">
            <p className="text-sm text-gray-600">
              Interactive table showing timestamps, request paths, API keys used, and policy results.
            </p>
          </Card>
        </section>

        <section id="system-actions" className="scroll-mt-20">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">System Actions</h2>
            <p className="text-sm text-gray-500">Administrative changes and authentication events.</p>
          </div>
          <Card title="Admin Action Log" description="Security parameter modifications.">
            <p className="text-sm text-gray-600">
              Log entries detailing configuration updates, user logins, and key generation events.
            </p>
          </Card>
        </section>
      </div>
    </MainLayout>
  );
};

export default AuditLog;
