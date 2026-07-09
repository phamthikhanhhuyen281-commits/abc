// Language localization service for English and Vietnamese
export type Language = 'vi' | 'en';

const TRANSLATIONS = {
  vi: {
    // Header & Navigation
    title: 'HỆ THỐNG ĐÁNH GIÁ TRÌNH ĐỘ TIẾNG ANH',
    admin_title: 'HỆ THỐNG QUẢN TRỊ VIÊN & GIÁO VIÊN',
    logout: 'Đăng xuất',
    for_teachers: 'Dành cho Giáo viên',
    back_to_test: 'Quay lại bài thi',
    back: 'Quay lại',
    save: 'Lưu thay đổi',
    cancel: 'Hủy bỏ',
    success: 'Thành công',
    error: 'Lỗi',
    confirm: 'Xác nhận',
    warning: 'Cảnh báo',
    delete: 'Xóa',
    edit: 'Sửa',
    
    // Start screen
    welcome_title: 'KỲ THI ĐÁNH GIÁ NĂNG LỰC TIẾNG ANH',
    anti_cheat_title: 'CẢNH BÁO QUAN TRỌNG CHO THÍ SINH',
    anti_cheat_text: 'Thí sinh không được sử dụng từ điển, AI, công cụ dịch thuật hoặc nhờ người khác hỗ trợ. Nếu không biết đáp án, hãy bỏ qua và tiếp tục làm bài. Hệ thống có cơ chế giám sát và khóa bài thi nếu phát hiện hành vi gian lận hoặc chuyển tab liên tục.',
    start_test: 'Bắt đầu làm bài',
    contact_teacher: 'Liên hệ Giáo viên',
    register_title: 'ĐĂNG KÝ THÔNG TIN',
    register_desc: 'Thông tin này dùng để lưu trữ và hiển thị kết quả thi cho giáo viên',
    fullname: 'Họ và tên thí sinh',
    fullname_placeholder: 'Ví dụ: Nguyễn Văn A',
    phone: 'Số điện thoại',
    phone_placeholder: 'Ví dụ: 0912345678',
    phone_notice: '* Mỗi SĐT chỉ được làm bài 1 lần duy nhất. Nếu bạn đang làm dở, nhập đúng SĐT để làm tiếp.',
    choose_exam: 'Chọn đề thi / Kỳ thi',
    link_locked: 'LIÊN KẾT KHÓA',
    direct_link_notice: '* Thí sinh đang truy cập thông qua liên kết trực tiếp. Bạn chỉ được phép thực hiện duy nhất bài thi này.',
    agree_commit: 'Tôi cam kết tự làm bài thi bằng năng lực thực tế, không sử dụng sự hỗ trợ của từ điển, AI hoặc người khác.',
    submitting_info: 'Đang xác thực thông tin...',
    start_now: 'Bắt đầu làm bài thi',
    exam_closed_title: 'KỲ THI NÀY HIỆN ĐANG ĐÓNG',
    exam_closed_desc: 'Kỳ thi đã tạm khóa hoặc kết thúc thời gian nhận bài. Quý phụ huynh và học sinh vui lòng liên hệ Giáo viên quản trị để được hỗ trợ.',
    contact_info: 'Thông tin liên hệ Giáo viên:',
    teacher_in_charge: 'Giáo viên phụ trách:',
    address: 'Địa chỉ:',
    call_sms_zalo: 'Gọi / Nhắn tin / Zalo',
    send_email: 'Gửi Email',
    facebook: 'Facebook',
    website: 'Website',
    call_hotline: '📞 Gọi Hotline trực tiếp',
    send_sms: '💬 Gửi tin nhắn SMS',
    open_zalo: '💬 Mở Zalo trò chuyện',
    click_contact_hint: '(Click chọn kênh liên hệ nếu bạn gặp sự cố kỹ thuật hoặc lỗi đường truyền audio)',
    
    // Admin menus
    menu_overview: 'Tổng quan',
    menu_exams: 'Quản lý kỳ thi',
    menu_candidates: 'Quản lý thí sinh',
    menu_materials: 'Tài liệu ôn tập',
    menu_settings: 'Cấu hình hệ thống',
    menu_logs: 'Nhật ký hệ thống',
    
    // Overview Menu
    overview_stats_daily: 'Thống kê thí sinh thi theo ngày',
    overview_avg_time: 'Thời gian hoàn thành trung bình',
    overview_cefr_dist: 'Phân bố trình độ CEFR',
    overview_active_sessions: 'Lượt đang làm bài',
    overview_completed_sessions: 'Đã hoàn thành',
    overview_total_candidates: 'Tổng số thí sinh',
    overview_no_candidates: 'Chưa có thí sinh nào tham gia thi.',
    overview_score_dist: 'Biểu đồ phân bố điểm số',
    overview_in_progress: 'Đang thi',
    overview_submitted: 'Đã nộp',
    
    // Exam Manager
    exam_create_btn: 'Tạo đề thi mới',
    exam_create_manual: 'Tạo thủ công',
    exam_create_ai: 'Tạo bằng AI (OCR)',
    exam_duration_mins: 'Thời lượng (phút)',
    exam_audio_listening: 'Tải lên/Dán link Audio Nghe',
    exam_speaking_box: 'Cho phép học sinh ghi âm phần Nói',
    exam_copy_link: 'Copy Link',
    exam_open_link: 'Open Link',
    exam_edit_title: 'Chỉnh sửa Đề thi',
    exam_delete_confirm: 'Bạn có chắc chắn muốn xóa kỳ thi này?',
    exam_list: 'Danh sách kỳ thi',
    exam_candidate_list: 'Danh sách thí sinh tham gia kỳ thi',
    exam_no_candidates: 'Chưa có thí sinh nào tham gia kỳ thi này.',
    
    // Candidates Manager
    cand_avatar: 'Ảnh',
    cand_name: 'Họ tên',
    cand_phone: 'SĐT',
    cand_email_username: 'Username / Email',
    cand_reg_date: 'Ngày đăng ký',
    cand_status: 'Trạng thái',
    cand_action: 'Thao tác',
    cand_locked: 'Đã khóa',
    cand_active: 'Bình thường',
    cand_lock: 'Khóa tài khoản',
    cand_unlock: 'Mở khóa',
    cand_delete: 'Xóa thí sinh',
    cand_view_test: 'Xem chi tiết bài làm',
    cand_search_placeholder: 'Tìm kiếm thí sinh theo tên, SĐT...',
    cand_reset_attempt: 'Reset Attempt (Thi lại)',
    cand_reset_warning: 'RESET ATTEMPT: Học sinh sẽ được làm lại từ đầu đúng 1 lần duy nhất. Kết quả hiện tại sẽ được lưu trữ vào lịch sử thi.',
    
    // Study Materials
    materials_title: 'TÀI LIỆU ÔN TẬP',
    materials_hint: 'Chỉ học sinh đã đăng nhập mới được xem các tài liệu ôn tập dưới đây.',
    materials_upload_btn: 'Tạo bài giảng mới',
    materials_type_video: 'Video bài giảng',
    materials_type_pdf: 'Tài liệu PDF',
    materials_type_docx: 'File DOCX',
    materials_type_pptx: 'Slide PPTX',
    materials_type_images: 'Hình ảnh bài học',
    materials_type_audio: 'Tệp tin Audio',
    materials_youtube: 'YouTube URL',
    materials_gdrive: 'Google Drive URL',
    materials_video_url: 'Video URL trực tiếp',
    
    // Settings
    settings_branding: 'CẤU HÌNH GIAO DIỆN & THƯƠNG HIỆU',
    settings_logo: 'Logo Website (URL hoặc Tải lên)',
    settings_web_name: 'Tên Website',
    settings_slogan: 'Câu Slogan',
    settings_colors: 'Màu sắc chủ đạo',
    settings_contact_teacher: 'CẤU HÌNH THÔNG TIN GIÁO VIÊN (HIỂN THỊ CHỖ CONTACT)',
    settings_teacher_name: 'Tên Giáo viên',
    settings_teacher_phone: 'SĐT Giáo viên',
    settings_teacher_zalo: 'SĐT Zalo',
    settings_teacher_fb: 'Facebook cá nhân URL',
    settings_teacher_web: 'Website cá nhân URL',
    settings_teacher_address: 'Địa chỉ Lớp học',
    settings_cefr_calc: 'CẤU HÌNH NGƯỠNG ĐIỂM CEFR (%)',
    settings_change_password: 'ĐỔI MẬT KHẨU QUẢN TRỊ VIÊN',
    settings_current_password: 'Mật khẩu hiện tại',
    settings_new_password: 'Mật khẩu mới',
    settings_confirm_password: 'Xác nhận mật khẩu mới',
    
    // Logs / Diary
    logs_title: 'NHẬT KÝ HOẠT ĐỘNG HỆ THỐNG',
    logs_candidate: 'Thí sinh',
    logs_action: 'Hành động',
    logs_timestamp: 'Thời gian',
    logs_no_logs: 'Chưa có nhật ký hoạt động nào.'
  },
  en: {
    // Header & Navigation
    title: 'ENGLISH PLACEMENT TEST SYSTEM',
    admin_title: 'ADMIN & TEACHER CONTROL PANEL',
    logout: 'Log Out',
    for_teachers: 'For Teachers',
    back_to_test: 'Back to Test',
    back: 'Back',
    save: 'Save Changes',
    cancel: 'Cancel',
    success: 'Success',
    error: 'Error',
    confirm: 'Confirm',
    warning: 'Warning',
    delete: 'Delete',
    edit: 'Edit',
    
    // Start screen
    welcome_title: 'ENGLISH PLACEMENT TEST',
    anti_cheat_title: 'IMPORTANT CANDIDATE NOTICE',
    anti_cheat_text: 'Candidates must not use dictionaries, AI, translating tools or receive assistance. If you do not know an answer, skip it. The system monitors and logs browser focus, and will lock your exam if cheating or frequent tab-switching is detected.',
    start_test: 'Start Test',
    contact_teacher: 'Contact Teacher',
    register_title: 'REGISTER CANDIDATE INFO',
    register_desc: 'This information is used to save and display results for your teacher',
    fullname: 'Candidate Full Name',
    fullname_placeholder: 'Example: John Doe',
    phone: 'Phone Number',
    phone_placeholder: 'Example: 0912345678',
    phone_notice: '* Each phone number can test exactly once. If you left the test earlier, enter your correct phone number to resume.',
    choose_exam: 'Choose Exam / Test',
    link_locked: 'LOCKED EXAM LINK',
    direct_link_notice: '* Accessing via direct exam link. You are only allowed to perform this specific exam.',
    agree_commit: 'I commit to completing the test independently, without dictionaries, AI assistance, or helper tools.',
    submitting_info: 'Validating details...',
    start_now: 'Start My Exam Now',
    exam_closed_title: 'THIS EXAM IS CURRENTLY CLOSED',
    exam_closed_desc: 'This exam has been locked or the submission period has expired. Please contact the Admin Teacher below for further support.',
    contact_info: 'Teacher Contact Information:',
    teacher_in_charge: 'Teacher in charge:',
    address: 'Address:',
    call_sms_zalo: 'Call / SMS / Zalo',
    send_email: 'Send Email',
    facebook: 'Facebook',
    website: 'Website',
    call_hotline: '📞 Call Hotline Direct',
    send_sms: '💬 Send SMS Message',
    open_zalo: '💬 Open Zalo Chat',
    click_contact_hint: '(Select a channel if you encounter technical difficulties or audio playback issues)',
    
    // Admin menus
    menu_overview: 'Overview',
    menu_exams: 'Exam Management',
    menu_candidates: 'Candidate Management',
    menu_materials: 'Study Materials',
    menu_settings: 'Settings & Config',
    menu_logs: 'Audit Logs',
    
    // Overview Menu
    overview_stats_daily: 'Candidate Testing History by Day',
    overview_avg_time: 'Average Completion Time',
    overview_cefr_dist: 'CEFR Level Distribution',
    overview_active_sessions: 'In Progress Sessions',
    overview_completed_sessions: 'Submitted / Completed',
    overview_total_candidates: 'Total Candidates',
    overview_no_candidates: 'No candidates have taken the test yet.',
    overview_score_dist: 'Score Range Distribution',
    overview_in_progress: 'Testing',
    overview_submitted: 'Finished',
    
    // Exam Manager
    exam_create_btn: 'Create New Exam',
    exam_create_manual: 'Manual Creation',
    exam_create_ai: 'Create with AI (OCR Scan)',
    exam_duration_mins: 'Duration (minutes)',
    exam_audio_listening: 'Upload/Paste Listening Audio link',
    exam_speaking_box: 'Allow student recording in Speaking',
    exam_copy_link: 'Copy Link',
    exam_open_link: 'Open Link',
    exam_edit_title: 'Edit Exam Details',
    exam_delete_confirm: 'Are you sure you want to delete this exam?',
    exam_list: 'Exam List',
    exam_candidate_list: 'Enrolled Candidates for this Exam',
    exam_no_candidates: 'No candidates have taken this exam yet.',
    
    // Candidates Manager
    cand_avatar: 'Photo',
    cand_name: 'Full Name',
    cand_phone: 'Phone',
    cand_email_username: 'Username / Email',
    cand_reg_date: 'Register Date',
    cand_status: 'Status',
    cand_action: 'Action',
    cand_locked: 'Locked',
    cand_active: 'Active',
    cand_lock: 'Lock Account',
    cand_unlock: 'Unlock',
    cand_delete: 'Delete Candidate',
    cand_view_test: 'View Test Review',
    cand_search_placeholder: 'Search candidates by name, phone...',
    cand_reset_attempt: 'Reset Attempt (Retake)',
    cand_reset_warning: 'RESET ATTEMPT: Student will be allowed to redo the exam exactly once. Their current result will be saved in their exam history.',
    
    // Study Materials
    materials_title: 'STUDY MATERIALS',
    materials_hint: 'Only logged-in students are permitted to view the learning materials listed below.',
    materials_upload_btn: 'Create New Material',
    materials_type_video: 'Lecture Video',
    materials_type_pdf: 'PDF Document',
    materials_type_docx: 'DOCX Document',
    materials_type_pptx: 'PPTX Slides',
    materials_type_images: 'Lesson Image',
    materials_type_audio: 'Audio Track',
    materials_youtube: 'YouTube URL',
    materials_gdrive: 'Google Drive URL',
    materials_video_url: 'Direct Video URL',
    
    // Settings
    settings_branding: 'BRANDING & INTERFACE DESIGN',
    settings_logo: 'Website Logo (URL or Upload file)',
    settings_web_name: 'Website Name',
    settings_slogan: 'Website Slogan',
    settings_colors: 'Primary & Accent Colors',
    settings_contact_teacher: 'TEACHER CONTACT DETAILS (SHOWN IN CONTACT FORM)',
    settings_teacher_name: 'Teacher Name',
    settings_teacher_phone: 'Teacher Phone',
    settings_teacher_zalo: 'Zalo Number',
    settings_teacher_fb: 'Personal Facebook URL',
    settings_teacher_web: 'Personal Website URL',
    settings_teacher_address: 'Classroom Address',
    settings_cefr_calc: 'CEFR PERCENTAGE SCORE BOUNDARIES (%)',
    settings_change_password: 'CHANGE ADMINISTRATOR PASSWORD',
    settings_current_password: 'Current Password',
    settings_new_password: 'New Password',
    settings_confirm_password: 'Confirm New Password',
    
    // Logs / Diary
    logs_title: 'SYSTEM AUDIT DIARY & SECURITY LOGS',
    logs_candidate: 'Candidate',
    logs_action: 'Logged Action',
    logs_timestamp: 'Timestamp',
    logs_no_logs: 'No security logs recorded yet.'
  }
};

let currentLanguage: Language = (localStorage.getItem('app_lang') as Language) || 'vi';
const listeners: ((lang: Language) => void)[] = [];

export const languageService = {
  getLanguage(): Language {
    return currentLanguage;
  },

  setLanguage(lang: Language) {
    currentLanguage = lang;
    localStorage.setItem('app_lang', lang);
    listeners.forEach((listener) => listener(lang));
  },

  onChange(callback: (lang: Language) => void) {
    listeners.push(callback);
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },

  t(key: keyof typeof TRANSLATIONS['vi']): string {
    const dict = TRANSLATIONS[currentLanguage] || TRANSLATIONS['vi'];
    return (dict as any)[key] || (TRANSLATIONS['vi'] as any)[key] || key;
  }
};
