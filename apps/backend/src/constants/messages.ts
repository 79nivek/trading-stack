export const MESSAGES = {
  // Session / Status / Safety
  AUTO_TRADE_ALREADY_RUNNING:
    '❌ Auto-trade đã đang chạy ở chế độ **{mode}**! Dùng /auto-trade-stop trước.',
  AUTO_TRADE_STARTED:
    '✅ **Auto-trade STARTED**\n- Mode: **{mode}**\n- Session ID: `{sessionId}`\n- Giới hạn: {modeLimit}',
  AUTO_TRADE_STOPPED_TIME: '⏰ **Auto-trade đã tự động dừng** — hết thời gian.',
  AUTO_TRADE_STOPPED_QTY:
    '✅ **Auto-trade đã tự động dừng** — đã hoàn thành {maxTrades} lệnh.',
  AUTO_TRADE_STOPPED_MANUAL: '🛑 **Auto-trade STOPPED** ({reason}).',
  INSUFFICIENT_CAPITAL:
    '⚠️ **Auto-trade tạm dừng** — Vốn khả dụng chỉ còn {usableCapital} USDT',
  KILL_SWITCH_ACTIVATED:
    '🛑 **[KILL SWITCH ACTIVATE] DỪNG TOÀN BỘ AUTO-TRADE**\nTổng tài sản ví Futures đã chạm ngưỡng bảo hiểm cuối cùng: **{totalEquity} USDT** (<= {limit} USDT).',
  TAPE_READING_STARTED:
    '👁️ **[Tape Reading Tracker Started]**\nTracking real-time order book imbalances for:\n{symbols}',

  // Trade Execution
  OPEN_POSITION:
    '🤖 **MỞ LỆNH AUTO-TRADE ({mode})**\n📊 **{symbol}** | {side} | {strategy}\n💰 Giá vào: **{entryPrice}** | HĐ: **{quantity}**\n📐 Leverage: **{leverage}x** | Ký quỹ: **{margin} USDT** (Size: {notionalSize})\n🛑 Stop Loss: **{slPrice}** ({slPercent}%)\n🎯 Take Profit: **{tpPrice}** (Mục tiêu lãi **{tpAmount}$**)\n⭐ Scanner Score: **{score}** | Session: **{sessionTradeCount}**',
  CLOSE_POSITION:
    '🤖 **ĐÓNG LỆNH AUTO-TRADE**\n📊 **{symbol}** | {side} | {strategy}\n💰 Giá vào: **{entryPrice}** → Giá ra: **{exitPrice}**\n📐 Leverage: **{leverage}x** | Size: **{quantity}**\n{pnlIcon}: **{totalPnl} USDT** | Phí: **{totalFee} USDT**\n⚖️ NET PnL: **{netPnl} USDT** | Status: **{status}**',
  INTERNAL_TRAILING_STOP:
    '🛡️ **[TRAILING STOP] {symbol}**\nGiá đi đúng hướng (Lãi **+{profitPercent}%**). Đã dời Stop Loss lên **{newSlPrice}** để bảo vệ lãi.',
  OPEN_ORDER_ERROR: '❌ **Lỗi mở lệnh {symbol}**: {errorMsg}',

  // Re-evaluation / Hybrid Exit
  HYBRID_EXIT_LOSING:
    '🛡️ **[TÁI THẨM ĐỊNH] {symbol}** bị ngâm >4h và mất đà.\n📉 Đang lỗ -> Đã hủy bộ lệnh cũ, thả lưới **LIMIT Maker** tại `{limitPrice}` chờ thoát hiểm hòa vốn.\n🛑 Đã kéo nhẹ Stop Loss an toàn lên `{slPrice}`.',
  HYBRID_EXIT_WINNING:
    '🦅 **[TÁI THẨM ĐỊNH] {symbol}** bị ngâm >4h và mất đà.\n📈 Đang có lãi -> Đã kích hoạt **Tight Trailing Stop** ({tightRate}%) để vắt kiệt lợi nhuận và chốt ngay nếu quay đầu.\n🛑 Đã kéo cứng Stop Loss về điểm hòa vốn `{slPrice}`.',

  // Blacklist
  ERROR_INVALID_TOKEN: '❌ Mã token không hợp lệ (phải kết thúc bằng USDT).',
  BLACKLIST_ADDED:
    '🚫 Đã thêm **{symbol}** vào danh sách cấm{reasonText}. Bot sẽ KHÔNG bao giờ mở lệnh với token này nữa.',
  BLACKLIST_REMOVED:
    '✅ Đã xóa **{symbol}** khỏi danh sách cấm. Bot có thể trade token này trở lại.',
  QUICK_TAKE_PROFIT:
    '⚡ **[CHỐT LỜI NHANH] {symbol}**\nLãi chưa chốt đạt **+{unrealizedPnl}$** (> {threshold}$). Đã kích hoạt lệnh Market đóng vị thế.',
};

export function formatTemplate(
  template: string,
  args: Record<string, any>,
): string {
  return template.replace(/{(\w+)}/g, (match, key) => {
    return args[key] !== undefined ? String(args[key]) : match;
  });
}
