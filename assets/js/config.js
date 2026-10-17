
/**
 * MedOrbits -- Central Configuration
 * File: assets/js/config.js
 *
 * Responsibilities:
 * - Centralize application settings
 * - Configure API and asset paths
 * - Define routes and feature flags
 * - Set request, upload, pagination, and UI defaults
 * - Expose a consistent read-only configuration API
 *
 * Security:
 * - Never store API secrets, database credentials, private tokens,
 *   payment secrets, or other sensitive values in this frontend file.
 * - All security-sensitive configuration belongs on the server.
 */

(() => {
  "use strict";

  const GLOBAL_KEY = "MedOrbitsConfig";

  if (window[GLOBAL_KEY]) {
    return;
  }

  // --------------------------------------------------
  // Environment detection
  // --------------------------------------------------

  function detectEnvironment() {
    const hostname = window.location.hostname;

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1"
    ) {
      return "development";
    }

    if (
      hostname.startsWith("staging.") ||
      hostname.startsWith("test.")
    ) {
      return "staging";
    }

    return "production";
  }

  const environment = detectEnvironment();

  // --------------------------------------------------
  // Base URL configuration
  // --------------------------------------------------

  function normalizeBasePath(value) {
    if (!value || value === "/") return "";

    return `/${String(value)
      .replace(/^\/+|\/+$/g, "")}`;
  }

  function normalizeOrigin(value) {
    if (!value) return "";

    const url = new URL(value, window.location.origin);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new TypeError("Unsupported application URL protocol.");
    }

    return url.origin;
  }

  const htmlBasePath = normalizeBasePath(
    document.documentElement.dataset.basePath || ""
  );

  const configuredApiOrigin = document.documentElement.dataset.apiOrigin || "";

  const apiOrigin = normalizeOrigin(configuredApiOrigin);

  const baseURL = window.location.origin + htmlBasePath;

  const apiBasePath = "/api/v1";

  // --------------------------------------------------
  // Application metadata
  // --------------------------------------------------

  const app = {
    name: "MedOrbits",
    shortName: "MedOrbits",
    description:
      "Education guidance, medical admissions, study abroad, careers, jobs and recruitment services.",
    version: "1.0.0",
    environment,
    defaultLanguage: "en",
    defaultCountry: "IN",
    defaultCurrency: "INR",
    timezone: "Asia/Kolkata",
    supportEmail: "support@medorbits.in",
    websiteURL: "https://medorbits.in"
  };

  // --------------------------------------------------
  // URL configuration
  // --------------------------------------------------

  const urls = {
    origin: window.location.origin,
    baseURL,
    apiOrigin,
    apiBaseURL: `${apiOrigin || window.location.origin}${apiBasePath}`,
    assets: `${htmlBasePath}/assets`.replace(/^\/\//, "/"),
    images: `${htmlBasePath}/assets/images`.replace(/^\/\//, "/"),
    icons: `${htmlBasePath}/assets/icons`.replace(/^\/\//, "/"),
    data: `${htmlBasePath}/assets/data`.replace(/^\/\//, "/"),
    documents: `${htmlBasePath}/assets/documents`.replace(/^\/\//, "/")
  };

  // --------------------------------------------------
  // Public site routes
  // --------------------------------------------------

  const routes = {
    home: "/index.html",

    pages: {
      about: "/pages/about.html",
      services: "/pages/services.html",
      contact: "/pages/contact.html",
      apply: "/pages/apply.html",
      subscriptions: "/pages/subscriptions.html",
      search: "/pages/search.html",
      testimonials: "/pages/testimonials.html",
      accessibility: "/pages/accessibility.html",
      sitemap: "/pages/sitemap.html",
      notFound: "/pages/404.html",
      badRequest: "/pages/400.html",
      serverError: "/pages/500.html",
      offline: "/pages/offline.html",
      maintenance: "/pages/maintenance.html"
    },

    account: {
      login: "/account/login.html",
      register: "/account/register.html",
      logout: "/account/logout.html",
      forgotPassword: "/account/forgot-password.html",
      resetPassword: "/account/reset-password.html",
      verifyEmail: "/account/verify-email.html",
      resendVerification: "/account/resend-verification.html",
      changePassword: "/account/change-password.html",
      twoFactor: "/account/two-factor.html",
      security: "/account/security.html",
      deleteAccount: "/account/delete-account.html",
      dashboard: "/account/dashboard.html",
      profile: "/account/profile.html",
      settings: "/account/settings.html",
      applications: "/account/applications.html",
      counselling: "/account/counselling.html",
      documents: "/account/documents.html",
      notifications: "/account/notifications.html",
      payments: "/account/payments.html",
      subscriptions: "/account/subscriptions.html",
      savedJobs: "/account/saved-jobs.html",
      internships: "/account/internships.html",
      support: "/account/support.html",
      activity: "/account/activity.html"
    },

    education: {
      home: "/education/index.html",
      courses: "/education/courses.html",
      colleges: "/education/colleges.html",
      universities: "/education/universities.html",

      india: {
        home: "/education/study-india/index.html",
        mbbs: "/education/study-india/mbbs.html",
        bds: "/education/study-india/bds.html",
        ayush: "/education/study-india/ayush.html",
        nursing: "/education/study-india/nursing.html",
        pharmacy: "/education/study-india/pharmacy.html",
        paramedical: "/education/study-india/paramedical.html",
        engineering: "/education/study-india/engineering.html",
        management: "/education/study-india/management.html",
        law: "/education/study-india/law.html",
        pgMedical: "/education/study-india/pg-medical.html",
        pgOthers: "/education/study-india/pg-others.html",
        moreCourses: "/education/study-india/more-courses.html"
      },

      abroad: {
        home: "/education/study-abroad/index.html",
        mbbs: "/education/study-abroad/mbbs-abroad.html",
        russia: "/education/study-abroad/russia.html",
        georgia: "/education/study-abroad/georgia.html",
        kazakhstan: "/education/study-abroad/kazakhstan.html",
        uzbekistan: "/education/study-abroad/uzbekistan.html",
        kyrgyzstan: "/education/study-abroad/kyrgyzstan.html",
        uae: "/education/study-abroad/uae.html",
        moreCountries: "/education/study-abroad/more-countries.html"
      },

      admissions: {
        home: "/education/admissions/index.html",
        process: "/education/admissions/process.html",
        eligibility: "/education/admissions/eligibility.html",
        exams: "/education/admissions/exams.html",
        counselling: "/education/admissions/counselling.html",
        documents: "/education/admissions/documents.html"
      },

      resources: {
        home: "/education/resources/index.html",
        fees: "/education/resources/fees.html",
        scholarships: "/education/resources/scholarships.html",
        hostels: "/education/resources/hostels.html",
        guides: "/education/resources/guides.html",
        brochures: "/education/resources/brochures.html",
        studentLoans: "/education/resources/student-loans.html",
        faqs: "/education/resources/faqs.html"
      }
    },

    career: {
      home: "/career/index.html",
      jobs: "/career/jobs.html",
      jobDetails: "/career/job-details.html",
      jobCategories: "/career/job-categories.html",
      internships: "/career/internships.html",
      internshipDetails: "/career/internship-details.html",
      register: "/career/register.html",
      employerServices: "/career/employer-services.html",
      employerLogin: "/career/employer-login.html",
      employerRegister: "/career/employer-register.html",
      employerDashboard: "/career/employer-dashboard.html",
      postJob: "/career/post-job.html",
      manageJobs: "/career/manage-jobs.html",
      applicants: "/career/applicants.html",
      recruitment: "/career/recruitment.html",
      guidance: "/career/guidance.html",
      resumeSupport: "/career/resume-support.html",
      resumeBuilder: "/career/resume-builder.html",
      interviewPreparation: "/career/interview-preparation.html",

      sectors: "/career/sectors/index.html",
      locations: "/career/locations/index.html",
      resources: "/career/resources/index.html"
    },

    admin: {
      home: "/admin/index.html",
      login: "/admin/login.html",
      dashboard: "/admin/dashboard.html",
      users: "/admin/users.html",
      roles: "/admin/roles.html",
      applications: "/admin/applications.html",
      courses: "/admin/courses.html",
      colleges: "/admin/colleges.html",
      jobs: "/admin/jobs.html",
      documents: "/admin/documents.html",
      payments: "/admin/payments.html",
      subscriptions: "/admin/subscriptions.html",
      support: "/admin/support.html",
      auditLogs: "/admin/audit-logs.html",
      settings: "/admin/settings.html"
    },

    legal: {
      home: "/legal/index.html",
      privacy: "/legal/privacy-policy.html",
      terms: "/legal/terms.html",
      refunds: "/legal/refund-policy.html",
      disclaimer: "/legal/disclaimer.html",
      cookies: "/legal/cookie-policy.html",
      accessibility: "/legal/accessibility-statement.html",
      dataDeletion: "/legal/data-deletion.html",
      consent: "/legal/consent-preferences.html",
      jobServiceTerms: "/legal/job-service-terms.html",
      employerTerms: "/legal/employer-terms.html",
      paymentTerms: "/legal/payment-terms.html",
      grievance: "/legal/grievance-redressal.html"
    }
  };

  // --------------------------------------------------
  // API endpoint configuration
  // --------------------------------------------------

  const api = {
    baseURL: urls.apiBaseURL,

    endpoints: {
      health: "/health",
      auth: {
        login: "/auth/login",
        register: "/auth/register",
        logout: "/auth/logout",
        refresh: "/auth/refresh",
        me: "/auth/me",
        sessions: "/sessions",
        sendEmailVerification: "/verification/email/send",
        verifyEmail: "/verification/email/confirm",
        resendVerification: "/verification/email/send",
        sendPhoneVerification: "/verification/phone/send",
        verifyPhone: "/verification/phone/confirm",
        forgotPassword: "/password/forgot",
        resetPassword: "/password/reset",
        changePassword: "/password/change"
      },

      users: {
        profile: "/users/me",
        settings: "/users/me/settings",
        activity: "/users/me/activity",
        deleteAccount: "/users/me"
      },

      education: {
        courses: "/courses",
        colleges: "/colleges",
        universities: "/universities",
        admissions: "/admissions",
        applications: "/applications",
        counselling: "/counselling",
        fees: "/resources/fees",
        scholarships: "/resources/scholarships",
        hostels: "/resources/hostels"
      },

      career: {
        jobs: "/jobs",
        internships: "/internships",
        candidates: "/candidates",
        employers: "/employers",
        recruitment: "/recruitment",
        resume: "/candidates/resume",
        savedJobs: "/users/me/saved-jobs"
      },

      documents: {
        list: "/documents",
        mine: "/documents/mine",
        upload: "/uploads",
        verify: "/documents/:id/verify",
        delete: "/documents/:id"
      },

      payments: {
        createCheckout: "/payments/checkout",
        history: "/payments/mine",
        subscriptions: "/subscriptions"
      },

      notifications: "/notifications",
      search: "/search",
      contact: "/contact",
      support: "/support",
      faqs: {
        list: "/faqs",
        answer: "/faqs/answer"
      },

      admin: {
        dashboard: "/admin/dashboard",
        users: "/admin/users",
        roles: "/admin/roles",
        applications: "/admin/applications",
        documents: "/admin/documents",
        payments: "/admin/payments",
        auditLogs: "/admin/audit-logs",
        settings: "/admin/settings"
      }
    }
  };

  // --------------------------------------------------
  // HTTP request defaults
  // --------------------------------------------------

  const request = {
    timeoutMs: 20000,
    credentials: "same-origin",
    defaultHeaders: {
      Accept: "application/json"
    },
    retry: {
      enabled: true,
      maxAttempts: 2,
      baseDelayMs: 300,
      retryableMethods: ["GET", "HEAD", "OPTIONS"],
      retryableStatusCodes: [408, 429, 500, 502, 503, 504]
    }
  };

  // --------------------------------------------------
  // Upload configuration
  // --------------------------------------------------

  const uploads = {
    maxFileSizeBytes: 10 * 1024 * 1024,

    allowedExtensions: [
      ".pdf",
      ".jpg",
      ".jpeg",
      ".png",
      ".webp"
    ],

    allowedMimeTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp"
    ],

    documentTypes: [
      "identity",
      "academic",
      "admission",
      "resume",
      "other"
    ],

    multiple: true
  };

  // --------------------------------------------------
  // Pagination and search
  // --------------------------------------------------

  const data = {
    pagination: {
      defaultPage: 1,
      defaultPageSize: 12,
      pageSizeOptions: [6, 12, 24, 48],
      maxPageSize: 100
    },

    search: {
      minQueryLength: 2,
      debounceMs: 300,
      defaultSort: "relevance",
      maxRecentSearches: 10
    }
  };

  // --------------------------------------------------
  // UI configuration
  // --------------------------------------------------

  const ui = {
    theme: {
      default: "dark",
      allowed: ["dark", "light"],
      storageKey: "medorbits-theme"
    },

    animation: {
      enabled: true,
      durationMs: 250,
      respectReducedMotion: true
    },

    toast: {
      durationMs: 4000,
      maxVisible: 4
    },

    modal: {
      closeOnEscape: true,
      closeOnBackdrop: true
    },

    navigation: {
      mobileBreakpointPx: 768,
      stickyHeader: true
    }
  };

  // --------------------------------------------------
  // Feature flags
  // --------------------------------------------------

  const features = {
    education: true,
    studyAbroad: true,
    careerServices: true,
    jobListings: true,
    internships: true,
    employerPortal: true,
    recruitmentServices: true,
    counselling: true,
    documentManagement: true,
    notifications: true,
    subscriptions: true,
    paymentIntegration: false,
    twoFactorAuthentication: false,
    aiGuidance: false,
    analytics: false
  };

  // These flags control frontend visibility only.
  // The backend must independently enforce all permissions.

  // --------------------------------------------------
  // Localization
  // --------------------------------------------------

  const localization = {
    defaultLanguage: "en",
    supportedLanguages: [
      "en",
      "hi",
      "bn",
      "as",
      "ne",
      "mr",
      "gu",
      "pa",
      "ur",
      "or",
      "fr",
      "de",
      "es",
      "zh",
      "ar",
      "ru",
      "ka",
      "kk",
      "uz",
      "ky"
    ],

    defaultLocale: "en-IN",
    currency: "INR",
    timezone: "Asia/Kolkata"
  };

  // --------------------------------------------------
  // Validation configuration
  // --------------------------------------------------

  const validation = {
    password: {
      minLength: 12,
      maxLength: 128
    },

    name: {
      minLength: 2,
      maxLength: 100
    },

    message: {
      maxLength: 5000
    },

    email: {
      maxLength: 254
    }
  };

  // --------------------------------------------------
  // Public runtime configuration
  // --------------------------------------------------

  const config = {
    app,
    urls,
    routes,
    api,
    API_BASE_URL: api.baseURL,
    apiBaseUrl: api.baseURL,
    request,
    uploads,
    data,
    ui,
    features,
    localization,
    validation,

    getRoute(path) {
      if (typeof path !== "string" || !path.trim()) {
        return null;
      }

      const segments = path.split(".");
      let current = routes;

      for (const segment of segments) {
        if (
          current === null ||
          typeof current !== "object" ||
          !Object.prototype.hasOwnProperty.call(current, segment)
        ) {
          return null;
        }

        current = current[segment];
      }

      return typeof current === "string" ? current : null;
    },

    getEndpoint(path) {
      if (typeof path !== "string" || !path.trim()) {
        return null;
      }

      const segments = path.split(".");
      let current = api.endpoints;

      for (const segment of segments) {
        if (
          current === null ||
          typeof current !== "object" ||
          !Object.prototype.hasOwnProperty.call(current, segment)
        ) {
          return null;
        }

        current = current[segment];
      }

      return typeof current === "string" ? current : null;
    },

    getApiURL(endpoint) {
      if (
        typeof endpoint !== "string" ||
        !endpoint.startsWith("/") ||
        endpoint.startsWith("//")
      ) {
        throw new TypeError("A relative API endpoint is required.");
      }

      return `${api.baseURL}${endpoint}`;
    },

    isFeatureEnabled(featureName) {
      return (
        typeof featureName === "string" &&
        Object.prototype.hasOwnProperty.call(features, featureName) &&
        features[featureName] === true
      );
    }
  };

  // Prevent accidental changes to nested configuration values.
  function deepFreeze(value) {
    if (
      value === null ||
      typeof value !== "object" ||
      Object.isFrozen(value)
    ) {
      return value;
    }

    Object.freeze(value);

    for (const key of Object.keys(value)) {
      deepFreeze(value[key]);
    }

    return value;
  }

  window[GLOBAL_KEY] = deepFreeze(config);

  // Optional compatibility alias for the application bootstrap.
  window.MedOrbitsConfig = window[GLOBAL_KEY];

  if (window.MEDORBITS_DEBUG === true) {
    console.info("[MedOrbits] Configuration loaded.", {
      environment,
      version: app.version
    });
  }
})();
