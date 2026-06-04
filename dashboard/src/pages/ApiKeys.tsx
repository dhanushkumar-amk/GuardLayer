import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export const ApiKeys: React.FC = () => {
  return (
    <MainLayout>
      <PageHeader
        title="API Keys"
        description="Generate, revoke, and manage API keys for clients accessing the gateway."
        actions={
          <Button variant="primary" size="sm">
            Create API Key
          </Button>
        }
      />
      <div className="space-y-8 font-sans">
        <section id="active-keys">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Active Keys</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Keys currently authorized to execute LLM queries.</p>
          </div>
          <Card title="Client Authentication Keys" description="Secure keys for integration.">
            <p className="text-sm">
              The API keys overview table will be rendered here. You will be able to revoke or regenerate keys as needed.
            </p>
          </Card>
        </section>

        <section id="key-permissions">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Key Permissions</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Associated roles and guard profiles for each key.</p>
          </div>
          <Card title="Role Scope Overview" description="Granular access controls.">
            <p className="text-sm">
              Define target policies (e.g., development, production, sandbox) for each generated API key.
            </p>
          </Card>
        </section>
      </div>
    </MainLayout>
  );
};

export default ApiKeys;
