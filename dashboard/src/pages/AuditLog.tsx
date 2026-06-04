import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';

export const AuditLog: React.FC = () => {
  return (
    <MainLayout>
      <PageHeader
        title="Audit Log"
        description="Comprehensive audit logs of all API requests, responses, and administrative actions."
      />
      <div className="space-y-8 font-sans">
        <section id="gateway-requests">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Gateway Requests</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">History of LLM transactions processed by the proxy.</p>
          </div>
          <Card title="Request History" description="All data flows are logged here.">
            <p className="text-sm">
              Interactive table showing timestamps, request paths, API keys used, and policy results.
            </p>
          </Card>
        </section>

        <section id="system-actions">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">System Actions</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Administrative changes and authentication events.</p>
          </div>
          <Card title="Admin Action Log" description="Security parameter modifications.">
            <p className="text-sm">
              Log entries detailing configuration updates, user logins, and key generation events.
            </p>
          </Card>
        </section>
      </div>
    </MainLayout>
  );
};

export default AuditLog;
