import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card.jsx';
import { Button } from '../ui/button.jsx';
import { useRevenueTrackingState } from './useRevenueTrackingState.jsx';

const FILTER_OPTIONS = [
  { value: 'monthly', label: 'Monthly (Last 12 mo)' },
  { value: 'yearly',  label: 'Yearly' },
  { value: 'all',     label: 'All Time' },
];

const BAR_COLOR        = '#6366f1';
const BAR_COLOR_HOVER  = '#4f46e5';
const GRID_COLOR       = 'rgba(0,0,0,0.06)';

export function RevenueTrackingTab() {
  const { chartData, summary, filter, setFilter, loading } = useRevenueTrackingState();
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  // Draw / redraw chart whenever data changes
  useEffect(() => {
    if (loading || !canvasRef.current) return;

    // Lazy-load Chart.js from CDN once
    const drawChart = () => {
      const Chart = window.Chart;
      if (!Chart) return;

      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }

      const ctx = canvasRef.current.getContext('2d');
      chartRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: chartData.labels,
          datasets: [
            {
              label: 'Revenue ($)',
              data: chartData.values,
              backgroundColor: BAR_COLOR,
              hoverBackgroundColor: BAR_COLOR_HOVER,
              borderRadius: 6,
              borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` $${ctx.parsed.y.toLocaleString()}`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 11 } },
            },
            y: {
              grid: { color: GRID_COLOR },
              ticks: {
                font: { size: 11 },
                callback: (v) => `$${v.toLocaleString()}`,
              },
              beginAtZero: true,
            },
          },
        },
      });
    };

    if (window.Chart) {
      drawChart();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
      script.onload = drawChart;
      document.head.appendChild(script);
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [chartData, loading]);

  // Generate PDF with the chart image + summary table
  const handleExportPDF = async () => {
    const loadJsPDF = () =>
      new Promise((resolve) => {
        if (window.jspdf) return resolve(window.jspdf.jsPDF);
        const script = document.createElement('script');
        script.src =
          'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => resolve(window.jspdf.jsPDF);
        document.head.appendChild(script);
      });

    const jsPDF = await loadJsPDF();
    const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const pageW  = doc.internal.pageSize.getWidth();
    const pageH  = doc.internal.pageSize.getHeight();
    const margin = 14;

    // ── Header ──────────────────────────────────────────────
    doc.setFillColor(30, 30, 60);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('EventSpace — Revenue Report', margin, 14);

    const filterLabel =
      FILTER_OPTIONS.find((f) => f.value === filter)?.label ?? filter;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Filter: ${filterLabel}   |   Generated: ${new Date().toLocaleString()}`,
      pageW - margin,
      14,
      { align: 'right' }
    );

    // ── Summary boxes ────────────────────────────────────────
    const boxes = [
      { label: 'Total Revenue',       value: `$${summary.total}` },
      { label: 'Venue Bookings',       value: `$${summary.venueTotal}` },
      { label: 'Event Registrations',  value: `$${summary.eventTotal}` },
      { label: 'Completed Payments',   value: summary.count },
    ];

    const boxW = (pageW - margin * 2 - 9) / 4;
    const boxY = 26;
    boxes.forEach((b, i) => {
      const x = margin + i * (boxW + 3);
      doc.setFillColor(245, 245, 255);
      doc.roundedRect(x, boxY, boxW, 18, 2, 2, 'F');
      doc.setTextColor(100, 100, 130);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text(b.label, x + boxW / 2, boxY + 6, { align: 'center' });
      doc.setTextColor(30, 30, 60);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(String(b.value), x + boxW / 2, boxY + 14, { align: 'center' });
    });

    // ── Chart image ──────────────────────────────────────────
    if (canvasRef.current) {
      const imgData  = canvasRef.current.toDataURL('image/png');
      const chartY   = boxY + 22;
      const chartH   = pageH - chartY - 40;
      doc.addImage(imgData, 'PNG', margin, chartY, pageW - margin * 2, chartH);
    }

    // ── Data table ───────────────────────────────────────────
    doc.addPage();
    doc.setFillColor(30, 30, 60);
    doc.rect(0, 0, pageW, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Revenue Breakdown', margin, 10);

    const colW   = (pageW - margin * 2) / 2;
    let   rowY   = 22;
    const rowH   = 9;

    // Table header
    doc.setFillColor(99, 102, 241);
    doc.rect(margin, rowY, pageW - margin * 2, rowH, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('Period', margin + 4, rowY + 6);
    doc.text('Revenue ($)', margin + colW + 4, rowY + 6);
    rowY += rowH;

    chartData.labels.forEach((label, i) => {
      if (rowY + rowH > pageH - 10) {
        doc.addPage();
        rowY = 14;
      }
      const isEven = i % 2 === 0;
      doc.setFillColor(isEven ? 248 : 255, isEven ? 248 : 255, isEven ? 255 : 255);
      doc.rect(margin, rowY, pageW - margin * 2, rowH, 'F');
      doc.setTextColor(50, 50, 80);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(label, margin + 4, rowY + 6);
      doc.text(`$${chartData.values[i].toLocaleString()}`, margin + colW + 4, rowY + 6);
      rowY += rowH;
    });

    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setTextColor(160, 160, 160);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${p} of ${totalPages}  |  EventSpace Revenue Report`,
        pageW / 2,
        pageH - 6,
        { align: 'center' }
      );
    }

    doc.save(`EventSpace_Revenue_${filter}_${Date.now()}.pdf`);
  };

  const filterLabel = FILTER_OPTIONS.find((f) => f.value === filter)?.label ?? filter;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Revenue',      value: `$${summary.total}`,         color: 'text-indigo-600' },
          { label: 'Venue Bookings',      value: `$${summary.venueTotal}`,    color: 'text-blue-600'   },
          { label: 'Event Registrations', value: `$${summary.eventTotal}`,    color: 'text-purple-600' },
          { label: 'Total Refunded',      value: `$${summary.refundedTotal}`, color: 'text-orange-500' },
          { label: 'Completed Payments',  value: summary.count,               color: 'text-green-600'  },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <p className="text-sm text-gray-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Revenue Chart</h2>
              <p className="text-sm text-gray-500">Completed payments — {filterLabel}</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Filter buttons */}
              <div className="flex rounded-lg border overflow-hidden">
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilter(opt.value)}
                    className={`px-3 py-1.5 text-sm transition-colors ${
                      filter === opt.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Export button */}
              <Button
                onClick={handleExportPDF}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
              >
                ⬇ Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Loading revenue data...
            </div>
          ) : chartData.labels.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No completed payments found for this period.
            </div>
          ) : (
            <div style={{ height: '340px', position: 'relative' }}>
              <canvas ref={canvasRef} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Breakdown Table */}
      {!loading && chartData.labels.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Breakdown Table</h2>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-indigo-50 text-indigo-700">
                    <th className="text-left px-4 py-2 rounded-tl-lg">Period</th>
                    <th className="text-right px-4 py-2 rounded-tr-lg">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.labels.map((label, i) => (
                    <tr key={label} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 text-gray-700">{label}</td>
                      <td className="px-4 py-2 text-right font-medium text-indigo-700">
                        ${chartData.values[i].toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-indigo-600 text-white font-semibold">
                    <td className="px-4 py-2 rounded-bl-lg">Total</td>
                    <td className="px-4 py-2 text-right rounded-br-lg">
                      ${chartData.values.reduce((s, v) => s + v, 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}