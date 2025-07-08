import passport, { Profile } from "passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";
import { Admin } from "../models/admin";
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, QED_EMAIL } from "../config";

passport.use(
    new Strategy(
        {
            clientID: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            callbackURL: "/auth/google/callback"
        },
        async (
            accessToken: string,
            refreshToken: string,
            profile: Profile,
            done: VerifyCallback
        ) => {
            if (profile.emails === undefined) return done(null, false);

            let existingAdmin;
            existingAdmin = await Admin.findOneAndUpdate(
                { email: profile.emails[0].value },
                {
                    email: profile.emails[0].value,
                    name: profile.displayName,
                    photo: profile.photos
                        ? profile.photos[0].value
                        : "https://i.pinimg.com/736x/2c/f5/58/2cf558ab8c1f12b43f7326945672805e.jpg"
                },
                { new: true }
            );

            if (existingAdmin) {
                return done(null, existingAdmin);
            } else if (profile.emails[0].value === QED_EMAIL) {
                existingAdmin = new Admin({
                    email: profile.emails[0].value,
                    name: profile.displayName,
                    photo: profile.photos
                        ? profile.photos[0].value
                        : "https://i.pinimg.com/736x/2c/f5/58/2cf558ab8c1f12b43f7326945672805e.jpg"
                });
                existingAdmin.save();
                return done(null, existingAdmin);
            }

            return done(null, false, { message: "New registrations are not allowed" });
        }
    )
);

passport.serializeUser((admin, done) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    done(null, (admin as any).id);
});

passport.deserializeUser(async (id, done) => {
    const admin = await Admin.findById(id);
    done(null, admin);
});
