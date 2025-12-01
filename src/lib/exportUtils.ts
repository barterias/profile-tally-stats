interface RankingItem {
  user_id: string;
  username: string;
  avatar_url?: string;
  total_videos: number;
  total_views: number;
  total_likes?: number;
  rank_position: number;
  estimated_earnings?: number;
}

interface CampaignSummary {
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_posts: number;
  total_clippers: number;
  engagement_rate: number;
}

interface CampaignInfo {
  name: string;
  campaign_type: string;
  payment_rate: number;
  prize_pool?: number;
  start_date: string;
  end_date: string;
  platforms: string[];
}

interface ExportData {
  campaign: CampaignInfo;
  summary: CampaignSummary;
  ranking: RankingItem[];
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('pt-BR').format(num);
};

const getCampaignTypeLabel = (type: string): string => {
  switch (type) {
    case 'pay_per_view':
      return 'Pagamento por View';
    case 'fixed':
      return 'Pagamento Fixo';
    case 'competition_daily':
      return 'Competição Diária';
    case 'competition_monthly':
      return 'Competição Mensal';
    default:
      return type;
  }
};

export function exportToCSV(data: ExportData, filename: string = 'campaign-report'): void {
  const { campaign, summary, ranking } = data;
  
  // Build CSV content
  let csvContent = '';
  
  // Campaign Info Header
  csvContent += 'RELATÓRIO DA CAMPANHA\n';
  csvContent += `Nome,${campaign.name}\n`;
  csvContent += `Tipo,${getCampaignTypeLabel(campaign.campaign_type)}\n`;
  csvContent += `Período,${new Date(campaign.start_date).toLocaleDateString('pt-BR')} a ${new Date(campaign.end_date).toLocaleDateString('pt-BR')}\n`;
  csvContent += `Plataformas,${campaign.platforms.join(', ')}\n`;
  if (campaign.campaign_type === 'pay_per_view') {
    csvContent += `Taxa por 1K views,${formatCurrency(campaign.payment_rate)}\n`;
  } else if (campaign.campaign_type === 'fixed') {
    csvContent += `Valor por vídeo,${formatCurrency(campaign.payment_rate)}\n`;
  } else {
    csvContent += `Premiação Total,${formatCurrency(campaign.prize_pool || 0)}\n`;
  }
  csvContent += '\n';
  
  // Summary
  csvContent += 'RESUMO DE DESEMPENHO\n';
  csvContent += `Total de Views,${formatNumber(summary.total_views)}\n`;
  csvContent += `Total de Vídeos,${formatNumber(summary.total_posts)}\n`;
  csvContent += `Total de Clipadores,${formatNumber(summary.total_clippers)}\n`;
  csvContent += `Total de Likes,${formatNumber(summary.total_likes)}\n`;
  csvContent += `Total de Comentários,${formatNumber(summary.total_comments)}\n`;
  csvContent += `Total de Compartilhamentos,${formatNumber(summary.total_shares)}\n`;
  csvContent += `Taxa de Engajamento,${summary.engagement_rate}%\n`;
  csvContent += '\n';
  
  // Ranking
  csvContent += 'RANKING DE CLIPADORES\n';
  csvContent += 'Posição,Nome,Vídeos,Views,Likes,Ganhos Estimados\n';
  
  ranking.forEach((item) => {
    csvContent += `${item.rank_position},${item.username},${item.total_videos},${formatNumber(item.total_views)},${formatNumber(item.total_likes || 0)},${formatCurrency(item.estimated_earnings || 0)}\n`;
  });
  
  // Download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPDF(data: ExportData, filename: string = 'campaign-report'): void {
  const { campaign, summary, ranking } = data;
  
  // Create a printable HTML document
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permita pop-ups para exportar o relatório em PDF.');
    return;
  }
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Relatório - ${campaign.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          padding: 40px;
          color: #1a1a2e;
          background: #ffffff;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #8b5cf6;
        }
        .header h1 { 
          font-size: 28px; 
          color: #8b5cf6;
          margin-bottom: 5px;
        }
        .header p { 
          color: #666; 
          font-size: 14px;
        }
        .section { 
          margin-bottom: 30px; 
        }
        .section-title { 
          font-size: 18px; 
          color: #8b5cf6;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e5e7eb;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .info-item {
          padding: 10px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        .info-item label {
          font-size: 12px;
          color: #666;
          display: block;
          margin-bottom: 4px;
        }
        .info-item span {
          font-size: 16px;
          font-weight: 600;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
        }
        .stat-card {
          text-align: center;
          padding: 15px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 12px;
        }
        .stat-card .value {
          font-size: 24px;
          font-weight: bold;
          color: #8b5cf6;
        }
        .stat-card .label {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        th {
          background: #f8f9fa;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          color: #666;
        }
        tr:nth-child(even) {
          background: #fafafa;
        }
        .rank-1 { color: #ffd700; font-weight: bold; }
        .rank-2 { color: #c0c0c0; font-weight: bold; }
        .rank-3 { color: #cd7f32; font-weight: bold; }
        .earnings { 
          color: #22c55e; 
          font-weight: 600;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #999;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${campaign.name}</h1>
        <p>${getCampaignTypeLabel(campaign.campaign_type)} • ${campaign.platforms.join(', ')}</p>
        <p>${new Date(campaign.start_date).toLocaleDateString('pt-BR')} - ${new Date(campaign.end_date).toLocaleDateString('pt-BR')}</p>
      </div>

      <div class="section">
        <h2 class="section-title">📊 Resumo de Desempenho</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="value">${formatNumber(summary.total_views)}</div>
            <div class="label">Views</div>
          </div>
          <div class="stat-card">
            <div class="value">${formatNumber(summary.total_posts)}</div>
            <div class="label">Vídeos</div>
          </div>
          <div class="stat-card">
            <div class="value">${formatNumber(summary.total_clippers)}</div>
            <div class="label">Clipadores</div>
          </div>
          <div class="stat-card">
            <div class="value">${summary.engagement_rate}%</div>
            <div class="label">Engajamento</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">💰 Informações Financeiras</h2>
        <div class="info-grid">
          ${campaign.campaign_type === 'pay_per_view' ? `
            <div class="info-item">
              <label>Taxa por 1K views</label>
              <span>${formatCurrency(campaign.payment_rate)}</span>
            </div>
          ` : campaign.campaign_type === 'fixed' ? `
            <div class="info-item">
              <label>Valor por vídeo</label>
              <span>${formatCurrency(campaign.payment_rate)}</span>
            </div>
          ` : `
            <div class="info-item">
              <label>Premiação Total</label>
              <span>${formatCurrency(campaign.prize_pool || 0)}</span>
            </div>
          `}
          <div class="info-item">
            <label>Total de Likes</label>
            <span>${formatNumber(summary.total_likes)}</span>
          </div>
          <div class="info-item">
            <label>Total de Comentários</label>
            <span>${formatNumber(summary.total_comments)}</span>
          </div>
          <div class="info-item">
            <label>Total de Compartilhamentos</label>
            <span>${formatNumber(summary.total_shares)}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">🏆 Ranking de Clipadores</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Clipador</th>
              <th>Vídeos</th>
              <th>Views</th>
              <th>Likes</th>
              <th>Ganhos Estimados</th>
            </tr>
          </thead>
          <tbody>
            ${ranking.map(item => `
              <tr>
                <td class="${item.rank_position <= 3 ? `rank-${item.rank_position}` : ''}">${item.rank_position}º</td>
                <td>${item.username}</td>
                <td>${item.total_videos}</td>
                <td>${formatNumber(item.total_views)}</td>
                <td>${formatNumber(item.total_likes || 0)}</td>
                <td class="earnings">${formatCurrency(item.estimated_earnings || 0)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="footer">
        Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
}
