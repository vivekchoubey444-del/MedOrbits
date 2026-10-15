/* =========================================================
   MedOrbits -- assets/js/user.model.js
   User model, normalization, profile utilities, and validation
   ========================================================= */
(function (window) {
  "use strict";
  const MODEL_VERSION = "1.0.0";
  const USER_ROLES = Object.freeze({
    STUDENT: "student",
    COUNSELLOR: "counsellor",
    COLLEGE: "college",
    EMPLOYER: "employer",
    RECRUITER: "recruiter",
    ADMIN: "admin",
    SUPER_ADMIN: "super_admin"
  });
  const ACCOUNT_STATUSES = Object.freeze({
    ACTIVE: "active",
    PENDING: "pending",
    SUSPENDED: "suspended",
    DISABLED: "disabled",
    DELETED: "deleted"
  });
  const VERIFICATION_STATUSES = Object.freeze({
    UNVERIFIED: "unverified",
    PENDING: "pending",
    VERIFIED: "verified",
    REJECTED: "rejected"
  });
  const PROFILE_FIELDS = Object.freeze([
    "firstName",
    "lastName",
    "email",
    "phone",
    "dateOfBirth",
    "gender",
    "profileImage",
    "bio",
    "address",
    "city",
    "state",
    "country",
    "postalCode",
    "education",
    "interests"
  ]);
  function isObject(value) {
    return value !== null &&
      typeof value === "object" &&
      !Array.isArray(value);
  }
  function cleanString(value, maxLength = 500) {
    if (value === undefined || value === null) return "";
    return String(value)
      .trim()
      .slice(0, maxLength);
  }
  function normalizeEmail(value) {
    return cleanString(value, 254).toLowerCase();
  }
  function normalizePhone(value) {
    return cleanString(value, 30).replace(/[^\d+()\-\s]/g, "");
  }
  function normalizeRole(value) {
    const role = cleanString(value, 50)
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    const aliases = {
      user: USER_ROLES.STUDENT,
      applicant: USER_ROLES.STUDENT,
      superadmin: USER_ROLES.SUPER_ADMIN,
      "super_admin": USER_ROLES.SUPER_ADMIN
    };
    const normalized = aliases[role] || role;
    return Object.values(USER_ROLES).includes(normalized)
      ? normalized
      : USER_ROLES.STUDENT;
  }
  function normalizeStatus(value) {
    const status = cleanString(value, 30).toLowerCase();
    return Object.values(ACCOUNT_STATUSES).includes(status)
      ? status
      : ACCOUNT_STATUSES.PENDING;
  }
  function normalizeVerification(value) {
    const status = cleanString(value, 30).toLowerCase();
    return Object.values(VERIFICATION_STATUSES).includes(status)
      ? status
      : VERIFICATION_STATUSES.UNVERIFIED;
  }
  function normalizeArray(value, maxItems = 100) {
    if (!Array.isArray(value)) return [];
    return [...new Set(
      value
        .map(item => cleanString(item, 200))
        .filter(Boolean)
    )].slice(0, maxItems);
  }
  function normalizeAddress(value) {
    if (typeof value === "string") {
      return {
        line1: cleanString(value, 200),
        line2: "",
        city: "",
        state: "",
        country: "",
        postalCode: ""
      };
    }
    const address = isObject(value) ? value : {};
    return {
      line1: cleanString(address.line1 || address.addressLine1, 200),
      line2: cleanString(address.line2 || address.addressLine2, 200),
      city: cleanString(address.city, 100),
      state: cleanString(address.state || address.province, 100),
      country: cleanString(address.country, 100),
      postalCode: cleanString(
        address.postalCode || address.zipCode || address.pincode,
        20
      )
    };
  }
  function normalizeEducation(value) {
    if (!Array.isArray(value)) return [];
    return value.slice(0, 50).filter(isObject).map(item => ({
      qualification: cleanString(
        item.qualification || item.degree || item.level,
        150
      ),
      institution: cleanString(
        item.institution || item.college || item.school,
        200
      ),
      fieldOfStudy: cleanString(
        item.fieldOfStudy || item.stream || item.specialization,
        150
      ),
      startYear: normalizeYear(item.startYear),
      endYear: normalizeYear(item.endYear),
      grade: cleanString(item.grade || item.result, 50),
      currentlyStudying: Boolean(item.currentlyStudying)
    }));
  }
  function normalizeYear(value) {
    if (value === "" || value === null || value === undefined) {
      return null;
    }
    const year = Number(value);
    if (
      !Number.isInteger(year) ||
      year < 1900 ||
      year > new Date().getFullYear() + 10
    ) {
      return null;
    }
    return year;
  }
  function normalizePreferences(value) {
    const preferences = isObject(value) ? value : {};
    return {
      language: cleanString(preferences.language || "en", 20),
      timezone: cleanString(preferences.timezone, 100),
      theme: ["light", "dark", "system"].includes(
        cleanString(preferences.theme).toLowerCase()
      )
        ? cleanString(preferences.theme).toLowerCase()
        : "system",
      emailNotifications: preferences.emailNotifications !== false,
      smsNotifications: Boolean(preferences.smsNotifications),
      pushNotifications: preferences.pushNotifications !== false,
      marketingEmails: Boolean(preferences.marketingEmails)
    };
  }
  function normalizeVerificationData(value = {}) {
    const verification = isObject(value) ? value : {};
    return {
      email: normalizeVerification(verification.email),
      phone: normalizeVerification(verification.phone),
      identity: normalizeVerification(verification.identity),
      updatedAt: cleanString(verification.updatedAt, 50) || null
    };
  }
  function normalizeUser(input = {}) {
    const source = isObject(input) ? input : {};
    const profile = isObject(source.profile)
      ? source.profile
      : {};
    const address = normalizeAddress(
      profile.address || source.address
    );
    const firstName = cleanString(
      source.firstName || source.first_name || profile.firstName,
      100
    );
    const lastName = cleanString(
      source.lastName || source.last_name || profile.lastName,
      100
    );
    const fullName = cleanString(
      source.fullName ||
      source.name ||
      profile.fullName ||
      [firstName, lastName].filter(Boolean).join(" "),
      201
    );
    const role = normalizeRole(
      source.role ||
      source.userRole ||
      source.user_type ||
      source.accountType
    );
    const profileImage = cleanString(
      source.profileImage ||
      source.avatar ||
      source.photoURL ||
      profile.profileImage,
      1000
    );
    return {
      id: cleanString(
        source.id || source.userId || source._id || source.uuid,
        150
      ),
      version: MODEL_VERSION,
      firstName,
      lastName,
      fullName,
      email: normalizeEmail(source.email || profile.email),
      phone: normalizePhone(source.phone || source.mobile || profile.phone),
      role,
      roles: normalizeArray(
        Array.isArray(source.roles) ? source.roles : [role],
        20
      ).map(normalizeRole),
      status: normalizeStatus(
        source.status || source.accountStatus
      ),
      profileImage,
      profile: {
        bio: cleanString(profile.bio || source.bio, 2000),
        dateOfBirth: cleanString(
          profile.dateOfBirth || source.dateOfBirth || source.dob,
          30
        ) || null,
        gender: cleanString(profile.gender || source.gender, 50),
        address,
        city: cleanString(profile.city || source.city || address.city, 100),
        state: cleanString(profile.state || source.state || address.state, 100),
        country: cleanString(
          profile.country || source.country || address.country,
          100
        ),
        postalCode: cleanString(
          profile.postalCode || source.postalCode || address.postalCode,
          20
        ),
        education: normalizeEducation(
          profile.education || source.education
        ),
        interests: normalizeArray(
          profile.interests || source.interests
        ),
        skills: normalizeArray(profile.skills || source.skills),
        languages: normalizeArray(profile.languages || source.languages),
        website: cleanString(profile.website || source.website, 1000),
        linkedin: cleanString(profile.linkedin || source.linkedin, 1000)
      },
      verification: normalizeVerificationData(
        source.verification || source.verificationStatus
      ),
      preferences: normalizePreferences(
        source.preferences || source.settings
      ),
      subscription: normalizeSubscription(source.subscription),
      createdAt: cleanString(
        source.createdAt || source.created_at,
        50
      ) || null,
      updatedAt: cleanString(
        source.updatedAt || source.updated_at,
        50
      ) || null,
      lastLoginAt: cleanString(
        source.lastLoginAt || source.last_login_at,
        50
      ) || null,
      metadata: normalizeMetadata(source.metadata)
    };
  }
  function normalizeSubscription(value) {
    const subscription = isObject(value) ? value : {};
    return {
      id: cleanString(subscription.id || subscription.subscriptionId, 150),
      plan: cleanString(subscription.plan || subscription.planName, 100),
      status: cleanString(subscription.status || "inactive", 30).toLowerCase(),
      startsAt: cleanString(subscription.startsAt, 50) || null,
      expiresAt: cleanString(subscription.expiresAt, 50) || null,
      autoRenew: Boolean(subscription.autoRenew)
    };
  }
  function normalizeMetadata(value) {
    if (!isObject(value)) return {};
    const allowedKeys = [
      "source",
      "campaign",
      "referralCode",
      "onboardingCompleted",
      "profileCompletion"
    ];
    const metadata = {};
    allowedKeys.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const item = value[key];
        if (
          item === null ||
          ["string", "number", "boolean"].includes(typeof item)
        ) {
          metadata[key] = item;
        }
      }
    });
    return metadata;
  }
  function validateEmail(value) {
    const email = normalizeEmail(value);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  function validatePhone(value) {
    const phone = normalizePhone(value);
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15;
  }
  function validateUser(input = {}, options = {}) {
    const user = normalizeUser(input);
    const errors = {};
    if (options.requireId && !user.id) {
      errors.id = "User ID is required.";
    }
    if (options.requireFirstName && !user.firstName) {
      errors.firstName = "First name is required.";
    }
    if (options.requireLastName && !user.lastName) {
      errors.lastName = "Last name is required.";
    }
    if (options.requireEmail && !user.email) {
      errors.email = "Email address is required.";
    } else if (user.email && !validateEmail(user.email)) {
      errors.email = "Enter a valid email address.";
    }
    if (options.requirePhone && !user.phone) {
      errors.phone = "Phone number is required.";
    } else if (user.phone && !validatePhone(user.phone)) {
      errors.phone = "Enter a valid phone number.";
    }
    if (
      input.role &&
      !Object.values(USER_ROLES).includes(
        cleanString(input.role).toLowerCase().replace(/[\s-]+/g, "_")
      )
    ) {
      errors.role = "Invalid user role.";
    }
    return {
      valid: Object.keys(errors).length === 0,
      errors,
      user
    };
  }
  function getDisplayName(user) {
    if (!user) return "User";
    const normalized = normalizeUser(user);
    return normalized.fullName ||
      normalized.email ||
      "User";
  }
  function getInitials(user) {
    if (!user) return "U";
    const normalized = normalizeUser(user);
    const name = normalized.fullName ||
      normalized.email ||
      "User";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join("") || "U";
  }
  function getProfileCompletion(user) {
    const normalized = normalizeUser(user);
    const fields = [
      normalized.firstName,
      normalized.lastName,
      normalized.email,
      normalized.phone,
      normalized.profile.dateOfBirth,
      normalized.profile.gender,
      normalized.profileImage,
      normalized.profile.city,
      normalized.profile.state,
      normalized.profile.education.length > 0,
      normalized.profile.bio
    ];
    const completed = fields.filter(value => {
      if (typeof value === "boolean") return value;
      return value !== null && value !== undefined && value !== "";
    }).length;
    return Math.round((completed / fields.length) * 100);
  }
  function isEmailVerified(user) {
    const normalized = normalizeUser(user);
    return normalized.verification.email === VERIFICATION_STATUSES.VERIFIED;
  }
  function isPhoneVerified(user) {
    const normalized = normalizeUser(user);
    return normalized.verification.phone === VERIFICATION_STATUSES.VERIFIED;
  }
  function hasRole(user, role) {
    if (!user || !role) return false;
    const normalized = normalizeUser(user);
    const requestedRole = normalizeRole(role);
    return normalized.role === requestedRole ||
      normalized.roles.includes(requestedRole);
  }
  function hasAnyRole(user, roles = []) {
    return Array.isArray(roles) &&
      roles.some(role => hasRole(user, role));
  }
  function isActive(user) {
    return normalizeUser(user).status === ACCOUNT_STATUSES.ACTIVE;
  }
  function toPublicProfile(input = {}) {
    const user = normalizeUser(input);
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      profileImage: user.profileImage,
      role: user.role,
      bio: user.profile.bio,
      city: user.profile.city,
      state: user.profile.state,
      country: user.profile.country,
      education: user.profile.education,
      interests: user.profile.interests,
      skills: user.profile.skills,
      languages: user.profile.languages,
      website: user.profile.website,
      linkedin: user.profile.linkedin
    };
  }
  function toUpdatePayload(input = {}) {
    const user = normalizeUser(input);
    return {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      profile: {
        bio: user.profile.bio,
        dateOfBirth: user.profile.dateOfBirth,
        gender: user.profile.gender,
        address: user.profile.address,
        city: user.profile.city,
        state: user.profile.state,
        country: user.profile.country,
        postalCode: user.profile.postalCode,
        education: user.profile.education,
        interests: user.profile.interests,
        skills: user.profile.skills,
        languages: user.profile.languages,
        website: user.profile.website,
        linkedin: user.profile.linkedin
      },
      preferences: user.preferences
    };
  }
  function updateUser(currentUser, updates = {}) {
    const current = isObject(currentUser) ? currentUser : {};
    const changes = isObject(updates) ? updates : {};
    const merged = {
      ...current,
      ...changes,
      profile: {
        ...(isObject(current.profile) ? current.profile : {}),
        ...(isObject(changes.profile) ? changes.profile : {})
      },
      preferences: {
        ...(isObject(current.preferences) ? current.preferences : {}),
        ...(isObject(changes.preferences) ? changes.preferences : {})
      },
      verification: {
        ...(isObject(current.verification) ? current.verification : {}),
        ...(isObject(changes.verification) ? changes.verification : {})
      },
      metadata: {
        ...(isObject(current.metadata) ? current.metadata : {}),
        ...(isObject(changes.metadata) ? changes.metadata : {})
      }
    };
    return normalizeUser(merged);
  }
  const api = {
    version: MODEL_VERSION,
    USER_ROLES,
    ACCOUNT_STATUSES,
    VERIFICATION_STATUSES,
    PROFILE_FIELDS,
    normalizeUser,
    updateUser,
    validateUser,
    validateEmail,
    validatePhone,
    normalizeEmail,
    normalizePhone,
    getDisplayName,
    getInitials,
    getProfileCompletion,
    isEmailVerified,
    isPhoneVerified,
    hasRole,
    hasAnyRole,
    isActive,
    toPublicProfile,
    toUpdatePayload
  };
  window.MedOrbitsUserModel = api;
})(window);