const { TwitterApi } = require("twitter-api-v2");
const fs = require("fs");
const path = require("path");

module.exports = async (req, res) => {
  try {
    // Debug logs
    console.log("TWITTER_API_KEY:", process.env.TWITTER_API_KEY);
    console.log("TWITTER_API_SECRET:", process.env.TWITTER_API_SECRET);
    console.log("CALLBACK_URL:", process.env.CALLBACK_URL);
    console.log("Request method:", req.method);
    console.log("Request query:", req.query);

    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
    });

    if (req.method === "GET" && req.query.step === "auth") {
      try {
        console.log("Starting auth step...");
        console.log("Using CALLBACK_URL:", process.env.CALLBACK_URL);

        const { url, oauthToken, oauthTokenSecret } =
          await client.generateAuthLink(process.env.CALLBACK_URL, {
            authAccessType: "write",
          });

        console.log("Auth link generated:", url);
        console.log("oauthToken:", oauthToken);
        console.log("oauthTokenSecret:", oauthTokenSecret);

        return res.status(200).json({
          url,
          oauthToken,
          oauthTokenSecret,
        });
      } catch (err) {
        console.error("Auth step failed:", err);
        return res.status(500).json({
          error: "Auth step failed",
          message: err.message,
          stack: err.stack,
        });
      }
    }

    if (req.method === "POST" && req.body.step === "callback") {
      const { oauthToken, oauthVerifier, oauthTokenSecret } = req.body;

      const loginClient = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken: oauthToken,
        accessSecret: oauthTokenSecret,
      });

      const { client: userClient } = await loginClient.login(oauthVerifier);

      await userClient.v1.updateAccountProfile({
        name: "New Display Name",
        description: "New bio here.",
        url: "https://ko-fi.com/darkmea",
      });

      const profilePicPath = path.join(__dirname, "profile.jpg");
      const bannerPath = path.join(__dirname, "banner.jpg");

      const profilePicData = fs.readFileSync(profilePicPath, {
        encoding: "base64",
      });
      const bannerData = fs.readFileSync(bannerPath, {
        encoding: "base64",
      });

      await userClient.v1.updateAccountProfileImage(profilePicData);
      await userClient.v1.updateAccountProfileBanner(bannerData);

      return res.status(200).send("Your X profile has been updated.");
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