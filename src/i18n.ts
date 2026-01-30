import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
        resources: {
            en: {
                translation: {
                    common: {
                        dashboard: 'Dashboard',
                        students: 'Students',
                        coaches: 'Coaches',
                        schedule: 'Schedule',
                        finance: 'Finance',
                        calculator: 'Gym Tools',
                        settings: 'Settings',
                        login: 'Login',
                        logout: 'Logout',
                        add: 'Add New',
                        edit: 'Edit',
                        delete: 'Delete',
                        save: 'Save Changes',
                        cancel: 'Cancel',
                        search: 'Search...',
                        loading: 'Loading...',
                        actions: 'Actions',
                        name: 'Name',
                        phone: 'Phone',
                        status: 'Status',
                        unknown: 'Unknown',
                        invalid: 'Invalid',

                        date: 'Date',
                        role: 'Role',
                        saveSuccess: 'Saved successfully!',
                        deleteConfirm: 'Are you sure you want to delete this?',
                        deleteError: 'Error occurred while deleting',
                        noResults: 'No results found',
                        daysLeft: '{{count}} days left',
                        cameras: 'Live Cameras'
                    },
                    cameras: {
                        subtitle: 'Monitor gym activities in real-time',
                        noSignal: 'No Signal / Stream Not Started',
                        connection: 'Connection Settings',
                        streamUrl: 'Stream URL',
                        enterLinkNote: 'Paste the embed link from your IP camera or streaming service.',
                        startStream: 'Start Stream',
                        noteTitle: 'Security Note',
                        noteContent: 'This feed is accessible only to administrators. Ensure your camera link is secure and not public.'
                    },
                    dashboard: {
                        welcome: 'Welcome back',
                        totalStudents: 'Total Students',
                        activeCoaches: 'Active Coaches',
                        monthlyRevenue: 'Monthly Revenue',
                        quickActions: 'Quick Actions',
                        addStudent: 'Add Student',
                        addCoach: 'Add Coach',
                        recordPayment: 'Record Payment',
                        newJoiners: 'New Joiners',
                        viewAll: 'View All',
                        noRecentActivity: 'No recent activity.',
                        joined: 'Joined {{date}}',
                        upcomingSessions: 'Upcoming Sessions',
                        today: 'Today',
                        tomorrow: 'Tomorrow',
                        coach: 'Coach'
                    },
                    students: {
                        title: 'Student Management',
                        subtitle: 'Manage enrollments and track subscriptions',
                        age: 'Age',
                        contact: 'Contact Info',
                        subscription: 'Subscription',
                        expiry: 'Expires',
                        active: 'Active',
                        expired: 'Expired',
                        expiringSoon: 'Expiring Soon'
                    },
                    coaches: {
                        title: 'Coach Management',
                        subtitle: 'Track attendance and manage staff',
                        rate: 'Hourly Rate',
                        workingNow: 'Working Now',
                        away: 'Away',
                        done: 'Done for Today',
                        checkIn: 'Check In',
                        checkOut: 'Check Out',
                        time: 'Time',
                        duration: 'Duration',
                        sessionCount: 'Sessions',
                        enterSessions: 'Enter number of PT sessions completed today:',
                        checkedOutStatus: 'Checked Out'
                    },
                    settings: {
                        title: 'System Settings',
                        subtitle: 'Customize appearance and gym details',
                        theme: 'Appearance & Theme',
                        gymProfile: 'Gym Profile',
                        gymName: 'Gym Name',
                        address: 'Address',
                        language: 'Language',
                        selectTheme: 'Select Theme',
                        themes: {
                            default: 'Epic Default',
                            dark: 'Midnight Pro',
                            forest: 'Forest Elite',
                            royal: 'Royal Gold',
                            berry: 'Berry Blast',
                            nature: 'Nature Calm',
                            ember: 'Ember Glow'
                        }
                    },
                    roles: {
                        admin: 'Administrator',
                        head_coach: 'Head Coach',
                        coach: 'Coach',
                        reception: 'Receptionist'
                    },
                }
            },

            ar: {
                translation: {
                    common: {
                        dashboard: 'لوحة التحكم',
                        students: 'الطلاب',
                        coaches: 'المدربين',
                        schedule: 'الجدول',
                        finance: 'المالية',
                        calculator: 'أدوات الجيم',
                        settings: 'الإعدادات',
                        login: 'تسجيل الدخول',
                        logout: 'تسجيل الخروج',
                        add: 'إضافة جديد',
                        edit: 'تعديل',
                        delete: 'حذف',
                        save: 'حفظ التغييرات',
                        cancel: 'إلغاء',
                        search: 'بحث...',
                        loading: 'جاري التحميل...',
                        actions: 'إجراءات',
                        name: 'الاسم',
                        phone: 'الهاتف',
                        status: 'الحالة',
                        unknown: 'غير معروف',
                        invalid: 'غير صالح',

                        date: 'التاريخ',
                        role: 'الدور',
                        saveSuccess: 'تم الحفظ بنجاح!',
                        deleteConfirm: 'هل أنت متأكد من عملية الحذف؟',
                        deleteError: 'حدث خطأ أثناء الحذف',
                        noResults: 'لا توجد نتائج',
                        daysLeft: 'متبقي {{count}} يوم',
                        cameras: 'كاميرات المراقبة'
                    },
                    cameras: {
                        subtitle: 'مراقبة أنشطة الجيم في الوقت الفعلي',
                        noSignal: 'لا توجد إشارة / لم يبدأ البث',
                        connection: 'إعدادات الاتصال',
                        streamUrl: 'رابط البث',
                        enterLinkNote: 'الصق رابط التضمين من كاميرا IP أو خدمة البث.',
                        startStream: 'بدء البث',
                        noteTitle: 'ملاحظة أمنية',
                        noteContent: 'هذا البث متاح للمسؤولين فقط. تأكد من أن رابط الكاميرا آمن وليس عاماً.'
                    },
                    dashboard: {
                        welcome: 'مرحباً بك',
                        totalStudents: 'إجمالي الطلاب',
                        activeCoaches: 'المدربين النشطين',
                        monthlyRevenue: 'الإيرادات الشهرية',
                        quickActions: 'إجراءات سريعة',
                        addStudent: 'إضافة طالب',
                        addCoach: 'إضافة مدرب',
                        recordPayment: 'تسجيل دفعة',
                        newJoiners: 'المشتركين الجدد',
                        viewAll: 'عرض الكل',
                        noRecentActivity: 'لا يوجد نشاط مؤخر',
                        joined: 'انضم {{date}}',
                        upcomingSessions: 'الجلسات القادمة',
                        today: 'اليوم',
                        tomorrow: 'غداً',
                        coach: 'المدرب'
                    },
                    students: {
                        title: 'إدارة الطلاب',
                        subtitle: 'إدارة التسجيلات ومتابعة الاشتراكات',
                        age: 'العمر',
                        contact: 'بيانات الاتصال',
                        subscription: 'الاشتراك',
                        expiry: 'ينتهي في',
                        active: 'نشط',
                        expired: 'منتهي',
                        expiringSoon: 'ينتهي قريباً'
                    },
                    coaches: {
                        title: 'إدارة المدربين',
                        subtitle: 'متابعة الحضور وإدارة الموظفين',
                        rate: 'سعر الساعة',
                        workingNow: 'يعمل الآن',
                        away: 'غائب',
                        done: 'انتهى لليوم',
                        checkIn: 'تسجيل دخول',
                        checkOut: 'تسجيل خروج',
                        time: 'الوقت',
                        duration: 'المدة',
                        sessionCount: 'الجلسات',
                        enterSessions: 'أدخل عدد الجلسات المكتملة اليوم:',
                        checkedOutStatus: 'تم تسجيل الخروج'
                    },
                    settings: {
                        title: 'إعدادات النظام',
                        subtitle: 'تخصيص المظهر وتفاصيل الجيم',
                        theme: 'المظهر والسمات',
                        gymProfile: 'ملف الجيم',
                        gymName: 'اسم الجيم',
                        address: 'العنوان',
                        language: 'اللغة',
                        selectTheme: 'اختر المظهر',
                        themes: {
                            default: 'الافتراضي',
                            dark: 'الوضع الليلي',
                            forest: 'الغابة',
                            royal: 'الملكي',
                            berry: 'التوت',
                            nature: 'الطبيعة',
                            ember: 'الجمر'
                        }
                    },
                    roles: {
                        admin: 'مدير النظام',
                        head_coach: 'كبير المدربين',
                        coach: 'مدرب',
                        reception: 'موظف استقبال'
                    }
                }
            }
        }
    });

export default i18n;
