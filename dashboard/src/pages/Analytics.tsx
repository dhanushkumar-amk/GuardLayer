import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';

export const Analytics: React.FC = () => {
  return (
    <MainLayout>
      <PageHeader
        title="Analytics"
        description="Visualize gateway request frequencies, rule trigger frequencies, and performance latency."
      />
      <div className="space-y-8 font-sans">
        <section id="traffic-trends">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Traffic Trends</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Query requests volume over time.</p>
          </div>
          <Card title="Traffic Overview" description="Hourly query throughput.">
            <p className="text-sm">
              Interactive line charts showing total requests vs blocked requests over specific time windows will load here.
            </p>
          </Card>
        </section>

        <section id="latency-stats">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Latency Statistics</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Guard evaluation times and overhead measurements.</p>
          </div>
          <Card title="System Performance" description="Average latency metrics.">
            <p className="text-sm">
              Bar graphs displaying evaluation latency breakdowns for each guard engine will be configured here.
            </p>
          </Card>
        </section>
      </div>
    </MainLayout>
  );
};

export default Analytics;
