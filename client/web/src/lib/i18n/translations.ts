export type Lang = "en" | "vi";

// Flat key → { en, vi } translation table.
// Add new keys here; missing keys fall back to the key itself.
export const translations: Record<string, { en: string; vi: string }> = {
  // ── Navigation ──────────────────────────────────────────────────────────────
  "nav.dashboard":  { en: "Dashboard",   vi: "Trang chủ" },
  "nav.fields":     { en: "Fields",      vi: "Sân bóng" },
  "nav.bookings":   { en: "Bookings",    vi: "Đặt sân" },
  "nav.teams":      { en: "Teams",       vi: "Đội bóng" },
  "nav.matches":    { en: "Matches",     vi: "Trận đấu" },
  "nav.lobbies":    { en: "Lobbies",     vi: "Phòng chờ" },
  "nav.history":    { en: "History",     vi: "Lịch sử" },
  "nav.myVenues":   { en: "My Venues",   vi: "Sân của tôi" },
  "nav.admin":      { en: "Admin",       vi: "Quản trị" },
  "nav.friends":    { en: "Friends & Chat", vi: "Bạn bè & Trò chuyện" },
  "nav.profile":    { en: "Profile",     vi: "Hồ sơ" },
  "nav.logout":     { en: "Logout",      vi: "Đăng xuất" },
  "nav.login":      { en: "Login",       vi: "Đăng nhập" },

  // ── Common ──────────────────────────────────────────────────────────────────
  "common.cancel":   { en: "Cancel",   vi: "Hủy" },
  "common.save":     { en: "Save",     vi: "Lưu" },
  "common.confirm":  { en: "Confirm",  vi: "Xác nhận" },
  "common.delete":   { en: "Delete",   vi: "Xóa" },
  "common.edit":     { en: "Edit",     vi: "Sửa" },
  "common.add":      { en: "Add",      vi: "Thêm" },
  "common.close":    { en: "Close",    vi: "Đóng" },
  "common.loading":  { en: "Loading…", vi: "Đang tải…" },
  "common.today":    { en: "Today",    vi: "Hôm nay" },
  "common.all":      { en: "All",      vi: "Tất cả" },
  "common.date":     { en: "Date",     vi: "Ngày" },
  "common.start":    { en: "Start",    vi: "Bắt đầu" },
  "common.end":      { en: "End",      vi: "Kết thúc" },
  "common.price":    { en: "Price",    vi: "Giá" },
  "common.hours":    { en: "Hours",    vi: "Giờ mở cửa" },
  "common.perHour":  { en: "per hour", vi: "mỗi giờ" },
  "common.players":  { en: "players",  vi: "người chơi" },

  // ── Booking statuses ──────────────────────────────────────────────────────────
  "status.confirmed": { en: "Confirmed", vi: "Đã xác nhận" },
  "status.pending":   { en: "Pending",   vi: "Chờ duyệt" },
  "status.canceled":  { en: "Canceled",  vi: "Đã hủy" },
  "status.completed": { en: "Completed", vi: "Đã hoàn thành" },
  "status.upcoming":  { en: "Upcoming",  vi: "Sắp tới" },
  "status.matching":  { en: "Matching",  vi: "Đang ghép" },

  // ── Bookings page ─────────────────────────────────────────────────────────────
  "bookings.title":       { en: "My bookings",     vi: "Lịch đặt của tôi" },
  "bookings.subtitle":    { en: "Track reservations, matches, and cancellations.", vi: "Theo dõi đặt sân, trận đấu và hủy đặt." },
  "bookings.schedule":    { en: "Schedule",        vi: "Lịch trình" },
  "bookings.teamSize":    { en: "Team size",       vi: "Số người" },
  "bookings.viewDetails": { en: "View Details",    vi: "Xem chi tiết" },
  "bookings.total":       { en: "total",           vi: "tổng" },
  "bookings.empty":       { en: "No bookings here", vi: "Chưa có lịch đặt nào" },
  "bookings.emptyDesc":   { en: "This tab is empty right now.", vi: "Mục này hiện đang trống." },
  "bookings.bookField":   { en: "Book a Field",    vi: "Đặt sân" },

  // ── Schedule grid (venue/admin) ─────────────────────────────────────────────
  "schedule.title":         { en: "Booking schedule", vi: "Lịch đặt sân" },
  "schedule.field":         { en: "Field",            vi: "Sân" },
  "schedule.time":          { en: "Time",             vi: "Giờ" },
  "schedule.noBookings":    { en: "No bookings on this day", vi: "Không có lịch đặt trong ngày" },
  "schedule.manualBooking": { en: "Manual booking",   vi: "Đặt sân thủ công" },
  "schedule.addBooking":    { en: "Add booking",      vi: "Thêm lịch đặt" },
  "schedule.customerName":  { en: "Customer name",    vi: "Tên khách hàng" },
  "schedule.note":          { en: "Note",             vi: "Ghi chú" },
  "schedule.walkIn":        { en: "Walk-in",          vi: "Khách vãng lai" },
  "schedule.recordResult":  { en: "Record match result", vi: "Nhập kết quả trận đấu" },
  "schedule.updateResult":  { en: "Update result",    vi: "Cập nhật kết quả" },
  "schedule.homeScore":     { en: "Home score",       vi: "Tỉ số đội nhà" },
  "schedule.awayScore":     { en: "Away score",       vi: "Tỉ số đội khách" },
  "schedule.saveResult":    { en: "Save result",      vi: "Lưu kết quả" },
  "schedule.resultPending": { en: "Result pending",   vi: "Chưa có kết quả" },
  "schedule.revenue":       { en: "Revenue",          vi: "Doanh thu" },
  "schedule.legendUpcoming":{ en: "Upcoming",         vi: "Sắp tới" },
  "schedule.legendPlayed":  { en: "Played",           vi: "Đã chơi" },
  "schedule.legendResult":  { en: "Result recorded",  vi: "Đã có kết quả" },
  "schedule.legendWalkIn":  { en: "Walk-in",          vi: "Khách vãng lai" },

  // ── My Venues ─────────────────────────────────────────────────────────────────
  "venues.title":       { en: "My Venues",        vi: "Sân của tôi" },
  "venues.subtitle":    { en: "Register your complexes and add fields for players to discover and book.", vi: "Đăng ký khu phức hợp và thêm sân để người chơi tìm và đặt." },
  "venues.myComplexes": { en: "My complexes",     vi: "Khu phức hợp của tôi" },
  "venues.addComplex":  { en: "Add complex",      vi: "Thêm khu phức hợp" },
  "venues.addField":    { en: "Add field",        vi: "Thêm sân" },
  "venues.fields":      { en: "Fields",           vi: "Sân bóng" },

  // ── Language ────────────────────────────────────────────────────────────────
  "lang.english":    { en: "English",     vi: "Tiếng Anh" },
  "lang.vietnamese": { en: "Vietnamese",  vi: "Tiếng Việt" },
};
