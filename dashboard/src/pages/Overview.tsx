import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';

export const Overview: React.FC = () => {
  return (
    <MainLayout>
      <PageHeader
        title="Overview"
        description="Monitor LLM security threats, guard outcomes, and gateway traffic in real-time."
      />
      <div className="space-y-8 font-sans">
        <section id="system-status">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">System Status</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Real-time status of the gateway guards.</p>
          </div>
          <Card title="Gateway Online" description="All protection layers are active.">
            <p className="text-sm">
              The GuardLayer gateway is currently running and intercepts LLM inputs/outputs.
            </p>
          </Card>
        </section>

        <section id="security-metrics">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security Metrics</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Recent threat statistics and analytics.</p>
          </div>
          <Card title="Metrics Overview" description="Summary of last 24 hours.">
            <p className="text-sm">
              Activity graphs, threat breakdown, and latency reports will be displayed here.
            </p>
          </Card>
        </section>
      </div>
    </MainLayout>
  );
};

export default Overview;
