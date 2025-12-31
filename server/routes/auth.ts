import { Router, RequestHandler } from "express";
import { z } from "zod";
import {
  signToken,
  createUserPayload,
  hashPassword,
  comparePassword,
  verifyToken,
} from "../utils/auth";
import { UserRole } from "../../shared/models";
import { LoginRequest, LoginResponse, RegisterRequest } from "../../shared/api";
import { dataStore, RegisteredUser } from "../utils/dataStore";
import { sendWelcomeEmail } from "../utils/emailService";

export const authRoutes = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name is required"),
  role: z.enum(["student", "faculty", "admin"]),
});

// Form URLs
const STUDENT_FORM_URL = process.env.STUDENT_FORM_URL || "https://docs.google.com/forms/d/e/1FAIpQLSdbglkFnbu21kQ37VTlLduSvUtaZ1oUJhi2R_Gksy5LMRPpNg/viewform";
const FACULTY_FORM_URL = process.env.FACULTY_FORM_URL || "https://docs.google.com/forms/d/e/1FAIpQLSdZVv8EqILilXLeb1gN2DMHW1YLHolEdgu-lYlxRGsHas_5Eg/viewform";

// Admin credentials from environment
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@internship.erp";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123456";

/**
 * POST /api/auth/login
 * User login endpoint - Only registered users can login
 */
export const handleLogin: RequestHandler = async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // =====================
    // ADMIN LOGIN (hardcoded)
    // =====================
    if (email === ADMIN_EMAIL) {
      if (password === ADMIN_PASSWORD) {
        const payload = createUserPayload(
          "admin-1",
          email,
          "admin" as UserRole,
          "admin-1"
        );
        const accessToken = signToken(payload);

        console.log(`✅ Admin logged in: ${email}`);
        return res.json({
          accessToken,
          user: {
            id: "admin-1",
            email: email,
            role: "admin" as UserRole,
            roleId: "admin-1",
          },
        });
      } else {
        return res.status(401).json({
          error: "Invalid credentials",
          message: "Email or password is incorrect",
        });
      }
    }

    // =====================
    // REGULAR USER LOGIN
    // =====================
    // Check if user is registered
    const registeredUser = dataStore.getRegisteredUser(email);

    if (!registeredUser) {
      // Check if they're in Google Sheets (have filled the form)
      const student = dataStore.getStudent(email);
      const faculty = dataStore.getFaculty(email);

      if (student || faculty) {
        // They filled the form but haven't registered yet
        return res.status(401).json({
          error: "Account not created",
          message: "Your email is in our system. Please sign up to create your account.",
          action: "redirect_to_signup",
        });
      }

      // Email not found anywhere - need to fill form first
      return res.status(403).json({
        error: "Email not registered",
        message: "This email is not found in our system. Please fill the Google Form first.",
        action: "redirect_to_form",
        formUrls: {
          student: STUDENT_FORM_URL,
          faculty: FACULTY_FORM_URL,
        },
      });
    }

    // User is registered - verify password
    const isPasswordValid = await comparePassword(password, registeredUser.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Invalid credentials",
        message: "Email or password is incorrect",
      });
    }

    // Create token
    const payload = createUserPayload(
      registeredUser.id,
      registeredUser.email,
      registeredUser.role as UserRole,
      registeredUser.roleId
    );
    const accessToken = signToken(payload);

    const response: LoginResponse = {
      accessToken,
      user: {
        id: registeredUser.id,
        email: registeredUser.email,
        role: registeredUser.role as UserRole,
        roleId: registeredUser.roleId,
      },
    };

    console.log(`✅ User logged in: ${email} (${registeredUser.role})`);
    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        message: error.errors[0].message,
      });
    }

    console.error("Login error:", error);
    res.status(500).json({
      error: "Login failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /api/auth/register
 * User registration endpoint - Only users who filled Google Form can register
 */
export const handleRegister: RequestHandler = async (req, res) => {
  try {
    const { email, password, fullName, role } = registerSchema.parse(req.body);

    // Check if already registered
    if (dataStore.hasRegisteredUser(email)) {
      return res.status(400).json({
        error: "Email already registered",
        message: "This email already has an account. Please login instead.",
      });
    }

    // Check if email exists in Google Forms data
    const student = dataStore.getStudent(email);
    const faculty = dataStore.getFaculty(email);

    // Determine expected role from Google Forms data
    let expectedRole: string | null = null;
    if (student) expectedRole = "student";
    if (faculty) expectedRole = "faculty";

    // If email not found in Google Sheets, they need to fill the form
    if (!expectedRole) {
      return res.status(403).json({
        error: "Email not in system",
        message: "This email is not found in our system. Please fill the Google Form first to register.",
        action: "redirect_to_form",
        formUrls: {
          student: STUDENT_FORM_URL,
          faculty: FACULTY_FORM_URL,
        },
      });
    }

    // Verify role matches Google Forms data
    if (role !== expectedRole) {
      return res.status(403).json({
        error: "Role mismatch",
        message: `According to our records, this email is registered as "${expectedRole}". You cannot sign up as "${role}".`,
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create registered user
    const newUser: RegisteredUser = {
      id: `user-${Date.now()}`,
      email,
      passwordHash,
      fullName,
      role: role as "student" | "faculty" | "admin",
      roleId: `${role}-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    // Save to dataStore
    dataStore.setRegisteredUser(newUser);

    // Create token
    const payload = createUserPayload(
      newUser.id,
      newUser.email,
      newUser.role as UserRole,
      newUser.roleId
    );
    const accessToken = signToken(payload);

    // Send welcome email (async, don't wait)
    sendWelcomeEmail(email, fullName, role).catch((error) => {
      console.error("Failed to send welcome email:", error);
    });

    const response: LoginResponse = {
      accessToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role as UserRole,
        roleId: newUser.roleId,
      },
    };

    console.log(`✅ New user registered: ${email} (${role})`);
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        message: error.errors[0].message,
      });
    }

    console.error("Registration error:", error);
    res.status(500).json({
      error: "Registration failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /api/auth/logout
 * User logout endpoint
 */
export const handleLogout: RequestHandler = (req, res) => {
  res.json({
    success: true,
    message: "Logged out successfully",
  });
};

/**
 * GET /api/auth/me
 * Get current user info (requires token)
 */
export const handleGetMe: RequestHandler = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  res.json({
    user: req.user,
  });
};

// Route definitions
authRoutes.post("/login", handleLogin);
authRoutes.post("/register", handleRegister);
authRoutes.post("/logout", handleLogout);
authRoutes.get("/me", (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    const user = verifyToken(token);
    if (user) {
      req.user = user;
    }
  }

  next();
}, handleGetMe);
