import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';

export const Analytics: React.FC = () => {
  const anchors = [
    { id: 'traffic-trends', label: 'Traffic Trends' },
    { id: 'latency-stats', label: 'Latency Statistics' },
  ];

  return (
    <MainLayout rightPanelLinks={anchors} rightPanelActiveId="traffic-trends">
      <PageHeader
        title="Analytics"
        description="Visualize gateway request frequencies, rule trigger frequencies, and performance latency."
      />
      <div className="space-y-8">
        <section id="traffic-trends" className="scroll-mt-20">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Traffic Trends</h2>
            <p className="text-sm text-gray-500">Query requests volume over time.</p>
          </div>
          <Card title="Traffic Overview" description="Hourly query throughput.">
            <p className="text-sm text-gray-600">
              Interactive line charts showing total requests vs blocked requests over specific time windows will load here.
            </p>
          </Card>
        </section>

        <section id="latency-stats" className="scroll-mt-20">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Latency Statistics</h2>
            <p className="text-sm text-gray-500">Guard evaluation times and overhead measurements.</p>
          </div>
          <Card title="System Performance" description="Average latency metrics.">
            <p className="text-sm text-gray-600">
              Bar graphs displaying evaluation latency breakdowns for each guard engine will be configured here.
            </p>
          </Card>
        </section>
      </div>
    </MainLayout>
  );
};

export default Analytics;
