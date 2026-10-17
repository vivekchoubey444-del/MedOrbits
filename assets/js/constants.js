
/**
 * MedOrbits -- Application Constants
 * File: assets/js/constants.js
 *
 * Central source of truth for:
 * - Application metadata and routes
 * - API endpoints
 * - User roles and permissions
 * - Education and career categories
 * - Application and payment statuses
 * - Validation and upload limits
 * - Storage keys and event names
 * - Security-related client configuration
 *
 * Important:
 * These constants are public frontend configuration.
 * Never place passwords, API secrets, private tokens,
 * database credentials, or payment secrets in this file.
 */

(() => {
  "use strict";

  // --------------------------------------------------
  // Application metadata
  // --------------------------------------------------

  const APP = Object.freeze({
    NAME: "MedOrbits",
    BRAND: "MedOrbits",
    VERSION: "1.0.0",
    DESCRIPTION:
      "Education guidance, medical admissions, study abroad, careers, jobs and recruitment.",
    DEFAULT_LOCALE: "en-IN",
    DEFAULT_TIMEZONE: "Asia/Kolkata",
    DEFAULT_CURRENCY: "INR",
    DEFAULT_COUNTRY: "IN",
    DEFAULT_COUNTRY_NAME: "India",
    SUPPORT_EMAIL: "",
    SUPPORT_PHONE: "",
    COPYRIGHT_START_YEAR: 2026
  });

  // --------------------------------------------------
  // Environment names
  // --------------------------------------------------

  const ENVIRONMENTS = Object.freeze({
    DEVELOPMENT: "development",
    TEST: "test",
    STAGING: "staging",
    PRODUCTION: "production"
  });

  // --------------------------------------------------
  // Website routes
  // Keep these synchronized with the actual HTML files.
  // --------------------------------------------------

  const ROUTES = Object.freeze({
    HOME: "/index.html",

    PAGES: Object.freeze({
      ABOUT: "/pages/about.html",
      SERVICES: "/pages/services.html",
      CONTACT: "/pages/contact.html",
      APPLY: "/pages/apply.html",
      SEARCH: "/pages/search.html",
      TESTIMONIALS: "/pages/testimonials.html",
      ACCESSIBILITY: "/pages/accessibility.html",
      SITEMAP: "/pages/sitemap.html",
      NOT_FOUND: "/pages/404.html",
      SERVER_ERROR: "/pages/500.html",
      OFFLINE: "/pages/offline.html"
    }),

    ACCOUNT: Object.freeze({
      LOGIN: "/account/login.html",
      REGISTER: "/account/register.html",
      LOGOUT: "/account/logout.html",
      FORGOT_PASSWORD: "/account/forgot-password.html",
      RESET_PASSWORD: "/account/reset-password.html",
      VERIFY_EMAIL: "/account/verify-email.html",
      RESEND_VERIFICATION: "/account/resend-verification.html",
      CHANGE_PASSWORD: "/account/change-password.html",
      TWO_FACTOR: "/account/two-factor.html",
      SECURITY: "/account/security.html",
      DELETE_ACCOUNT: "/account/delete-account.html",
      DASHBOARD: "/account/dashboard.html",
      PROFILE: "/account/profile.html",
      SETTINGS: "/account/settings.html",
      APPLICATIONS: "/account/applications.html",
      COUNSELLING: "/account/counselling.html",
      DOCUMENTS: "/account/documents.html",
      NOTIFICATIONS: "/account/notifications.html",
      PAYMENTS: "/account/payments.html",
      SUBSCRIPTIONS: "/account/subscriptions.html",
      SAVED_JOBS: "/account/saved-jobs.html",
      INTERNSHIPS: "/account/internships.html",
      SUPPORT: "/account/support.html",
      ACTIVITY: "/account/activity.html"
    }),

    EDUCATION: Object.freeze({
      HOME: "/education/index.html",
      COURSES: "/education/courses.html",
      COLLEGES: "/education/colleges.html",
      UNIVERSITIES: "/education/universities.html",

      STUDY_INDIA: Object.freeze({
        HOME: "/education/study-india/index.html",
        MBBS: "/education/study-india/mbbs.html",
        BDS: "/education/study-india/bds.html",
        AYUSH: "/education/study-india/ayush.html",
        NURSING: "/education/study-india/nursing.html",
        PHARMACY: "/education/study-india/pharmacy.html",
        PARAMEDICAL: "/education/study-india/paramedical.html",
        ENGINEERING: "/education/study-india/engineering.html",
        MANAGEMENT: "/education/study-india/management.html",
        LAW: "/education/study-india/law.html",
        PG_MEDICAL: "/education/study-india/pg-medical.html",
        PG_OTHERS: "/education/study-india/pg-others.html",
        MORE: "/education/study-india/more-courses.html"
      }),

      STUDY_ABROAD: Object.freeze({
        HOME: "/education/study-abroad/index.html",
        MBBS: "/education/study-abroad/mbbs-abroad.html",
        RUSSIA: "/education/study-abroad/russia.html",
        GEORGIA: "/education/study-abroad/georgia.html",
        KAZAKHSTAN: "/education/study-abroad/kazakhstan.html",
        UZBEKISTAN: "/education/study-abroad/uzbekistan.html",
        KYRGYZSTAN: "/education/study-abroad/kyrgyzstan.html",
        UAE: "/education/study-abroad/uae.html",
        MORE: "/education/study-abroad/more-countries.html"
      }),

      ADMISSIONS: Object.freeze({
        HOME: "/education/admissions/index.html",
        PROCESS: "/education/admissions/process.html",
        ELIGIBILITY: "/education/admissions/eligibility.html",
        EXAMS: "/education/admissions/exams.html",
        COUNSELLING: "/education/admissions/counselling.html",
        DOCUMENTS: "/education/admissions/documents.html"
      }),

      RESOURCES: Object.freeze({
        HOME: "/education/resources/index.html",
        FEES: "/education/resources/fees.html",
        SCHOLARSHIPS: "/education/resources/scholarships.html",
        HOSTELS: "/education/resources/hostels.html",
        GUIDES: "/education/resources/guides.html",
        BROCHURES: "/education/resources/brochures.html",
        STUDENT_LOANS: "/education/resources/student-loans.html",
        FAQS: "/education/resources/faqs.html"
      })
    }),

    CAREER: Object.freeze({
      HOME: "/career/index.html",
      JOBS: "/career/jobs.html",
      JOB_DETAILS: "/career/job-details.html",
      JOB_CATEGORIES: "/career/job-categories.html",
      INTERNSHIPS: "/career/internships.html",
      INTERNSHIP_DETAILS: "/career/internship-details.html",
      REGISTER: "/career/register.html",
      EMPLOYER_SERVICES: "/career/employer-services.html",
      EMPLOYER_LOGIN: "/career/employer-login.html",
      EMPLOYER_REGISTER: "/career/employer-register.html",
      EMPLOYER_DASHBOARD: "/career/employer-dashboard.html",
      POST_JOB: "/career/post-job.html",
      MANAGE_JOBS: "/career/manage-jobs.html",
      APPLICANTS: "/career/applicants.html",
      RECRUITMENT: "/career/recruitment.html",
      GUIDANCE: "/career/guidance.html",
      RESUME_SUPPORT: "/career/resume-support.html",
      RESUME_BUILDER: "/career/resume-builder.html",
      INTERVIEW_PREPARATION: "/career/interview-preparation.html",

      SECTORS: Object.freeze({
        HOME: "/career/sectors/index.html",
        HEALTHCARE: "/career/sectors/healthcare.html",
        IT: "/career/sectors/it.html",
        FINANCE: "/career/sectors/finance.html",
        HOSPITALITY: "/career/sectors/hospitality.html",
        AVIATION: "/career/sectors/aviation.html",
        MANUFACTURING: "/career/sectors/manufacturing.html",
        LOGISTICS: "/career/sectors/logistics.html",
        OTHERS: "/career/sectors/others.html"
      }),

      LOCATIONS: Object.freeze({
        HOME: "/career/locations/index.html",
        DELHI_NCR: "/career/locations/delhi-ncr.html",
        NOIDA: "/career/locations/noida.html",
        GURUGRAM: "/career/locations/gurugram.html",
        UTTAR_PRADESH: "/career/locations/uttar-pradesh.html",
        MUMBAI: "/career/locations/mumbai.html",
        BENGALURU: "/career/locations/bengaluru.html",
        OVERSEAS: "/career/locations/overseas.html",
        OTHERS: "/career/locations/others.html"
      }),

      RESOURCES: Object.freeze({
        HOME: "/career/resources/index.html",
        GUIDES: "/career/resources/guides.html",
        RESUME_TEMPLATES: "/career/resources/resume-templates.html",
        INTERVIEW_QUESTIONS: "/career/resources/interview-questions.html",
        SALARY_GUIDE: "/career/resources/salary-guide.html",
        JOB_FRAUD_AWARENESS: "/career/resources/job-fraud-awareness.html",
        FAQS: "/career/resources/faqs.html"
      })
    }),

    ADMIN: Object.freeze({
      HOME: "/admin/index.html",
      LOGIN: "/admin/login.html",
      DASHBOARD: "/admin/dashboard.html",
      USERS: "/admin/users.html",
      ROLES: "/admin/roles.html",
      APPLICATIONS: "/admin/applications.html",
      COURSES: "/admin/courses.html",
      COLLEGES: "/admin/colleges.html",
      JOBS: "/admin/jobs.html",
      DOCUMENTS: "/admin/documents.html",
      PAYMENTS: "/admin/payments.html",
      SUBSCRIPTIONS: "/admin/subscriptions.html",
      SUPPORT: "/admin/support.html",
      AUDIT_LOGS: "/admin/audit-logs.html",
      SETTINGS: "/admin/settings.html"
    }),

    LEGAL: Object.freeze({
      HOME: "/legal/index.html",
      PRIVACY: "/legal/privacy-policy.html",
      TERMS: "/legal/terms.html",
      REFUND: "/legal/refund-policy.html",
      DISCLAIMER: "/legal/disclaimer.html",
      COOKIES: "/legal/cookie-policy.html",
      ACCESSIBILITY: "/legal/accessibility-statement.html",
      DATA_DELETION: "/legal/data-deletion.html",
      CONSENT: "/legal/consent-preferences.html",
      JOB_SERVICE_TERMS: "/legal/job-service-terms.html",
      EMPLOYER_TERMS: "/legal/employer-terms.html",
      PAYMENT_TERMS: "/legal/payment-terms.html",
      GRIEVANCE: "/legal/grievance-redressal.html"
    })
  });

  // --------------------------------------------------
  // API configuration
  // The API base URL can be supplied by config.js.
  // --------------------------------------------------

  const API = Object.freeze({
    PREFIX: "/api/v1",
    DEFAULT_TIMEOUT_MS: 15000,
    UPLOAD_TIMEOUT_MS: 60000,
    MAX_RETRIES: 2,

    ENDPOINTS: Object.freeze({
      HEALTH: "/health",
      AUTH: "/auth",
      SESSION: "/sessions",
      VERIFICATION: "/verification",
      PASSWORD: "/password",
      USERS: "/users",
      COURSES: "/courses",
      COLLEGES: "/colleges",
      UNIVERSITIES: "/universities",
      ADMISSIONS: "/admissions",
      APPLICATIONS: "/applications",
      COUNSELLING: "/counselling",
      DOCUMENTS: "/documents",
      JOBS: "/jobs",
      INTERNSHIPS: "/internships",
      CANDIDATES: "/candidates",
      EMPLOYERS: "/employers",
      RECRUITMENT: "/recruitment",
      SERVICES: "/services",
      SEARCH: "/search",
      NOTIFICATIONS: "/notifications",
      PAYMENTS: "/payments",
      UPLOADS: "/uploads",
      CONTACT: "/contact",
      FAQS: "/faqs",
      FAQ_ANSWER: "/faqs/answer",
      SUBSCRIPTIONS: "/subscriptions",
      ADMIN: "/admin"
    }),

    METHODS: Object.freeze({
      GET: "GET",
      POST: "POST",
      PUT: "PUT",
      PATCH: "PATCH",
      DELETE: "DELETE"
    }),

    HEADERS: Object.freeze({
      CONTENT_TYPE: "Content-Type",
      ACCEPT: "Accept",
      AUTHORIZATION: "Authorization",
      REQUEST_ID: "X-Request-ID",
      CSRF_TOKEN: "X-CSRF-Token"
    }),

    CONTENT_TYPES: Object.freeze({
      JSON: "application/json",
      FORM_DATA: "multipart/form-data",
      URL_ENCODED: "application/x-www-form-urlencoded"
    })
  });

  // --------------------------------------------------
  // Authentication and user roles
  // --------------------------------------------------

  const AUTH = Object.freeze({
    ROLES: Object.freeze({
      GUEST: "guest",
      STUDENT: "student",
      CANDIDATE: "candidate",
      EMPLOYER: "employer",
      COUNSELLOR: "counsellor",
      RECRUITER: "recruiter",
      ADMIN: "admin",
      SUPER_ADMIN: "super_admin"
    }),

    PROVIDERS: Object.freeze({
      EMAIL: "email",
      GOOGLE: "google"
    }),

    SESSION: Object.freeze({
      USER: "medorbits-user",
      STATUS: "medorbits-session-status"
    }),

    REQUIREMENTS: Object.freeze({
      EMAIL_VERIFICATION: true,
      PASSWORD_MIN_LENGTH: 12,
      PASSWORD_MAX_LENGTH: 128,
      OTP_LENGTH: 6,
      OTP_EXPIRY_SECONDS: 300,
      RESET_TOKEN_EXPIRY_SECONDS: 1800,
      MAX_LOGIN_ATTEMPTS: 5
    })
  });

  // --------------------------------------------------
  // User account states
  // --------------------------------------------------

  const USER_STATUS = Object.freeze({
    ACTIVE: "active",
    PENDING: "pending",
    SUSPENDED: "suspended",
    DISABLED: "disabled",
    DELETED: "deleted",
    UNVERIFIED: "unverified"
  });

  const VERIFICATION_STATUS = Object.freeze({
    NOT_STARTED: "not_started",
    PENDING: "pending",
    VERIFIED: "verified",
    REJECTED: "rejected",
    EXPIRED: "expired"
  });

  // --------------------------------------------------
  // Education categories
  // --------------------------------------------------

  const EDUCATION = Object.freeze({
    COURSE_CATEGORIES: Object.freeze([
      "MBBS",
      "BDS",
      "AYUSH",
      "Nursing",
      "Pharmacy",
      "Paramedical",
      "Engineering",
      "Management",
      "Law",
      "Postgraduate Medical",
      "Other Postgraduate Courses"
    ]),

    STUDY_DESTINATIONS: Object.freeze({
      INDIA: "india",
      ABROAD: "abroad"
    }),

    ADMISSION_STATUS: Object.freeze({
      DRAFT: "draft",
      SUBMITTED: "submitted",
      UNDER_REVIEW: "under_review",
      SHORTLISTED: "shortlisted",
      APPROVED: "approved",
      REJECTED: "rejected",
      WITHDRAWN: "withdrawn",
      COMPLETED: "completed"
    }),

    COUNSELLING_STATUS: Object.freeze({
      REQUESTED: "requested",
      SCHEDULED: "scheduled",
      IN_PROGRESS: "in_progress",
      COMPLETED: "completed",
      CANCELLED: "cancelled"
    })
  });

  // --------------------------------------------------
  // Career, jobs and internships
  // --------------------------------------------------

  const CAREER = Object.freeze({
    SECTORS: Object.freeze([
      "healthcare",
      "it",
      "finance",
      "hospitality",
      "aviation",
      "manufacturing",
      "logistics",
      "other"
    ]),

    JOB_TYPES: Object.freeze({
      FULL_TIME: "full_time",
      PART_TIME: "part_time",
      CONTRACT: "contract",
      TEMPORARY: "temporary",
      INTERNSHIP: "internship",
      APPRENTICESHIP: "apprenticeship",
      REMOTE: "remote"
    }),

    WORK_MODES: Object.freeze({
      ONSITE: "onsite",
      HYBRID: "hybrid",
      REMOTE: "remote"
    }),

    JOB_STATUS: Object.freeze({
      DRAFT: "draft",
      PENDING_REVIEW: "pending_review",
      PUBLISHED: "published",
      PAUSED: "paused",
      CLOSED: "closed",
      REJECTED: "rejected",
      ARCHIVED: "archived"
    }),

    APPLICATION_STATUS: Object.freeze({
      SUBMITTED: "submitted",
      UNDER_REVIEW: "under_review",
      SHORTLISTED: "shortlisted",
      INTERVIEW: "interview",
      OFFERED: "offered",
      HIRED: "hired",
      REJECTED: "rejected",
      WITHDRAWN: "withdrawn"
    }),

    EXPERIENCE_LEVELS: Object.freeze([
      "fresher",
      "entry_level",
      "mid_level",
      "senior",
      "executive"
    ])
  });

  // --------------------------------------------------
  // Document management
  // --------------------------------------------------

  const DOCUMENTS = Object.freeze({
    TYPES: Object.freeze({
      IDENTITY: "identity",
      ADDRESS_PROOF: "address_proof",
      EDUCATION: "education",
      MARKSHEET: "marksheet",
      CERTIFICATE: "certificate",
      RESUME: "resume",
      PHOTO: "photo",
      SIGNATURE: "signature",
      ADMISSION: "admission",
      FINANCIAL: "financial",
      OTHER: "other"
    }),

    STATUS: Object.freeze({
      PENDING: "pending",
      UPLOADED: "uploaded",
      UNDER_REVIEW: "under_review",
      VERIFIED: "verified",
      REJECTED: "rejected",
      EXPIRED: "expired"
    }),

    UPLOAD: Object.freeze({
      MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
      MAX_FILES_PER_REQUEST: 10,

      ALLOWED_EXTENSIONS: Object.freeze([
        ".pdf",
        ".jpg",
        ".jpeg",
        ".png"
      ]),

      ALLOWED_MIME_TYPES: Object.freeze([
        "application/pdf",
        "image/jpeg",
        "image/png"
      ])
    })
  });

  // --------------------------------------------------
  // Payments and subscriptions
  // --------------------------------------------------

  const PAYMENTS = Object.freeze({
    CURRENCY: "INR",

    METHODS: Object.freeze({
      UPI: "upi",
      CARD: "card",
      NET_BANKING: "net_banking",
      WALLET: "wallet",
      BANK_TRANSFER: "bank_transfer"
    }),

    STATUS: Object.freeze({
      CREATED: "created",
      PENDING: "pending",
      PROCESSING: "processing",
      SUCCESS: "success",
      FAILED: "failed",
      CANCELLED: "cancelled",
      REFUNDED: "refunded",
      PARTIALLY_REFUNDED: "partially_refunded"
    }),

    REFUND_STATUS: Object.freeze({
      NOT_REQUESTED: "not_requested",
      REQUESTED: "requested",
      PROCESSING: "processing",
      APPROVED: "approved",
      REJECTED: "rejected",
      COMPLETED: "completed"
    })
  });

  const SUBSCRIPTIONS = Object.freeze({
    PLANS: Object.freeze({
      FREE: "free",
      BASIC: "basic",
      PREMIUM: "premium",
      PROFESSIONAL: "professional",
      ENTERPRISE: "enterprise"
    }),

    STATUS: Object.freeze({
      TRIAL: "trial",
      ACTIVE: "active",
      PAST_DUE: "past_due",
      PAUSED: "paused",
      CANCELLED: "cancelled",
      EXPIRED: "expired"
    }),

    INTERVALS: Object.freeze({
      MONTHLY: "monthly",
      QUARTERLY: "quarterly",
      YEARLY: "yearly"
    })
  });

  // --------------------------------------------------
  // Form validation
  // --------------------------------------------------

  const VALIDATION = Object.freeze({
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 100,

    EMAIL_MAX_LENGTH: 254,

    PHONE_MIN_LENGTH: 7,
    PHONE_MAX_LENGTH: 15,

    MESSAGE_MIN_LENGTH: 10,
    MESSAGE_MAX_LENGTH: 5000,

    SEARCH_MIN_LENGTH: 2,
    SEARCH_MAX_LENGTH: 200,

    PASSWORD_MIN_LENGTH: 12,
    PASSWORD_MAX_LENGTH: 128,

    PAGINATION: Object.freeze({
      DEFAULT_PAGE: 1,
      DEFAULT_LIMIT: 20,
      MAX_LIMIT: 100
    })
  });

  // --------------------------------------------------
  // Local storage and session storage keys
  // --------------------------------------------------

  const STORAGE_KEYS = Object.freeze({
    THEME: "medorbits-theme",
    COOKIE_CONSENT: "medorbits-cookie-consent",
    LANGUAGE: "medorbits-language",
    USER_PREFERENCES: "medorbits-user-preferences",
    SEARCH_HISTORY: "medorbits-search-history",
    SAVED_FILTERS: "medorbits-saved-filters",
    ONBOARDING_COMPLETED: "medorbits-onboarding-completed"
  });

  // Do not store session identifiers, access tokens,
  // passwords, or sensitive documents in localStorage.

  // --------------------------------------------------
  // UI and accessibility
  // --------------------------------------------------

  const UI = Object.freeze({
    BREAKPOINTS: Object.freeze({
      MOBILE: 480,
      TABLET: 768,
      DESKTOP: 1024,
      WIDE: 1280
    }),

    TOAST: Object.freeze({
      DEFAULT_DURATION_MS: 4000,
      ERROR_DURATION_MS: 6000,
      MAX_VISIBLE: 5
    }),

    DEBOUNCE_MS: 300,
    THROTTLE_MS: 200,
    ANIMATION_DURATION_MS: 250,
    SCROLL_TOP_THRESHOLD: 400
  });

  const ACCESSIBILITY = Object.freeze({
    REDUCED_MOTION_QUERY: "(prefers-reduced-motion: reduce)",
    HIGH_CONTRAST_QUERY: "(prefers-contrast: more)",
    FOCUSABLE_SELECTOR: [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])'
    ].join(", ")
  });

  // --------------------------------------------------
  // Notifications
  // --------------------------------------------------

  const NOTIFICATIONS = Object.freeze({
    TYPES: Object.freeze({
      INFO: "info",
      SUCCESS: "success",
      WARNING: "warning",
      ERROR: "error"
    }),

    CHANNELS: Object.freeze({
      IN_APP: "in_app",
      EMAIL: "email",
      SMS: "sms",
      PUSH: "push"
    }),

    STATUS: Object.freeze({
      UNREAD: "unread",
      READ: "read",
      ARCHIVED: "archived"
    })
  });

  // --------------------------------------------------
  // Support and contact
  // --------------------------------------------------

  const SUPPORT = Object.freeze({
    PRIORITY: Object.freeze({
      LOW: "low",
      NORMAL: "normal",
      HIGH: "high",
      URGENT: "urgent"
    }),

    STATUS: Object.freeze({
      OPEN: "open",
      IN_PROGRESS: "in_progress",
      WAITING: "waiting",
      RESOLVED: "resolved",
      CLOSED: "closed"
    })
  });

  // --------------------------------------------------
  // Consent categories
  // --------------------------------------------------

  const CONSENT = Object.freeze({
    CATEGORIES: Object.freeze({
      NECESSARY: "necessary",
      ANALYTICS: "analytics",
      MARKETING: "marketing",
      PREFERENCES: "preferences"
    }),

    DEFAULTS: Object.freeze({
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false
    })
  });

  // --------------------------------------------------
  // Custom event names
  // --------------------------------------------------

  const EVENTS = Object.freeze({
    APP_READY: "medorbits:ready",
    NAVIGATION_CHANGE: "medorbits:navigation-change",
    THEME_CHANGE: "medorbits:theme-change",
    TOAST: "medorbits:toast",
    FORM_VALID: "medorbits:form-valid",
    FORM_INVALID: "medorbits:form-invalid",
    AUTH_CHANGE: "medorbits:auth-change",
    USER_UPDATED: "medorbits:user-updated",
    APPLICATION_UPDATED: "medorbits:application-updated",
    DOCUMENT_UPLOADED: "medorbits:document-uploaded",
    PAYMENT_UPDATED: "medorbits:payment-updated",
    SUBSCRIPTION_UPDATED: "medorbits:subscription-updated",
    CONSENT_CHANGE: "medorbits:consent-change"
  });

  // --------------------------------------------------
  // HTTP status codes
  // --------------------------------------------------

  const HTTP_STATUS = Object.freeze({
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  });

  // --------------------------------------------------
  // Data files
  // --------------------------------------------------

  const DATA_FILES = Object.freeze({
    COUNTRIES: "/assets/data/countries.json",
    COURSES: "/assets/data/courses.json",
    COLLEGES: "/assets/data/colleges.json",
    UNIVERSITIES: "/assets/data/universities.json",
    FEES: "/assets/data/fees.json",
    SCHOLARSHIPS: "/assets/data/scholarships.json",
    HOSTELS: "/assets/data/hostels.json",
    ADMISSIONS: "/assets/data/admissions.json",
    ADMISSION_PROCESS: "/assets/data/admission-process.json",
    ENTRANCE_EXAMS: "/assets/data/entrance-exams.json",
    DOCUMENTS: "/assets/data/documents.json",
    JOBS: "/assets/data/jobs.json",
    INTERNSHIPS: "/assets/data/internships.json",
    CAREER_OPTIONS: "/assets/data/career-options.json",
    CATEGORIES: "/assets/data/categories.json",
    SECTORS: "/assets/data/sectors.json",
    LOCATIONS: "/assets/data/locations.json",
    RECRUITMENT: "/assets/data/recruitment.json",
    SERVICES: "/assets/data/services.json",
    TESTIMONIALS: "/assets/data/testimonials.json",
    FAQS: "/assets/data/faqs.json",
    NEWS: "/assets/data/news.json",
    NOTIFICATIONS: "/assets/data/notifications.json"
  });

  // --------------------------------------------------
  // Public configuration interface
  // --------------------------------------------------

  const MedOrbitsConstants = Object.freeze({
    APP,
    ENVIRONMENTS,
    ROUTES,
    API,
    AUTH,
    USER_STATUS,
    VERIFICATION_STATUS,
    EDUCATION,
    CAREER,
    DOCUMENTS,
    PAYMENTS,
    SUBSCRIPTIONS,
    VALIDATION,
    STORAGE_KEYS,
    UI,
    ACCESSIBILITY,
    NOTIFICATIONS,
    SUPPORT,
    CONSENT,
    EVENTS,
    HTTP_STATUS,
    DATA_FILES
  });

  // Expose a single namespaced global for classic scripts.
  // Avoid overwriting an existing constants object.
  if (window.MedOrbitsConstants) {
    console.warn(
      "[MedOrbits] MedOrbitsConstants already exists. " +
      "Check for duplicate script inclusion."
    );
    return;
  }

  Object.defineProperty(window, "MedOrbitsConstants", {
    value: MedOrbitsConstants,
    writable: false,
    configurable: false,
    enumerable: true
  });
})();
