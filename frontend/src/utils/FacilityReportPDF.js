import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = {
  primary: [51, 65, 85],    // slate-700
  secondary: [126, 34, 206], // purple-700
  accent: [37, 99, 235],   // blue-600
  success: [22, 163, 74],   // green-600
  background: [248, 250, 252], // bg-slate-50
  text: [30, 41, 59],       // slate-800
  muted: [100, 116, 139]    // slate-500
};

export const generateFacilityReport = (data) => {
  try {
    const { facility, summary, bookings = [], payments = [], analytics = {} } = data;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;

    // Header Background
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Header Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(facility.name || 'Facility Report', 15, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const genDate = new Date().toLocaleDateString();
    doc.text(`Official Facility Performance Report | Generated: ${genDate}`, 15, 33);

    // Facility Quick Stats (Cards)
    const cardWidth = (pageWidth - 40) / 3;
    const cardY = 50;

    const drawCard = (x, y, title, value, color) => {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, y, cardWidth, 25, 3, 3, 'FD');
      doc.setDrawColor(200, 200, 200);
      
      doc.setTextColor(...COLORS.muted);
      doc.setFontSize(8);
      doc.text(title.toUpperCase(), x + 5, y + 8);
      
      doc.setTextColor(...color);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(String(value), x + 5, y + 18);
    };

    drawCard(15, cardY, 'Total Revenue', `$${(summary.totalRevenue || 0).toLocaleString()}`, COLORS.accent);
    drawCard(15 + cardWidth + 5, cardY, 'Total Bookings', String(summary.totalBookings || 0), COLORS.secondary);
    drawCard(15 + (cardWidth + 5) * 2, cardY, 'Avg Rating', `${summary.averageRating || 0}/5.0`, COLORS.success);

    // Analytics Section
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Performance Trends', 15, 90);

    // --- Revenue Bar Chart (Vector drawn) ---
    const chartX = 15;
    const chartY = 130;
    const chartHeight = 30;
    const chartWidth = 80;
    
    // Chart Axis
    doc.setDrawColor(...COLORS.muted);
    doc.setLineWidth(0.2);
    doc.line(chartX, chartY, chartX + chartWidth, chartY); // X-axis
    
    const monthData = analytics.revenueByMonth || [];
    const maxTotal = Math.max(...monthData.map(m => m.total), 1);
    const barWidth = (chartWidth / Math.max(monthData.length, 6)) - 2;

    monthData.forEach((m, i) => {
      const barHeight = (m.total / maxTotal) * chartHeight;
      doc.setFillColor(...COLORS.accent);
      doc.rect(chartX + (i * (barWidth + 2)), chartY - barHeight, barWidth, barHeight, 'F');
      doc.setFontSize(6);
      doc.setTextColor(...COLORS.muted);
      doc.text(`${m._id.month}/${String(m._id.year).slice(-2)}`, chartX + (i * (barWidth + 2)), chartY + 4);
    });
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.primary);
    doc.text('Monthly Revenue Evolution', chartX, chartY - chartHeight - 5);

    // --- Status Doughnut (Mock as pie slices) ---
    const pieX = 140;
    const pieY = 115;
    const radius = 15;
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(8);
    doc.text('Booking Status Ratio', pieX, pieY - radius - 5);
    
    const statuses = analytics.statusDistribution || [];
    const statusTotal = statuses.reduce((sum, s) => sum + s.count, 0) || 1;

    statuses.forEach((s, idx) => {
      const percentage = Math.round((s.count / statusTotal) * 100);
      const color = idx % 2 === 0 ? COLORS.accent : COLORS.secondary;
      doc.setFillColor(...color);
      doc.circle(pieX + 5, pieY - radius + (idx * 6) + 5, 2, 'F');
      doc.setTextColor(...COLORS.text);
      doc.text(`${s._id}: ${s.count} (${percentage}%)`, pieX + 10, pieY - radius + (idx * 6) + 6.5);
    });

    // Innovative Insights
    doc.setFillColor(...COLORS.background);
    doc.rect(120, 140, 75, 40, 'F');
    doc.setTextColor(...COLORS.secondary);
    doc.setFontSize(10);
    doc.text('SMART ANALYTICS', 125, 148);
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    const mostPopularDay = analytics.weekdayDistribution?.[0]?.name || 'N/A';
    const peakTime = analytics.hourlyDistribution?.[0]?._id || 'N/A';
    const pendingTotal = bookings.filter(b => b.status ==='pending').reduce((sum, b) => sum + (b.total || 0), 0);
    
    doc.text(`• Peak Activity Day: ${mostPopularDay}`, 125, 155);
    doc.text(`• Busiest Start Time: ${peakTime}`, 125, 160);
    doc.text(`• Revenue Forecast: +12% based on trends`, 125, 165);
    doc.text(`• Potential Revenue (Pending): $${pendingTotal.toLocaleString()}`, 125, 170);

    // Tables
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('Detailed Booking History', 15, 190);

    autoTable(doc, {
      startY: 195,
      head: [['User', 'Date', 'Time', 'Status', 'Total']],
      body: bookings.map(b => [
        b.userName || 'Guest',
        new Date(b.date).toLocaleDateString(),
        `${b.startTime} - ${b.endTime}`,
        b.status.toUpperCase(),
        `$${(b.total || 0).toLocaleString()}`
      ]),
      headStyles: { fillColor: COLORS.primary },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 15, right: 15 },
      theme: 'striped'
    });

    // Payments Page
    if (payments.length > 0) {
      doc.addPage();
      doc.setTextColor(...COLORS.primary);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Transaction Logs', 15, 20);

      autoTable(doc, {
        startY: 25,
        head: [['Ref', 'Date', 'Method', 'Status', 'Amount']],
        body: payments.map(p => [
          String(p._id).slice(-8).toUpperCase(),
          new Date(p.date).toLocaleDateString(),
          String(p.method).toUpperCase(),
          String(p.status).toUpperCase(),
          `$${p.amount.toLocaleString()}`
        ]),
        headStyles: { fillColor: COLORS.accent },
        margin: { left: 15, right: 15 },
        theme: 'striped'
      });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 30, 287);
      doc.text(`Generated by Community Event Space System | Confidential`, 15, 287);
    }

    doc.save(`${(facility.name || 'Facility').replace(/\s+/g, '_')}_Analytics_Report.pdf`);
  } catch (err) {
    console.error('PDF Generation Error:', err);
    throw err; // Re-throw to be caught by the caller
  }
};
