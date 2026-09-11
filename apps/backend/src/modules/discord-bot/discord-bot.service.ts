import { FuturesScannerService } from '../futures-scanner/futures-scanner.service';
import { Options, NumberOption, StringOption } from 'necord';

import { Injectable, Logger } from '@nestjs/common';
import { SpotTradeService } from '../spot-trade/spot-trade.service';
import { FuturesTradeService } from '../futures-trade/futures-trade.service';
import { P2PTradeService } from '../p2p-trade/p2p-trade.service';
import { Context, SlashCommand, Button, On } from 'necord';
import type { SlashCommandContext, ButtonContext, ContextOf } from 'necord';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

import { ConfigService } from '@nestjs/config';
import { Spot } from '@binance/spot';
import { PortfolioValuationService } from '../portfolio-valuation/portfolio-valuation.service';
import { HistorySyncService } from '../account-balance-streamer/history-sync.service';
import { P2PSyncService } from '../p2p-sync/p2p-sync.service';

export class TopFuturesOptions {
  @NumberOption({
    name: 'capital',
    description: 'Số vốn hiện có (USDT)',
    required: false,
  })
  capital?: number;
}

export class BlacklistOptions {
  @StringOption({
    name: 'symbol',
    description: 'Mã token (VD: BTCUSDT)',
    required: true,
  })
  symbol!: string;
}

export class BlacklistAddOptions {
  @StringOption({
    name: 'symbol',
    description: 'Mã token (VD: BTCUSDT)',
    required: true,
  })
  symbol!: string;

  @StringOption({
    name: 'reason',
    description: 'Lý do cấm (chọn mẫu)',
    required: false,
    choices: [
      { name: 'Trade manually', value: 'Trade manually' },
      { name: 'Bị huỷ niêm yết', value: 'Bị huỷ niêm yết' },
      { name: 'Khác', value: 'Khác' }
    ]
  })
  reason?: string;

  @StringOption({
    name: 'custom_reason',
    description: 'Lý do khác (nhập bằng tay)',
    required: false,
  })
  customReason?: string;
}

export class AutoTradeStartOptions {
  @NumberOption({
    name: 'time',
    description: 'Thời gian chạy bot (phút)',
    required: false,
  })
  time?: number;
  @NumberOption({
    name: 'quantity',
    description: 'Số lượng lệnh tối đa',
    required: false,
  })
  quantity?: number;
  @NumberOption({
    name: 'capital',
    description: 'Số vốn USDT tối đa bot được dùng',
    required: false,
  })
  capital?: number;
}

@Injectable()
export class DiscordBotService {
  private readonly logger = new Logger(DiscordBotService.name);

  constructor(
    private readonly spotTradeService: SpotTradeService,
    private readonly futuresTradeService: FuturesTradeService,
    private readonly p2pTradeService: P2PTradeService,
    private readonly configService: ConfigService,
    private readonly portfolioValuationService: PortfolioValuationService,
    private readonly historySyncService: HistorySyncService,
    private readonly p2pSyncService: P2PSyncService,
    private readonly futuresScannerService: FuturesScannerService,
  ) {}

  @On('clientReady')
  public onReady(@Context() [client]: ContextOf<'clientReady'>) {
    this.logger.log(`Discord Bot logged in as ${client.user.username}`);
  }

