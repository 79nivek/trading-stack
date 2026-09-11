// Cấu hình giao dịch với các con số gợi ý (Best Practices)
export const TRADING_CONFIG = {
  IMBALANCE_MAX_WATCH_LIST: 3, // Theo dõi tối đa 3 token có dòng tiền mạnh nhất
  IMBALANCE_COOLDOWN_MS: 5 * 60 * 1000, // 5 phút cooldown sau khi lệnh đóng
  TRADE_RISK_PERCENT: 2.0, // Rủi ro tối đa 2% vốn trên mỗi lệnh (để tính Position Size)
  TRAILING_ACTIVATION_PERCENT: 1.5, // Kích hoạt Trailing Stop khi lãi 1.5%
  TRAILING_CALLBACK_RATE: 1.0, // Tỷ lệ Callback của Trailing Stop là 1%
  MAX_GLOBAL_LEVERAGE: 20, // Giới hạn đòn bẩy tối đa (Binance giới hạn 20x cho tk mới mở < 30 ngày)
};
