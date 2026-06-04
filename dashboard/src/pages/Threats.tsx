import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';

export const Threats: React.FC = () => {
  return (
    <MainLayout>
      <PageHeader
        title="Threats"
        description="Review blocked requests, prompt injections, PII leaks, and other policy violations."
      />
      <div className="space-y-8 font-sans">
        <section id="recent-threats">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Threats</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">List of security incidents intercepted by guards.</p>
          </div>
          <Card title="Security Alerts" description="No critical threats detected recently.">
            <p className="text-sm">
              When threats are detected, detailed records of payload, triggers, and classifications will appear here.
            </p>
          </Card>
        </section>

        <section id="classification">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Threat Classification</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Incident breakdown by threat type.</p>
          </div>
          <Card title="Guard Categories" description="System capability overview.">
            <p className="text-sm">
              Filters and summaries based on Prompt Injections, Toxic Prompts, and PII Leaks will be integrated here.
            </p>
          </Card>
        </section>
      </div>
    </MainLayout>
  );
};

export default Threats;