  @SlashCommand({
    name: 'report-futures',
    description: 'Show Futures trading report menu',
  })
  public async onReportFutures(@Context() [interaction]: SlashCommandContext) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('futures_daily')
        .setLabel('Daily')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('futures_weekly')
        .setLabel('Weekly')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('futures_monthly')
        .setLabel('Monthly')
        .setStyle(ButtonStyle.Primary),
    );
    return interaction.reply({
      content: 'Chọn khoảng thời gian cho Futures Report:',
      components: [row],
    });
  }

  @SlashCommand({
    name: 'report-spot',
    description: 'Báo cáo tổng quan tài sản và lợi nhuận Spot',
  })
  public async onReportSpot(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply();
    const end = new Date();
    const start = new Date(0);
    await this.generateAndReplySpotReport(interaction, start, end, 'All Time');
  }

  @SlashCommand({
    name: 'top-futures',
    description:
      'Lọc ra 5 token có tiềm năng trade futures nhất bằng phân tích định lượng',
  })
  public async onTopFutures(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: TopFuturesOptions,
  ) {
    await interaction.deferReply();

    try {
      const { capital, tokens } =
        await this.futuresScannerService.scanTopOpportunities(options.capital);

      let msg = `🚀 **TOP 5 CƠ HỘI FUTURES (QUANTITATIVE ANALYSIS)** 🚀\n`;
      msg += `💰 **Vốn giao dịch tham khảo:** ${capital.toFixed(2)} USDT\n\n`;

      tokens.forEach((t, index) => {
        msg += `**#${index + 1} ${t.symbol}**\n`;
        msg += `- **Tín hiệu:** ${t.suggestedAction}\n`;
        msg += `- **Volume 24h:** ${(t.volume / 1e6).toFixed(2)}M USDT | **Biến động:** ${(t.volatility * 100).toFixed(2)}% | **Thay đổi:** ${t.priceChangePercent.toFixed(2)}%\n`;
        msg += `- **Funding Rate:** ${(t.fundingRate * 100).toFixed(4)}%\n`;
        msg += `- **Lý do:** ${t.reason}\n`;
        msg += `- **Gợi ý đi lệnh:** Đòn bẩy tối đa **${t.recommendedLeverage}x** - Quy mô lệnh: **${t.allocationSize.toFixed(2)} USDT** (Rủi ro 2% vốn/lệnh)\n\n`;
      });

      msg += `\n*Lưu ý: Phân tích định lượng dựa trên biến động giá, khối lượng và funding rate hiện tại để tìm sự bất thường (anomaly) hoặc xu hướng mạnh. Luôn cài đặt Stoploss!* `;

      await interaction.editReply(msg);
    } catch (err: any) {
      await interaction.editReply(`❌ Lỗi phân tích dữ liệu: ${err.message}`);
    }
  }

  // --- FUTURES BUTTONS ---
  @Button('futures_daily')
  public async onFuturesDaily(@Context() [interaction]: ButtonContext) {
    const end = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    await interaction.deferReply();
    await this.generateAndReplyReport(interaction, start, end, 'Daily');
  }

  @Button('futures_weekly')
  public async onFuturesWeekly(@Context() [interaction]: ButtonContext) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    await interaction.deferReply();
    await this.generateAndReplyReport(interaction, start, end, 'Weekly');
  }

  @Button('futures_monthly')
  public async onFuturesMonthly(@Context() [interaction]: ButtonContext) {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    await interaction.deferReply();
    await this.generateAndReplyReport(interaction, start, end, 'Monthly');
  }

  @On('messageCreate')
  public async onMessageCreate(
    @Context() [message]: ContextOf<'messageCreate'>,
  ) {
    if (message.author.bot) return;

    const content = message.content.trim();
    if (content.startsWith('@report')) {
      const parts = content.split(' ');
      if (parts.length < 2) {
        await message.reply(
          'Cú pháp: @report [futures|spot] dd/mm/yy-dd/mm/yy hoặc @report [futures|spot] daily/weekly/monthly',
        );
        return;
      }

      let market: 'FUTURES' | 'SPOT' = 'FUTURES';
      let timeframe = parts[1].toLowerCase();

      if (['futures', 'spot'].includes(timeframe)) {
        market = timeframe.toUpperCase() as 'FUTURES' | 'SPOT';
        timeframe = parts[2] ? parts[2].toLowerCase() : 'daily';
      }

      const end = new Date();
      const start = new Date();

      if (timeframe === 'daily') {
        start.setHours(0, 0, 0, 0);
      } else if (timeframe === 'weekly') {
        start.setDate(start.getDate() - 7);
      } else if (timeframe === 'monthly') {
        start.setMonth(start.getMonth() - 1);
      } else if (timeframe.includes('-')) {
        const dates = timeframe.split('-');
        if (dates.length === 2) {
          const parseDate = (dStr: string, isEnd = false) => {
            const [dd, mm, yy] = dStr.split('/');
            const year = yy.length === 2 ? `20${yy}` : yy;
            const d = new Date(`${year}-${mm}-${dd}T00:00:00.000Z`);
            if (isEnd) d.setHours(23, 59, 59, 999);
            return d;
          };
          try {
            start.setTime(parseDate(dates[0]).getTime());
            end.setTime(parseDate(dates[1], true).getTime());
          } catch (e) {
            await message.reply(
              'Định dạng ngày không hợp lệ. Vui lòng dùng dd/mm/yy-dd/mm/yy',
            );
            return;
          }
        }
      }

      if (timeframe === 'overview' || parts[1].toLowerCase() === 'overview') {
        await this.generateAndReplyOverviewReport(message);
        return;
      }

      if (market === 'FUTURES') {
        await this.generateAndReplyReport(
          message,
          start,
          end,
          timeframe.toUpperCase(),
        );
      } else {
        await this.generateAndReplySpotReport(
          message,
          start,
          end,
          timeframe.toUpperCase(),
        );
      }
    }
  }

  private async formatFeeWithUsdtEstimation(
    feeByAsset: Record<string, number>,
  ): Promise<string> {
    if (Object.keys(feeByAsset).length === 0) return '0 USDT';

    let totalUsdtEquivalent = 0;
    const feeParts: string[] = [];

    try {
      const apiKey = this.configService.get<string>('BINANCE_API_KEY');
      const apiSecret = (
        this.configService.get<string>('BINANCE_PRIVATE_KEY') || ''
      ).replace(/\\n/g, '\n');

      const priceMap = new Map<string, number>();
      if (apiKey && apiSecret) {
        const spotClient = new Spot({
          configurationRestAPI: { apiKey, privateKey: apiSecret },
        });
        const pricesRes = await spotClient.restAPI.tickerPrice();
        const pricesData = await pricesRes.data();
        const prices = Array.isArray(pricesData) ? pricesData : [];
        for (const p of prices as any[]) {
          if (p.symbol && p.price) {
            priceMap.set(p.symbol, parseFloat(p.price));
          }
        }
      }

      for (const [asset, amount] of Object.entries(feeByAsset)) {
        if (asset === 'USDT' || asset === 'USDC') {
          totalUsdtEquivalent += amount;
          feeParts.push(`${amount.toFixed(4)} ${asset}`);
        } else {
          const symbol = `${asset}USDT`;
          const currentPrice = priceMap.get(symbol) || 0;
          if (currentPrice > 0) {
            const usdtValue = amount * currentPrice;
            totalUsdtEquivalent += usdtValue;
            feeParts.push(
              `${amount.toFixed(6)} ${asset} (~${usdtValue.toFixed(4)} USDT)`,
            );
          } else {
            feeParts.push(`${amount.toFixed(6)} ${asset}`);
          }
        }
      }

      if (
        feeParts.length === 1 &&
        feeParts[0].includes('USDT') &&
        !feeParts[0].includes('(~')
      ) {
        return feeParts[0];
      } else {
        return `${feeParts.join(' + ')} (Tổng ước tính: ~${totalUsdtEquivalent.toFixed(4)} USDT)`;
      }
    } catch (err) {
      this.logger.error('Lỗi khi tính fee ra USDT: ', err);
      return Object.entries(feeByAsset)
        .map(([a, f]) => `${f.toFixed(6)} ${a}`)
        .join(' + ');
    }
  }

  private async generateAndReplyReport(
    interactionOrMessage: any,
    start: Date,
    end: Date,
    title: string,
  ) {
    const allTrades = await this.futuresTradeService.findTradesBetween(
      start,
      end,
    );

    let totalWinCount = 0;
    let totalLoseCount = 0;
    let totalNetPnl = 0;
    let totalWinAmount = 0;
    let totalLoseAmount = 0;
    const feeByAsset: Record<string, number> = {};

    for (const trade of allTrades) {
      if (trade.realizedPnl > 0) {
        totalWinCount++;
        totalWinAmount += trade.realizedPnl;
      } else if (trade.realizedPnl < 0) {
        totalLoseCount++;
        totalLoseAmount += Math.abs(trade.realizedPnl);
      }
      const actualFee = Math.abs(trade.fee); // Handle both old negative and new positive fee data
      totalNetPnl += trade.realizedPnl - actualFee;

      const asset = trade.feeAsset || 'USDT';
      feeByAsset[asset] = (feeByAsset[asset] || 0) + actualFee;
    }

    const feeStr = await this.formatFeeWithUsdtEstimation(feeByAsset);

    const reportStr = `**FUTURES Trading Report (${title})**
📅 Từ: ${start.toLocaleString()}
📅 Đến: ${end.toLocaleString()}
--------------------------------------
💰 **TỔNG KẾT TOÀN BỘ (Total Net PnL)**
📊 Tổng lịch sử khớp: ${allTrades.length} giao dịch (${totalWinCount} Thắng / ${totalLoseCount} Thua)
💵 Tổng tiền lãi: ${totalWinAmount.toFixed(4)} USDT
💸 Tổng tiền lỗ: ${totalLoseAmount.toFixed(4)} USDT
💳 Tổng chi phí (Fee): ${feeStr}
⚖️ NET PNL: **${totalNetPnl.toFixed(4)} USDT**`;

    if ('editReply' in interactionOrMessage) {
      try {
        await interactionOrMessage.editReply({ content: reportStr });
      } catch {
        await interactionOrMessage.reply({ content: reportStr });
      }
    } else if ('reply' in interactionOrMessage) {
      await interactionOrMessage.reply({ content: reportStr });
    }
  }

  private async generateAndReplySpotReport(
    interactionOrMessage: any,
    start: Date,
    end: Date,
    title: string,
  ) {
    const trades = await this.spotTradeService.findTradesBetween(start, end);

    const totalTrades = trades.length;
    let buyCount = 0;
    let sellCount = 0;
    const feeByAsset: Record<string, number> = {};

    for (const trade of trades) {
      if (trade.side === 'BUY') buyCount++;
      else sellCount++;

      const asset = trade.feeAsset || 'USDT';
      feeByAsset[asset] = (feeByAsset[asset] || 0) + trade.fee;
    }

    const feeStr = await this.formatFeeWithUsdtEstimation(feeByAsset);

    let estimatedTotalValue = 0;
    let balanceStr = '';

    try {
      const apiKey = this.configService.get<string>('BINANCE_API_KEY');
      const apiSecret = (
        this.configService.get<string>('BINANCE_PRIVATE_KEY') || ''
      ).replace(/\\n/g, '\n');
      if (apiKey && apiSecret) {
        const spotClient = new Spot({
          configurationRestAPI: {
            apiKey,
            privateKey: apiSecret,
          },
        });
        const res = await spotClient.restAPI.getAccount();
        const accountData = await res.data();
        const balances = (accountData.balances || []).filter(
          (b: any) =>
            parseFloat(b.free || '0') > 0 || parseFloat(b.locked || '0') > 0,
        );

        const pricesRes = await spotClient.restAPI.tickerPrice();
        const pricesData = await pricesRes.data();
        const prices = Array.isArray(pricesData) ? pricesData : [];
        const priceMap = new Map<string, number>();
        for (const p of prices as any[]) {
          if (p.symbol && p.price) {
            priceMap.set(p.symbol, parseFloat(p.price));
          }
        }

        for (const b of balances) {
          const amount =
            parseFloat(b.free || '0') + parseFloat(b.locked || '0');
          if (b.asset === 'USDT') {
            estimatedTotalValue += amount;
            balanceStr += `\n- **${b.asset}**: ${amount.toFixed(4)}`;
          } else {
            const symbol = `${b.asset}USDT`;
            const price = priceMap.get(symbol) || 0;
            const usdtValue = amount * price;
            if (usdtValue > 1) {
              // Lọc các coin lẻ (dust) dưới 1 USDT
              estimatedTotalValue += usdtValue;

              // Calculate Average Cost & PNL
              let avgPrice = 0;
              let totalQty = 0;
              let totalCost = 0;
              const trades =
                await this.spotTradeService.findAllBySymbol(symbol);
              for (const t of trades) {
                if (t.side === 'BUY') {
                  totalCost += t.qty * t.price;
                  totalQty += t.qty;
                } else if (t.side === 'SELL') {
                  if (totalQty >= t.qty) {
                    totalCost -= (totalCost / totalQty) * t.qty;
                    totalQty -= t.qty;
                  } else {
                    totalQty = 0;
                    totalCost = 0;
                  }
                }
              }
              if (totalQty > 0) avgPrice = totalCost / totalQty;

              let pnlStr = '';
              if (avgPrice > 0) {
                const pnl = (price - avgPrice) * amount;
                const pnlPercent = ((price - avgPrice) / avgPrice) * 100;
                const icon = pnl >= 0 ? '🟩 Lãi' : '🟥 Lỗ';
                pnlStr = `\n  ↳ Vốn TB: ${avgPrice.toFixed(4)} | ${icon}: ${Math.abs(pnl).toFixed(2)} USDT (${pnlPercent.toFixed(2)}%)`;
              }

              balanceStr += `\n- **${b.asset}**: ${amount.toFixed(4)} (~${usdtValue.toFixed(2)} USDT)${pnlStr}`;
            }
          }
        }
      }
    } catch (err) {
      this.logger.error('Failed to fetch spot balances', err);
    }

    const reportStr = `**SPOT Trading Report (${title})**
📅 Từ: ${start.toLocaleString()}
📅 Đến: ${end.toLocaleString()}
--------------------------------------
📊 Tổng số lệnh khớp (trong kỳ): ${totalTrades}
🟢 Số lệnh BUY: ${buyCount} | 🔴 Số lệnh SELL: ${sellCount}
💸 Tổng phí giao dịch: ${feeStr}

**💰 TỔNG TÀI SẢN DỰ TÍNH HIỆN TẠI:**
**~ ${estimatedTotalValue.toFixed(2)} USDT**
${balanceStr ? `*Chi tiết ví Spot:*${balanceStr}` : ''}`;

    if ('editReply' in interactionOrMessage) {
      try {
        await interactionOrMessage.editReply({ content: reportStr });
      } catch {
        await interactionOrMessage.reply({ content: reportStr });
      }
    } else if ('reply' in interactionOrMessage) {
      await interactionOrMessage.reply({ content: reportStr });
    }
  }
  private async generateAndReplyOverviewReport(interactionOrMessage: any) {
    const p2pTrades = await this.p2pTradeService.findAll();
    let totalFiatIn = 0;
    let totalFiatOut = 0;
    let totalUsdtIn = 0;
    let totalUsdtOut = 0;
    let totalP2pCommission = 0;

    for (const trade of p2pTrades) {
      if (trade.tradeType === 'BUY') {
        totalFiatIn += trade.totalPrice;
        totalUsdtIn += trade.amount;
      } else if (trade.tradeType === 'SELL') {
        totalFiatOut += trade.totalPrice;
        totalUsdtOut += trade.amount;
      }
      totalP2pCommission += trade.commission || 0;
    }

    const netFiatInjected = totalFiatIn - totalFiatOut;
    const netUsdtInjected = totalUsdtIn - totalUsdtOut;

    // Fallback: If no P2P history but we have assets, it might be transferred from elsewhere.

    const valuation = this.portfolioValuationService.getTotalAssetValue();

    // Lợi nhuận ròng = Tổng tài sản sàn - Số vốn USDT đã bơm vào
    const netProfitUsdt = valuation.total - netUsdtInjected;

    const reportStr = `**📊 TỔNG QUAN TÀI SẢN & ĐẦU TƯ**
--------------------------------------
**1. Dòng Tiền P2P (Bơm vào sàn)**
💵 Tổng VND nạp: \`${totalFiatIn.toLocaleString('vi-VN')} VND\` (~${totalUsdtIn.toFixed(2)} USDT)
💸 Tổng VND rút: \`${totalFiatOut.toLocaleString('vi-VN')} VND\` (~${totalUsdtOut.toFixed(2)} USDT)
⚖️ **NET VND Bơm Vào:** \`${netFiatInjected.toLocaleString('vi-VN')} VND\`
⚖️ **NET USDT Bơm Vào:** \`${netUsdtInjected.toFixed(2)} USDT\`
💳 **Tổng phí giao dịch P2P:** \`${totalP2pCommission.toFixed(2)} USDT\`

**2. Tài Sản Hiện Tại (Định giá theo giá hiện tại)**
📈 Ví Spot: \`~${valuation.spot.toFixed(2)} USDT\`
📉 Ví Futures: \`~${valuation.futures.toFixed(2)} USDT\`
💰 **TỔNG TÀI SẢN:** \`${valuation.total.toFixed(2)} USDT\`

**3. Hiệu Quả Đầu Tư (Net Profit)**
${netProfitUsdt >= 0 ? '🟢 LÃI RÒNG' : '🔴 LỖ RÒNG'}: **${netProfitUsdt.toFixed(2)} USDT**`;

    if ('reply' in interactionOrMessage) {
      await interactionOrMessage.reply({ content: reportStr });
    }
  }

  @SlashCommand({
    name: 'sync',
    description: 'Đồng bộ dữ liệu lịch sử từ Binance (Spot, Futures, P2P)',
  })
  public async onSync(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const marketResult = await this.historySyncService.syncInitialData();
      const p2pSynced = await this.p2pSyncService.syncP2PHistory();

      const msg =
        `✅ Đồng bộ hoàn tất!\n` +
        `- Spot Trades: ${marketResult.spotSynced || 0}\n` +
        `- Futures Trades: ${marketResult.futuresSynced || 0}\n` +
        `- P2P Trades: ${p2pSynced}`;


      await interaction.followUp({ content: msg, ephemeral: true });
    } catch (err: any) {
      await interaction.followUp({
        content: `❌ Đồng bộ thất bại: ${err.message}`,
        ephemeral: true,
      });
    }
  }

  @SlashCommand({
    name: 'overview',
    description: 'Xem tổng quan tài sản & lợi nhuận ròng',
  })
  public async onOverviewSlash(@Context() [interaction]: SlashCommandContext) {
    await this.generateAndReplyOverviewReport(interaction);
  }

}