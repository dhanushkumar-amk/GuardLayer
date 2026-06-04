import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export const Config: React.FC = () => {
  const anchors = [
    { id: 'gateway-settings', label: 'Gateway Settings' },
    { id: 'active-rules', label: 'Active Rules' },
  ];

  return (
    <MainLayout rightPanelLinks={anchors} rightPanelActiveId="gateway-settings">
      <PageHeader
        title="Configuration"
        description="Edit system-wide guard settings, thresholds, and regex patterns."
        actions={
          <Button variant="primary" size="sm">
            Save Config
          </Button>
        }
      />
      <div className="space-y-8">
        <section id="gateway-settings" className="scroll-mt-20">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Gateway Settings</h2>
            <p className="text-sm text-gray-500">General settings for the gateway proxy runtime.</p>
          </div>
          <Card title="Proxy Engine" description="Basic operational rules.">
            <p className="text-sm text-gray-600">
              Configure parameters such as gateway names, operation mode (permissive or enforcing), and client rate limiting.
            </p>
          </Card>
        </section>

        <section id="active-rules" className="scroll-mt-20">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Active Rules</h2>
            <p className="text-sm text-gray-500">Security layers to apply on requests.</p>
          </div>
          <Card title="Guard Rules" description="Customize rulesets and safety limits.">
            <p className="text-sm text-gray-600">
              Modify prompt injection detection parameters, customize regular expressions for PII discovery, or define custom toxicity limits.
            </p>
          </Card>
        </section>
      </div>
    </MainLayout>
  );
};

export default Config;
