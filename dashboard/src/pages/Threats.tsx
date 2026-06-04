import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';

export const Threats: React.FC = () => {
  const anchors = [
    { id: 'recent-threats', label: 'Recent Threats' },
    { id: 'classification', label: 'Threat Classification' },
  ];

  return (
    <MainLayout rightPanelLinks={anchors} rightPanelActiveId="recent-threats">
      <PageHeader
        title="Threats"
        description="Review blocked requests, prompt injections, PII leaks, and other policy violations."
      />
      <div className="space-y-8">
        <section id="recent-threats" className="scroll-mt-20">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Threats</h2>
            <p className="text-sm text-gray-500">List of security incidents intercepted by guards.</p>
          </div>
          <Card title="Security Alerts" description="No critical threats detected recently.">
            <p className="text-sm text-gray-600">
              When threats are detected, detailed records of payload, triggers, and classifications will appear here.
            </p>
          </Card>
        </section>

        <section id="classification" className="scroll-mt-20">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Threat Classification</h2>
            <p className="text-sm text-gray-500">Incident breakdown by threat type.</p>
          </div>
          <Card title="Guard Categories" description="System capability overview.">
            <p className="text-sm text-gray-600">
              Filters and summaries based on Prompt Injections, Toxic Prompts, and PII Leaks will be integrated here.
            </p>
          </Card>
        </section>
      </div>
    </MainLayout>
  );
};

export default Threats;
