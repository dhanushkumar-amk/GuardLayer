import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export const ApiKeys: React.FC = () => {
  const anchors = [
    { id: 'active-keys', label: 'Active Keys' },
    { id: 'key-permissions', label: 'Key Permissions' },
  ];

  return (
    <MainLayout rightPanelLinks={anchors} rightPanelActiveId="active-keys">
      <PageHeader
        title="API Keys"
        description="Generate, revoke, and manage API keys for clients accessing the gateway."
        actions={
          <Button variant="primary" size="sm">
            Create API Key
          </Button>
        }
      />
      <div className="space-y-8">
        <section id="active-keys" className="scroll-mt-20">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Active Keys</h2>
            <p className="text-sm text-gray-500">Keys currently authorized to execute LLM queries.</p>
          </div>
          <Card title="Client Authentication Keys" description="Secure keys for integration.">
            <p className="text-sm text-gray-600">
              The API keys overview table will be rendered here. You will be able to revoke or regenerate keys as needed.
            </p>
          </Card>
        </section>

        <section id="key-permissions" className="scroll-mt-20">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Key Permissions</h2>
            <p className="text-sm text-gray-500">Associated roles and guard profiles for each key.</p>
          </div>
          <Card title="Role Scope Overview" description="Granular access controls.">
            <p className="text-sm text-gray-600">
              Define target policies (e.g., development, production, sandbox) for each generated API key.
            </p>
          </Card>
        </section>
      </div>
    </MainLayout>
  );
};

export default ApiKeys;
