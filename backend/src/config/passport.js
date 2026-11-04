const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

let callbackURL = process.env.GOOGLE_CALLBACK_URL;
if (!callbackURL || callbackURL.includes('your-backend-vercel-url')) {
  callbackURL = `http://localhost:${process.env.PORT || 5001}/api/user/google/callback`;
}

if (clientID && clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
      },
      (accessToken, refreshToken, profile, done) => {
        return done(null, profile);
      }
    )
  );
} else {
  console.warn(
    '⚠️ [Passport] Google OAuth credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) are missing or empty in .env. Google login will be disabled.'
  );
}

module.exports = passport;
