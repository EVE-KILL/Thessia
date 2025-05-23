export default defineEventHandler(async (event) => {
  try {
    const cookieName = "evelogin";

    // Delete the cookie by setting it with a past expiration
    setCookie(event, cookieName, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: -1, // Expired
      path: "/",
    });

    return {
      success: true,
      message: "Logged out successfully",
    };
  } catch (error) {
    console.debug("[Auth] Logout error:", error);
    return {
      success: false,
      message: "An error occurred during logout",
    };
  }
});
