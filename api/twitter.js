const { TwitterApi } = require("twitter-api-v2");
const axios = require("axios");

module.exports = async (req, res) => {
  try {
    const { method, query, body } = req;
    console.log("TWITTER_API_KEY:", process.env.TWITTER_API_KEY);
    console.log("TWITTER_API_SECRET:", process.env.TWITTER_API_SECRET);
    console.log("CALLBACK_URL:", process.env.CALLBACK_URL);
    console.log("Request method:", method);
    console.log("Request query:", query);

    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
    });

    // 🔐 Step 1: Generate Auth Link
    if (method === "GET" && query.step === "auth") {
      try {
        const authResponse = await client.generateAuthLink(process.env.CALLBACK_URL, {
          authAccessType: "write",
        });

        console.log("Full auth response:", authResponse);

        if (query.redirect === "true") {
          return res.redirect(authResponse.url);
        }

        return res.status(200).json(authResponse);
      } catch (err) {
        console.error("Auth step failed:", err);
        return res.status(500).json({
          error: "Auth step failed",
          message: err.message,
          stack: err.stack,
        });
      }
    }

    // 🔁 Step 2: Handle Callback (GET or POST)
    const isCallback =
      (method === "POST" && body.step === "callback") ||
      (method === "GET" && query.oauth_token && query.oauth_verifier);

    if (isCallback) {
      try {
        const oauthToken = method === "POST" ? body.oauthToken : query.oauth_token;
        const oauthVerifier = method === "POST" ? body.oauthVerifier : query.oauth_verifier;
        const oauthTokenSecret =
          method === "POST" ? body.oauthTokenSecret : query.oauth_token_secret || "";

        console.log("Received callback payload:", { oauthToken, oauthVerifier, oauthTokenSecret });

        const loginClient = new TwitterApi({
          appKey: process.env.TWITTER_API_KEY,
          appSecret: process.env.TWITTER_API_SECRET,
          accessToken: oauthToken,
          accessSecret: oauthTokenSecret,
        });

        const { client: userClient } = await loginClient.login(oauthVerifier);
        console.log("Logged in to Twitter API");

        await userClient.v1.updateAccountProfile({
          name: "New Display Name",
          description: "New bio here.",
          url: "https://ko-fi.com/darkmea",
        });
        console.log("Profile text updated");

        const profilePicUrl = "https://twitter-vercel-plum.vercel.app/profile.jpg";
        const bannerUrl = "https://twitter-vercel-plum.vercel.app/banner.jpg";

        const fetchImageBuffer = async (url) => {
          const res = await axios.get(url, { responseType: "arraybuffer" });
          const contentType = res.headers["content-type"];
          if (!contentType.startsWith("image/")) {
            throw new Error(`Invalid image response from ${url}: ${contentType}`);
          }
          return Buffer.from(res.data);
        };

        const profilePicBuffer = await fetchImageBuffer(profilePicUrl);
        const bannerBuffer = await fetchImageBuffer(bannerUrl);

        console.log("Fetched image buffer sizes:", {
          profilePicSize: profilePicBuffer.length,
          bannerSize: bannerBuffer.length,
        });

        await userClient.v1.updateAccountProfileImage(profilePicBuffer);
        await userClient.v1.updateAccountProfileBanner(bannerBuffer);
        console.log("Images uploaded");

        return res.status(200).send(`
          <html>
            <body style="background:#0d1117;color:#c9d1d9;font-family:sans-serif;text-align:center;padding-top:100px;">
              <h1>Profile updated successfully 🎉</h1>
              <script>setTimeout(() => window.close(), 1500);</script>
            </body>
          </html>
        `);
      } catch (err) {
        console.error("Callback step failed:", err);
        return res.status(500).json({
          error: "Callback step failed",
          message: err.message,
          stack: err.stack,
        });
      }
    }

    return res.status(400).send("Invalid request");
  } catch (error) {
    console.error("Function error:", error);
    return res.status(500).json({
      error: "Function crashed",
      message: error.message,
      stack: error.stack,
    });
  }
};