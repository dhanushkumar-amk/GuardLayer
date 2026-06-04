import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';

export const Settings: React.FC = () => {
  return (
    <MainLayout>
      <PageHeader
        title="Settings"
        description="Configure account details, update credentials, and verify server environment values."
      />
      <div className="space-y-8 font-sans">
        <section id="user-profile">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">User Profile</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Configure credentials for dashboard administration.</p>
          </div>
          <Card title="Account Details" description="Update password and administrative email.">
            <p className="text-sm">
              Settings options for updating accounts and security preferences will be configured here.
            </p>
          </Card>
        </section>

        <section id="server-settings">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Server Settings</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Environmental configs and connection endpoints.</p>
          </div>
          <Card title="Environment Details" description="System environment parameters.">
            <p className="text-sm">
              Debug details showing proxy configuration paths and active database states will be shown here.
            </p>
          </Card>
        </section>
      </div>
    </MainLayout>
  );
};

export default Settings;
